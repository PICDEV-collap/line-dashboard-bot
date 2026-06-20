import Groq from "groq-sdk";
import { ENV } from "@/config/constants";
import { getSupabaseClient } from "@/lib/services/supabase.service";
import { createLogger } from "@/lib/middleware/logger";
import { withTimeout } from "@/lib/utils/ai-timeout";
import { getCurrentTimestamp, safeJsonParse } from "@/lib/utils/helpers";
import { normalizeThaiMessage } from "@/lib/thai/normalizer";

const logger = createLogger("CommandLearning");

const PENDING_TTL_MS = 10 * 60 * 1000; // a confirmation prompt is valid for 10 min

// ──────────────────────────────────────────────────────────────
// Types
// ──────────────────────────────────────────────────────────────

export type InterpretType = "command" | "financial" | "unknown";

export interface InterpretResult {
  type: InterpretType;
  canonical: string; // a clean command string the deterministic router understands
  confidence: number; // 0..1
  reason?: string;
}

export type LearnDecision =
  | { action: "financial" }
  | { action: "auto"; canonical: string }
  | { action: "confirm"; canonical: string }
  | { action: "unknown" };

export interface CommandAlias {
  normalized: string;
  canonicalText: string;
  intent?: string;
  confidence?: number;
  source: "ai" | "confirmed";
}

export interface PendingCommand {
  userId: string;
  rawText: string;
  normalized: string;
  canonicalText: string;
  intent?: string;
  confidence?: number;
  createdAt: string;
}

// ──────────────────────────────────────────────────────────────
// Pure helpers (no I/O — unit-testable)
// ──────────────────────────────────────────────────────────────

export function isLearningEnabled(): boolean {
  return ENV.AI_COMMAND_LEARNING_ENABLED();
}

/** Normalized lookup key for the learned-alias store. */
export function learningKey(text: string): string {
  return normalizeThaiMessage(text).normalized.replace(/\s+/g, " ").trim().toLowerCase();
}

const AFFIRMATIVE_RE =
  /^(?:ใช่|ใช่ครับ|ใช่ค่ะ|ใช่เลย|ช่าย|ถูก|ถูกต้อง|โอเค|โอเคครับ|ตกลง|เอา|เอาเลย|ยืนยัน|ครับ|ค่ะ|คะ|ok|okay|yes|y|👍|✅)$/i;

const NEGATIVE_RE =
  /^(?:ไม่|ไม่ใช่|ไม่ช่าย|มะใช่|ผิด|เปล่า|ยกเลิก|no|n|❌)$/i;

export function isAffirmative(text: string): boolean {
  return AFFIRMATIVE_RE.test(text.trim());
}

export function isNegative(text: string): boolean {
  return NEGATIVE_RE.test(text.trim());
}

/** Decide what to do with an AI interpretation given the confidence thresholds. */
export function decideCommandAction(
  ai: InterpretResult,
  highThreshold: number,
  minThreshold: number
): LearnDecision {
  if (ai.type === "financial") return { action: "financial" };
  if (ai.type === "command" && ai.canonical.trim()) {
    if (ai.confidence >= highThreshold) return { action: "auto", canonical: ai.canonical.trim() };
    if (ai.confidence >= minThreshold) return { action: "confirm", canonical: ai.canonical.trim() };
  }
  return { action: "unknown" };
}

