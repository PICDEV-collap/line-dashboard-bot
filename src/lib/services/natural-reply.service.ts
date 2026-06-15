import { GoogleGenerativeAI } from "@google/generative-ai";
import { ENV } from "@/config/constants";
import { createLogger } from "@/lib/middleware/logger";
import type { FinancialRecord } from "@/lib/types/financial.types";
import { detectShopFromText } from "@/lib/services/financial-parser.service";

const logger = createLogger("NaturalReply");
const MAX_REPLY_CHARS = 4800;

export type NaturalReplyKind =
  | "record_saved_short"
  | "record_saved_full"
  | "summary"
  | "correction"
  | "summary_not_found"
  | "unrecognized"
  | "shop_summary";

export interface NaturalReplyContext {
  kind: NaturalReplyKind;
  userMessage: string;
  template: string;
  record?: FinancialRecord | null;
  addedItems?: string[];
  prefix?: string;
}

const KIND_LABELS: Record<NaturalReplyKind, string> = {
  record_saved_short: "บันทึกยอดสำเร็จ (ตอบสั้น)",
  record_saved_full: "บันทึกยอดสำเร็จ (ตอบเต็ม)",
  summary: "สรุปยอดรายวัน",
  correction: "แก้ไขข้อมูล",
  summary_not_found: "ไม่มียอดวันนั้น",
  unrecognized: "ไม่เข้าใจข้อความ",
  shop_summary: "ขอสรุปสาขา",
};

const NATURAL_REPLY_PROMPT = `คุณเป็นผู้ช่วยบัญชีร้านก๋วยเตี๋ยว "ครูตอม" ตอบใน LINE ภาษาไทยแบบเป็นกันเอง สุภาพ กระชับ เหมือนคุยกับเจ้าของร้าน

กฎสำคัญ:
1. ตัวเลขทุกตัว (บาท, กก., %) ต้องตรงกับ template 100% — ห้ามคำนวณหรือเดาใหม่
2. ครบทุกรายการสำคัญจาก template (รายรับ รายจ่าย กำไร สาขา วันที่ รายการที่เพิ่งเพิ่ม)
3. ใช้ emoji ได้ 2–5 ตัว ไม่จัดรายการแบบฟอร์มยาวๆ ถ้าเป็นโหมดสั้น
4. โหมดสรุปเต็ม: แยกรายรับ/รายจ่ายอ่านง่าย แต่ใช้ภาษาพูด ไม่ใช่ bullet แข็งๆ
5. ถ้ามีรายการ "รอยอดจำนวน" หรือ "ยังไม่ใส่ราคา" ให้บอกชัด
6. จบด้วยคำแนะนำสั้นๆ เช่น พิมพ์ "สรุป" หรือ "ช่วย" ถ้าเหมาะสม
7. ตอบข้อความเดียว ไม่มี markdown ไม่มี JSON`;

function getClient(): GoogleGenerativeAI {
  return new GoogleGenerativeAI(ENV.GEMINI_API_KEY());
}

function shopLabel(rec: FinancialRecord): string {
  return rec.shopId === "shop2" ? "สายหนองปิง" : "ตลาดญี่ปุ่น";
}

function recordSnapshot(rec: FinancialRecord): Record<string, unknown> {
  const pb = rec.porkBreakdown;
  return {
    date: rec.date,
    shop: shopLabel(rec),
    revenue: rec.revenue,
    transfer: rec.transfer,
    cash: rec.cash,
    delivery: rec.delivery,
    extraIncome: rec.extraIncome,
    expense: rec.expense,
    materials: rec.materials,
    supplies: rec.supplies,
    gas: rec.gas,
    labor: rec.labor,
    ice: rec.ice,
    extraExpenses: rec.extraExpenses,
    pork: pb
      ? {
          red: { qty: pb.redQty, price: pb.redPrice, total: pb.redTotal },
          minced: { qty: pb.mincedQty, price: pb.mincedPrice, total: pb.mincedTotal },
          fat: { qty: pb.fatQty, price: pb.fatPrice, total: pb.fatTotal },
        }
      : null,
    profit: rec.profit,
    marginPct: rec.marginPct,
    status: rec.status,
  };
}

/** "หนองปิงด้วย" / "ญี่ปุ่นด้วย" — ask for the other branch summary. */
export function looksLikeShopSummaryFollowUp(text: string): boolean {
  return /^(?:หนองปิง|สายหนองปิง|ญี่ปุ่น|ตลาดญี่ปุ่น)\s*(?:ด้วย|ด้วยนะ|ด้วยครับ|ด้วยค่ะ|ด้วยจ้า)?$/u.test(
    text.trim()
  );
}

function stripMarkdownFences(raw: string): string {
  return raw
    .replace(/^```(?:text)?\s*/i, "")
    .replace(/\s*```$/i, "")
    .trim();
}

/** Rewrite a template reply into natural Thai via Gemini; fallback to template on error. */
export async function naturalizeReply(ctx: NaturalReplyContext): Promise<string> {
  const template = ctx.template.trim();
  if (!template) return template;

  try {
    const client = getClient();
    const model = client.getGenerativeModel({ model: ENV.GEMINI_MODEL() });

    const parts: string[] = [
      NATURAL_REPLY_PROMPT,
      "",
      `ประเภท: ${KIND_LABELS[ctx.kind]}`,
      `ข้อความลูกค้า: "${ctx.userMessage}"`,
    ];
    if (ctx.prefix) parts.push(`สิ่งที่เพิ่งทำ: ${ctx.prefix}`);
    if (ctx.addedItems?.length) {
      parts.push(`รายการที่เพิ่งเพิ่มจากข้อความนี้: ${ctx.addedItems.join(", ")}`);
    }
    if (ctx.record) {
      parts.push(`ข้อมูลบันทึก (JSON — ตัวเลขอ้างอิง): ${JSON.stringify(recordSnapshot(ctx.record))}`);
    }
    parts.push("", "template จากระบบ (ตัวเลขถูกต้องแล้ว — ห้ามเปลี่ยน):", template);
    parts.push("", "เขียนข้อความตอบกลับ LINE ใหม่:");

    const result = await model.generateContent(parts.join("\n"));
    const raw = stripMarkdownFences(result.response.text().trim());

    if (!raw || raw.length < 20) {
      logger.warn("Gemini natural reply too short, using template");
      return template;
    }
    if (raw.length > MAX_REPLY_CHARS) {
      logger.warn("Gemini natural reply too long, using template");
      return template;
    }

    logger.info("Natural reply generated", { kind: ctx.kind, length: raw.length });
    return raw;
  } catch (error) {
    logger.warn(
      "Gemini natural reply failed, using template",
      error instanceof Error ? error.message : String(error)
    );
    return template;
  }
}

/** Resolve shop from follow-up like "หนองปิงด้วย". */
export function shopFromSummaryFollowUp(
  text: string
): { shopId: string; shopName: string } | null {
  if (!looksLikeShopSummaryFollowUp(text)) return null;
  return detectShopFromText(`${text.trim()}\n`);
}
