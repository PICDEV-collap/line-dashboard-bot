import { getSupabaseClient } from "@/lib/services/supabase.service";
import { createLogger } from "@/lib/middleware/logger";
import { getTodayDateString } from "@/lib/utils/helpers";
import type { MessageRow, OcrResultRow, StatsRow, DashboardStats } from "@/lib/types/db.types";
import type { LogEntry } from "@/lib/types/common.types";

const logger = createLogger("MessagesService");

// ──────────────────────────────────────────────────────────────
// Messages
// ──────────────────────────────────────────────────────────────

export async function appendMessage(row: MessageRow): Promise<void> {
  logger.info("Inserting message", { messageId: row.id });
  const db = getSupabaseClient();
  const { error } = await db.from("messages").insert({
    id: row.id,
    timestamp: row.timestamp,
    user_id: row.userId,
    display_name: row.displayName,
    type: row.type,
    content: row.content,
    image_url: row.imageUrl || null,
    file_url: row.fileUrl || null,
    location_lat: row.locationLat ? parseFloat(row.locationLat) : null,
    location_lng: row.locationLng ? parseFloat(row.locationLng) : null,
    location_address: row.locationAddress || null,
    reply_token: row.replyToken || null,
    status: row.status,
    error_message: row.errorMessage || null,
  });
  if (error) throw new Error(`DB insert error (messages): ${error.message}`);
}

export async function getMessages(
  limit = 100,
  offset = 0
): Promise<MessageRow[]> {
  const db = getSupabaseClient();
  const { data, error } = await db
    .from("messages")
    .select("*")
    .order("timestamp", { ascending: false })
    .range(offset, offset + limit - 1);
  if (error) throw new Error(`DB query error (messages): ${error.message}`);
  return (data ?? []).map(rowToMessage);
}

function rowToMessage(row: Record<string, unknown>): MessageRow {
  return {
    id: String(row.id ?? ""),
    timestamp: String(row.timestamp ?? ""),
    userId: String(row.user_id ?? ""),
    displayName: String(row.display_name ?? ""),
    type: String(row.type ?? ""),
    content: String(row.content ?? ""),
    imageUrl: String(row.image_url ?? ""),
    fileUrl: String(row.file_url ?? ""),
    locationLat: String(row.location_lat ?? ""),
    locationLng: String(row.location_lng ?? ""),
    locationAddress: String(row.location_address ?? ""),
    replyToken: String(row.reply_token ?? ""),
    status: String(row.status ?? ""),
    errorMessage: String(row.error_message ?? ""),
  };
}

// ──────────────────────────────────────────────────────────────
// OCR Results
// ──────────────────────────────────────────────────────────────

export async function appendOcrResult(row: OcrResultRow): Promise<void> {
  logger.info("Inserting OCR result", { ocrId: row.id });
  const db = getSupabaseClient();
  const { error } = await db.from("ocr_results").insert({
    id: row.id,
    message_id: row.messageId,
    timestamp: row.timestamp,
    image_url: row.imageUrl,
    raw_text: row.rawText,
    structured_json: row.structuredJson,
    confidence: parseFloat(row.confidence),
    processing_time_ms: parseInt(row.processingTimeMs),
  });
  if (error) throw new Error(`DB insert error (ocr_results): ${error.message}`);
}

// ──────────────────────────────────────────────────────────────
// Logs — forwarded to Vercel's log stream (no DB write needed)
// ──────────────────────────────────────────────────────────────

export async function appendLogs(_entries: LogEntry[]): Promise<void> {
  // Vercel captures all console output automatically
}

// ──────────────────────────────────────────────────────────────
// Daily Stats
// ──────────────────────────────────────────────────────────────

export async function updateDailyStats(delta: Partial<StatsRow>): Promise<void> {
  const today = getTodayDateString();
  const db = getSupabaseClient();

  const { data: existing } = await db
    .from("daily_stats")
    .select("*")
    .eq("date", today)
    .maybeSingle();

  if (!existing) {
    await db.from("daily_stats").insert({
      date: today,
      total_messages: delta.totalMessages ?? 1,
      text_count: delta.textCount ?? 0,
      image_count: delta.imageCount ?? 0,
      pdf_count: delta.pdfCount ?? 0,
      location_count: delta.locationCount ?? 0,
      ocr_count: delta.ocrCount ?? 0,
      error_count: delta.errorCount ?? 0,
    });
  } else {
    await db.from("daily_stats").update({
      total_messages: (existing.total_messages ?? 0) + (delta.totalMessages ?? 1),
      text_count: (existing.text_count ?? 0) + (delta.textCount ?? 0),
      image_count: (existing.image_count ?? 0) + (delta.imageCount ?? 0),
      pdf_count: (existing.pdf_count ?? 0) + (delta.pdfCount ?? 0),
      location_count: (existing.location_count ?? 0) + (delta.locationCount ?? 0),
      ocr_count: (existing.ocr_count ?? 0) + (delta.ocrCount ?? 0),
      error_count: (existing.error_count ?? 0) + (delta.errorCount ?? 0),
      updated_at: new Date().toISOString(),
    }).eq("date", today);
  }
}

// ──────────────────────────────────────────────────────────────
// Dashboard Stats
// ──────────────────────────────────────────────────────────────

export async function getDashboardStats(): Promise<DashboardStats> {
  const today = getTodayDateString();
  const db = getSupabaseClient();

  const [totalRes, todayRes, statRes, errorRes, recentRes] = await Promise.all([
    db.from("messages").select("*", { count: "exact", head: true }),
    db.from("messages").select("*", { count: "exact", head: true })
      .gte("timestamp", `${today}T00:00:00+07:00`),
    db.from("daily_stats").select("*").eq("date", today).maybeSingle(),
    db.from("messages").select("*", { count: "exact", head: true })
      .eq("status", "failed"),
    db.from("messages").select("*").order("timestamp", { ascending: false }).limit(20),
  ]);

  const total = totalRes.count ?? 0;
  const errCnt = errorRes.count ?? 0;
  const stat = statRes.data;

  return {
    totalMessages: total,
    todayMessages: todayRes.count ?? 0,
    textCount: stat?.text_count ?? 0,
    imageCount: stat?.image_count ?? 0,
    pdfCount: stat?.pdf_count ?? 0,
    locationCount: stat?.location_count ?? 0,
    ocrCount: stat?.ocr_count ?? 0,
    errorCount: errCnt,
    successRate:
      total > 0 ? Math.round(((total - errCnt) / total) * 100) : 100,
    recentMessages: (recentRes.data ?? []).map(rowToMessage),
  };
}
