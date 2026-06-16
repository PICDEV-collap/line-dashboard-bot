import { ENV } from "@/config/constants";
import type { ShopMatch } from "@/lib/thai/types";

export interface ShopDefinition {
  shopId: string;
  shopName: string;
  canonical: string;
  patterns: string[];
}

function envShop2Id(): string {
  try {
    return ENV.SHOP2_ID();
  } catch {
    return "shop2";
  }
}

function envShop2Name(): string {
  try {
    return ENV.SHOP2_NAME();
  } catch {
    return "ก๋วยเตี๋ยวไทยครูตอมสายหนองปิง";
  }
}

function envDefaultShopId(): string {
  try {
    return ENV.DEFAULT_SHOP_ID();
  } catch {
    return "shop1";
  }
}

function envDefaultShopName(): string {
  try {
    return ENV.DEFAULT_SHOP_NAME();
  } catch {
    return "ก๋วยเตี๋ยวไทยครูตอมตลาดญี่ปุ่น";
  }
}

/** Single source of truth for branch aliases (longest match first per shop). */
export function getShopDefinitions(): ShopDefinition[] {
  return [
    {
      shopId: envShop2Id(),
      shopName: envShop2Name(),
      canonical: "สายหนองปิง",
      patterns: [
        "สายหนองปิง",
        "หนองปลั่ง",
        "หนองปลิง",
        "หนองปลัง",
        "หนองปิง",
        "ปลั่ง",
        "ปลิง",
        "ปิง",
      ],
    },
    {
      shopId: envDefaultShopId(),
      shopName: envDefaultShopName(),
      canonical: "ตลาดญี่ปุ่น",
      patterns: ["ตลาดญี่ปุ่น", "ยี่ปุ่น", "ญี่ปุ่น"],
    },
  ];
}

/** Regex alternation for shop names (longest first). */
export function buildShopPattern(): string {
  const all = getShopDefinitions()
    .flatMap((s) => s.patterns)
    .sort((a, b) => b.length - a.length);
  return all.map((p) => p.replace(/[.*+?^${}()|[\]\\]/g, "\\$&")).join("|");
}

let cachedShopPattern: string | null = null;

/** Regex alternation for shop names (longest first). */
export function getShopSuffixPattern(): string {
  if (!cachedShopPattern) {
    cachedShopPattern = buildShopPattern();
  }
  return cachedShopPattern;
}

/** @deprecated use getShopSuffixPattern() — kept for string template compat */
export const SHOP_SUFFIX_RE = "(?:สายหนองปิง|หนองปล(?:ิง|ลั่ง|ลัง)|หนองปิง|ตลาดญี่ปุ่น|ปล(?:ิง|ลั่ง|ั่ง)|ปิง|ญี่ปุ่น|ยี่ปุ่น)";

export const SHOP_KW = new RegExp(getShopSuffixPattern(), "gu");

export const SUMMARY_VERB_RE = "(?:สรุป|ดูยอด|ยอดวัน|ยอด|เช็คยอด|ดูบัญชี|บัญชี)";
export const DATE_SUFFIX_RE = "(?:วันนี้|พรุ่งนี้|เมื่อวาน)?";

export const QUERY_VERBS = ["สรุป", "ดูยอด", "ยอดวัน", "ยอด", "เช็คยอด", "ดูบัญชี", "บัญชี"];

export const PORK_QUERY_RE =
  /รวม(?:ค่า)?หมู(?:ทั้งหมด)?|ค่าหมู(?:ทั้งหมด)?|หมูทั้งหมด|คิดหมู(?:ด้วย)?|รวมหมู(?:ด้วย)?/i;

export const PORK_QUERY_MARKERS = [
  "รวมค่าหมู",
  "รวมหมู",
  "ค่าหมูทั้งหมด",
  "ค่าหมู",
  "หมูทั้งหมด",
  "คิดหมู",
  "รวมหมู",
];

export const CORRECTION_PREFIXES = ["แก้", "ปรับ", "เปลี่ยน", "ตั้ง", "ลบ"];

export const CORRECTION_PREFIX = "(?:แก้|เปลี่ยน|ตั้ง|ปรับ)";

export const SAVE_INCOME_PREFIXES = ["ได้", "รับ", "รายรับ", "รายได้"];

export const SAVE_EXPENSE_PREFIXES = ["จ่าย", "ซื้อ"];

export const PORK_KINDS = {
  red: ["หมูแดง", "หมูเนื้อ", "แดง"],
  minced: ["หมูสับ", "สับ"],
  fat: ["มันหมู", "หมูมัน", "มัน"],
} as const;

export const PORK_KIND_PATTERN = "(?:หมูแดง|หมูเนื้อ|แดง|หมูสับ|สับ|มันหมู|หมูมัน|มัน)";

/** "เอาหมูแดง ออก 1 กก", "หมูสับ ออก 2" */
export const PORK_REMOVE = new RegExp(
  `(?:เอา\\s*)?(${PORK_KIND_PATTERN})\\s*ออก\\s*([\\d.,]+)\\s*(?:กก\\.?|กิโล)?`,
  "i"
);

