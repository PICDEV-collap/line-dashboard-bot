import { randomUUID } from "crypto";
import { BANGKOK_TZ } from "@/config/constants";

export function generateId(): string {
  return randomUUID();
}

// UTC ISO instant — correct for created_at/updated_at timestamps.
export function getCurrentTimestamp(): string {
  return new Date().toISOString();
}

// Calendar date (YYYY-MM-DD) in the shop's timezone. Using the local day —
// not UTC — keeps records entered after midnight ICT on the right date.
export function getTodayDateString(): string {
  return new Date().toLocaleDateString("en-CA", { timeZone: BANGKOK_TZ });
}

/** Shift a YYYY-MM-DD calendar date by N days (Bangkok shop dates). */
export function shiftDateString(dateStr: string, days: number): string {
  const [y, m, d] = dateStr.split("-").map(Number);
  const dt = new Date(Date.UTC(y, m - 1, d + days));
  return dt.toISOString().slice(0, 10);
}

/** Detect target record date from Thai keywords in message text. */
export function resolveRecordDateFromText(
  text: string,
  today: string = getTodayDateString()
): string | undefined {
  if (/พรุ่งนี้/.test(text)) return shiftDateString(today, 1);
  if (/เมื่อวาน/.test(text)) return shiftDateString(today, -1);
  if (/วันนี้/.test(text)) return today;
  return undefined;
}

/** Human label for a record date relative to today. */
export function describeRecordDate(
  date: string,
  today: string = getTodayDateString()
): string {
  if (date === today) return "วันนี้";
  if (date === shiftDateString(today, 1)) return "พรุ่งนี้";
  if (date === shiftDateString(today, -1)) return "เมื่อวาน";
  return date;
}

export function encodeBase64(str: string): string {
  return Buffer.from(str).toString("base64");
}

export function decodeBase64(str: string): string {
  return Buffer.from(str, "base64").toString("utf-8");
}

export function decodeBase64ToBuffer(str: string): Buffer {
  return Buffer.from(str, "base64");
}

export function truncate(str: string, maxLength: number): string {
  if (str.length <= maxLength) return str;
  return str.slice(0, maxLength - 3) + "...";
}

export function safeJsonStringify(obj: unknown): string {
  try {
    return JSON.stringify(obj, null, 2);
  } catch {
    return String(obj);
  }
}

export function safeJsonParse<T = unknown>(str: string): T | null {
  try {
    return JSON.parse(str) as T;
  } catch {
    return null;
  }
}

export function sleep(ms: number): Promise<void> {
  return new Promise((resolve) => setTimeout(resolve, ms));
}

export function formatFileSize(bytes: number): string {
  if (bytes < 1024) return `${bytes} B`;
  if (bytes < 1024 * 1024) return `${(bytes / 1024).toFixed(1)} KB`;
  return `${(bytes / (1024 * 1024)).toFixed(1)} MB`;
}

// Extract file extension from filename
export function getFileExtension(filename: string): string {
  return filename.split(".").pop()?.toLowerCase() ?? "";
}

// Sanitize filename for object storage (strip path-unsafe characters)
export function sanitizeFilename(name: string): string {
  return name.replace(/[<>:"/\\|?*]/g, "_").trim();
}

export function chunkArray<T>(arr: T[], size: number): T[][] {
  const chunks: T[][] = [];
  for (let i = 0; i < arr.length; i += size) {
    chunks.push(arr.slice(i, i + size));
  }
  return chunks;
}

export function omit<T extends object, K extends keyof T>(
  obj: T,
  keys: K[]
): Omit<T, K> {
  const result = { ...obj };
  keys.forEach((key) => delete result[key]);
  return result;
}
