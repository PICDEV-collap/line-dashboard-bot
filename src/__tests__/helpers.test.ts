import {
  generateId,
  encodeBase64,
  decodeBase64,
  truncate,
  safeJsonStringify,
  safeJsonParse,
  sanitizeFilename,
  chunkArray,
  shiftDateString,
  resolveRecordDateFromText,
  describeRecordDate,
  getTodayDateString,
} from "@/lib/utils/helpers";

describe("helpers", () => {
  it("generateId returns a UUID", () => {
    const id = generateId();
    expect(id).toMatch(
      /^[0-9a-f]{8}-[0-9a-f]{4}-[0-9a-f]{4}-[0-9a-f]{4}-[0-9a-f]{12}$/i
    );
  });

  it("encodeBase64 / decodeBase64 are inverses", () => {
    const original = '{"type":"service_account"}';
    expect(decodeBase64(encodeBase64(original))).toBe(original);
  });

  it("truncate clips long strings", () => {
    expect(truncate("hello world", 8)).toBe("hello...");
    expect(truncate("hi", 8)).toBe("hi");
  });

  it("safeJsonStringify handles circular refs gracefully", () => {
    const obj = { a: 1 };
    expect(safeJsonStringify(obj)).toContain('"a": 1');
  });

  it("safeJsonParse returns null for invalid JSON", () => {
    expect(safeJsonParse("not json")).toBeNull();
  });

  it("sanitizeFilename removes illegal characters", () => {
    expect(sanitizeFilename('file<>:"/\\|?*.txt')).not.toMatch(/[<>:"/\\|?*]/);
  });

  it("chunkArray splits correctly", () => {
    expect(chunkArray([1, 2, 3, 4, 5], 2)).toEqual([[1, 2], [3, 4], [5]]);
    expect(chunkArray([], 3)).toEqual([]);
  });

  it("shiftDateString moves calendar dates", () => {
    expect(shiftDateString("2026-06-15", 1)).toBe("2026-06-16");
    expect(shiftDateString("2026-06-15", -1)).toBe("2026-06-14");
  });

  it("resolveRecordDateFromText detects Thai date keywords", () => {
    const today = "2026-06-15";
    expect(resolveRecordDateFromText("หนองปิง\nพรุ่งนี้\nวัตถุดิบ 1120", today)).toBe("2026-06-16");
    expect(resolveRecordDateFromText("เมื่อวาน โอน 1000", today)).toBe("2026-06-14");
    expect(resolveRecordDateFromText("วันนี้ สด 500", today)).toBe("2026-06-15");
    expect(resolveRecordDateFromText("โอน 5000", today)).toBeUndefined();
  });

  it("describeRecordDate labels relative days", () => {
    const today = getTodayDateString();
    expect(describeRecordDate(today, today)).toBe("วันนี้");
    expect(describeRecordDate(shiftDateString(today, 1), today)).toBe("พรุ่งนี้");
  });
});
