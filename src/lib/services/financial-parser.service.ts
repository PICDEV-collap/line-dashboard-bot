import { GoogleGenerativeAI } from "@google/generative-ai";
import { ENV } from "@/config/constants";
import { createLogger } from "@/lib/middleware/logger";
import { safeJsonParse } from "@/lib/utils/helpers";
import type { ParsedFinancialInput, ExtraExpense, ExtraIncome, FinancialRecord } from "@/lib/types/financial.types";

const logger = createLogger("FinancialParser");

// Prompt ที่ออกแบบมาสำหรับร้านขายหมู/อาหาร
const FINANCIAL_DETECT_PROMPT = `คุณเป็น AI ผู้ช่วยบันทึกบัญชีร้านขายหมู/อาหาร ภาษาไทย

วิเคราะห์ข้อความนี้แล้วตอบเป็น JSON:

1. ตรวจสอบว่าข้อความนี้เกี่ยวกับ "รายรับ/รายจ่ายประจำวัน" หรือไม่
   - ตัวอย่างที่ใช่: "โอน 5000 สด 3000", "หมู 2กก 180บาท", "วันนี้ขายได้ 8000"
   - ตัวอย่างที่ไม่ใช่: ขอบคุณ, สวัสดี, รูปภาพ, คำถามทั่วไป

2. ถ้าใช่ ให้ extract ข้อมูลดังนี้:
   - transfer: รายรับจากโอนเงิน (บาท)
   - cash: รายรับเงินสด (บาท)
   - delivery: รายรับ Delivery เช่น Grab/Lineman/Foodpanda (บาท)
   - porkRed: { qty: กิโลกรัม, price: บาท/กก } — หมูแดง/หมูเนื้อ (รับคำย่อ "แดง" ด้วย)
   - porkMinced: { qty, price } — หมูสับ (รับคำย่อ "สับ" ด้วย)
   - porkFat: { qty, price } — มันหมู/หมูมัน (รับคำย่อ "มัน" ด้วย)
   - ⚠️ ถ้าไม่ได้ระบุราคาหมู ให้ price=0 (ลูกค้าจะกรอกราคาเองทีหลัง) — อย่าเดาราคา
   - materials: ค่าวัตถุดิบอื่น ไม่ใช่หมู (บาท)
   - supplies: ค่าอุปกรณ์/บรรจุภัณฑ์/ถุง/กล่อง (บาท)
   - gas: ค่าแก๊ส (บาท, default 150)
   - labor: ค่าแรง (บาท, default 1500)
   - ice: ค่าน้ำแข็ง (บาท, default 35)
   - extraExpenses: รายการค่าใช้จ่ายอื่นๆ [{name, amount}]
   - extraIncome: รายรับพิเศษอื่นๆ นอกเหนือ โอน/สด/delivery [{name, amount}] เช่น "รายรับ ค่าทิป 200"
   - note: หมายเหตุ (ถ้ามี)
   - date: วันที่ในรูปแบบ YYYY-MM-DD (ถ้าระบุ เช่น "วันนี้", "เมื่อวาน", "1/4/2026")

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

function getClient(): GoogleGenerativeAI {
  return new GoogleGenerativeAI(ENV.GEMINI_API_KEY());
}

export async function parseFinancialMessage(
  text: string
): Promise<ParsedFinancialInput> {
  logger.info("Parsing financial message", { textLength: text.length });

  // Deterministic detections we don't trust the LLM to do reliably.
  const shop = detectShop(text);

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
    // Backfill extra income if the LLM missed it (regex is deterministic).
    if (!parsed.extraIncome || parsed.extraIncome.length === 0) {
      parsed.extraIncome = extractExtraIncome(text);
    }

    logger.info("Financial parse result", {
      isFinancialData: parsed.isFinancialData,
      confidence: parsed.confidence,
      shopId: parsed.shopId,
      extraIncome: parsed.extraIncome?.length ?? 0,
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

// Extra income lines: "รายรับ <name> <amount>", "รายได้ ...", or "+<name> <amount>".
// Shared by both the Gemini and regex paths so extra income is never dropped.
function extractExtraIncome(text: string): ExtraIncome[] {
  const out: ExtraIncome[] = [];
  for (const line of text.split(/\n/).map((l) => l.trim()).filter(Boolean)) {
    const m = line.match(/^(?:รายรับ|รายได้|\+)\s*(.+?)\s+([\d,]+)$/);
    if (m) {
      const amount = num(m[2]);
      if (amount > 0) out.push({ name: m[1].trim(), amount });
    }
  }
  return out;
}

// Detect shop from first line of message
// Returns { shopId, shopName } or null if not detected
function detectShop(text: string): { shopId: string; shopName: string } | null {
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

function parseFinancialMessageWithRegex(text: string): ParsedFinancialInput {
  const shop = detectShop(text);

  const transfer = num((text.match(/โอน\s*([\d,]+)/) ?? [])[1] ?? "0");
  const cash = num((text.match(/(?:เงินสด|สด)\s*([\d,]+)/) ?? [])[1] ?? "0");
  const delivery = num((text.match(/(?:delivery|เดลิเวอรี่?|ส่ง)\s*([\d,]+)/i) ?? [])[1] ?? "0");

  const porkRed = parsePork(text, ["หมูแดง", "หมูเนื้อ", "แดง"]);
  const porkMinced = parsePork(text, ["หมูสับ", "สับ"]);
  const porkFat = parsePork(text, ["มันหมู", "หมูมัน", "มัน"]);

  const materials = num((text.match(/วัตถุดิบ\s*([\d,]+)/) ?? [])[1] ?? "0");
  const supplies = num((text.match(/(?:อุปกรณ์|บรรจุภัณฑ์|ถุง|กล่อง)\s*([\d,]+)/) ?? [])[1] ?? "0");
  const gasM = text.match(/(?:ค่าแก๊ส|แก๊ส)\s*([\d,]+)/);
  const gas = gasM ? num(gasM[1]) : undefined;
  const laborM = text.match(/ค่าแรง\s*([\d,]+)/);
  const labor = laborM ? num(laborM[1]) : undefined;
  const iceM = text.match(/(?:ค่าน้ำแข็ง|น้ำแข็ง)\s*([\d,]+)/);
  const ice = iceM ? num(iceM[1]) : undefined;

  // Detect free-form extra expenses/income from unrecognized lines
  const KNOWN = [
    /โอน/, /เงินสด/, /^สด\s/, /delivery/i, /เดลิเวอรี/,
    /หมู(?:แดง|เนื้อ|สับ|มัน)/, /มันหมู/, /\d+\s*กก/,
    /(?:^|\s)แดง\s*\d/, /(?:^|\s)สับ\s*\d/, /(?:^|\s)มัน\s*\d/,
    /วัตถุดิบ/, /อุปกรณ์/, /บรรจุภัณฑ์/, /ถุง/, /กล่อง/,
    /ค่าแก๊ส/, /^แก๊ส\s/, /ค่าแรง/, /ค่าน้ำแข็ง/, /^น้ำแข็ง\s/,
    /ตลาดญี่ปุ่น/, /ญี่ปุ่น/, /หนองปิง/, /สายหนองปิง/,
    /ขายได้/,
  ];
  const extraIncome = extractExtraIncome(text);
  const extraExpenses: ExtraExpense[] = [];

  for (const line of text.split(/\n/).map((l) => l.trim()).filter(Boolean)) {
    // Skip extra-income lines — already handled by extractExtraIncome above
    if (/^(?:รายรับ|รายได้|\+)\s*.+?\s+[\d,]+$/.test(line)) continue;
    // Extra expense: unrecognized "text amount" lines
    const m = line.match(/^(.+?)\s+([\d,]+)$/);
    if (!m) continue;
    if (KNOWN.some((p) => p.test(line))) continue;
    const name = m[1].trim();
    const amount = num(m[2]);
    if (amount > 0 && name.length >= 2) extraExpenses.push({ name, amount });
  }

  const hasRevenue = transfer > 0 || cash > 0 || delivery > 0 || extraIncome.length > 0;
  const hasPork = porkRed !== undefined || porkMinced !== undefined || porkFat !== undefined;
  const isFinancialData = hasRevenue || hasPork || materials > 0 || extraExpenses.length > 0;

  logger.info("Regex parse result", { isFinancialData, transfer, cash, delivery, extraExpenses: extraExpenses.length, extraIncome: extraIncome.length, shopId: shop?.shopId });

  return {
    isFinancialData,
    confidence: isFinancialData ? 0.85 : 0,
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
    /รายรับ\s*\d+/,
    /ขายได้\s*\d+/,
    /วัตถุดิบ\s*\d+/,
    /ค่าแรง\s*\d+/,
    /ค่าแก๊ส/,
    /ค่าน้ำแข็ง/,
  ];
  return patterns.some((p) => p.test(text));
}

// Build a human-readable confirmation for the LINE reply from the SAVED record,
// so it shows the running daily total after merging this message.
export function buildRecordConfirmation(rec: FinancialRecord): string {
  const baht = (n: number) => `฿${n.toLocaleString("th-TH")}`;
  const shopLabel =
    rec.shopId === "shop2" ? "🏪 สาขา: สายหนองปิง" : "🏪 สาขา: ตลาดญี่ปุ่น";
  const lines: string[] = [`✅ บันทึกข้อมูลรายวันแล้ว\n${shopLabel}\n`];

  lines.push("💰 รายรับ:");
  if (rec.transfer) lines.push(`  📱 โอน: ${baht(rec.transfer)}`);
  if (rec.cash) lines.push(`  💵 สด: ${baht(rec.cash)}`);
  if (rec.delivery) lines.push(`  🛵 Delivery: ${baht(rec.delivery)}`);
  for (const e of rec.extraIncome ?? []) lines.push(`  💚 ${e.name}: ${baht(e.amount)}`);
  lines.push(`  รวม: ${baht(rec.revenue)}\n`);

  lines.push("🧾 ค่าใช้จ่าย:");
  const porkLine = (emoji: string, label: string, qty: number, price: number, total: number) => {
    if (qty <= 0) return;
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

  return lines.join("\n");
}
