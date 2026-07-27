import {
  compareBranches,
  formatBranchComparisonText,
} from "@/lib/services/branch-analytics.service";
import type { FinancialRecord } from "@/lib/types/financial.types";

describe("Branch Analytics Service", () => {
  const mockRecords: FinancialRecord[] = [
    {
      id: "r1",
      date: "2026-07-27",
      shopId: "shop1",
      shopName: "ตลาดญี่ปุ่น",
      revenue: 10000,
      transfer: 6000,
      cash: 4000,
      delivery: 0,
      expense: 6000,
      pork: 2000,
      materials: 2000,
      supplies: 500,
      gas: 150,
      labor: 1300,
      ice: 50,
      extraExpenses: [],
      extraIncome: [],
      profit: 4000,
      marginPct: 40,
      note: "",
      status: "complete",
      incomplete: false,
      createdAt: "2026-07-27T00:00:00Z",
      updatedAt: "2026-07-27T00:00:00Z",
    },
    {
      id: "r2",
      date: "2026-07-27",
      shopId: "shop2",
      shopName: "สายหนองปิง",
      revenue: 8000,
      transfer: 5000,
      cash: 3000,
      delivery: 0,
      expense: 5000,
      pork: 1500,
      materials: 1800,
      supplies: 400,
      gas: 150,
      labor: 1100,
      ice: 50,
      extraExpenses: [],
      extraIncome: [],
      profit: 3000,
      marginPct: 37.5,
      note: "",
      status: "complete",
      incomplete: false,
      createdAt: "2026-07-27T00:00:00Z",
      updatedAt: "2026-07-27T00:00:00Z",
    },
  ];

  it("correctly groups and compares branch metrics", () => {
    const result = compareBranches(mockRecords, "มีนาคม 2569");
    expect(result.totalSystemRevenue).toBe(18000);
    expect(result.totalSystemExpense).toBe(11000);
    expect(result.totalSystemProfit).toBe(7000);
    expect(result.topBranchId).toBe("shop1");
    expect(result.branches.shop1.totalRevenue).toBe(10000);
    expect(result.branches.shop2.totalRevenue).toBe(8000);
  });

  it("formats readable Thai text for branch comparison", () => {
    const text = formatBranchComparisonText(mockRecords, "มีนาคม 2569");
    expect(text).toContain("รายงานเปรียบเทียบผลประกอบการรายสาขา");
    expect(text).toContain("ตลาดญี่ปุ่น");
    expect(text).toContain("สายหนองปิง");
    expect(text).toContain("รวมทุกสาขา");
  });
});
