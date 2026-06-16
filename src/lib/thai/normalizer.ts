import {
  SHOP_KW,
  SHOP_SUFFIX_RE,
  SUMMARY_VERB_RE,
} from "@/lib/thai/lexicon";
import type { NormalizedMessage } from "@/lib/thai/types";

const FILLER_PARTICLES = /(?:ครับ|ค่ะ|คะ|นะ|จ้า|อ่ะ|อะ)$/u;

/** Per-line: split glued correction verbs — "ปรับหมูสับราคา 120" */
export function normalizeNaturalCommandLine(line: string): string {
  return line
    .replace(/^(ปรับ|แก้|เปลี่ยน|ตั้ง)(หมู|ค่า|แดง|สับ|มัน)/i, "$1 $2")
    .replace(/(หมู(?:แดง|สับ|มัน|เนื้อ)?)(ราคา)/gi, "$1 $2")
    .replace(/ราคา(\d)/g, "ราคา $1")
    .replace(/\s+/g, " ")
    .trim();
}

/** Per-line: split glued shop+summary — "หนองปิงสรุปพรุ่งนี้" → "หนองปิง สรุปพรุ่งนี้" */
export function normalizeSummaryCommandText(text: string): string {
  return text
    .trim()
    .replace(new RegExp(`^(${SHOP_SUFFIX_RE})(ด้วย)`, "u"), "$1 $2")
    .replace(new RegExp(`^(${SUMMARY_VERB_RE})(${SHOP_SUFFIX_RE})`, "u"), "$1 $2")
    .replace(new RegExp(`^(${SHOP_SUFFIX_RE})(${SUMMARY_VERB_RE})`, "u"), "$1 $2")
    .replace(new RegExp(`^(${SUMMARY_VERB_RE})(ทุกสาขา|ทั้งสองสาขา|ทั้งหมด)`, "u"), "$1 $2")
    .replace(new RegExp(`^(${SHOP_SUFFIX_RE})(${SUMMARY_VERB_RE})(พรุ่งนี้|เมื่อวาน|วันนี้)`, "u"), "$1 $2 $3")
    .replace(/\s+/g, " ")
    .trim();
}

function stripTrailingFiller(text: string): string {
  let t = text.trim();
  while (FILLER_PARTICLES.test(t)) {
    t = t.replace(FILLER_PARTICLES, "").trim();
  }
  return t;
}

function normalizeLine(line: string): string {
  let l = stripTrailingFiller(line.trim());
  l = normalizeSummaryCommandText(l);
  l = normalizeNaturalCommandLine(l);
  return l.replace(/\s+/g, " ").trim();
}

/** Full message normalization pipeline. */
export function normalizeThaiMessage(text: string): NormalizedMessage {
  const raw = text;
  const lines = raw
    .split(/\n/)
    .map((l) => normalizeLine(l.trim()))
    .filter(Boolean);

  const normalized = lines.join("\n").replace(/\s+/g, " ").trim();
  const compact = normalized.replace(/\s+/g, "");

  return { raw, normalized, compact, lines };
}

/** Strip branch names from each line (correction path). */
export function normalizeCommandText(text: string): string {
  return text
    .split(/\n/)
    .map((l) => l.replace(SHOP_KW, "").trim())
    .filter(Boolean)
    .join("\n");
}

/** Correction-normalized lines (shop stripped + natural command split). */
export function normalizeCorrectionText(text: string): string {
  return normalizeThaiMessage(text)
    .lines.map((l) => {
      const stripped = l.replace(new RegExp(SHOP_SUFFIX_RE, "gu"), "").trim();
      return normalizeNaturalCommandLine(stripped);
    })
    .filter(Boolean)
    .join("\n");
}