export const ALL_BRANCHES_RE =
  /^(?:สรุป|ดูยอด|ยอด|เช็คยอด|ดูบัญชี)(?:วัน)?(?:ทุกสาขา|ทั้งสองสาขา|ทั้งหมด|รวม(?:ทุก)?สาขา)|(?:ทุกสาขา|ทั้งสองสาขา|ทั้งหมด)(?:ด้วย|นะ|ครับ|ค่ะ|จ้า)?$/u;

export const HELP_RE = /^(?:ช่วย|วิธีแก้|help|คำสั่ง)(?:\s|$)/i;

export const FILLER_SUFFIX_RE = /(?:ครับ|ค่ะ|คะ|นะ|จ้า|อ่ะ|อะ|ด้วย)?\s*$/u;

export const SHOP_LINE_ONLY_RE = new RegExp(
  `^(?:${SHOP_SUFFIX_RE}|พรุ่งนี้|เมื่อวาน|วันนี้)$`,
  "u"
);

export const STORE_NAMES =
  /(?:แม็คโคร|แม็กโคร|แมคโคร|โลตัส|บิ๊กซี|ท็อปส์|เทสโก้)/i;

/** Financial save heuristics (used when no query/correction markers). */
export const FINANCIAL_SAVE_PATTERNS: RegExp[] = [
  /โอน\s*\d+/,
  /สด\s*\d+/,
  /เงินสด\s*\d+/,
  /delivery\s*\d+/i,
  /เดลิเวอรี/,
  /หมู(แดง|สับ|มัน|เนื้อ)?\s*\d/,
  /\d+\s*กก/,
  /(?:^|\s)แดง\s*\d/,
  /(?:^|\s)สับ\s*\d/,
  /(?:^|\s)มัน\s*\d/,
  /(?:^|\n)ได้[^\n\d]*[\d,]+/m,
  /(?:^|\n)คนละครึ่ง[\d,]+/m,
  /(?:^|\n)ได้\s*คนละครึ่ง[\d,]+/im,
  /(?:^|\n)รับ[^\n\d]*[\d,]+/m,
  /(?:^|\n)จ่าย[^\n\d]*[\d,]+/m,
  /(?:^|\n)ปรับ[^\n\d]*[\d,]+/m,
  /^ค่า\s+\d/m,
  /(?:^|\n)ค่าแรง\s*[\d,]+/m,
  /(?:^|\n)ซื้อ[^\n\d]*[\d,]+/m,
  /รายรับ\s*\d+/,
  /ขายได้\s*\d+/,
  /วัตถุดิบ\s*\d+/,
  /ค่าแรง\s*\d+/,
  /(?:^|\n)ค่าเช่า\s*[\d,]+/m,
  /(?:^|\n)ค่าไฟ(?:ฟ้า)?\s*[\d,]+/m,
  /(?:^|\n)ค่าน้ำ\s*[\d,]+/m,
  /ค่าน้ำแข็ง/,
  new RegExp(`(?:${SHOP_SUFFIX_RE})[\\s\\S]*\\d`),
  /(?:^|\n)[\u0E00-\u0E7Fa-zA-Z][^\n\d]{1,30}\s+\d{2,}(?:\s*\([\d.]+\))?/m,
  /(?:แม็คโคร|แม็กโคร|แมคโคร|โลตัส|บิ๊กซี|ท็อปส์|เทสโก้)\s*[\d,]+/i,
  /ซื้อ[\s\S]*\d/,
];

export function porkKindFromKeyword(kw: string): "red" | "minced" | "fat" | null {
  if (/แดง|หมูแดง|หมูเนื้อ/.test(kw)) return "red";
  if (/สับ|หมูสับ/.test(kw)) return "minced";
  if (/มัน|มันหมู|หมูมัน/.test(kw)) return "fat";
  return null;
}

export function detectShopFromText(text: string): ShopMatch | null {
  const fullText = text.split(/\n/).map((l) => l.trim()).filter(Boolean).join(" ");

  for (const shop of getShopDefinitions()) {
    const sorted = [...shop.patterns].sort((a, b) => b.length - a.length);
    for (const kw of sorted) {
      if (fullText.includes(kw)) {
        return { shopId: shop.shopId, shopName: shop.shopName, matchedKeyword: kw };
      }
    }
  }
  return null;
}

export function stripShopPrefix(line: string): string {
  return line.replace(SHOP_KW, "").replace(/\s+/g, " ").trim();
}

export function looksLikePorkQuery(text: string): boolean {
  return PORK_QUERY_RE.test(text);
}

export function hasPorkRemovalMarker(text: string): boolean {
  return PORK_REMOVE.test(text) || (/(?:เอา|เอา).*ออก/i.test(text) && /(?:หมู|แดง|สับ|มัน)/i.test(text));
}
