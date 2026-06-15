import { GoogleGenerativeAI } from "@google/generative-ai";
import { ENV } from "@/config/constants";
import { createLogger } from "@/lib/middleware/logger";
import {
  safeJsonParse,
  getTodayDateString,
  resolveRecordDateFromText,
  describeRecordDate,
} from "@/lib/utils/helpers";
import type { ParsedFinancialInput, ExtraExpense, ExtraIncome, FinancialRecord } from "@/lib/types/financial.types";
import { extractRecurringExpenses, buildCarriedDefaultsNotice, type CarriedDefaultsNotice } from "@/lib/services/recurring-expenses.service";

const logger = createLogger("FinancialParser");

// Prompt ที่ออกแบบมาสำหรับร้านขายหมู/อาหาร
const FINANCIAL_DETECT_PROMPT = `คุณเป็น AI ผู้ช่วยบันทึกบัญชีร้านขายหมู/อาหาร ภาษาไทย

วิเคราะห์ข้อความนี้แล้วตอบเป็น JSON:

1. ตรวจสอบว่าข้อความนี้เกี่ยวกับ "รายรับ/รายจ่ายประจำวัน" หรือไม่
   - ตัวอย่างที่ใช่: "โอน 5000 สด 3000", "หมู 2กก 180บาท", "วันนี้ขายได้ 8000", "หนองปิง ซื้อของ แม็คโคร 1220"
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
   - note: หมายเหตุ (ถ้ามี)
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

function getClient(): GoogleGenerativeAI {
  return new GoogleGenerativeAI(ENV.GEMINI_API_KEY());
}

export async function parseFinancialMessage(
  text: string
): Promise<ParsedFinancialInput> {
  logger.info("Parsing financial message", { textLength: text.length });

  // Deterministic detections we don't trust the LLM to do reliably.
  const shop = detectShopFromText(text);

  try {
    const client = getClient();
    const model = client.getGenerativeModel({ model: ENV.GEMINI_MODEL() });

    const result = await model.generateContent(
      `${FINANCIAL_DETECT_PROMPT}\n\nข้อความ: "${text}"`
    );

    const raw = result.response.text().trim();
    const cleaned = raw
      .replace(/^```json\s*/i, "")
      .replace(/^```\s*/i, "")
      .replace(/\s*```$/i, "")
      .trim();

    const parsed = safeJsonParse<ParsedFinancialInput>(cleaned);
    if (!parsed) {
      logger.warn("Could not parse Gemini response as JSON", { raw: raw.slice(0, 300) });
      return parseFinancialMessageWithRegex(text);
    }

    // Branch detection by keyword is more reliable than the LLM — always override.
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
    logger.warn("Gemini unavailable, falling back to regex parser", error instanceof Error ? error.message : String(error));
    return parseFinancialMessageWithRegex(text);
  }
}

function num(s: string): number {
  return parseInt(s.replace(/,/g, ""), 10) || 0;
}

const SHOP_KW = /(?:ตลาดญี่ปุ่น|สายหนองปิง|ญี่ปุ่น|หนองปิง)/g;

