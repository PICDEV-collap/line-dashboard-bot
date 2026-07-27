import type { FinancialRecord } from "@/lib/types/financial.types";
import { createLogger } from "@/lib/middleware/logger";

const logger = createLogger("BranchAnalytics");

export interface BranchMetrics {
  shopId: string;
  shopName: string;
  totalDays: number;
  totalRevenue: number;
  totalExpense: number;
  totalProfit: number;
  avgMarginPct: number;
  avgDailyRevenue: number;
  avgDailyProfit: number;
  transfer: number;
  cash: number;
  delivery: number;
  porkCost: number;
}

export interface BranchComparisonResult {
  periodLabel: string;
  branches: Record<string, BranchMetrics>;
  totalSystemRevenue: number;
  totalSystemExpense: number;
  totalSystemProfit: number;
  topBranchId: string;
}

export function compareBranches(
  records: FinancialRecord[],
  periodLabel = "ทั้งหมด"
): BranchComparisonResult {
  const shopMap: Record<string, FinancialRecord[]> = {};

  for (const r of records) {
    const shop = r.shopId || "unknown";
    if (!shopMap[shop]) shopMap[shop] = [];
    shopMap[shop].push(r);
  }

  const branches: Record<string, BranchMetrics> = {};
  let totalSystemRevenue = 0;
  let totalSystemExpense = 0;
  let topBranchId = "";
  let maxRevenue = -1;

  for (const [shopId, shopRecords] of Object.entries(shopMap)) {
    const days = shopRecords.length;
    const rev = shopRecords.reduce((sum, r) => sum + (r.revenue || 0), 0);
    const exp = shopRecords.reduce((sum, r) => sum + (r.expense || 0), 0);
    const prof = rev - exp;
    const margin = rev > 0 ? (prof / rev) * 100 : 0;

    const transfer = shopRecords.reduce((sum, r) => sum + (r.transfer || 0), 0);
    const cash = shopRecords.reduce((sum, r) => sum + (r.cash || 0), 0);
    const delivery = shopRecords.reduce((sum, r) => sum + (r.delivery || 0), 0);
    const porkCost = shopRecords.reduce((sum, r) => sum + (r.pork || 0), 0);

    const shopName =
      shopId === "shop1"
        ? "ตลาดญี่ปุ่น"
        : shopId === "shop2"
        ? "สายหนองปิง"
        : shopRecords[0]?.shopName || shopId;

    branches[shopId] = {
      shopId,
      shopName,
      totalDays: days,
      totalRevenue: rev,
      totalExpense: exp,
      totalProfit: prof,
      avgMarginPct: margin,
      avgDailyRevenue: days > 0 ? Math.round(rev / days) : 0,
      avgDailyProfit: days > 0 ? Math.round(prof / days) : 0,
      transfer,
      cash,
      delivery,
      porkCost,
    };

    totalSystemRevenue += rev;
    totalSystemExpense += exp;

    if (rev > maxRevenue) {
      maxRevenue = rev;
      topBranchId = shopId;
    }
  }

  logger.info("Branch comparison calculated", {
    branchCount: Object.keys(branches).length,
    totalSystemRevenue,
  });

  return {
    periodLabel,
    branches,
    totalSystemRevenue,
    totalSystemExpense,
    totalSystemProfit: totalSystemRevenue - totalSystemExpense,
    topBranchId,
  };
}

export function formatBranchComparisonText(
  records: FinancialRecord[],
  periodLabel = "ทั้งหมด"
): string {
  const result = compareBranches(records, periodLabel);

  if (Object.keys(result.branches).length === 0) {
    return "❌ ไม่พบข้อมูลการเงินสำหรับเปรียบเทียบสาขา";
  }

  const fmt = (n: number) => n.toLocaleString("th-TH");
  const lines: string[] = [`📊 **รายงานเปรียบเทียบผลประกอบการรายสาขา (${periodLabel})**\n`];

  for (const b of Object.values(result.branches)) {
    const share =
      result.totalSystemRevenue > 0
        ? ((b.totalRevenue / result.totalSystemRevenue) * 100).toFixed(1)
        : "0.0";

    lines.push(`🏪 **สาขา ${b.shopName}** (${b.totalDays} วัน)`);
    lines.push(`  • รายรับรวม: ฿${fmt(b.totalRevenue)} (สัดส่วน ${share}%)`);
    lines.push(`  • ค่าใช้จ่ายรวม: ฿${fmt(b.totalExpense)}`);
    lines.push(`  • กำไรสุทธิ: ฿${fmt(b.totalProfit)} (${b.avgMarginPct.toFixed(1)}%)`);
    lines.push(`  •เฉลี่ย/วัน: รายรับ ฿${fmt(b.avgDailyRevenue)} | กำไร ฿${fmt(b.avgDailyProfit)}`);
    lines.push(`  • ค่าหมูรวม: ฿${fmt(b.porkCost)}\n`);
  }

  lines.push(`💵 **รวมทุกสาขา:**`);
  lines.push(`• รายรับรวมระบบ: ฿${fmt(result.totalSystemRevenue)}`);
  lines.push(`• ค่าใช้จ่ายรวมระบบ: ฿${fmt(result.totalSystemExpense)}`);
  lines.push(
    `• กำไรสุทธิรวมระบบ: ฿${fmt(result.totalSystemProfit)}`
  );

  return lines.join("\n");
}
