import type { FinancialRecord } from "@/lib/types/financial.types";
import {
  groupRecordsByWeek,
  groupRecordsByMonth,
} from "@/lib/utils/analytics-aggregator";
import {
  buildCsvContent,
  buildExcelXmlContent,
} from "@/lib/utils/export-records";

describe("Dashboard Analytics & Export (TDD)", () => {
  const dummyRecords: FinancialRecord[] = [
    {
      id: "r1",
      date: "2026-03-02",
      shopId: "shop1",
      shopName: "ตลาดญี่ปุ่น",
      revenue: 10000,
      transfer: 6000,
      cash: 4000,
      delivery: 0,
      expense: 6000,
      pork: 2000,
      materials: 1000,
      supplies: 0,
      gas: 150,
      labor: 1500,
      ice: 35,
      profit: 4000,
      marginPct: 40,
      extraExpenses: [],
      extraIncome: [],
      note: "",
      incomplete: false,
      status: "complete",
      createdAt: "2026-03-02T10:00:00Z",
      updatedAt: "2026-03-02T10:00:00Z",
    },
    {
      id: "r2",
      date: "2026-03-04",
      shopId: "shop1",
      shopName: "ตลาดญี่ปุ่น",
      revenue: 8000,
      transfer: 5000,
      cash: 3000,
      delivery: 0,
      expense: 5000,
      pork: 1500,
      materials: 800,
      supplies: 0,
      gas: 150,
      labor: 1500,
      ice: 35,
      profit: 3000,
      marginPct: 37.5,
      extraExpenses: [],
      extraIncome: [],
      note: "",
      incomplete: false,
      status: "complete",
      createdAt: "2026-03-04T10:00:00Z",
      updatedAt: "2026-03-04T10:00:00Z",
    },
    {
      id: "r3",
      date: "2026-03-10",
      shopId: "shop2",
      shopName: "สายหนองปิง",
      revenue: 12000,
      transfer: 7000,
      cash: 4000,
      delivery: 1000,
      expense: 7000,
      pork: 2500,
      materials: 1200,
      supplies: 0,
      gas: 150,
      labor: 1500,
      ice: 35,
      profit: 5000,
      marginPct: 41.6,
      extraExpenses: [],
      extraIncome: [],
      note: "",
      incomplete: false,
      status: "complete",
      createdAt: "2026-03-10T10:00:00Z",
      updatedAt: "2026-03-10T10:00:00Z",
    },
    {
      id: "r4",
      date: "2026-04-05",
      shopId: "shop1",
      shopName: "ตลาดญี่ปุ่น",
      revenue: 15000,
      transfer: 9000,
      cash: 6000,
      delivery: 0,
      expense: 8000,
      pork: 3000,
      materials: 1500,
      supplies: 0,
      gas: 150,
      labor: 1500,
      ice: 35,
      profit: 7000,
      marginPct: 46.6,
      extraExpenses: [],
      extraIncome: [],
      note: "",
      incomplete: false,
      status: "complete",
      createdAt: "2026-04-05T10:00:00Z",
      updatedAt: "2026-04-05T10:00:00Z",
    },
  ];

  describe("1. Weekly Sales Aggregation", () => {
    it("aggregates records into weekly intervals accurately", () => {
      const weeks = groupRecordsByWeek(dummyRecords);
      expect(weeks.length).toBeGreaterThanOrEqual(2);

      // March 1 and March 3 belong to the same week interval
      const firstWeek = weeks[0];
      expect(firstWeek.revenue).toBe(18000); // 10000 + 8000
      expect(firstWeek.expense).toBe(11000); // 6000 + 5000
      expect(firstWeek.profit).toBe(7000); // 4000 + 3000
      expect(firstWeek.recordCount).toBe(2);
      expect(firstWeek.avgDailyRevenue).toBe(9000);
    });
  });

  describe("2. Monthly Sales Aggregation", () => {
    it("aggregates records into monthly buckets accurately", () => {
      const months = groupRecordsByMonth(dummyRecords);
      expect(months.length).toBe(2); // March 2026 and April 2026

      const march = months.find((m) => m.monthKey === "2026-03");
      expect(march).toBeDefined();
      expect(march!.revenue).toBe(30000); // 10000 + 8000 + 12000
      expect(march!.expense).toBe(18000); // 6000 + 5000 + 7000
      expect(march!.profit).toBe(12000); // 4000 + 3000 + 5000
      expect(march!.recordCount).toBe(3);

      const april = months.find((m) => m.monthKey === "2026-04");
      expect(april).toBeDefined();
      expect(april!.revenue).toBe(15000);
      expect(april!.profit).toBe(7000);
    });
  });

  describe("3. Excel & CSV Export Generator", () => {
    it("generates CSV with UTF-8 BOM and correct Thai columns", () => {
      const csv = buildCsvContent(dummyRecords);

      // Verify UTF-8 BOM is present to prevent Excel garbled Thai text
      expect(csv.startsWith("\uFEFF")).toBe(true);

      // Verify header columns
      expect(csv).toContain("วันที่");
      expect(csv).toContain("สาขา");
      expect(csv).toContain("รายรับรวม");
      expect(csv).toContain("กำไรสุทธิ");

      // Verify data lines
      expect(csv).toContain("2026-03-02");
      expect(csv).toContain("ตลาดญี่ปุ่น");
      expect(csv).toContain("10000");
    });

    it("generates structured Excel XML content", () => {
      const xml = buildExcelXmlContent(dummyRecords);

      expect(xml).toContain('<?xml version="1.0"?>');
      expect(xml).toContain("Workbook");
      expect(xml).toContain("ตลาดญี่ปุ่น");
      expect(xml).toContain("สายหนองปิง");
    });
  });
});
