import {
  ALL_BRANCHES_RE,
  CORRECTION_PREFIXES,
  detectShopFromText,
  FINANCIAL_SAVE_PATTERNS,
  hasPorkRemovalMarker,
  HELP_RE,
  looksLikePorkQuery,
  PORK_REMOVE,
  SAVE_EXPENSE_PREFIXES,
  SAVE_INCOME_PREFIXES,
  SHOP_SUFFIX_RE,
  stripShopPrefix,
  SUMMARY_VERB_RE,
} from "@/lib/thai/lexicon";
import { normalizeThaiMessage } from "@/lib/thai/normalizer";
import type { LineMarker, SegmentedLine, SegmentedMessage } from "@/lib/thai/types";
import { resolveRecordDateFromText } from "@/lib/utils/helpers";

const SUMMARY_VERB = new RegExp(`^${SUMMARY_VERB_RE}`, "u");
const SHOP_FOLLOW_UP = new RegExp(`^${SHOP_SUFFIX_RE}\\s*ด้วย`, "u");
const SHOP_FOLLOW_UP_COMPACT = new RegExp(`^${SHOP_SUFFIX_RE}ด้วย`, "u");
const CORRECTION_LINE = /^(?:แก้|เปลี่ยน|ตั้ง|ปรับ|ลบ)\s*\S/i;
const CORRECTION_GLUED = /^(?:แก้|เปลี่ยน|ตั้ง|ปรับ)(?:หมู|ค่า|แดง|สับ|มัน)/i;
const PORK_PRICE_LINE = /^ราคา\s*(?:หมู|แดง|สับ|มัน)/i;
const LABOR_SHORTHAND = /^ค่า\s+[\d,]+\s*$/i;
const LABOR_LINE = /^(?:แก้|เปลี่ยน|ตั้ง|ปรับ)?\s*ค่าแรง\s*[\d,]+\s*$/i;
const PORK_QTY = /(?:หมู(?:แดง|สับ|มัน|เนื้อ)?|แดง|สับ|มัน)\s*[\d.]+\s*(?:กก|กิโล)?/i;
const SHORTHAND_PORK = /(?:^|\s)(?:แดง|สับ|มัน)\s*\d/i;
const AMOUNT_PATTERN = /[\d,]+/;
const INCOME_LINE = new RegExp(
  `^(?:${SAVE_INCOME_PREFIXES.join("|")}|\\+)\\s*`,
  "i"
);
const EXPENSE_LINE = new RegExp(`^(?:${SAVE_EXPENSE_PREFIXES.join("|")})\\s*`, "i");

function detectDateHint(text: string): SegmentedLine["dateHint"] | undefined {
  if (/พรุ่งนี้/.test(text)) return "tomorrow";
  if (/เมื่อวาน/.test(text)) return "yesterday";
  if (/วันนี้/.test(text)) return "today";
  return undefined;
}

function tagLine(text: string, compact: string): LineMarker[] {
  const markers: LineMarker[] = [];
  const stripped = stripShopPrefix(text);

  if (HELP_RE.test(text.trim())) markers.push("help");
  if (looksLikePorkQuery(text)) markers.push("pork_query");
  if (ALL_BRANCHES_RE.test(text) || ALL_BRANCHES_RE.test(compact)) markers.push("all_branches");
  if (SUMMARY_VERB.test(text) || SUMMARY_VERB.test(stripped)) markers.push("summary_verb");
  if (
    SHOP_FOLLOW_UP.test(text) ||
    SHOP_FOLLOW_UP_COMPACT.test(compact) ||
    new RegExp(`^ดู${SHOP_SUFFIX_RE}$`, "u").test(compact)
  ) {
    markers.push("shop_follow_up");
  }

  if (
    hasPorkRemovalMarker(text) ||
    hasPorkRemovalMarker(stripped) ||
    PORK_REMOVE.test(stripped)
  ) {
    markers.push("pork_removal");
  }

  if (
    CORRECTION_LINE.test(stripped) ||
    CORRECTION_GLUED.test(stripped) ||
    PORK_PRICE_LINE.test(stripped) ||
    LABOR_SHORTHAND.test(stripped) ||
    LABOR_LINE.test(stripped) ||
    CORRECTION_PREFIXES.some((p) => stripped.startsWith(p))
  ) {
    markers.push("correction_verb");
  }

  if (INCOME_LINE.test(stripped)) markers.push("income_prefix");
  if (EXPENSE_LINE.test(stripped)) markers.push("expense_prefix");
  if (PORK_QTY.test(text) || SHORTHAND_PORK.test(text)) markers.push("pork_qty");
  if (AMOUNT_PATTERN.test(stripped) && /[\d]/.test(stripped)) markers.push("amount");

  return markers;
}

export function segmentMessage(text: string, today?: string): SegmentedMessage {
  const normalized = normalizeThaiMessage(text);
  const messageShop = detectShopFromText(normalized.normalized);
  const date =
    resolveRecordDateFromText(normalized.raw, today) ??
    resolveRecordDateFromText(normalized.normalized, today);

  const lines: SegmentedLine[] = normalized.lines.map((line) => {
    const compact = line.replace(/\s+/g, "");
    const lineShop = detectShopFromText(line) ?? messageShop ?? undefined;
    return {
      text: line,
      strippedText: stripShopPrefix(line),
      shop: lineShop ?? undefined,
      dateHint: detectDateHint(line),
      markers: tagLine(line, compact),
    };
  });

  return {
    raw: text,
    normalized,
    lines,
    shop: messageShop ?? undefined,
    date: date ?? undefined,
  };
}

export function messageHasMarker(msg: SegmentedMessage, marker: LineMarker): boolean {
  return msg.lines.some((l) => l.markers.includes(marker));
}

export function looksLikeFinancialSaveHeuristic(text: string): boolean {
  if (looksLikePorkQuery(text)) return false;
  if (hasPorkRemovalMarker(text)) return false;
  return FINANCIAL_SAVE_PATTERNS.some((p) => p.test(text));
}
