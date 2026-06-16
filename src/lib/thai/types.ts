export type SummaryIntent =
  | { type: "all_branches"; date: string }
  | { type: "single_shop"; date: string; shopId: string; shopName: string }
  | { type: "default_shop"; date: string; shopId: string; shopName: string };

export interface PorkSummaryIntent {
  date: string;
  shopId: string;
  shopName: string;
}

export type LineMarker =
  | "pork_query"
  | "summary_verb"
  | "correction_verb"
  | "pork_removal"
  | "income_prefix"
  | "expense_prefix"
  | "pork_qty"
  | "amount"
  | "all_branches"
  | "help"
  | "shop_follow_up";

export interface ShopMatch {
  shopId: string;
  shopName: string;
  matchedKeyword: string;
}

export interface NormalizedMessage {
  raw: string;
  normalized: string;
  compact: string;
  lines: string[];
}

export interface SegmentedLine {
  text: string;
  strippedText: string;
  shop?: ShopMatch;
  dateHint?: "today" | "tomorrow" | "yesterday";
  markers: LineMarker[];
}

export interface SegmentedMessage {
  raw: string;
  normalized: NormalizedMessage;
  lines: SegmentedLine[];
  shop?: ShopMatch;
  date?: string;
}

export type LineIntent =
  | { kind: "HELP" }
  | { kind: "QUERY_SUMMARY"; payload: SummaryIntent }
  | { kind: "QUERY_PORK"; payload: PorkSummaryIntent }
  | { kind: "CORRECTION"; normalizedText: string }
  | { kind: "SAVE_FINANCIAL" }
  | { kind: "UNKNOWN" };
