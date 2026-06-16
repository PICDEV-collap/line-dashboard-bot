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
