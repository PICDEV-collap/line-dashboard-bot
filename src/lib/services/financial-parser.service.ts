import Groq from "groq-sdk";
import { ENV } from "@/config/constants";
import { createLogger } from "@/lib/middleware/logger";
import { withTimeout } from "@/lib/utils/ai-timeout";
import {
  safeJsonParse,
  getTodayDateString,
  resolveRecordDateFromText,
  describeRecordDate,
} from "@/lib/utils/helpers";
import type { ParsedFinancialInput, ExtraExpense, ExtraIncome, FinancialRecord } from "@/lib/types/financial.types";
import { extractRecurringExpenses, buildCarriedDefaultsNotice, type CarriedDefaultsNotice } from "@/lib/services/recurring-expenses.service";
import {
  detectShopFromText,
  hasPorkRemovalMarker,
  SHOP_KW,
  stripShopPrefix,
} from "@/lib/thai/lexicon";
import { looksLikeFinancialData } from "@/lib/services/thai-intent-router.service";

export { detectShopFromText, looksLikeFinancialData };

const logger = createLogger("FinancialParser");

// Prompt ที่ออกแบบมาสำหรับร้านขายหมู/อาหาร
const FINANCIAL_DETECT_PROMPT = `คุณเป็น AI ผู้ช่วยบันทึกบัญชีร้านขายหมู/อาหาร ภาษาไทย

วิเคราะห์ข้อความนี้แล้วตอบเป็น JSON:

1. ตรวจสอบว่าข้อความนี้เกี่ยวกับ "รายรับ/รายจ่ายประจำวัน" หรือไม่
   - ตัวอย่างที่ใช่: "โอน 5000 สด 3000", "หมู 2กก 180บาท", "วันนี้ขายได้ 8000", "หนองปิง ซื้อของ แม็คโคร 1220", "ปิง แม็คโคร 2500", "แม็คโคร 1800"
   - ⚠️ ชื่อสาขาอาจสะกดคลุมเครือ: "ปิง"/"ปลิง" = หนองปิง (สาขา 2), "ยี่ปุ่น" = ญี่ปุ่น (สาขา 1)
   - ⚠️ ชื่อร้านค้า (แม็คโคร, โลตัส, บิ๊กซี ฯลฯ) ตามด้วยตัวเลข = ซื้อของ → extraExpenses
   - ตัวอย่างที่ไม่ใช่: ขอบคุณ, สวัสดี, รูปภาพ, คำถามทั่วไป

2. ถ้าใช่ ให้ extract ข้อมูลดังนี้:
   - transfer: รายรับจากโอนเงิน (บาท)
   - cash: รายรับเงินสด (บาท)
   - delivery: รายรับ Delivery เช่น Grab/Lineman/Foodpanda (บาท)
   - porkRed: { qty: กิโลกรัม, price: บาท/กก } — หมูแดง/หมูเนื้อ/แดง
   - porkMinced: { qty, price } — หมูสับ/สับ
   - porkFat: { qty, price } — มันหมู/หมูมัน/มัน
   - ⚠️ คำศัพท์หมู: "หมูแดง"=porkRed, "หมูสับ"=porkMinced, "มันหมู"=porkFat, "แดง4"=porkRed qty4
   - ⚠️ แก้ราคาอย่างเดียว: "ปรับหมูสับราคา 120" → porkMinced {qty:0, price:120}
   - ⚠️ ถ้าไม่ได้ระบุราคาหมู ให้ price=0 — อย่าเดาราคา
   - materials: ค่าวัตถุดิบอื่น ไม่ใช่หมู (บาท)
   - supplies: ค่าอุปกรณ์/บรรจุภัณฑ์/ถุง/กล่อง (บาท)
   - gas: ค่าแก๊ส (บาท, default 150)
   - labor: ค่าแรง (บาท, default 1500)
   - ice: ค่าน้ำแข็ง (บาท, default 35)
   - extraExpenses: รายจ่ายอื่นๆ — รายการที่ขึ้นต้นด้วย "จ่าย" หรือ "ซื้อ" = รายจ่าย เช่น "จ่ายค่าขนม 500", "จ่ายลูก690" (ติดกันไม่มีเว้นวรรคได้)
   - extraIncome: รายรับพิเศษ — ขึ้นต้นด้วย "ได้" หรือ "รับ" = รายรับ เช่น "ได้คนละครึ่ง 1265", "ได้ไลน์แมน 450" ⚠️ ห้ามใส่ใน extraExpenses
   - ⚠️ รายการซื้อของ (OCR/ลายมือ): "เผือก 80", "ค่าน้ำ 49" → extraExpenses + materials=ผลรวม
   - ⚠️ "เอาหมูแดง ออก 1 กก" = ลดจำนวนหมู (ไม่ใช่เพิ่ม)
   - date: วันที่ในรูปแบบ YYYY-MM-DD (ถ้าระบุ เช่น "วันนี้", "พรุ่งนี้", "เมื่อวาน", "1/4/2026")
   - ⚠️ "พรุ่งนี้" = บันทึกวันถัดไป, "เมื่อวาน" = วันก่อนหน้า

ตอบเป็น JSON เท่านั้น:
{
  "isFinancialData": true/false,
  "confidence": 0.0-1.0,
  "date": "YYYY-MM-DD or null",
  "transfer": 0,
  "cash": 0,
  "delivery": 0,
  "porkRed": null or { "qty": 0, "price": 0 },
  "porkMinced": null or { "qty": 0, "price": 0 },
  "porkFat": null or { "qty": 0, "price": 0 },
  "materials": 0,
  "supplies": 0,
  "gas": null,
  "labor": null,
  "ice": null,
  "extraExpenses": [],
  "extraIncome": [],
  "note": ""
}`;

