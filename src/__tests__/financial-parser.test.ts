import {
  extractExtraExpenses,
  extractExtraIncome,
  extractDeterministicPork,
  isIncomeLikeName,
  looksLikeFinancialData,
  looksLikeSummaryRequest,
  parseFinancialMessageWithRegex,
  parsePork,
  sanitizeExtraLedger,
  formatParsedDeltaItems,
  shouldUseShortConfirmation,
  buildRecordConfirmation,
  buildShortRecordConfirmation,
} from "@/lib/services/financial-parser.service";
import { resolveRecordDateFromText } from "@/lib/utils/helpers";
import type { FinancialRecord } from "@/lib/types/financial.types";

const RED = ["หมูแดง", "หมูเนื้อ", "แดง"];
const MINCED = ["หมูสับ", "สับ"];

describe("looksLikeFinancialData", () => {
  it("detects shorthand pork (แดง4 สับ3)", () => {
    expect(looksLikeFinancialData("ตลาดญี่ปุ่น\nแดง4 สับ3\nแม็คโคร 1300")).toBe(true);
  });

  it("detects full pork and revenue", () => {
    expect(looksLikeFinancialData("หมูแดง 4 กก 130")).toBe(true);
    expect(looksLikeFinancialData("โอน 5000 สด 3000")).toBe(true);
  });

  it("detects a branch name or purchase together with an amount", () => {
    expect(looksLikeFinancialData("หนองปิง ซื้อของ แม็คโคร 1220")).toBe(true);
    expect(looksLikeFinancialData("ตลาดญี่ปุ่น แดง4 สับ3 แม็คโคร 1300")).toBe(true);
  });

  it("detects income/expense prefix lines", () => {
    expect(looksLikeFinancialData("ได้คนละครึ่ง 1200")).toBe(true);
    expect(looksLikeFinancialData("รับเงินคืน 300")).toBe(true);
    expect(looksLikeFinancialData("จ่ายค่าขนม 500")).toBe(true);
    expect(looksLikeFinancialData("ซื้อของ แม็คโคร 1220")).toBe(true);
  });

  it("ignores plain chat", () => {
    expect(looksLikeFinancialData("สวัสดีครับ ขอบคุณมากนะ")).toBe(false);
    expect(looksLikeFinancialData("ขอบคุณ 2 ครั้งเลยนะ")).toBe(false);
  });
});

describe("parsePork", () => {
  it("captures shorthand qty without a price (price = 0)", () => {
    expect(parsePork("แดง4 สับ3", RED)).toEqual({ qty: 4, price: 0 });
    expect(parsePork("แดง4 สับ3", MINCED)).toEqual({ qty: 3, price: 0 });
  });

  it("captures full form with a price", () => {
    expect(parsePork("หมูแดง 4 กก 130", RED)).toEqual({ qty: 4, price: 130 });
    expect(parsePork("หมูสับ 3 กก ราคา 100", MINCED)).toEqual({ qty: 3, price: 100 });
  });

  it("returns undefined when the pork type is absent", () => {
    expect(parsePork("โอน 5000 สด 3000", RED)).toBeUndefined();
  });
});

describe("extractExtraIncome", () => {
  it("always treats คนละครึ่ง as income (never expense)", () => {
    expect(extractExtraIncome("ได้คนละครึ่ง1265")).toEqual([
      { name: "คนละครึ่ง", amount: 1265 },
    ]);
    expect(extractExtraIncome("คนละครึ่ง1265")).toEqual([
      { name: "คนละครึ่ง", amount: 1265 },
    ]);
    expect(extractExtraExpenses("ได้คนละครึ่ง1265")).toEqual([]);
    expect(extractExtraExpenses("คนละครึ่ง1265")).toEqual([]);
  });

  it("parses glued amounts without a space before digits", () => {
    expect(extractExtraExpenses("จ่ายลูก690")).toEqual([
      { name: "ลูก", amount: 690 },
    ]);
  });

  it("parses ได้ and รับ prefix lines", () => {
    expect(extractExtraIncome("ได้คนละครึ่ง 1200")).toEqual([
      { name: "คนละครึ่ง", amount: 1200 },
    ]);
    expect(extractExtraIncome("รับเงินคืน 300")).toEqual([
      { name: "เงินคืน", amount: 300 },
    ]);
  });

  it("keeps backward-compatible prefixes", () => {
    expect(extractExtraIncome("รายรับ คนละครึ่ง 1200")).toEqual([
      { name: "คนละครึ่ง", amount: 1200 },
    ]);
    expect(extractExtraIncome("+โบนัส 500")).toEqual([{ name: "โบนัส", amount: 500 }]);
  });

  it("does not treat ขายได้ as extra income", () => {
    expect(extractExtraIncome("ขายได้ 8000")).toEqual([]);
  });
});

