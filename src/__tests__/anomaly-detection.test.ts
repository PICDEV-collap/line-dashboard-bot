import {
  analyzeRecordAnomalies,
  formatAnomalyNotice,
} from "@/lib/services/anomaly-detection.service";
import type { FinancialRecord } from "@/lib/types/financial.types";

describe("Anomaly Detection Service", () => {
  const baseRecord: FinancialRecord = {
    id: "rec1",
    date: "2026-07-27",
    shopId: "shop1",
    shopName: "ตลาดญี่ปุ่น",
    revenue: 10000,
    transfer: 6000,
    cash: 4000,
    delivery: 0,
    expense: 5000,
    pork: 1500,
    porkBreakdown: {
      redQty: 5,
      redPrice: 150,
      redTotal: 750,
      mincedQty: 5,
      mincedPrice: 150,
      mincedTotal: 750,
      fatQty: 0,
      fatPrice: 0,
      fatTotal: 0,
      total: 1500,
    },
    materials: 2000,
    supplies: 500,
    gas: 150,
    labor: 800,
    ice: 50,
    extraExpenses: [],
    extraIncome: [],
    profit: 5000,
    marginPct: 50,
    note: "",
    status: "complete",
    incomplete: false,
    createdAt: "2026-07-27T00:00:00Z",
    updatedAt: "2026-07-27T00:00:00Z",
  };

  it("returns no alerts for normal healthy record", () => {
    const alerts = analyzeRecordAnomalies(baseRecord);
    expect(alerts).toHaveLength(0);
  });

  it("detects revenue component mismatch", () => {
    const mismatchRecord: FinancialRecord = {
      ...baseRecord,
      revenue: 10000,
      transfer: 3000,
      cash: 2000,
      delivery: 0, // sum is 5000 != 10000
    };
    const alerts = analyzeRecordAnomalies(mismatchRecord);
    expect(alerts.some((a) => a.type === "REVENUE_MISMATCH")).toBe(true);
  });

  it("detects negative margin loss alert", () => {
    const lossRecord: FinancialRecord = {
      ...baseRecord,
      revenue: 5000,
      expense: 8000,
      profit: -3000,
    };
    const alerts = analyzeRecordAnomalies(lossRecord);
    expect(alerts.some((a) => a.type === "LOW_MARGIN" && a.severity === "high")).toBe(true);
  });

  it("detects expense spike over historical 7-day average", () => {
    const history: FinancialRecord[] = [
      { ...baseRecord, id: "h1", expense: 4000 },
      { ...baseRecord, id: "h2", expense: 4100 },
      { ...baseRecord, id: "h3", expense: 3900 },
    ];
    const spikeRecord: FinancialRecord = {
      ...baseRecord,
      expense: 7500, // > 30% over 4000
    };
    const alerts = analyzeRecordAnomalies(spikeRecord, history);
    expect(alerts.some((a) => a.type === "EXPENSE_SPIKE")).toBe(true);
  });

  it("formats alerts into readable Thai text", () => {
    const alerts = analyzeRecordAnomalies({
      ...baseRecord,
      revenue: 5000,
      expense: 8000,
      profit: -3000,
    });
    const notice = formatAnomalyNotice(alerts);
    expect(notice).toContain("ผลการตรวจสอบความผิดปกติ");
    expect(notice).toContain("ขาดทุนสุทธิ");
  });
});
