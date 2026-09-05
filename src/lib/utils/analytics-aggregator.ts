import type { FinancialRecord } from "@/lib/types/financial.types";

export interface WeeklyAggregate {
  weekKey: string; // YYYY-MM-DD (Monday date)
  label: string;
  startDate: string;
  endDate: string;
  revenue: number;
  expense: number;
  profit: number;
  pork: number;
  recordCount: number;
  avgDailyRevenue: number;
  shopBreakdown: Record<string, number>;
}

export interface MonthlyAggregate {
  monthKey: string; // YYYY-MM
  label: string;
  year: number;
  month: number;
  revenue: number;
  expense: number;
  profit: number;
  pork: number;
  recordCount: number;
  avgDailyRevenue: number;
  shopBreakdown: Record<string, number>;
}

const THAI_MONTHS_SHORT = [
  "",
  "ม.ค.",
  "ก.พ.",
  "มี.ค.",
  "เม.ย.",
  "พ.ค.",
  "มิ.ย.",
  "ก.ค.",
  "ส.ค.",
  "ก.ย.",
  "ต.ค.",
  "พ.ย.",
  "ธ.ค.",
];

function getMonday(dStr: string): Date {
  const d = new Date(dStr + "T00:00:00");
  const day = d.getDay();
  const diff = d.getDate() - day + (day === 0 ? -6 : 1);
  return new Date(d.setDate(diff));
}

export function groupRecordsByWeek(records: FinancialRecord[]): WeeklyAggregate[] {
  const map = new Map<string, { start: Date; records: FinancialRecord[] }>();

  for (const r of records) {
    if (!r.date) continue;
    const monday = getMonday(r.date);
    const key = monday.toISOString().split("T")[0];

    if (!map.has(key)) {
      map.set(key, { start: monday, records: [] });
    }
    map.get(key)!.records.push(r);
  }

  const sortedKeys = Array.from(map.keys()).sort();

  return sortedKeys.map((key) => {
    const { start, records: weekRecords } = map.get(key)!;
    const end = new Date(start);
    end.setDate(end.getDate() + 6);
    const endKey = end.toISOString().split("T")[0];

    const revenue = weekRecords.reduce((sum, r) => sum + (r.revenue || 0), 0);
    const expense = weekRecords.reduce((sum, r) => sum + (r.expense || 0), 0);
    const profit = weekRecords.reduce((sum, r) => sum + (r.profit ?? ((r.revenue || 0) - (r.expense || 0))), 0);
    const pork = weekRecords.reduce((sum, r) => sum + (r.pork || 0), 0);

    const startParts = key.split("-");
    const endParts = endKey.split("-");
    const label = `${parseInt(startParts[2])}/${parseInt(startParts[1])} - ${parseInt(endParts[2])}/${parseInt(endParts[1])}`;

    const shopBreakdown: Record<string, number> = {};
    for (const r of weekRecords) {
      const s = r.shopName || r.shopId;
      shopBreakdown[s] = (shopBreakdown[s] || 0) + (r.revenue || 0);
    }

    const count = weekRecords.length;

    return {
      weekKey: key,
      label,
      startDate: key,
      endDate: endKey,
      revenue,
      expense,
      profit,
      pork,
      recordCount: count,
      avgDailyRevenue: count > 0 ? Math.round(revenue / count) : 0,
      shopBreakdown,
    };
  });
}

export function groupRecordsByMonth(records: FinancialRecord[]): MonthlyAggregate[] {
  const map = new Map<string, FinancialRecord[]>();

  for (const r of records) {
    if (!r.date) continue;
    const monthKey = r.date.slice(0, 7); // YYYY-MM
    if (!map.has(monthKey)) {
      map.set(monthKey, []);
    }
    map.get(monthKey)!.push(r);
  }

  const sortedKeys = Array.from(map.keys()).sort();

  return sortedKeys.map((key) => {
    const monthRecords = map.get(key)!;
    const [yearStr, monthStr] = key.split("-");
    const year = parseInt(yearStr, 10);
    const month = parseInt(monthStr, 10);

    const revenue = monthRecords.reduce((sum, r) => sum + (r.revenue || 0), 0);
    const expense = monthRecords.reduce((sum, r) => sum + (r.expense || 0), 0);
    const profit = monthRecords.reduce((sum, r) => sum + (r.profit ?? ((r.revenue || 0) - (r.expense || 0))), 0);
    const pork = monthRecords.reduce((sum, r) => sum + (r.pork || 0), 0);

    const label = `${THAI_MONTHS_SHORT[month]} ${year + 543}`;

    const shopBreakdown: Record<string, number> = {};
    for (const r of monthRecords) {
      const s = r.shopName || r.shopId;
      shopBreakdown[s] = (shopBreakdown[s] || 0) + (r.revenue || 0);
    }

    const count = monthRecords.length;

    return {
      monthKey: key,
      label,
      year,
      month,
      revenue,
      expense,
      profit,
      pork,
      recordCount: count,
      avgDailyRevenue: count > 0 ? Math.round(revenue / count) : 0,
      shopBreakdown,
    };
  });
}