const CORRECTION_GEMINI_PROMPT = `คุณช่วยแปลงคำสั่งแก้ไขบัญชีร้านอาหารไทยเป็น JSON array เท่านั้น

คำศัพท์หมู:
- หมูแดง/แดง → pork "red"
- หมูสับ/สับ → pork "minced"
- มันหมู/มัน → pork "fat"

รูปแบบ action:
- แก้ราคาหมู: {"op":"set","field":"porkPrice","pork":"red|minced|fat","value":130}
- แก้จำนวน+ราคา: {"op":"set","field":"porkQtyPrice","pork":"red","qty":4,"price":130}
- แก้ค่าแรง: {"op":"set","field":"labor","value":850}
- แก้โอน: {"op":"set","field":"transfer","value":3000}
- แก้ค่าเช่า: {"op":"setExtraExpense","name":"ค่าเช่า","amount":5000}

ตัวอย่าง:
"ปรับหมูสับราคา 120" → [{"op":"set","field":"porkPrice","pork":"minced","value":120}]
"ปรับหมูแดง ราคา 130" → [{"op":"set","field":"porkPrice","pork":"red","value":130}]

ตอบ JSON array เท่านั้น ไม่มี markdown`;

function getClient(): Groq {
  return new Groq({ apiKey: ENV.GROQ_API_KEY() });
}

