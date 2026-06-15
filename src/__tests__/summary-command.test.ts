import {
  parseSummaryIntent,
  normalizeSummaryCommandText,
  buildAllBranchesSummary,
  looksLikeSummaryRequest,
} from "@/lib/services/summary-command.service";
import type { FinancialRecord } from "@/lib/types/financial.types";

const sampleRecord = (shopId: string, revenue: number): FinancialRecord => ({
  id: "1",
  date: "2026-06-15",
  shopId,
  shopName: shopId,
  revenue,
  transfer: revenue,
  cash: 0,
  delivery: 0,
  expense: 1000,
  pork: 0,
  materials: 0,
  supplies: 0,
  gas: 150,
  labor: 850,
  ice: 35,
  extraExpenses: [],
  extraIncome: [],
  profit: revenue - 1000,
  marginPct: 0,
  note: "",
  status: "complete",
  incomplete: false,
  createdAt: "",
  updatedAt: "",
});

describe("summary-command.service", () => {
  const today = "2026-06-15";

  it("normalizes glued shop follow-up", () => {
    expect(normalizeSummaryCommandText("หนองปิงด้วย")).toBe("หนองปิง ด้วย");
    expect(normalizeSummaryCommandText("สรุปหนองปิง")).toBe("สรุป หนองปิง");
    expect(normalizeSummaryCommandText("สรุปทุกสาขา")).toBe("สรุป ทุกสาขา");
  });

  it("parses shop follow-up without space", () => {
    const intent = parseSummaryIntent("หนองปิงด้วย", today);
    expect(intent).toEqual({
      type: "single_shop",
      date: today,
      shopId: "shop2",
      shopName: "ก๋วยเตี๋ยวไทยครูตอมสายหนองปิง",
    });
  });

  it("parses all branches summary", () => {
    expect(parseSummaryIntent("สรุปทุกสาขา", today)).toEqual({
      type: "all_branches",
      date: today,
    });
    expect(parseSummaryIntent("ทุกสาขา", today)?.type).toBe("all_branches");
    expect(parseSummaryIntent("สรุปทั้งสองสาขา", today)?.type).toBe("all_branches");
    expect(parseSummaryIntent("ดูยอดทุกสาขา", today)?.type).toBe("all_branches");
  });

  it("parses shop-specific summary commands", () => {
    expect(parseSummaryIntent("สรุปหนองปิง", today)?.type).toBe("single_shop");
    expect(parseSummaryIntent("ญี่ปุ่น สรุป", today)?.shopId).toBe("shop1");
    expect(parseSummaryIntent("ดูยอดญี่ปุ่น", today)?.shopId).toBe("shop1");
    expect(parseSummaryIntent("ดูหนองปิง", today)?.shopId).toBe("shop2");
  });

  it("parses default summary with date keywords", () => {
    expect(parseSummaryIntent("สรุป", today)?.type).toBe("default_shop");
    expect(parseSummaryIntent("ดูยอด", today)?.type).toBe("default_shop");
    expect(parseSummaryIntent("เช็คยอด", today)?.type).toBe("default_shop");
    expect(parseSummaryIntent("สรุปพรุ่งนี้", today)?.date).toBe("2026-06-16");
    expect(parseSummaryIntent("หนองปิง สรุปพรุ่งนี้", today)?.shopId).toBe("shop2");
  });

  it("ignores non-summary messages", () => {
    expect(parseSummaryIntent("โอน 5000", today)).toBeNull();
    expect(parseSummaryIntent("สวัสดี", today)).toBeNull();
  });

  it("looksLikeSummaryRequest covers all summary intents", () => {
    expect(looksLikeSummaryRequest("หนองปิงด้วย")).toBe(true);
    expect(looksLikeSummaryRequest("สรุปทุกสาขา")).toBe(true);
  });

  it("buildAllBranchesSummary aggregates totals", () => {
    const msg = buildAllBranchesSummary(
      [sampleRecord("shop1", 1285), sampleRecord("shop2", 2000)],
      today,
      today
    );
    expect(msg).toContain("สรุปทุกสาขา");
    expect(msg).toContain("ตลาดญี่ปุ่น");
    expect(msg).toContain("สายหนองปิง");
    expect(msg).toContain("฿3,285");
    expect(msg).toContain("฿1,285");
  });
});
