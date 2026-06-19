import { ENV } from "@/config/constants";
import {
  ALL_BRANCHES_RE,
  detectShopFromText,
  HELP_RE,
  matchThaiMonthNumber,
  REPORT_RE,
  SHOP_SUFFIX_RE,
  SUMMARY_VERB_RE,
} from "@/lib/thai/lexicon";
import { normalizeCorrectionText, normalizeThaiMessage } from "@/lib/thai/normalizer";
import {
  looksLikeFinancialSaveHeuristic,
  messageHasMarker,
  segmentMessage,
} from "@/lib/thai/segmenter";
import type {
  LineIntent,
  PorkSummaryIntent,
  ReportSummaryIntent,
  SegmentedMessage,
  SummaryIntent,
} from "@/lib/thai/types";
import { getTodayDateString, resolveRecordDateFromText } from "@/lib/utils/helpers";

function detectShopInSummaryCommand(norm: string, compact: string) {
  const patterns = [
    new RegExp(`^${SUMMARY_VERB_RE}\\s*${SHOP_SUFFIX_RE}`, "u"),
    new RegExp(`^${SHOP_SUFFIX_RE}\\s*${SUMMARY_VERB_RE}`, "u"),
    new RegExp(`^${SUMMARY_VERB_RE}${SHOP_SUFFIX_RE}`, "u"),
    new RegExp(`^${SHOP_SUFFIX_RE}${SUMMARY_VERB_RE}`, "u"),
    new RegExp(`^ดูยอด${SHOP_SUFFIX_RE}`, "u"),
    new RegExp(`^${SHOP_SUFFIX_RE}ด้วย`, "u"),
  ];
  for (const p of patterns) {
    if (p.test(norm) || p.test(compact)) {
      return detectShopFromText(`${norm}\n`);
    }
  }
  return null;
}

function isShopFollowUp(norm: string, compact: string): boolean {
  return (
    new RegExp(`^${SHOP_SUFFIX_RE}\\s*ด้วย`, "u").test(norm) ||
    new RegExp(`^${SHOP_SUFFIX_RE}ด้วย`, "u").test(compact) ||
    new RegExp(`^สาขา${SHOP_SUFFIX_RE}`, "u").test(compact) ||
    new RegExp(`^ดู${SHOP_SUFFIX_RE}$`, "u").test(compact)
  );
}

function isDefaultSummary(norm: string, compact: string): boolean {
  const DATE_SUFFIX = "(?:วันนี้|พรุ่งนี้|เมื่อวาน)?";
  return (
    new RegExp(`^${SUMMARY_VERB_RE}\\s*${DATE_SUFFIX}$`, "u").test(norm) ||
    new RegExp(`^${SUMMARY_VERB_RE}${DATE_SUFFIX}$`, "u").test(compact)
  );
}

function buildSummaryIntent(text: string, today: string): SummaryIntent | null {
  const raw = text.trim();
  if (!raw) return null;

  const norm = normalizeThaiMessage(raw).normalized;
  const compact = norm.replace(/\s+/g, "");
  const date = resolveRecordDateFromText(raw, today) ?? resolveRecordDateFromText(norm, today) ?? today;

  if (ALL_BRANCHES_RE.test(norm) || ALL_BRANCHES_RE.test(compact)) {
    return { type: "all_branches", date };
  }

  if (isShopFollowUp(norm, compact)) {
    const shop = detectShopFromText(`${norm}\n`) ?? detectShopFromText(`${compact}\n`);
    if (shop) {
      return { type: "single_shop", date, shopId: shop.shopId, shopName: shop.shopName };
    }
  }

  const shopInCmd = detectShopInSummaryCommand(norm, compact);
  if (shopInCmd) {
    return {
      type: "single_shop",
      date,
      shopId: shopInCmd.shopId,
      shopName: shopInCmd.shopName,
    };
  }

  if (isDefaultSummary(norm, compact)) {
    const shop = detectShopFromText(raw);
    return {
      type: "default_shop",
      date,
      shopId: shop?.shopId ?? ENV.DEFAULT_SHOP_ID(),
      shopName: shop?.shopName ?? ENV.DEFAULT_SHOP_NAME(),
    };
  }

  return null;
}

/** Buddhist-era year → Gregorian (2569 → 2026); leaves CE years unchanged. */
function toGregorianYear(y: number): number {
  return y > 2400 ? y - 543 : y;
}