export async function parseFinancialMessage(
  text: string
): Promise<ParsedFinancialInput> {
  logger.info("Parsing financial message", { textLength: text.length });

  // Deterministic detections we don't trust the LLM to do reliably.
  const shop = detectShopFromText(text);

  try {
    const client = getClient();

    const result = await withTimeout(
      client.chat.completions.create({
        model: ENV.GROQ_MODEL(),
        messages: [
          { role: "system", content: FINANCIAL_DETECT_PROMPT },
          { role: "user", content: text },
        ],
        temperature: 0.1,
        max_tokens: 2048,
      }),
      ENV.AI_PARSE_TIMEOUT_MS(),
      "Financial parse"
    );

    const raw = (result.choices?.[0]?.message?.content ?? "").trim();
    const cleaned = raw
      .replace(/^```json\s*/i, "")
      .replace(/^```\s*/i, "")
      .replace(/\s*```$/i, "")
      .trim();

    const parsed = safeJsonParse<ParsedFinancialInput>(cleaned);
    if (!parsed) {
      logger.warn("Could not parse AI response as JSON", { raw: raw.slice(0, 300) });
      return parseFinancialMessageWithRegex(text);
    }

    if (shop) {
      parsed.shopId = shop.shopId;
      parsed.shopName = shop.shopName;
    }
    applyDeterministicEnrichment(parsed, text);

    const resolvedDate = resolveRecordDateFromText(text);
    if (resolvedDate) parsed.date = resolvedDate;

    logger.info("Financial parse result", {
      isFinancialData: parsed.isFinancialData,
      confidence: parsed.confidence,
      shopId: parsed.shopId,
      extraIncome: parsed.extraIncome?.length ?? 0,
      extraExpenses: parsed.extraExpenses?.length ?? 0,
      porkRed: parsed.porkRed,
      porkMinced: parsed.porkMinced,
      porkFat: parsed.porkFat,
    });

    return parsed;
  } catch (error) {
    logger.warn("Groq unavailable, falling back to regex parser", error instanceof Error ? error.message : String(error));
    return parseFinancialMessageWithRegex(text);
  }
}

function num(s: string): number {
  return parseInt(s.replace(/,/g, ""), 10) || 0;
}

function mergeExtraItems<T extends { name: string; amount: number }>(
  existing: T[],
  incoming: T[]
): T[] {
  const out = [...existing];
  for (const item of incoming) {
    if (!out.some((e) => e.name === item.name && e.amount === item.amount)) {
      out.push(item);
    }
  }
  return out;
}

// Parse "หมูแดง 4 กก 130", "แดง4", "สับ 3 กก" → { qty, price }.
// Price is optional (defaults to 0 — filled in later on the dashboard).
// `keywords` are tried most-specific first so "หมูแดง" wins over "แดง".
export function parsePork(
  text: string,
  keywords: string[]
): { qty: number; price: number } | undefined {
  for (const kw of keywords) {
    const m = text.match(
      new RegExp(`${kw}\\s*([\\d.]+)\\s*(?:กก\\.?|กิโล)?\\s*(?:ราคา|x|×|\\*|@)?\\s*([\\d,]+)?`)
    );
    if (m && parseFloat(m[1]) > 0) {
      return { qty: parseFloat(m[1]), price: m[2] ? num(m[2]) : 0 };
    }
  }
  return undefined;
}

/** Price-only update: "ราคา แดง 130", "แก้ สับ 135" (qty filled from existing record on upsert). */
function extractPorkPriceUpdates(text: string): {
  porkRed?: { qty: number; price: number };
  porkMinced?: { qty: number; price: number };
  porkFat?: { qty: number; price: number };
} {
  const out: {
    porkRed?: { qty: number; price: number };
    porkMinced?: { qty: number; price: number };
    porkFat?: { qty: number; price: number };
  } = {};
  const lineRe =
    /^ราคา\s*(หมูแดง|หมูเนื้อ|แดง|หมูสับ|สับ|มันหมู|หมูมัน|มัน)\s*([\d,]+)\s*(?:บาท|\/กก)?\s*$/i;
  for (const raw of text.split(/\n/)) {
    const m = raw.trim().match(lineRe);
    if (!m) continue;
    const price = num(m[2]);
    if (price <= 0) continue;
    const kw = m[1];
    const item = { qty: 0, price };
    if (/แดง|หมูแดง|หมูเนื้อ/.test(kw)) out.porkRed = item;
    else if (/สับ|หมูสับ/.test(kw)) out.porkMinced = item;
    else if (/มัน|มันหมู|หมูมัน/.test(kw)) out.porkFat = item;
  }
  return out;
}

function mergePorkParsed(
  base: { qty: number; price: number } | undefined,
  priceOnly: { qty: number; price: number } | undefined
): { qty: number; price: number } | undefined {
  if (!base && !priceOnly) return undefined;
  return {
    qty: base?.qty ?? priceOnly?.qty ?? 0,
    price: priceOnly?.price ?? base?.price ?? 0,
  };
}

// คนละครึ่ง (โครงการรัฐ) — รายรับเสมอ ไม่ใช่รายจ่าย
const KON_LA_KHRUENG_LINE = /^(?:ได้\s*)?คนละครึ่ง\s*([\d,]+)\s*$/i;

function isKonLaKhruengLine(line: string): boolean {
  return KON_LA_KHRUENG_LINE.test(line) || /^ได้\s*คนละครึ่ง/i.test(line);
}

function parseKonLaKhruengIncome(line: string): ExtraIncome | null {
  const m = line.match(KON_LA_KHRUENG_LINE);
  if (!m) return null;
  const amount = num(m[1]);
  return amount > 0 ? { name: "คนละครึ่ง", amount } : null;
}

// Amount may be glued to the label: "ได้คนละครึ่ง1265", "จ่ายลูก690" (no space before digits).
const EXTRA_INCOME_LINE =
  /^(?:ได้|รับ|รายรับ|รายได้|\+)\s*(.*?)([\d,]+)\s*$/;
const EXTRA_EXPENSE_LINE =
  /^(?:จ่าย|ซื้อ)\s*(.*?)([\d,]+)\s*$/;
const STORE_PURCHASE_LINE =
  /^(แม็คโคร|แม็กโคร|แมคโคร|โลตัส|บิ๊กซี|ท็อปส์|เทสโก้)\s*([\d,]+)\s*$/i;

function parsePrefixedAmount(
  line: string,
  pattern: RegExp
): { name: string; amount: number } | null {
  const m = line.match(pattern);
  if (!m) return null;
  const amount = num(m[2]);
  const name = m[1].trim();
  if (amount <= 0 || name.length < 1) return null;
  return { name, amount };
}

/** ชื่อรายการที่เป็นรายรับ — ห้ามอยู่ใน extraExpenses */
export function isIncomeLikeName(name: string): boolean {
  const n = name.trim();
  if (/^(?:ได้|รับ|รายรับ|รายได้|\+)/.test(n)) return true;
  if (/คนละครึ่ง/i.test(n)) return true;
  if (/ไลน์\s*แมน|line\s*man|lineman|grab|foodpanda/i.test(n)) return true;
  return false;
}

function expenseToIncome(e: ExtraExpense): ExtraIncome {
  let name = e.name.trim().replace(/^(?:ได้|รับ|รายรับ|รายได้|\+)\s*/, "").trim();
  if (/คนละครึ่ง/i.test(e.name)) name = "คนละครึ่ง";
  else if (/ไลน์\s*แมน|lineman/i.test(e.name)) name = "ไลน์แมน";
  if (!name) name = "รายรับอื่น";
  return { name, amount: e.amount };
}

/** ย้ายรายการที่ Gemini/DB จัดผิด (ได้/รับ → รายจ่าย) กลับเป็นรายรับ */
export function sanitizeExtraLedger(
  extraIncome: ExtraIncome[],
  extraExpenses: ExtraExpense[]
): { extraIncome: ExtraIncome[]; extraExpenses: ExtraExpense[] } {
  const promoted: ExtraIncome[] = [];
  const kept: ExtraExpense[] = [];
  for (const e of extraExpenses) {
    if (isIncomeLikeName(e.name)) promoted.push(expenseToIncome(e));
    else kept.push(e);
  }
  return {
    extraIncome: mergeExtraItems(extraIncome, promoted),
    extraExpenses: kept,
  };
}

/** Line-item extras from message text — authoritative over Gemini (LLM mislabels ได้/จ่าย). */
function applyDeterministicIncomeRules(parsed: ParsedFinancialInput, text: string): void {
  parsed.extraIncome = extractExtraIncome(text);
  parsed.extraExpenses = extractExtraExpenses(text);
  const sanitized = sanitizeExtraLedger(parsed.extraIncome, parsed.extraExpenses);
  parsed.extraIncome = sanitized.extraIncome;
  parsed.extraExpenses = sanitized.extraExpenses;
}

function mergePorkField(
  gemini?: { qty: number; price: number } | null,
  regex?: { qty: number; price: number }
): { qty: number; price: number } | undefined {
  const gQty = gemini?.qty ?? 0;
  const gPrice = gemini?.price ?? 0;
  const rQty = regex?.qty ?? 0;
  const rPrice = regex?.price ?? 0;
  const qty = rQty > 0 ? rQty : gQty;
  const price = rPrice > 0 ? rPrice : gPrice;
  if (qty <= 0 && price <= 0) return undefined;
  return { qty, price };
}

/** Extract pork qty/price from text via regex (deterministic layer). Skips "ออก" removal lines. */
export function extractDeterministicPork(text: string): {
  porkRed?: { qty: number; price: number };
  porkMinced?: { qty: number; price: number };
  porkFat?: { qty: number; price: number };
} {
  if (hasPorkRemovalMarker(text)) {
    return {};
  }

  return {
    porkRed: mergePorkParsed(
      parsePork(text, ["หมูแดง", "หมูเนื้อ", "แดง"]),
      extractPorkPriceUpdates(text).porkRed
    ),
    porkMinced: mergePorkParsed(
      parsePork(text, ["หมูสับ", "สับ"]),
      extractPorkPriceUpdates(text).porkMinced
    ),
    porkFat: mergePorkParsed(
      parsePork(text, ["มันหมู", "หมูมัน", "มัน"]),
      extractPorkPriceUpdates(text).porkFat
    ),
  };
}

/**
 * Hybrid merge: Gemini คิดภาษาพูด + regex กันพลาด
 * - ได้/จ่าย → regex เป็นหลัก (Gemini มักผิด)
 * - หมู/โอน/สด/ค่าแรง → เอาค่าที่มีข้อมูลจากทั้งสองฝั่ง
 */
function applyDeterministicEnrichment(parsed: ParsedFinancialInput, text: string): void {
  applyDeterministicIncomeRules(parsed, text);

  const regex = extractDeterministicPork(text);
  parsed.porkRed = mergePorkField(parsed.porkRed, regex.porkRed);
  parsed.porkMinced = mergePorkField(parsed.porkMinced, regex.porkMinced);
  parsed.porkFat = mergePorkField(parsed.porkFat, regex.porkFat);

  const transfer = num((text.match(/โอน\s*([\d,]+)/) ?? [])[1] ?? "0");
  const cash = num((text.match(/(?:เงินสด|สด)\s*([\d,]+)/) ?? [])[1] ?? "0");
  if (!parsed.transfer && transfer > 0) parsed.transfer = transfer;
  if (!parsed.cash && cash > 0) parsed.cash = cash;

  const laborM =
    text.match(/(?:ปรับ|แก้|เปลี่ยน|ตั้ง)?\s*ค่าแรง\s*([\d,]+)/i) ??
    text.match(/(?:^|\n)ค่า\s+([\d,]+)\s*(?:\n|$)/m);
  if ((!parsed.labor || parsed.labor <= 0) && laborM) parsed.labor = num(laborM[1]);

  const hasPork = parsed.porkRed || parsed.porkMinced || parsed.porkFat;
  const hasMoney =
    (parsed.transfer ?? 0) > 0 ||
    (parsed.cash ?? 0) > 0 ||
    (parsed.delivery ?? 0) > 0 ||
    (parsed.labor ?? 0) > 0 ||
    (parsed.extraIncome?.length ?? 0) > 0 ||
    (parsed.extraExpenses?.length ?? 0) > 0;

  if (hasPork || hasMoney) {
    parsed.isFinancialData = true;
    parsed.confidence = Math.max(parsed.confidence ?? 0, 0.85);
  }

  const shopping = extractShoppingListFromText(text);
  if (shopping) {
    if (!parsed.materials || parsed.materials <= 0) parsed.materials = shopping.materialsTotal;
    parsed.extraExpenses = mergeExtraItems(parsed.extraExpenses ?? [], shopping.items);
    parsed.isFinancialData = true;
    parsed.confidence = Math.max(parsed.confidence ?? 0, 0.85);
  }
}

/** AI ช่วย parse คำสั่งแก้ไขเมื่อ regex ไม่ match (ภาษาพูด/คำติดกัน) */
export async function parseCorrectionWithGemini(
  text: string
): Promise<import("@/lib/services/financial-correction.service").CorrectionAction[]> {
  type CorrectionAction = import("@/lib/services/financial-correction.service").CorrectionAction;
  try {
    const client = getClient();
    const result = await client.chat.completions.create({
      model: ENV.GROQ_MODEL(),
      messages: [
        { role: "system", content: CORRECTION_GEMINI_PROMPT },
        { role: "user", content: text },
      ],
      temperature: 0.1,
      max_tokens: 1024,
    });
    const raw = (result.choices?.[0]?.message?.content ?? "").trim()
      .replace(/^```json\s*/i, "")
      .replace(/^```\s*/i, "")
      .replace(/\s*```$/i, "")
      .trim();
    const actions = safeJsonParse<CorrectionAction[]>(raw);
    if (!Array.isArray(actions)) return [];
    logger.info("Groq correction assist", { actions: actions.length });
    return actions.filter((a) => a && typeof a === "object" && "op" in a);
  } catch (error) {
    logger.warn("Groq correction assist failed", error instanceof Error ? error.message : String(error));
    return [];
  }
}