/** Parse the AI's JSON response into a validated InterpretResult (pure). */
export function parseInterpretResponse(raw: string): InterpretResult {
  const cleaned = raw
    .replace(/^```json\s*/i, "")
    .replace(/^```\s*/i, "")
    .replace(/\s*```$/i, "")
    .trim();
  const parsed = safeJsonParse<Partial<InterpretResult>>(cleaned);
  if (!parsed || typeof parsed !== "object") {
    return { type: "unknown", canonical: "", confidence: 0 };
  }
  const type: InterpretType =
    parsed.type === "command" || parsed.type === "financial" ? parsed.type : "unknown";
  const canonical = typeof parsed.canonical === "string" ? parsed.canonical.trim() : "";
  let confidence = typeof parsed.confidence === "number" ? parsed.confidence : 0;
  if (!Number.isFinite(confidence)) confidence = 0;
  confidence = Math.max(0, Math.min(1, confidence));
  return { type, canonical, confidence, reason: parsed.reason };
}

export function isPendingFresh(createdAt: string, now = Date.now()): boolean {
  const t = new Date(createdAt).getTime();
  return Number.isFinite(t) && now - t < PENDING_TTL_MS;
}

// ──────────────────────────────────────────────────────────────
// AI interpretation
// ──────────────────────────────────────────────────────────────

const INTERPRET_PROMPT = `คุณเป็นตัวช่วยตีความ "คำสั่งที่พิมพ์ผิด/สะกดเพี้ยน/คำติดกัน" ของบอทบัญชีร้านก๋วยเตี๋ยว/หมู "ครูตอม" (ผู้ใช้พิมพ์ภาษาไทย มักพิมพ์เร็วและผิด)

หน้าที่: แปลงข้อความเป็น "คำสั่งมาตรฐาน (canonical)" โดย**ประกอบ**จาก 3 ส่วน: [คำกริยา] + [สาขา ถ้ามี] + [ช่วงเวลา ถ้ามี]

คำกริยา:
- "สรุป" = ดูสรุปยอด
- "ค่าหมูทั้งหมด" = ดูยอดค่าหมู
- "รายงาน" = ออกรายงาน PDF
- "ช่วย" = ดูวิธีใช้
- คำสั่งแก้ไขข้อมูล เช่น "แก้ ...", "ลบ ...", "เอาหมูแดงออก 1" (คงข้อความเดิมไว้)

สาขา (เขียน**ติดหลังคำกริยาทันที** ถ้าผู้ใช้ระบุ):
- "ญี่ปุ่น" = สาขาตลาดญี่ปุ่น — รวมคำสะกดเพี้ยน: ยี่ปุ่น, อะปุน, ญีปุ่น, ยีปุ่น, ตลาดญี่ปุ่น
- "หนองปิง" = สาขาสายหนองปิง — รวมคำสะกดเพี้ยน: ปิง, ปลิง, หนองปลิง, สายหนองปิง
- "ทุกสาขา" = ทั้งสองสาขา

ช่วงเวลา (เขียนต่อท้ายสุด ถ้าระบุ): "วันนี้" / "พรุ่งนี้" / "เมื่อวาน"
สำหรับ "รายงาน" ใช้ "เดือนนี้" / "เดือนที่แล้ว" / "ปีนี้" ได้ด้วย

ตัวอย่าง (สำคัญ — ทำตามรูปแบบนี้เป๊ะ):
- "สรุ ปิง" → "สรุปหนองปิง"
- "สรุปพรุ่งนี้อะปุน" → "สรุปญี่ปุ่นพรุ่งนี้"
- "ดูยอดเมื่อวาน" → "สรุปเมื่อวาน"
- "ค่าหมูปิง" → "ค่าหมูหนองปิง"
- "รายงา" → "รายงาน"
- "รายงานเดือนที่แล้วยี่ปุ่น" → "รายงานญี่ปุ่นเดือนที่แล้ว"
- "ช่วยหน่อย" → "ช่วย"

"financial" = การบันทึกตัวเลข เช่น "โอน 5000 สด 3000", "หมูแดง 4 กก 130", "แม็คโคร 2500", "ได้คนละครึ่ง 450"

ตอบเป็น JSON เท่านั้น (ห้ามมีข้อความอื่น):
{"type":"command"|"financial"|"unknown","canonical":"<คำสั่งมาตรฐาน ถ้า type=command, ไม่งั้นเว้นว่าง>","confidence":0.0-1.0,"reason":"<เหตุผลสั้นๆ>"}

กติกา:
- type=command → canonical ประกอบตามรูปแบบด้านบน (สาขาติดหลังคำกริยา, ช่วงเวลาท้ายสุด) ห้ามใส่คำเกิน
- ถ้าผู้ใช้ระบุสาขาหรือช่วงเวลา ต้องคงไว้ในคำสั่ง อย่าตัดทิ้ง
- การบันทึกตัวเลข → type=financial, canonical=""
- เดาไม่ได้จริงๆ → type=unknown, canonical="", confidence ต่ำ
- confidence = ความมั่นใจว่าตีความถูก (สูง = มั่นใจมาก)`;

function getClient(): Groq {
  return new Groq({ apiKey: ENV.GROQ_API_KEY() });
}

/** Ask Groq to interpret a messy message into a canonical command or 'financial'. */
export async function interpretCommand(text: string): Promise<InterpretResult> {
  try {
    const client = getClient();
    const result = await withTimeout(
      client.chat.completions.create({
        model: ENV.GROQ_MODEL(),
        messages: [
          { role: "system", content: INTERPRET_PROMPT },
          { role: "user", content: text },
        ],
        temperature: 0.1,
        max_tokens: 256,
      }),
      ENV.AI_PARSE_TIMEOUT_MS(),
      "Command interpret"
    );
    const raw = (result.choices?.[0]?.message?.content ?? "").trim();
    const interpreted = parseInterpretResponse(raw);
    logger.info("Command interpreted", {
      type: interpreted.type,
      canonical: interpreted.canonical,
      confidence: interpreted.confidence,
    });
    return interpreted;
  } catch (error) {
    logger.warn("Command interpret failed", error instanceof Error ? error.message : String(error));
    return { type: "unknown", canonical: "", confidence: 0 };
  }
}

// ──────────────────────────────────────────────────────────────
// Learned-alias store (Supabase)
// ──────────────────────────────────────────────────────────────

/** Look up a previously learned correction; bumps hit count when found. */
export async function lookupAlias(normalized: string): Promise<CommandAlias | null> {
  const db = getSupabaseClient();
  const { data, error } = await db
    .from("command_aliases")
    .select("*")
    .eq("normalized", normalized)
    .maybeSingle();
  if (error) {
    logger.warn("Alias lookup failed", error.message);
    return null;
  }
  if (!data) return null;

  // Fire-and-forget usage bump (don't block the reply on the counter write).
  void db
    .from("command_aliases")
    .update({ hits: Number(data.hits ?? 1) + 1, last_used_at: getCurrentTimestamp() })
    .eq("normalized", normalized)
    .then(
      () => {},
      (e) => logger.warn("Alias hit bump failed", String(e))
    );

  return {
    normalized: String(data.normalized),
    canonicalText: String(data.canonical_text),
    intent: data.intent ? String(data.intent) : undefined,
    confidence: data.confidence != null ? Number(data.confidence) : undefined,
    source: (data.source as CommandAlias["source"]) ?? "ai",
  };
}

/** Persist a learned correction (upsert; 'confirmed' is stickier than 'ai'). */
export async function learnAlias(alias: CommandAlias): Promise<void> {
  const db = getSupabaseClient();
  const now = getCurrentTimestamp();
  const { data: existing } = await db
    .from("command_aliases")
    .select("hits")
    .eq("normalized", alias.normalized)
    .maybeSingle();

  const row = {
    normalized: alias.normalized,
    canonical_text: alias.canonicalText,
    intent: alias.intent ?? null,
    confidence: alias.confidence ?? null,
    source: alias.source,
    hits: existing ? Number(existing.hits ?? 1) + 1 : 1,
    updated_at: now,
    last_used_at: now,
  };

  // created_at is omitted on purpose: DB default sets it on insert, and a
  // conflict-update leaves the existing value untouched.
  const { error } = await db
    .from("command_aliases")
    .upsert(row, { onConflict: "normalized" });
  if (error) {
    logger.warn("learnAlias failed", error.message);
    return;
  }
  logger.info("Learned command alias", {
    normalized: alias.normalized,
    canonical: alias.canonicalText,
    source: alias.source,
  });
}

// ──────────────────────────────────────────────────────────────
// Pending confirmation store (Supabase) — one per user
// ──────────────────────────────────────────────────────────────

export async function getPendingCommand(userId: string): Promise<PendingCommand | null> {
  const db = getSupabaseClient();
  const { data, error } = await db
    .from("pending_commands")
    .select("*")
    .eq("user_id", userId)
    .maybeSingle();
  if (error) {
    logger.warn("getPendingCommand failed", error.message);
    return null;
  }
  if (!data) return null;
  return {
    userId: String(data.user_id),
    rawText: String(data.raw_text),
    normalized: String(data.normalized),
    canonicalText: String(data.canonical_text),
    intent: data.intent ? String(data.intent) : undefined,
    confidence: data.confidence != null ? Number(data.confidence) : undefined,
    createdAt: String(data.created_at ?? getCurrentTimestamp()),
  };
}

export async function setPendingCommand(
  pending: Omit<PendingCommand, "createdAt">
): Promise<void> {
  const db = getSupabaseClient();
  const { error } = await db.from("pending_commands").upsert(
    {
      user_id: pending.userId,
      raw_text: pending.rawText,
      normalized: pending.normalized,
      canonical_text: pending.canonicalText,
      intent: pending.intent ?? null,
      confidence: pending.confidence ?? null,
      created_at: getCurrentTimestamp(),
    },
    { onConflict: "user_id" }
  );
  if (error) logger.warn("setPendingCommand failed", error.message);
}

export async function clearPendingCommand(userId: string): Promise<void> {
  const db = getSupabaseClient();
  const { error } = await db.from("pending_commands").delete().eq("user_id", userId);
  if (error) logger.warn("clearPendingCommand failed", error.message);
}
