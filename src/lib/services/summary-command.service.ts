import { ENV } from "@/config/constants";
import { describeRecordDate, getTodayDateString, resolveRecordDateFromText } from "@/lib/utils/helpers";
import { detectShopFromText } from "@/lib/services/financial-parser.service";
import type { FinancialRecord, PorkBreakdown } from "@/lib/types/financial.types";
import {
  getCarriedPorkPrices,
  getCarriedPorkQuantities,
  type CarriedPorkQuantities,
} from "@/lib/services/financial-records.service";

export type SummaryIntent =
  | { type: "all_branches"; date: string }
  | { type: "single_shop"; date: string; shopId: string; shopName: string }
  | { type: "default_shop"; date: string; shopId: string; shopName: string };

export interface PorkSummaryIntent {
  date: string;
  shopId: string;
  shopName: string;
}

const SHOP_SUFFIX_RE = "(?:สายหนองปิง|หนองปลิง|หนองปิง|ตลาดญี่ปุ่น|ปลิง|ปิง|ญี่ปุ่น|ยี่ปุ่น)";
const SUMMARY_VERB_RE = "(?:สรุป|ดูยอด|ยอดวัน|ยอด|เช็คยอด|ดูบัญชี|บัญชี)";
const DATE_SUFFIX_RE = "(?:วันนี้|พรุ่งนี้|เมื่อวาน)?";
const ALL_BRANCHES_RE =
  /^(?:สรุป|ดูยอด|ยอด|เช็คยอด|ดูบัญชี)(?:วัน)?(?:ทุกสาขา|ทั้งสองสาขา|ทั้งหมด|รวม(?:ทุก)?สาขา)|(?:ทุกสาขา|ทั้งสองสาขา|ทั้งหมด)(?:ด้วย|นะ|ครับ|ค่ะ|จ้า)?$/u;

/** Phrases that ask for pork total (read-only query). */
export const PORK_QUERY_RE =
  /รวม(?:ค่า)?หมู(?:ทั้งหมด)?|ค่าหมู(?:ทั้งหมด)?|หมูทั้งหมด|คิดหมู(?:ด้วย)?|รวมหมู(?:ด้วย)?/i;

export function looksLikePorkQuery(text: string): boolean {
  return PORK_QUERY_RE.test(text);
}

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
  const date = resolveRecordDateFromText(raw, today) ?? resolveRecordDateFromText(norm, today) ?? today;

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
  return parseSummaryIntent(text) !== null || parsePorkSummaryIntent(text) !== null;
}

/** Ask pork total for a shop/date — read-only, never saves. */
export function parsePorkSummaryIntent(
  text: string,
  today: string = getTodayDateString()
): PorkSummaryIntent | null {
  const raw = text.trim();
  if (!raw || !looksLikePorkQuery(raw)) return null;

  const shop = detectShopFromText(raw) ?? {
    shopId: ENV.DEFAULT_SHOP_ID(),
    shopName: ENV.DEFAULT_SHOP_NAME(),
  };
  const date = resolveRecordDateFromText(raw, today) ?? today;

  return { date, shopId: shop.shopId, shopName: shop.shopName };
}

function finalizePorkBreakdown(pb: PorkBreakdown): PorkBreakdown {
  pb.redTotal = pb.redQty * pb.redPrice;
  pb.mincedTotal = pb.mincedQty * pb.mincedPrice;
  pb.fatTotal = pb.fatQty * pb.fatPrice;
  pb.total = pb.redTotal + pb.mincedTotal + pb.fatTotal;
  return pb;
}

function buildProjectedPorkBreakdown(
  qty: CarriedPorkQuantities,
  prices: { redPrice: number; mincedPrice: number; fatPrice: number }
): PorkBreakdown {
  const pb: PorkBreakdown = {
    redQty: qty.porkRed?.qty ?? 0,
    redPrice: qty.porkRed?.price || prices.redPrice,
    redTotal: 0,
    mincedQty: qty.porkMinced?.qty ?? 0,
    mincedPrice: qty.porkMinced?.price || prices.mincedPrice,
    mincedTotal: 0,
    fatQty: qty.porkFat?.qty ?? 0,
    fatPrice: qty.porkFat?.price || prices.fatPrice,
    fatTotal: 0,
    total: 0,
  };
  return finalizePorkBreakdown(pb);
}