// Extra income: lines starting with ได้/รับ/รายรับ/รายได้/+ — not "ขายได้".
export function extractExtraIncome(text: string): ExtraIncome[] {
  const out: ExtraIncome[] = [];
  for (const rawLine of text.split(/\n/).map((l) => l.trim()).filter(Boolean)) {
    const line = stripShopPrefix(rawLine);
    if (!line || /^ขายได้\b/.test(line)) continue;

    // คนละครึ่ง — government half-half program, always income
    const klk = parseKonLaKhruengIncome(line);
    if (klk) {
      out.push(klk);
      continue;
    }

    const parsed = parsePrefixedAmount(line, EXTRA_INCOME_LINE);
    if (parsed) {
      out.push(/คนละครึ่ง/i.test(parsed.name) ? { name: "คนละครึ่ง", amount: parsed.amount } : parsed);
    }
  }
  return out;
}

/** Handwritten/OCR shopping list: "เผือก 80 (4)", "ค่าน้ำ 49", total line "923". */
export function extractShoppingListFromText(text: string): {
  items: ExtraExpense[];
  materialsTotal: number;
} | null {
  const lines = text.split(/\n/).map((l) => l.trim()).filter(Boolean);
  const items: ExtraExpense[] = [];
  let explicitTotal = 0;

  for (let i = 0; i < lines.length; i++) {
    const line = stripShopPrefix(lines[i]);
    if (!line) continue;

    const totalOnly = line.match(/^([\d,]+)\s*$/);
    if (totalOnly && i === lines.length - 1) {
      explicitTotal = num(totalOnly[1]);
      continue;
    }

    const itemM = line.match(/^(.+?)\s+([\d,]+)(?:\s*\([\d.]+\))?\s*$/);
    if (!itemM) continue;

    const name = itemM[1].replace(/^\d+[.)]\s*/, "").trim();
    const amount = num(itemM[2]);
    if (amount <= 0 || name.length < 2) continue;
    if (/^(?:รวม|total|ยอด)/i.test(name)) continue;
    if (/^(?:โอน|สด|เงินสด|delivery|หมู|แดง|สับ)/i.test(name)) continue;

    items.push({ name, amount });
  }

  if (items.length < 2 && explicitTotal <= 0) return null;

  const itemSum = items.reduce((s, e) => s + e.amount, 0);
  const materialsTotal =
    explicitTotal >= itemSum && explicitTotal > 0 ? explicitTotal : itemSum;
  if (materialsTotal <= 0) return null;

  return { items, materialsTotal };
}

