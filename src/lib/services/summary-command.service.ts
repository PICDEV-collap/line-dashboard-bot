import { ENV } from "@/config/constants";
import { describeRecordDate, getTodayDateString } from "@/lib/utils/helpers";
import type { FinancialRecord, PorkBreakdown } from "@/lib/types/financial.types";
import {
  getCarriedPorkPrices,
  getCarriedPorkQuantities,
  type CarriedPorkQuantities,
} from "@/lib/services/financial-records.service";
import { PORK_QUERY_RE, looksLikePorkQuery as lexiconLooksLikePorkQuery } from "@/lib/thai/lexicon";
import { normalizeSummaryCommandText as thaiNormalizeSummary } from "@/lib/thai/normalizer";
import type { PorkSummaryIntent } from "@/lib/thai/types";
import { routeLineMessage } from "@/lib/services/thai-intent-router.service";

export type { SummaryIntent, PorkSummaryIntent } from "@/lib/thai/types";

/** @deprecated import from @/lib/thai/lexicon */
export { PORK_QUERY_RE };

export function looksLikePorkQuery(text: string): boolean {
  return lexiconLooksLikePorkQuery(text);
}

/** Split glued Thai summary commands — delegates to shared normalizer. */
export function normalizeSummaryCommandText(text: string): string {
  return thaiNormalizeSummary(text);
}

/** Parse any summary-related LINE command. */
export function parseSummaryIntent(
  text: string,
  today: string = getTodayDateString()
) {
  const intent = routeLineMessage(text, today);
  return intent.kind === "QUERY_SUMMARY" ? intent.payload : null;
}

/** @deprecated use parseSummaryIntent */
export function looksLikeSummaryRequest(text: string): boolean {
  return parseSummaryIntent(text) !== null || parsePorkSummaryIntent(text) !== null;
}

/** Ask pork total for a shop/date — read-only, never saves. */
export function parsePorkSummaryIntent(
  text: string,
  today: string = getTodayDateString()
) {
  const intent = routeLineMessage(text, today);
  return intent.kind === "QUERY_PORK" ? intent.payload : null;
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
