import { classifyIntent } from "@/lib/thai/conflict-rules";
import { looksLikeFinancialSaveHeuristic } from "@/lib/thai/segmenter";
import type { LineIntent } from "@/lib/thai/types";
import { getTodayDateString } from "@/lib/utils/helpers";

export type { LineIntent, PorkSummaryIntent, SummaryIntent } from "@/lib/thai/types";

/** Route a LINE text message to a single deterministic intent. */
export function routeLineMessage(
  text: string,
  today: string = getTodayDateString()
): LineIntent {
  return classifyIntent(text, today);
}

/** Backward-compatible financial heuristic (excludes query/correction phrases). */
export function looksLikeFinancialData(text: string): boolean {
  const intent = routeLineMessage(text);
  if (
    intent.kind === "QUERY_PORK" ||
    intent.kind === "QUERY_SUMMARY" ||
    intent.kind === "HELP" ||
    intent.kind === "CORRECTION"
  ) {
    return false;
  }
  if (intent.kind === "SAVE_FINANCIAL") return true;
  return looksLikeFinancialSaveHeuristic(text);
}

// Re-export shared Thai utilities for services
export { detectShopFromText, hasPorkRemovalMarker, looksLikePorkQuery } from "@/lib/thai/lexicon";
export {
  normalizeCommandText,
  normalizeCorrectionText,
  normalizeNaturalCommandLine,
  normalizeSummaryCommandText,
  normalizeThaiMessage,
} from "@/lib/thai/normalizer";
export { segmentMessage } from "@/lib/thai/segmenter";