// Extra expenses: lines starting with จ่าย/ซื้อ — prefix stripped from name.
export function extractExtraExpenses(text: string): ExtraExpense[] {
  const out: ExtraExpense[] = [];
  for (const rawLine of text.split(/\n/).map((l) => l.trim()).filter(Boolean)) {
    const line = stripShopPrefix(rawLine);
    if (!line || isKonLaKhruengLine(line)) continue;
    // บรรทัดรายรับ (ได้/รับ) — ไม่ใช่รายจ่าย
    if (/^(?:ได้|รับ|รายรับ|รายได้|\+)/.test(line)) continue;
    const parsed = parsePrefixedAmount(line, EXTRA_EXPENSE_LINE);
    if (parsed) { out.push(parsed); continue; }
    const storeM = line.match(STORE_PURCHASE_LINE);
    if (storeM) {
      const amount = num(storeM[2]);
      if (amount > 0) { out.push({ name: storeM[1], amount }); continue; }
    }
  }
  for (const item of extractRecurringExpenses(text)) {
    if (!out.some((e) => e.name === item.name && e.amount === item.amount)) {
      out.push(item);
    }
  }
  return out;
}

export function parseFinancialMessageWithRegex(text: string): ParsedFinancialInput {
  const shop = detectShopFromText(text);

  const transfer = num((text.match(/โอน\s*([\d,]+)/) ?? [])[1] ?? "0");
  const cash = num((text.match(/(?:เงินสด|สด)\s*([\d,]+)/) ?? [])[1] ?? "0");
  const delivery = num((text.match(/(?:delivery|เดลิเวอรี่?|ส่ง)\s*([\d,]+)/i) ?? [])[1] ?? "0");

  const { porkRed, porkMinced, porkFat } = extractDeterministicPork(text);

  const materials = num((text.match(/วัตถุดิบ\s*([\d,]+)/) ?? [])[1] ?? "0");
  const supplies = num((text.match(/(?:อุปกรณ์|บรรจุภัณฑ์|ถุง|กล่อง)\s*([\d,]+)/) ?? [])[1] ?? "0");
  const gasM = text.match(/(?:ค่าแก๊ส|แก๊ส)\s*([\d,]+)/);
  const gas = gasM ? num(gasM[1]) : undefined;
  const laborM =
    text.match(/(?:ปรับ|แก้|เปลี่ยน|ตั้ง)?\s*ค่าแรง\s*([\d,]+)/i) ??
    text.match(/(?:^|\n)ค่า\s+([\d,]+)\s*(?:\n|$)/m);
  const labor = laborM ? num(laborM[1]) : undefined;
  const iceM = text.match(/(?:ค่าน้ำแข็ง|น้ำแข็ง)\s*([\d,]+)/);
  const ice = iceM ? num(iceM[1]) : undefined;

  const extraIncome = extractExtraIncome(text);
  let extraExpenses = extractExtraExpenses(text);

  const shopping = extractShoppingListFromText(text);
  let materialsFromList = materials;
  if (shopping) {
    materialsFromList = Math.max(materials, shopping.materialsTotal);
    extraExpenses = mergeExtraItems(extraExpenses, shopping.items);
  }

  const parsed: ParsedFinancialInput = {
    isFinancialData: false,
    confidence: 0,
    ...(shop ?? {}),
    transfer,
    cash,
    delivery,
    porkRed,
    porkMinced,
    porkFat,
    materials: materialsFromList,
    supplies,
    gas,
    labor,
    ice,
    extraExpenses,
    extraIncome,
  };

  applyDeterministicIncomeRules(parsed, text);
  parsed.isFinancialData =
    transfer > 0 || cash > 0 || delivery > 0 || parsed.extraIncome!.length > 0 ||
    porkRed !== undefined || porkMinced !== undefined || porkFat !== undefined ||
    materialsFromList > 0 || (parsed.extraExpenses?.length ?? 0) > 0 ||
    (labor ?? 0) > 0 || (gas ?? 0) > 0 || (ice ?? 0) > 0 ||
    shopping !== null;
  parsed.confidence = parsed.isFinancialData ? 0.85 : 0;

  const resolvedDate = resolveRecordDateFromText(text);
  if (resolvedDate) parsed.date = resolvedDate;

  logger.info("Regex parse result", {
    isFinancialData: parsed.isFinancialData,
    transfer,
    cash,
    delivery,
    extraExpenses: parsed.extraExpenses?.length ?? 0,
    extraIncome: parsed.extraIncome?.length ?? 0,
    shopId: shop?.shopId,
    date: parsed.date,
  });

  return parsed;
}

