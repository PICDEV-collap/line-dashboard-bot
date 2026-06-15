import {
  looksLikeFinancialData,
  parsePork,
} from "@/lib/services/financial-parser.service";

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
