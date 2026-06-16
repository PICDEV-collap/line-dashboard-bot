import { ENV } from "@/config/constants";
import { describeRecordDate, getTodayDateString, resolveRecordDateFromText } from "@/lib/utils/helpers";
import { detectShopFromText } from "@/lib/services/financial-parser.service";
import type { FinancialRecord } from "@/lib/types/financial.types";

export type SummaryIntent =
  | { type: "all_branches"; date: string }
  | { type: "single_shop"; date: string; shopId: string; shopName: string }
  | { type: "default_shop"; date: string; shopId: string; shopName: string };

const SHOP_SUFFIX_RE = "(?:สายหนองปิง|หนองปลิง|หนองปิง|ตลาดญี่ปุ่น|ปลิง|ปิง|ญี่ปุ่น|ยี่ปุ่น)";
const SUMMARY_VERB_RE = "(?:สรุป|ดูยอด|ยอดวัน|ยอด|เช็คยอด|ดูบัญชี|บัญชี)";
const DATE_SUFFIX_RE = "(?:วันนี้|พรุ่งนี้|เมื่อวาน)?";
const ALL_BRANCHES_RE =
  /^(?:สรุป|ดูยอด|ยอด|เช็คยอด|ดูบัญชี)(?:วัน)?(?:ทุกสาขา|ทั้งสองสาขา|ทั้งหมด|รวม(?:ทุก)?สาขา)|(?:ทุกสาขา|ทั้งสองสาขา|ทั้งหมด)(?:ด้วย|นะ|ครับ|ค่ะ|จ้า)?$/u;

/** Split glued Thai: หนองปิงด้วย → หนองปิง ด้วย, สรุปหนองปิง → สรุป หนองปิง */
export function normalizeSummaryCommandText(text: string): string {
  return text
    .trim()
    .replace(new RegExp(`^(${SHOP_SUFFIX_RE})(ด้วย)`, "u"), "$1 $2")
    .replace(new RegExp(`^(${SUMMARY_VERB_RE})(${SHOP_SUFFIX_RE})`, "u"), "$1 $2")
    .replace(new RegExp(`^(${SHOP_SUFFIX_RE})(${SUMMARY_VERB_RE})`, "u"), "$1 $2")
    .replace(new RegExp(`^(${SUMMARY_VERB_RE})(ทุกสาขา|ทั้งสองสาขา|ทั้งหมด)`, "u"), "$1 $2")
    .replace(/\s+/g, " ")
    .trim();
}

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
  return (
    new RegExp(`^${SUMMARY_VERB_RE}\\s*${DATE_SUFFIX_RE}$`, "u").test(norm) ||
    new RegExp(`^${SUMMARY_VERB_RE}${DATE_SUFFIX_RE}$`, "u").test(compact)
  );
}

function isAllBranchesSummary(norm: string, compact: string): boolean {
  return ALL_BRANCHES_RE.test(norm) || ALL_BRANCHES_RE.test(compact);
}

/** Parse any summary-related LINE command. */
export function parseSummaryIntent(
  text: string,
  today: string = getTodayDateString()
): SummaryIntent | null {
  const raw = text.trim();
  if (!raw) return null;

  const norm = normalizeSummaryCommandText(raw);
  const compact = norm.replace(/\s+/g, "");
  const date = resolveRecordDateFromText(raw) ?? resolveRecordDateFromText(norm) ?? today;

  if (isAllBranchesSummary(norm, compact)) {
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

/** @deprecated use parseSummaryIntent */
export function looksLikeSummaryRequest(text: string): boolean {
  return parseSummaryIntent(text) !== null;
}

function shopLabel(rec: FinancialRecord): string {
  return rec.shopId === "shop2" ? "🏪 สายหนองปิง" : "🏪 ตลาดญี่ปุ่น";
}

function briefTotals(rec: FinancialRecord): string {
  const baht = (n: number) => `฿${n.toLocaleString("th-TH")}`;
  const sign = rec.profit >= 0 ? "+" : "";
  return `รายรับ ${baht(rec.revenue)} · ค่าใช้จ่าย ${baht(rec.expense)} · กำไร ${sign}${baht(rec.profit)}`;
}

export function buildAllBranchesSummary(
  records: FinancialRecord[],
  date: string,
  today: string = getTodayDateString()
): string {
  const lines: string[] = ["📋 สรุปทุกสาขา"];
  if (date !== today) {
    lines.push(`📅 ${describeRecordDate(date, today)} (${date})`);
  }
  lines.push("");

  if (records.length === 0) {
    lines.push("❌ ยังไม่มีข้อมูลวันนี้ในทุกสาขา");
    lines.push('\n💬 ส่งยอดเพื่อเริ่มบันทึก · "ช่วย" ดูคำสั่ง');
    return lines.join("\n");
  }

  let totalRevenue = 0;
  let totalExpense = 0;
  let totalProfit = 0;

  for (const rec of records) {
    lines.push(`${shopLabel(rec)}`);
    lines.push(`  ${briefTotals(rec)}`);
    lines.push("");
    totalRevenue += rec.revenue;
    totalExpense += rec.expense;
    totalProfit += rec.profit;
  }

  const baht = (n: number) => `฿${n.toLocaleString("th-TH")}`;
  const sign = totalProfit >= 0 ? "+" : "";
  lines.push(`📊 รวมทุกสาขา: รายรับ ${baht(totalRevenue)} · ค่าใช้จ่าย ${baht(totalExpense)} · กำไร ${sign}${baht(totalProfit)}`);
  lines.push('\n💬 "สรุป" สาขาเดียว · "หนองปิงด้วย" / "ญี่ปุ่นด้วย" · "ช่วย" แก้ไข');
  return lines.join("\n");
}

export function getAllBranchShops(): readonly { shopId: string; shopName: string }[] {
  return [
    { shopId: ENV.DEFAULT_SHOP_ID(), shopName: ENV.DEFAULT_SHOP_NAME() },
    { shopId: ENV.SHOP2_ID(), shopName: ENV.SHOP2_NAME() },
  ];
}