// Build a human-readable confirmation for the LINE reply from the SAVED record,
// so it shows the running daily total after merging this message.
export interface RecordConfirmationOptions {
  carryMeta?: CarriedDefaultsNotice;
  prefix?: string;
  /** Items extracted from the current message (short mode). */
  addedItems?: string[];
  /** short = compact reply; full = itemized breakdown (default). */
  mode?: "short" | "full";
}

const SHOP_LINE_RE =
  /^(?:สายหนองปิง|หนองปลิง|หนองปิง|ตลาดญี่ปุ่น|ปลิง|ปิง|ญี่ปุ่น|ยี่ปุ่น|พรุ่งนี้|เมื่อวาน|วันนี้)$/u;

/** @deprecated import from summary-command.service */
export { looksLikeSummaryRequest } from "@/lib/services/summary-command.service";

/** Human-readable list of fields present in this parsed message. */
export function formatParsedDeltaItems(parsed: ParsedFinancialInput): string[] {
  const baht = (n: number) => `฿${n.toLocaleString("th-TH")}`;
  const items: string[] = [];

  if (parsed.transfer && parsed.transfer > 0) items.push(`โอน ${baht(parsed.transfer)}`);
  if (parsed.cash && parsed.cash > 0) items.push(`สด ${baht(parsed.cash)}`);
  if (parsed.delivery && parsed.delivery > 0) items.push(`Delivery ${baht(parsed.delivery)}`);
  for (const e of parsed.extraIncome ?? []) {
    if (e.amount > 0) items.push(`${e.name} ${baht(e.amount)}`);
  }

  const porkDelta = (
    label: string,
    p?: { qty: number; price: number }
  ) => {
    if (!p || (p.qty <= 0 && p.price <= 0)) return;
    if (p.qty > 0 && p.price > 0) items.push(`${label} ${p.qty}กก. × ${baht(p.price)}`);
    else if (p.qty > 0) items.push(`${label} ${p.qty}กก.`);
    else items.push(`${label} ${baht(p.price)}/กก.`);
  };
  porkDelta("หมูแดง", parsed.porkRed);
  porkDelta("หมูสับ", parsed.porkMinced);
  porkDelta("มันหมู", parsed.porkFat);

  if (parsed.materials && parsed.materials > 0) items.push(`วัตถุดิบ ${baht(parsed.materials)}`);
  if (parsed.supplies && parsed.supplies > 0) items.push(`อุปกรณ์ ${baht(parsed.supplies)}`);
  if (parsed.gas && parsed.gas > 0) items.push(`แก๊ส ${baht(parsed.gas)}`);
  if (parsed.labor && parsed.labor > 0) items.push(`ค่าแรง ${baht(parsed.labor)}`);
  if (parsed.ice && parsed.ice > 0) items.push(`น้ำแข็ง ${baht(parsed.ice)}`);
  for (const e of parsed.extraExpenses ?? []) {
    if (e.amount > 0) items.push(`${e.name} ${baht(e.amount)}`);
  }
  return items;
}

