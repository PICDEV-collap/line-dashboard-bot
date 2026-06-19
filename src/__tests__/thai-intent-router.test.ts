import { routeLineMessage, looksLikeFinancialData } from "@/lib/services/thai-intent-router.service";
import { normalizeSummaryCommandText, normalizeNaturalCommandLine } from "@/lib/thai/normalizer";

const today = "2026-06-15";

describe("thai-intent-router", () => {
  const cases: Array<{ input: string; kind: ReturnType<typeof routeLineMessage>["kind"] }> = [
    { input: "หนองปลิง รวมค่าหมู", kind: "QUERY_PORK" },
    { input: "หนองปลั่ง ค่าหมูทั้งหมด", kind: "QUERY_PORK" },
    { input: "ญี่ปุ่น เอาหมูแดง ออก 1 กก พรุ่งนี้", kind: "CORRECTION" },
    { input: "แดง4 สับ3", kind: "SAVE_FINANCIAL" },
    { input: "โอน 5000", kind: "SAVE_FINANCIAL" },
    { input: "สรุปหนองปิง", kind: "QUERY_SUMMARY" },
    { input: "หนองปิงด้วย", kind: "QUERY_SUMMARY" },
    { input: "ช่วย", kind: "HELP" },
    { input: "สวัสดีครับ", kind: "UNKNOWN" },
  ];

  it.each(cases)("routes %j as %s", ({ input, kind }) => {
    expect(routeLineMessage(input, today).kind).toBe(kind);
  });

  it("pork query is not treated as financial save", () => {
    expect(looksLikeFinancialData("หนองปลิง รวมค่าหมู")).toBe(false);
  });

  it("correction with filler suffix still routes correctly", () => {
    expect(routeLineMessage("ญี่ปุ่น เอาหมูแดง ออก 1 กก พรุ่งนี้อ่ะ", today).kind).toBe(
      "CORRECTION"
    );
  });

  it("normalizes glued summary commands", () => {
    expect(normalizeSummaryCommandText("หนองปิงด้วย")).toBe("หนองปิง ด้วย");
    expect(normalizeSummaryCommandText("สรุปหนองปิง")).toBe("สรุป หนองปิง");
  });

  it("normalizes glued correction commands", () => {
    expect(normalizeNaturalCommandLine("ปรับหมูสับราคา 120")).toBe("ปรับ หมูสับ ราคา 120");
  });
});

describe("report intent routing", () => {
  // today = 2026-06-15 → current month 2026-06, current year 2026
  const reportCases: Array<{
    input: string;
    period: "month" | "year";
    month?: string;
    year?: string;
    shopId?: string;
  }> = [
    { input: "รายงาน", period: "month", month: "2026-06" },
    { input: "ขอรายงานเดือนนี้", period: "month", month: "2026-06" },
    { input: "รายงานเดือนที่แล้ว", period: "month", month: "2026-05" },
    { input: "รายงานเดือนมีนาคม", period: "month", month: "2026-03" },
    { input: "รายงานเดือน 3", period: "month", month: "2026-03" },
    { input: "report", period: "month", month: "2026-06" },
    { input: "รายงานปีนี้", period: "year", year: "2026" },
    { input: "รายงานปี 2568", period: "year", year: "2025" },
    { input: "รายงานปีที่แล้ว", period: "year", year: "2025" },
    { input: "รายงานหนองปิงเดือนนี้", period: "month", month: "2026-06", shopId: "shop2" },
  ];

  it.each(reportCases)("routes %j to a report intent", ({ input, period, month, year, shopId }) => {
    const intent = routeLineMessage(input, today);
    expect(intent.kind).toBe("QUERY_REPORT");
    if (intent.kind !== "QUERY_REPORT") return;
    expect(intent.payload.period).toBe(period);
    if (month) expect(intent.payload.month).toBe(month);
    if (year) expect(intent.payload.year).toBe(year);
    if (shopId) expect(intent.payload.shopId).toBe(shopId);
  });

  it("does not misclassify a daily summary as a report", () => {
    expect(routeLineMessage("สรุป", today).kind).toBe("QUERY_SUMMARY");
  });

  it("report request is not treated as financial save", () => {
    expect(looksLikeFinancialData("รายงานเดือนนี้")).toBe(false);
  });
});