describe("extractExtraExpenses", () => {
  it("parses จ่าย and ซื้อ prefix lines", () => {
    expect(extractExtraExpenses("จ่ายค่าขนม 500")).toEqual([
      { name: "ค่าขนม", amount: 500 },
    ]);
    expect(extractExtraExpenses("ซื้อของ แม็คโคร 1220")).toEqual([
      { name: "ของ แม็คโคร", amount: 1220 },
    ]);
  });

  it("strips branch name before matching", () => {
    expect(extractExtraExpenses("หนองปิง ซื้อของ แม็คโคร 1220")).toEqual([
      { name: "ของ แม็คโคร", amount: 1220 },
    ]);
  });
});

describe("parseFinancialMessageWithRegex", () => {
  it("parses a multi-line daily message with income and expenses", async () => {
    const text = [
      "ตลาดญี่ปุ่น",
      "โอน 5000 สด 3000",
      "ได้คนละครึ่ง 1200",
      "จ่ายค่าขนม 500",
      "ซื้อของ แม็คโคร 1300",
      "แดง4 สับ3",
    ].join("\n");

    const parsed = parseFinancialMessageWithRegex(text);

    expect(parsed.isFinancialData).toBe(true);
    expect(parsed.shopId).toBe("shop1");
    expect(parsed.transfer).toBe(5000);
    expect(parsed.cash).toBe(3000);
    expect(parsed.extraIncome).toEqual([{ name: "คนละครึ่ง", amount: 1200 }]);
    expect(parsed.extraExpenses).toEqual([
      { name: "ค่าขนม", amount: 500 },
      { name: "ของ แม็คโคร", amount: 1300 },
    ]);
    expect(parsed.porkRed).toEqual({ qty: 4, price: 0 });
    expect(parsed.porkMinced).toEqual({ qty: 3, price: 0 });
  });

  it("parses real LINE shorthand from shop2 (glued amounts)", () => {
    const text = [
      "หนองปิง",
      "โอน3385",
      "สด1000",
      "ได้คนละครึ่ง1265",
      "สับ4",
      "แดง4",
      "มันหมู 8",
      "จ่ายลูก690",
    ].join("\n");

    const parsed = parseFinancialMessageWithRegex(text);

    expect(parsed.shopId).toBe("shop2");
    expect(parsed.transfer).toBe(3385);
    expect(parsed.cash).toBe(1000);
    expect(parsed.extraIncome).toEqual([{ name: "คนละครึ่ง", amount: 1265 }]);
    expect(parsed.extraExpenses).toEqual([{ name: "ลูก", amount: 690 }]);
    expect(parsed.porkRed).toEqual({ qty: 4, price: 0 });
    expect(parsed.porkMinced).toEqual({ qty: 4, price: 0 });
    expect(parsed.porkFat).toEqual({ qty: 8, price: 0 });
  });

  it("parses screenshot message — ได้=รายรับ, จ่าย=รายจ่าย", () => {
    const text = [
      "หนองปิง",
      "โอน 3385",
      "สด 1000",
      "ได้คนละครึ่ง 1265",
      "สับ4",
      "แดง4",
      "มันหมู 8",
      "จ่ายต่อล 670",
      "ได้ไลน์แมน 450",
      "จ่ายแม็คโคร 3800",
    ].join("\n");

    const parsed = parseFinancialMessageWithRegex(text);

    expect(parsed.transfer).toBe(3385);
    expect(parsed.cash).toBe(1000);
    expect(parsed.extraIncome).toEqual(
      expect.arrayContaining([
        { name: "คนละครึ่ง", amount: 1265 },
        { name: "ไลน์แมน", amount: 450 },
      ])
    );
    expect(parsed.extraExpenses).toEqual(
      expect.arrayContaining([
        { name: "ต่อล", amount: 670 },
        { name: "แม็คโคร", amount: 3800 },
      ])
    );
    expect(parsed.extraExpenses!.every((e) => !isIncomeLikeName(e.name))).toBe(true);
  });

  it("parses LINE screenshot (19:42) — จ่ายต่อ without branch prefix", () => {
    const text = [
      "โอน 3385",
      "สด 1000",
      "ได้คนละครึ่ง 1265",
      "สับ 4",
      "แดง 4",
      "มันหมู 8",
      "จ่ายต่อ 670",
      "ได้ไลน์แมน 450",
      "จ่ายแม็คโคร 3800",
    ].join("\n");

    const parsed = parseFinancialMessageWithRegex(text);

    expect(parsed.extraIncome).toEqual(
      expect.arrayContaining([
        { name: "คนละครึ่ง", amount: 1265 },
        { name: "ไลน์แมน", amount: 450 },
      ])
    );
    expect(parsed.extraExpenses).toEqual(
      expect.arrayContaining([
        { name: "ต่อ", amount: 670 },
        { name: "แม็คโคร", amount: 3800 },
      ])
    );
    expect(parsed.extraExpenses!.every((e) => !isIncomeLikeName(e.name))).toBe(true);
  });

  it("sets date to tomorrow when message contains พรุ่งนี้", () => {
    const parsed = parseFinancialMessageWithRegex("หนองปิง\nพรุ่งนี้\nวัตถุดิบ 1120");
    expect(parsed.isFinancialData).toBe(true);
    expect(parsed.materials).toBe(1120);
    expect(parsed.date).toBe(resolveRecordDateFromText("พรุ่งนี้"));
    expect(parsed.shopId).toBe("shop2");
  });
});