/** Use compact reply for small single-purpose messages. */
export function shouldUseShortConfirmation(
  parsed: ParsedFinancialInput,
  text: string
): boolean {
  const items = formatParsedDeltaItems(parsed);
  if (items.length === 0) return false;
  if (items.length >= 4) return false;
  const contentLines = text
    .split(/\n/)
    .map((l) => l.trim())
    .filter((l) => l && !SHOP_LINE_RE.test(l));
  return contentLines.length < 4;
}

function shopLabelFor(rec: FinancialRecord): string {
  return rec.shopId === "shop2" ? "🏪 สายหนองปิง" : "🏪 ตลาดญี่ปุ่น";
}

function formatBriefTotals(rec: FinancialRecord): string {
  const baht = (n: number) => `฿${n.toLocaleString("th-TH")}`;
  const sign = rec.profit >= 0 ? "+" : "";
  return `📊 ยอดวันนั้น: รายรับ ${baht(rec.revenue)} · ค่าใช้จ่าย ${baht(rec.expense)} · กำไร ${sign}${baht(rec.profit)}`;
}

export function buildShortRecordConfirmation(
  rec: FinancialRecord,
  options: RecordConfirmationOptions = {}
): string {
  const lines: string[] = [];
  if (options.prefix) lines.push(options.prefix);

  const today = getTodayDateString();
  lines.push(`✅ บันทึกแล้ว · ${shopLabelFor(rec)}`);
  if (rec.date !== today) {
    lines.push(`📅 ${describeRecordDate(rec.date, today)} (${rec.date})`);
  }
  lines.push("");

  if (options.addedItems?.length) {
    lines.push(`➕ เพิ่ม: ${options.addedItems.join(" · ")}`);
    lines.push("");
  }

  lines.push(formatBriefTotals(rec));

  if (options.carryMeta) {
    lines.push("   (รวมค่าที่ดึงจากวันก่อนด้วย)");
  }

  lines.push('');
  lines.push('💬 "สรุป" ดูรายละเอียด · "ช่วย" คำสั่งทั้งหมด');
  return lines.join("\n");
}

export function buildSummaryNotFoundMessage(date: string, today: string): string {
  const tag = describeRecordDate(date, today);
  return `❌ ยังไม่มีข้อมูล${tag === date ? ` วันที่ ${date}` : ` (${tag})`}\n\nส่งยอดหรือรายการเพื่อเริ่มบันทึก`;
}

