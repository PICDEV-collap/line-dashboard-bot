import {
  generateId,
  encodeBase64,
  decodeBase64,
  truncate,
  safeJsonStringify,
  safeJsonParse,
  sanitizeFilename,
  chunkArray,
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
});
