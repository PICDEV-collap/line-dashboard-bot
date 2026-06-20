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

// The AI command-learning layer emits these "canonical" strings; they MUST route
// to the right intent (incl. branch + date) or the corrected command does nothing.
describe("AI canonical commands route correctly", () => {
  it("summary with branch + date (สรุปญี่ปุ่นพรุ่งนี้)", () => {
    const intent = routeLineMessage("สรุปญี่ปุ่นพรุ่งนี้", today);
    expect(intent.kind).toBe("QUERY_SUMMARY");
    if (intent.kind !== "QUERY_SUMMARY" || intent.payload.type === "all_branches") return;
    expect(intent.payload.shopId).toBe("shop1");
    expect(intent.payload.date).toBe("2026-06-16"); // tomorrow relative to 2026-06-15
  });

  it("summary other branch (สรุปหนองปิง)", () => {
    const intent = routeLineMessage("สรุปหนองปิง", today);
    expect(intent.kind).toBe("QUERY_SUMMARY");
    if (intent.kind !== "QUERY_SUMMARY" || intent.payload.type === "all_branches") return;
    expect(intent.payload.shopId).toBe("shop2");
  });

  it("all-branches summary (สรุปทุกสาขา)", () => {
    const intent = routeLineMessage("สรุปทุกสาขา", today);
    expect(intent.kind).toBe("QUERY_SUMMARY");
    if (intent.kind === "QUERY_SUMMARY") expect(intent.payload.type).toBe("all_branches");
  });

  it("summary with date only (สรุปเมื่อวาน)", () => {
    const intent = routeLineMessage("สรุปเมื่อวาน", today);
    expect(intent.kind).toBe("QUERY_SUMMARY");
    if (intent.kind === "QUERY_SUMMARY") expect(intent.payload.date).toBe("2026-06-14");
  });

  it("pork query with branch (ค่าหมูหนองปิง)", () => {
    const intent = routeLineMessage("ค่าหมูหนองปิง", today);
    expect(intent.kind).toBe("QUERY_PORK");
    if (intent.kind === "QUERY_PORK") expect(intent.payload.shopId).toBe("shop2");
  });

  it("report with branch + relative month (รายงานญี่ปุ่นเดือนที่แล้ว)", () => {
    const intent = routeLineMessage("รายงานญี่ปุ่นเดือนที่แล้ว", today);
    expect(intent.kind).toBe("QUERY_REPORT");
    if (intent.kind !== "QUERY_REPORT") return;
    expect(intent.payload.period).toBe("month");
    expect(intent.payload.month).toBe("2026-05");
    expect(intent.payload.shopId).toBe("shop1");
  });

  it("help (ช่วย)", () => {
    expect(routeLineMessage("ช่วย", today).kind).toBe("HELP");
  });
});