export function buildRecordConfirmation(
  rec: FinancialRecord,
  options: RecordConfirmationOptions = {}
): string {
  if (options.mode === "short") {
    return buildShortRecordConfirmation(rec, options);
  }

  const baht = (n: number) => `฿${n.toLocaleString("th-TH")}`;
  const lines: string[] = [];
  if (options.prefix) lines.push(options.prefix);
  const today = getTodayDateString();
  lines.push(`✅ บันทึกข้อมูลรายวันแล้ว\n🏪 สาขา: ${shopLabelFor(rec)}`);
  if (rec.date !== today) {
    lines.push(`📅 ${describeRecordDate(rec.date, today)} (${rec.date})`);
  }
  lines.push("");

  const incomeLines: string[] = [];
  if (rec.transfer) incomeLines.push(`  📱 โอน: ${baht(rec.transfer)}`);
  if (rec.cash) incomeLines.push(`  💵 สด: ${baht(rec.cash)}`);
  if (rec.delivery) incomeLines.push(`  🛵 Delivery: ${baht(rec.delivery)}`);
  for (const e of rec.extraIncome ?? []) {
    if (e.amount > 0) incomeLines.push(`  💚 ${e.name}: ${baht(e.amount)}`);
  }
  if (incomeLines.length === 0) {
    lines.push("💰 รายรับ: (ยังไม่มี)\n");
  } else {
    lines.push("💰 รายรับ:");
    lines.push(...incomeLines);
    lines.push(`  รวม: ${baht(rec.revenue)}\n`);
  }

  lines.push("🧾 ค่าใช้จ่าย:");
  const expenseLines: string[] = [];
  const porkLine = (emoji: string, label: string, qty: number, price: number, total: number) => {
    if (qty <= 0 && price <= 0) return;
    if (qty <= 0 && price > 0) {
      expenseLines.push(`  ${emoji} ${label}: ฿${price}/กก. (⏳ รอยอดจำนวน)`);
      return;
    }
    if (price <= 0) expenseLines.push(`  ${emoji} ${label}: ${qty}กก (⏳ ยังไม่ใส่ราคา)`);
    else expenseLines.push(`  ${emoji} ${label}: ${qty}กก × ฿${price} = ${baht(total)}`);
  };
  const pb = rec.porkBreakdown;
  if (pb) {
    porkLine("🔴", "หมูแดง", pb.redQty, pb.redPrice, pb.redTotal);
    porkLine("🟠", "หมูสับ", pb.mincedQty, pb.mincedPrice, pb.mincedTotal);
    porkLine("🟡", "มันหมู", pb.fatQty, pb.fatPrice, pb.fatTotal);
  }
  if (rec.materials) expenseLines.push(`  🫙 วัตถุดิบ: ${baht(rec.materials)}`);
  if (rec.supplies) expenseLines.push(`  📦 อุปกรณ์: ${baht(rec.supplies)}`);
  if (rec.gas) expenseLines.push(`  🔥 แก๊ส: ${baht(rec.gas)}`);
  if (rec.labor) expenseLines.push(`  👷 ค่าแรง: ${baht(rec.labor)}`);
  if (rec.ice) expenseLines.push(`  🧊 น้ำแข็ง: ${baht(rec.ice)}`);
  for (const e of rec.extraExpenses ?? []) {
    if (e.amount > 0) expenseLines.push(`  💸 ${e.name}: ${baht(e.amount)}`);
  }
  if (expenseLines.length === 0) {
    lines.push("  (ยังไม่มี)");
  } else {
    lines.push(...expenseLines);
  }
  if (rec.expense > 0) {
    lines.push(`  รวม: ${baht(rec.expense)}\n`);
  } else {
    lines.push("");
  }

  if (rec.revenue > 0 || rec.expense > 0) {
    const emoji = rec.profit >= 0 ? "📈" : "📉";
    const sign = rec.profit >= 0 ? "+" : "";
    lines.push(`${emoji} กำไร: ${sign}${baht(rec.profit)}`);
    if (rec.revenue > 0) {
      lines.push(`📊 อัตรากำไร: ${((rec.profit / rec.revenue) * 100).toFixed(1)}%`);
    }
  }

  if (rec.status !== "complete") {
    lines.push(`\n⏳ ข้อมูลยังไม่สมบูรณ์ — เปิด Dashboard เพื่อกรอกราคาหมู/รายละเอียดเพิ่ม`);
  }

  const carryNote = options.carryMeta ? buildCarriedDefaultsNotice(options.carryMeta) : undefined;
  if (carryNote) lines.push(carryNote);

  lines.push(`\n💬 พิมพ์ "สรุป" ดูรายละเอียด · "ช่วย" แก้ไขข้อมูล`);

  return lines.join("\n");
}
