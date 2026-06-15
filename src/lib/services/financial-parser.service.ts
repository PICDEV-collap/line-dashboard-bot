import { GoogleGenerativeAI } from "@google/generative-ai";
import { ENV } from "@/config/constants";
import { createLogger } from "@/lib/middleware/logger";
import { safeJsonParse } from "@/lib/utils/helpers";
import type { ParsedFinancialInput } from "@/lib/types/financial.types";

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
   - porkRed: { qty: กิโลกรัม, price: บาท/กก } — หมูแดง/หมูเนื้อ
   - porkMinced: { qty, price } — หมูสับ
   - porkFat: { qty, price } — มันหมู/หมูมัน
   - materials: ค่าวัตถุดิบอื่น ไม่ใช่หมู (บาท)
   - supplies: ค่าอุปกรณ์/บรรจุภัณฑ์/ถุง/กล่อง (บาท)
   - gas: ค่าแก๊ส (บาท, default 150)
   - labor: ค่าแรง (บาท, default 1500)
   - ice: ค่าน้ำแข็ง (บาท, default 35)
   - extraExpenses: รายการค่าใช้จ่ายอื่นๆ [{name, amount}]
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
  "note": ""
}`;

function getClient(): GoogleGenerativeAI {
  return new GoogleGenerativeAI(ENV.GEMINI_API_KEY());
}

export async function parseFinancialMessage(
  text: string
): Promise<ParsedFinancialInput> {
  logger.info("Parsing financial message", { textLength: text.length });

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

    logger.info("Financial parse result", {
      isFinancialData: parsed.isFinancialData,
      confidence: parsed.confidence,
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

function parseFinancialMessageWithRegex(text: string): ParsedFinancialInput {
  const transfer = num((text.match(/โอน\s*([\d,]+)/) ?? [])[1] ?? "0");
  const cash = num((text.match(/(?:เงินสด|สด)\s*([\d,]+)/) ?? [])[1] ?? "0");
  const delivery = num((text.match(/(?:delivery|เดลิเวอรี่?|ส่ง)\s*([\d,]+)/i) ?? [])[1] ?? "0");

  const porkRedM = text.match(/หมู(?:แดง|เนื้อ)\s*([\d.]+)\s*กก?\s*(?:ราคา)?\s*([\d,]+)/);
  const porkRed = porkRedM ? { qty: parseFloat(porkRedM[1]), price: num(porkRedM[2]) } : undefined;

  const porkMincedM = text.match(/หมูสับ\s*([\d.]+)\s*กก?\s*(?:ราคา)?\s*([\d,]+)/);
  const porkMinced = porkMincedM ? { qty: parseFloat(porkMincedM[1]), price: num(porkMincedM[2]) } : undefined;

  const porkFatM = text.match(/(?:มันหมู|หมูมัน)\s*([\d.]+)\s*กก?\s*(?:ราคา)?\s*([\d,]+)/);
  const porkFat = porkFatM ? { qty: parseFloat(porkFatM[1]), price: num(porkFatM[2]) } : undefined;

  const materials = num((text.match(/วัตถุดิบ\s*([\d,]+)/) ?? [])[1] ?? "0");
  const supplies = num((text.match(/(?:อุปกรณ์|บรรจุภัณฑ์|ถุง|กล่อง)\s*([\d,]+)/) ?? [])[1] ?? "0");
  const gasM = text.match(/(?:ค่าแก๊ส|แก๊ส)\s*([\d,]+)/);
  const gas = gasM ? num(gasM[1]) : undefined;
  const laborM = text.match(/ค่าแรง\s*([\d,]+)/);
  const labor = laborM ? num(laborM[1]) : undefined;
  const iceM = text.match(/(?:ค่าน้ำแข็ง|น้ำแข็ง)\s*([\d,]+)/);
  const ice = iceM ? num(iceM[1]) : undefined;

  const hasRevenue = transfer > 0 || cash > 0 || delivery > 0;
  const hasPork = porkRed !== undefined || porkMinced !== undefined || porkFat !== undefined;
  const isFinancialData = hasRevenue || hasPork || materials > 0;

  logger.info("Regex parse result", { isFinancialData, transfer, cash, delivery });

  return {
    isFinancialData,
    confidence: isFinancialData ? 0.85 : 0,
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
    extraExpenses: [],
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
    /รายรับ\s*\d+/,
    /ขายได้\s*\d+/,
    /วัตถุดิบ\s*\d+/,
    /ค่าแรง\s*\d+/,
    /ค่าแก๊ส/,
    /ค่าน้ำแข็ง/,
  ];
  return patterns.some((p) => p.test(text));
}

// Build a human-readable confirmation message for LINE reply
export function buildFinancialConfirmation(
  input: ParsedFinancialInput,
  revenue: number,
  expense: number,
  profit: number
): string {
  const lines: string[] = ["✅ บันทึกข้อมูลรายวันเรียบร้อยแล้ว\n"];

  lines.push("💰 รายรับ:");
  if (input.transfer) lines.push(`  📱 โอน: ฿${input.transfer.toLocaleString("th-TH")}`);
  if (input.cash) lines.push(`  💵 สด: ฿${input.cash.toLocaleString("th-TH")}`);
  if (input.delivery) lines.push(`  🛵 Delivery: ฿${input.delivery.toLocaleString("th-TH")}`);
  lines.push(`  รวม: ฿${revenue.toLocaleString("th-TH")}\n`);

  lines.push("🧾 ค่าใช้จ่าย:");
  if (input.porkRed?.qty) {
    const t = input.porkRed.qty * input.porkRed.price;
    lines.push(`  🔴 หมูแดง: ${input.porkRed.qty}กก × ฿${input.porkRed.price} = ฿${t.toLocaleString("th-TH")}`);
  }
  if (input.porkMinced?.qty) {
    const t = input.porkMinced.qty * input.porkMinced.price;
    lines.push(`  🟠 หมูสับ: ${input.porkMinced.qty}กก × ฿${input.porkMinced.price} = ฿${t.toLocaleString("th-TH")}`);
  }
  if (input.porkFat?.qty) {
    const t = input.porkFat.qty * input.porkFat.price;
    lines.push(`  🟡 มันหมู: ${input.porkFat.qty}กก × ฿${input.porkFat.price} = ฿${t.toLocaleString("th-TH")}`);
  }
  if (input.materials) lines.push(`  🫙 วัตถุดิบ: ฿${input.materials.toLocaleString("th-TH")}`);
  if (input.supplies) lines.push(`  📦 อุปกรณ์: ฿${input.supplies.toLocaleString("th-TH")}`);
  lines.push(`  รวม: ฿${expense.toLocaleString("th-TH")}\n`);

  const emoji = profit >= 0 ? "📈" : "📉";
  const sign = profit >= 0 ? "+" : "";
  lines.push(`${emoji} กำไร: ${sign}฿${profit.toLocaleString("th-TH")}`);

  if (revenue > 0) {
    const margin = ((profit / revenue) * 100).toFixed(1);
    lines.push(`📊 อัตรากำไร: ${margin}%`);
  }

  return lines.join("\n");
}