function stripShopPrefix(line: string): string {
  return line.replace(SHOP_KW, "").trim();
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

/** Extract pork qty/price from text via regex (deterministic layer). */
export function extractDeterministicPork(text: string): {
  porkRed?: { qty: number; price: number };
  porkMinced?: { qty: number; price: number };
  porkFat?: { qty: number; price: number };
} {
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
}

/** Gemini ช่วย parse คำสั่งแก้ไขเมื่อ regex ไม่ match (ภาษาพูด/คำติดกัน) */
export async function parseCorrectionWithGemini(
  text: string
): Promise<import("@/lib/services/financial-correction.service").CorrectionAction[]> {
  type CorrectionAction = import("@/lib/services/financial-correction.service").CorrectionAction;
  try {
    const client = getClient();
    const model = client.getGenerativeModel({ model: ENV.GEMINI_MODEL() });
    const result = await model.generateContent(
      `${CORRECTION_GEMINI_PROMPT}\n\nข้อความ: "${text}"`
    );
    const raw = result.response.text().trim()
      .replace(/^```json\s*/i, "")
      .replace(/^```\s*/i, "")
      .replace(/\s*```$/i, "")
      .trim();
    const actions = safeJsonParse<CorrectionAction[]>(raw);
    if (!Array.isArray(actions)) return [];
    logger.info("Gemini correction assist", { actions: actions.length });
    return actions.filter((a) => a && typeof a === "object" && "op" in a);
  } catch (error) {
    logger.warn("Gemini correction assist failed", error instanceof Error ? error.message : String(error));
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

// Extra expenses: lines starting with จ่าย/ซื้อ — prefix stripped from name.
export function extractExtraExpenses(text: string): ExtraExpense[] {
  const out: ExtraExpense[] = [];
  for (const rawLine of text.split(/\n/).map((l) => l.trim()).filter(Boolean)) {
    const line = stripShopPrefix(rawLine);
    if (!line || isKonLaKhruengLine(line)) continue;
    // บรรทัดรายรับ (ได้/รับ) — ไม่ใช่รายจ่าย
    if (/^(?:ได้|รับ|รายรับ|รายได้|\+)/.test(line)) continue;
    const parsed = parsePrefixedAmount(line, EXTRA_EXPENSE_LINE);
    if (parsed) out.push(parsed);
  }
  for (const item of extractRecurringExpenses(text)) {
    if (!out.some((e) => e.name === item.name && e.amount === item.amount)) {
      out.push(item);
    }
  }
  return out;
}

// Detect shop from first line of message
// Returns { shopId, shopName } or null if not detected
export function detectShopFromText(text: string): { shopId: string; shopName: string } | null {
  const firstLine = text.split(/\n/)[0].trim();
  const SHOPS = [
    {
      id: "shop2",
      name: "ก๋วยเตี๋ยวไทยครูตอมสายหนองปิง",
      keywords: ["หนองปิง", "สายหนองปิง"],
    },
    {
      id: "shop1",
      name: "ก๋วยเตี๋ยวไทยครูตอมตลาดญี่ปุ่น",
      keywords: ["ญี่ปุ่น", "ตลาดญี่ปุ่น"],
    },
  ];

  for (const shop of SHOPS) {
    if (shop.keywords.some((kw) => firstLine.includes(kw))) {
      return { shopId: shop.id, shopName: shop.name };
    }
  }
  return null;
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
  const extraExpenses = extractExtraExpenses(text);

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
    materials,
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
    materials > 0 || (parsed.extraExpenses?.length ?? 0) > 0 ||
    (labor ?? 0) > 0 || (gas ?? 0) > 0 || (ice ?? 0) > 0;
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

// Quick heuristic check before calling Gemini (saves API quota)
export function looksLikeFinancialData(text: string): boolean {
  const patterns = [
    /โอน\s*\d+/,
    /สด\s*\d+/,
    /เงินสด\s*\d+/,
    /delivery\s*\d+/i,
    /เดลิเวอรี/,
    /หมู(แดง|สับ|มัน|เนื้อ)?\s*\d/,
    /\d+\s*กก/,
    /(?:^|\s)แดง\s*\d/,
    /(?:^|\s)สับ\s*\d/,
    /(?:^|\s)มัน\s*\d/,
    /(?:^|\n)ได้[^\n\d]*[\d,]+/m,
    /(?:^|\n)คนละครึ่ง[\d,]+/m,
    /(?:^|\n)ได้\s*คนละครึ่ง[\d,]+/im,
    /(?:^|\n)รับ[^\n\d]*[\d,]+/m,
    /(?:^|\n)จ่าย[^\n\d]*[\d,]+/m,
    /(?:^|\n)ปรับ[^\n\d]*[\d,]+/m,
    /^ค่า\s+\d/m,
    /(?:^|\n)ค่าแรง\s*[\d,]+/m,
    /(?:^|\n)ซื้อ[^\n\d]*[\d,]+/m,
    /รายรับ\s*\d+/,
    /ขายได้\s*\d+/,
    /วัตถุดิบ\s*\d+/,
    /ค่าแรง\s*\d+/,
    /(?:^|\n)ค่าเช่า\s*[\d,]+/m,
    /(?:^|\n)ค่าไฟ(?:ฟ้า)?\s*[\d,]+/m,
    /(?:^|\n)ค่าน้ำ\s*[\d,]+/m,
    /ค่าน้ำแข็ง/,
    // A branch name together with a number → a daily entry/expense for that shop
    /(?:ตลาดญี่ปุ่น|ญี่ปุ่น|หนองปิง|สายหนองปิง)[\s\S]*\d/,
    // "ซื้อของ ... 1220" style purchases
    /ซื้อ[\s\S]*\d/,
  ];
  return patterns.some((p) => p.test(text));
}

// Build a human-readable confirmation for the LINE reply from the SAVED record,
// so it shows the running daily total after merging this message.
export interface RecordConfirmationOptions {
  carryMeta?: CarriedDefaultsNotice;
  prefix?: string;
}

export function buildRecordConfirmation(
  rec: FinancialRecord,
  options: RecordConfirmationOptions = {}
): string {
  const baht = (n: number) => `฿${n.toLocaleString("th-TH")}`;
  const shopLabel =
    rec.shopId === "shop2" ? "🏪 สาขา: สายหนองปิง" : "🏪 สาขา: ตลาดญี่ปุ่น";
  const lines: string[] = [];
  if (options.prefix) lines.push(options.prefix);
  const today = getTodayDateString();
  lines.push(`✅ บันทึกข้อมูลรายวันแล้ว\n${shopLabel}`);
  if (rec.date !== today) {
    lines.push(`📅 ${describeRecordDate(rec.date, today)} (${rec.date})`);
  }
  lines.push("");

  lines.push("💰 รายรับ:");
  if (rec.transfer) lines.push(`  📱 โอน: ${baht(rec.transfer)}`);
  if (rec.cash) lines.push(`  💵 สด: ${baht(rec.cash)}`);
  if (rec.delivery) lines.push(`  🛵 Delivery: ${baht(rec.delivery)}`);
  for (const e of rec.extraIncome ?? []) lines.push(`  💚 ${e.name}: ${baht(e.amount)}`);
  lines.push(`  รวม: ${baht(rec.revenue)}\n`);

  lines.push("🧾 ค่าใช้จ่าย:");
  const porkLine = (emoji: string, label: string, qty: number, price: number, total: number) => {
    if (qty <= 0 && price <= 0) return;
    if (qty <= 0 && price > 0) {
      lines.push(`  ${emoji} ${label}: ฿${price}/กก. (⏳ รอยอดจำนวน)`);
      return;
    }
    if (price <= 0) lines.push(`  ${emoji} ${label}: ${qty}กก (⏳ ยังไม่ใส่ราคา)`);
    else lines.push(`  ${emoji} ${label}: ${qty}กก × ฿${price} = ${baht(total)}`);
  };
  const pb = rec.porkBreakdown;
  if (pb) {
    porkLine("🔴", "หมูแดง", pb.redQty, pb.redPrice, pb.redTotal);
    porkLine("🟠", "หมูสับ", pb.mincedQty, pb.mincedPrice, pb.mincedTotal);
    porkLine("🟡", "มันหมู", pb.fatQty, pb.fatPrice, pb.fatTotal);
  }
  if (rec.materials) lines.push(`  🫙 วัตถุดิบ: ${baht(rec.materials)}`);
  if (rec.supplies) lines.push(`  📦 อุปกรณ์: ${baht(rec.supplies)}`);
  if (rec.gas) lines.push(`  🔥 แก๊ส: ${baht(rec.gas)}`);
  if (rec.labor) lines.push(`  👷 ค่าแรง: ${baht(rec.labor)}`);
  if (rec.ice) lines.push(`  🧊 น้ำแข็ง: ${baht(rec.ice)}`);
  for (const e of rec.extraExpenses ?? []) lines.push(`  💸 ${e.name}: ${baht(e.amount)}`);
  lines.push(`  รวม: ${baht(rec.expense)}\n`);

  const emoji = rec.profit >= 0 ? "📈" : "📉";
  const sign = rec.profit >= 0 ? "+" : "";
  lines.push(`${emoji} กำไร: ${sign}${baht(rec.profit)}`);
  if (rec.revenue > 0) {
    lines.push(`📊 อัตรากำไร: ${((rec.profit / rec.revenue) * 100).toFixed(1)}%`);
  }

  if (rec.status !== "complete") {
    lines.push(`\n⏳ ข้อมูลยังไม่สมบูรณ์ — เปิด Dashboard เพื่อกรอกราคาหมู/รายละเอียดเพิ่ม`);
  }

  const carryNote = options.carryMeta ? buildCarriedDefaultsNotice(options.carryMeta) : undefined;
  if (carryNote) lines.push(carryNote);

  lines.push(`\n💬 พิมพ์ "ช่วย" เพื่อดูวิธีแก้ไขข้อมูล`);

  return lines.join("\n");
}
