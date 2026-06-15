import { GoogleGenerativeAI } from "@google/generative-ai";
import { ENV } from "@/config/constants";
import {
  GEMINI_NATURAL_REPLY_TIMEOUT_MS,
  recommendedTimeoutFromSamples,
} from "@/config/gemini-timing";
import { createLogger } from "@/lib/middleware/logger";
import type { FinancialRecord } from "@/lib/types/financial.types";
import { detectShopFromText } from "@/lib/services/financial-parser.service";

const logger = createLogger("NaturalReply");
const MAX_REPLY_CHARS = 4800;
const LATENCY_WINDOW = 20;

/** Rolling latency samples from recent natural-reply calls (per server instance). */
const recentLatenciesMs: number[] = [];

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

export interface NaturalReplyBenchmarkResult {
  kind: NaturalReplyKind;
  latencyMs: number;
  replyChars: number;
  usedTemplate: boolean;
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

/** Resolve timeout: env override → adaptive recent samples → static default. */
export function getNaturalReplyTimeoutMs(): number {
  const envMs = ENV.GEMINI_NATURAL_REPLY_TIMEOUT_MS();
  if (envMs > 0) return envMs;
  if (recentLatenciesMs.length >= 3) {
    return recommendedTimeoutFromSamples(recentLatenciesMs);
  }
  return GEMINI_NATURAL_REPLY_TIMEOUT_MS;
}

export function getRecentNaturalReplyLatencies(): readonly number[] {
  return recentLatenciesMs;
}

function recordLatency(ms: number): void {
  recentLatenciesMs.push(ms);
  if (recentLatenciesMs.length > LATENCY_WINDOW) recentLatenciesMs.shift();
}

function buildPrompt(ctx: NaturalReplyContext, template: string): string {
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
  return parts.join("\n");
}

async function withTimeout<T>(promise: Promise<T>, ms: number): Promise<T> {
  return Promise.race([
    promise,
    new Promise<T>((_, reject) => {
      setTimeout(() => reject(new Error(`Gemini natural reply timeout after ${ms}ms`)), ms);
    }),
  ]);
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

async function callGeminiNaturalReply(ctx: NaturalReplyContext, template: string): Promise<string> {
  const client = getClient();
  const model = client.getGenerativeModel({ model: ENV.GEMINI_MODEL() });
  const result = await model.generateContent(buildPrompt(ctx, template));
  return stripMarkdownFences(result.response.text().trim());
}

/** Rewrite a template reply into natural Thai via Gemini; fallback to template on error/timeout. */
export async function naturalizeReply(ctx: NaturalReplyContext): Promise<string> {
  const template = ctx.template.trim();
  if (!template) return template;

  const timeoutMs = getNaturalReplyTimeoutMs();
  const start = Date.now();

  try {
    const raw = await withTimeout(callGeminiNaturalReply(ctx, template), timeoutMs);
    const latencyMs = Date.now() - start;
    recordLatency(latencyMs);

    if (!raw || raw.length < 20) {
      logger.warn("Gemini natural reply too short, using template", { latencyMs });
      return template;
    }
    if (raw.length > MAX_REPLY_CHARS) {
      logger.warn("Gemini natural reply too long, using template", { latencyMs });
      return template;
    }

    logger.info("Natural reply generated", {
      kind: ctx.kind,
      length: raw.length,
      latencyMs,
      timeoutMs,
    });
    return raw;
  } catch (error) {
    const latencyMs = Date.now() - start;
    logger.warn("Gemini natural reply failed, using template", {
      error: error instanceof Error ? error.message : String(error),
      latencyMs,
      timeoutMs,
    });
    return template;
  }
}

/** Benchmark one natural-reply call (for scripts / health deep check). */
export async function benchmarkNaturalReply(
  kind: NaturalReplyKind = "record_saved_short"
): Promise<NaturalReplyBenchmarkResult> {
  const template =
    kind === "summary" || kind === "record_saved_full"
      ? `✅ บันทึกข้อมูลรายวันแล้ว\n🏪 สาขา: ตลาดญี่ปุ่น\n💰 รายรับ:\n  📱 โอน: ฿505\n  รวม: ฿505\n🧾 ค่าใช้จ่าย:\n  🔥 แก๊ส: ฿150\n  รวม: ฿150\n📈 กำไร: +฿355`
      : `✅ บันทึกแล้ว · 🏪 สายหนองปิง\n➕ เพิ่ม: วัตถุดิบ ฿1,120\n📊 ยอดวันนั้น: ค่าใช้จ่าย ฿1,970`;

  const ctx: NaturalReplyContext = {
    kind,
    userMessage: kind === "summary" ? "สรุป" : "วัตถุดิบ 1120",
    template,
  };

  const timeoutMs = getNaturalReplyTimeoutMs();
  const start = Date.now();
  try {
    const reply = await withTimeout(callGeminiNaturalReply(ctx, template), timeoutMs);
    const latencyMs = Date.now() - start;
    recordLatency(latencyMs);
    return {
      kind,
      latencyMs,
      replyChars: reply.length,
      usedTemplate: false,
    };
  } catch (error) {
    return {
      kind,
      latencyMs: Date.now() - start,
      replyChars: template.length,
      usedTemplate: true,
    };
  }
}

/** Minimal Gemini ping for health checks. */
export async function pingGemini(): Promise<{ latencyMs: number; ok: boolean; error?: string }> {
  const start = Date.now();
  try {
    const client = getClient();
    const model = client.getGenerativeModel({ model: ENV.GEMINI_MODEL() });
    const result = await withTimeout(model.generateContent("ตอบคำเดียวว่า ok"), 8000);
    const text = result.response.text().trim();
    return { latencyMs: Date.now() - start, ok: text.length > 0 };
  } catch (error) {
    return {
      latencyMs: Date.now() - start,
      ok: false,
      error: error instanceof Error ? error.message : String(error),
    };
  }
}

/** Resolve shop from follow-up like "หนองปิงด้วย". */
export function shopFromSummaryFollowUp(
  text: string
): { shopId: string; shopName: string } | null {
  if (!looksLikeShopSummaryFollowUp(text)) return null;
  return detectShopFromText(`${text.trim()}\n`);
}