describe("extractDeterministicPork", () => {
  it("parses หมูแดง and หมูสับ from natural text", () => {
    const result = extractDeterministicPork("หนองปิง\nแดง4\nสับ3\nมันหมู 8");
    expect(result.porkRed).toEqual({ qty: 4, price: 0 });
    expect(result.porkMinced).toEqual({ qty: 3, price: 0 });
    expect(result.porkFat).toEqual({ qty: 8, price: 0 });
  });
});

describe("sanitizeExtraLedger", () => {
  it("promotes misclassified ได้ items from expenses to income", () => {
    const result = sanitizeExtraLedger([], [
      { name: "ได้คนละครึ่ง", amount: 1265 },
      { name: "ได้ไลน์แมน", amount: 450 },
      { name: "แม็คโคร", amount: 3800 },
    ]);
    expect(result.extraIncome).toEqual(
      expect.arrayContaining([
        { name: "คนละครึ่ง", amount: 1265 },
        { name: "ไลน์แมน", amount: 450 },
      ])
    );
    expect(result.extraExpenses).toEqual([{ name: "แม็คโคร", amount: 3800 }]);
  });
});

const baseRecord: FinancialRecord = {
  id: "1",
  date: "2026-06-16",
  shopId: "shop2",
  shopName: "หนองปิง",
  revenue: 0,
  transfer: 0,
  cash: 0,
  delivery: 0,
  expense: 1970,
  pork: 0,
  materials: 1120,
  supplies: 0,
  gas: 150,
  labor: 850,
  ice: 35,
  extraExpenses: [],
  extraIncome: [],
  profit: -1970,
  marginPct: 0,
  note: "",
  status: "complete",
  incomplete: false,
  createdAt: "",
  updatedAt: "",
};

describe("reply messages", () => {
  it("looksLikeSummaryRequest detects summary commands", () => {
    expect(looksLikeSummaryRequest("สรุป")).toBe(true);
    expect(looksLikeSummaryRequest("หนองปิง สรุปพรุ่งนี้")).toBe(true);
    expect(looksLikeSummaryRequest("ดูยอด")).toBe(true);
    expect(looksLikeSummaryRequest("โอน 5000")).toBe(false);
  });

  it("formatParsedDeltaItems lists items from parsed message", () => {
    const items = formatParsedDeltaItems(
      parseFinancialMessageWithRegex("หนองปิง\nพรุ่งนี้\nวัตถุดิบ 1120")
    );
    expect(items).toEqual(["วัตถุดิบ ฿1,120"]);
  });

  it("shouldUseShortConfirmation for small messages", () => {
    const text = "หนองปิง\nพรุ่งนี้\nวัตถุดิบ 1120";
    const parsed = parseFinancialMessageWithRegex(text);
    expect(shouldUseShortConfirmation(parsed, text)).toBe(true);

    const longText = "หนองปิง\nโอน 5000\nสด 3000\nจ่ายแม็คโคร 3800\nแดง4";
    const longParsed = parseFinancialMessageWithRegex(longText);
    expect(shouldUseShortConfirmation(longParsed, longText)).toBe(false);
  });

  it("buildShortRecordConfirmation is compact", () => {
    const msg = buildShortRecordConfirmation(baseRecord, {
      mode: "short",
      addedItems: ["วัตถุดิบ ฿1,120"],
    });
    expect(msg).toContain("➕ เพิ่ม: วัตถุดิบ ฿1,120");
    expect(msg).toContain("📊 ยอดวันนั้น:");
    expect(msg).toContain('"สรุป"');
    expect(msg).not.toContain("หมูแดง");
  });

  it("buildRecordConfirmation hides empty income section", () => {
    const msg = buildRecordConfirmation(baseRecord, { mode: "full" });
    expect(msg).toContain("💰 รายรับ: (ยังไม่มี)");
    expect(msg).toContain("🫙 วัตถุดิบ: ฿1,120");
    expect(msg).not.toMatch(/รวม: ฿0/);
  });
});