function porkHasData(pb?: PorkBreakdown | null): boolean {
  if (!pb) return false;
  return pb.redQty > 0 || pb.mincedQty > 0 || pb.fatQty > 0 || pb.total > 0;
}

function porkLine(
  emoji: string,
  label: string,
  qty: number,
  price: number,
  total: number,
  baht: (n: number) => string
): string | null {
  if (qty <= 0 && price <= 0) return null;
  if (qty <= 0 && price > 0) return `  ${emoji} ${label}: ${baht(price)}/กก. (⏳ รอยอดจำนวน)`;
  if (price <= 0) return `  ${emoji} ${label}: ${qty} กก. (⏳ ยังไม่ใส่ราคา)`;
  return `  ${emoji} ${label}: ${qty} กก. × ${baht(price)} = ${baht(total)}`;
}

/** Build read-only pork total reply (from saved record or carried-forward preview). */
export async function buildPorkTotalSummary(input: {
  intent: PorkSummaryIntent;
  record: FinancialRecord | null;
  today?: string;
}): Promise<string> {
  const today = input.today ?? getTodayDateString();
  const { intent, record } = input;
  const baht = (n: number) => `฿${n.toLocaleString("th-TH")}`;
  const shopLabel = intent.shopId === "shop2" ? "🏪 สายหนองปิง" : "🏪 ตลาดญี่ปุ่น";

  let pb = record?.porkBreakdown;
  let source: "record" | "carried" | null = porkHasData(pb) ? "record" : null;

  if (!source) {
    const [qty, prices] = await Promise.all([
      getCarriedPorkQuantities(intent.shopId, intent.date),
      getCarriedPorkPrices(intent.shopId, intent.date),
    ]);
    const projected = buildProjectedPorkBreakdown(qty, prices);
    if (porkHasData(projected)) {
      pb = projected;
      source = "carried";
    }
  }

  if (!pb || !porkHasData(pb)) {
    const tag = describeRecordDate(intent.date, today);
    return (
      `❌ ยังไม่มีข้อมูลค่าหมู${tag === intent.date ? ` วันที่ ${intent.date}` : ` (${tag})`}\n` +
      `${shopLabel}\n\n` +
      `💬 ส่งยอดหมู เช่น "แดง4 สับ3" เพื่อเริ่มบันทึก`
    );
  }

  const lines: string[] = [`🥩 ค่าหมูทั้งหมด · ${shopLabel}`];
  if (intent.date !== today) {
    lines.push(`📅 ${describeRecordDate(intent.date, today)} (${intent.date})`);
  }
  lines.push("");

  for (const row of [
    porkLine("🔴", "หมูแดง", pb.redQty, pb.redPrice, pb.redTotal, baht),
    porkLine("🟠", "หมูสับ", pb.mincedQty, pb.mincedPrice, pb.mincedTotal, baht),
    porkLine("🟡", "มันหมู", pb.fatQty, pb.fatPrice, pb.fatTotal, baht),
  ]) {
    if (row) lines.push(row);
  }

  lines.push("");
  lines.push(`💰 รวมค่าหมู: ${baht(pb.total)}`);

  if (source === "carried") {
    lines.push("📎 อ้างอิงจากวันก่อน (ยังไม่ได้บันทึกวันนี้)");
  } else if (source === "record") {
    lines.push(`📊 ยอดวันนั้น: ค่าใช้จ่ายรวม ${baht(record!.expense)} · กำไร ${record!.profit >= 0 ? "+" : ""}${baht(record!.profit)}`);
  }

  lines.push('\n💬 "สรุป" ดูยอดทั้งหมด · "ช่วย" คำสั่งทั้งหมด');
  return lines.join("\n");
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