/** Parse a monthly/yearly PDF-report request ("รายงานเดือนนี้", "รายงานปี 2568"). */
function buildReportIntent(text: string, today: string): ReportSummaryIntent | null {
  const raw = text.trim();
  if (!raw || !REPORT_RE.test(raw)) return null;

  const norm = normalizeThaiMessage(raw).normalized;
  const shop = detectShopFromText(raw);
  const [cy, cm] = today.split("-").map(Number);

  const monthNum = matchThaiMonthNumber(norm);
  const yearMatch = norm.match(/25\d{2}|20\d{2}/);
  const explicitYear = yearMatch ? toGregorianYear(parseInt(yearMatch[0], 10)) : null;
  const hasMonthWord = /เดือน/.test(norm) || monthNum != null;
  const hasYearWord = /ปี/.test(norm);

  // Year report: "ปี" mentioned without a specific month.
  if (hasYearWord && !hasMonthWord) {
    let year = explicitYear ?? cy;
    if (/ปีที่แล้ว|ปีก่อน/.test(norm)) year = cy - 1;
    return { period: "year", year: String(year), shopId: shop?.shopId, shopName: shop?.shopName };
  }

  // Month report (default).
  let year = explicitYear ?? cy;
  let month = cm;
  if (/เดือนที่แล้ว|เดือนก่อน/.test(norm)) {
    if (cm === 1) {
      month = 12;
      year = explicitYear ?? cy - 1;
    } else {
      month = cm - 1;
    }
  } else if (monthNum != null) {
    month = monthNum;
  } else {
    const m = norm.match(/เดือน\s*(\d{1,2})/);
    if (m) {
      const n = parseInt(m[1], 10);
      if (n >= 1 && n <= 12) month = n;
    }
  }

  return {
    period: "month",
    month: `${year}-${String(month).padStart(2, "0")}`,
    shopId: shop?.shopId,
    shopName: shop?.shopName,
  };
}

function buildPorkIntent(text: string, today: string): PorkSummaryIntent | null {
  if (!messageHasMarker(segmentMessage(text, today), "pork_query")) return null;

  const shop = detectShopFromText(text) ?? {
    shopId: ENV.DEFAULT_SHOP_ID(),
    shopName: ENV.DEFAULT_SHOP_NAME(),
    matchedKeyword: "",
  };
  const date = resolveRecordDateFromText(text, today) ?? today;

  return { date, shopId: shop.shopId, shopName: shop.shopName };
}

function isCorrectionMessage(msg: SegmentedMessage): boolean {
  if (messageHasMarker(msg, "pork_removal")) return true;
  if (messageHasMarker(msg, "correction_verb")) return true;
  return false;
}

function isSummaryMessage(msg: SegmentedMessage, text: string, today: string): boolean {
  if (messageHasMarker(msg, "pork_query")) return false;
  if (messageHasMarker(msg, "pork_removal")) return false;
  if (messageHasMarker(msg, "correction_verb")) return false;
  if (buildSummaryIntent(text, today)) return true;
  if (messageHasMarker(msg, "all_branches")) return true;
  if (messageHasMarker(msg, "summary_verb")) return true;
  if (messageHasMarker(msg, "shop_follow_up")) return true;
  return false;
}

/** Classify intent using explicit conflict rules (query > correction > save). */
export function classifyIntent(text: string, today: string = getTodayDateString()): LineIntent {
  const raw = text.trim();
  if (!raw) return { kind: "UNKNOWN" };

  const msg = segmentMessage(raw, today);

  if (HELP_RE.test(raw) || messageHasMarker(msg, "help")) {
    return { kind: "HELP" };
  }

  const reportIntent = buildReportIntent(raw, today);
  if (reportIntent) {
    return { kind: "QUERY_REPORT", payload: reportIntent };
  }

  const porkIntent = buildPorkIntent(raw, today);
  if (porkIntent) {
    return { kind: "QUERY_PORK", payload: porkIntent };
  }

  if (isCorrectionMessage(msg)) {
    return { kind: "CORRECTION", normalizedText: normalizeCorrectionText(raw) || raw };
  }

  if (isSummaryMessage(msg, raw, today)) {
    const payload = buildSummaryIntent(raw, today);
    if (payload) return { kind: "QUERY_SUMMARY", payload };
  }

  if (looksLikeFinancialSaveHeuristic(raw)) {
    return { kind: "SAVE_FINANCIAL" };
  }

  return { kind: "UNKNOWN" };
}
