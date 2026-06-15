import {
  parseCorrectionMessage,
  applyCorrectionActions,
  looksLikeCorrection,
  looksLikeCorrectionHelp,
} from "@/lib/services/financial-correction.service";
import type { FinancialRecord } from "@/lib/types/financial.types";

function emptyRecord(): FinancialRecord {
  return {
    id: "r1",
    date: "2026-06-15",
    shopId: "shop2",
    revenue: 6100,
    transfer: 3385,
    cash: 1000,
    delivery: 0,
    expense: 5000,
    pork: 0,
    porkBreakdown: {
      redQty: 4, redPrice: 0, redTotal: 0,
      mincedQty: 4, mincedPrice: 0, mincedTotal: 0,
      fatQty: 8, fatPrice: 0, fatTotal: 0,
      total: 0,
    },
    materials: 0,
    supplies: 0,
    gas: 150,
    labor: 1500,
    ice: 35,
    extraExpenses: [{ name: "แม็คโคร", amount: 3800 }, { name: "ต่อ", amount: 670 }],
    extraIncome: [{ name: "คนละครึ่ง", amount: 1265 }, { name: "ไลน์แมน", amount: 450 }],
    profit: 1100,
    marginPct: 18,
    note: "",
    status: "pending",
    incomplete: true,
    createdAt: "",
    updatedAt: "",
  };
}

describe("looksLikeCorrection", () => {
  it("detects แก้ and ลบ commands", () => {
    expect(looksLikeCorrection("แก้ โอน 3000")).toBe(true);
    expect(looksLikeCorrection("ลบ แม็คโคร")).toBe(true);
    expect(looksLikeCorrection("โอน 5000")).toBe(false);
  });

  it("detects ปรับ with branch prefix and shorthand ค่า", () => {
    expect(looksLikeCorrection("ญี่ปุ่น ปรับค่าแรง 850")).toBe(true);
    expect(looksLikeCorrection("ญี่ปุ่น ค่า 850")).toBe(true);
  });

  it("detects help", () => {
    expect(looksLikeCorrectionHelp("ช่วย")).toBe(true);
    expect(looksLikeCorrectionHelp("วิธีแก้")).toBe(true);
  });
});

describe("parseCorrectionMessage", () => {
  it("parses field updates", () => {
    expect(parseCorrectionMessage("แก้ โอน 3000")).toEqual([
      { op: "set", field: "transfer", value: 3000 },
    ]);
  });

  it("parses ปรับค่าแรง with branch prefix", () => {
    expect(parseCorrectionMessage("ญี่ปุ่น ปรับค่าแรง 850")).toEqual([
      { op: "set", field: "labor", value: 850 },
    ]);
  });

  it("parses recurring extra corrections", () => {
    expect(parseCorrectionMessage("แก้ ค่าเช่า 5000")).toEqual([
      { op: "setExtraExpense", name: "ค่าเช่า", amount: 5000 },
    ]);
  });

  it("parses shorthand ค่า as labor", () => {
    expect(parseCorrectionMessage("ญี่ปุ่น ค่า 850")).toEqual([
      { op: "set", field: "labor", value: 850 },
    ]);
  });

  it("parses pork price and qty+price", () => {
    expect(parseCorrectionMessage("แก้ แดง 130")).toEqual([
      { op: "set", field: "porkPrice", pork: "red", value: 130 },
    ]);
    expect(parseCorrectionMessage("แก้ สับ 4 135")).toEqual([
      { op: "set", field: "porkQtyPrice", pork: "minced", qty: 4, price: 135 },
    ]);
  });

  it("parses remove extra and clear revenue fields", () => {
    expect(parseCorrectionMessage("ลบ แม็คโคร")).toEqual([
      { op: "removeExtraExpense", name: "แม็คโคร" },
    ]);
    expect(parseCorrectionMessage("ลบ คนละครึ่ง")).toEqual([
      { op: "removeExtraIncome", name: "คนละครึ่ง" },
    ]);
    expect(parseCorrectionMessage("ลบ โอน")).toEqual([
      { op: "clear", field: "transfer" },
    ]);
  });

  it("parses multi-line corrections", () => {
    const actions = parseCorrectionMessage("แก้ โอน 3000\nลบ แม็คโคร");
    expect(actions).toHaveLength(2);
  });
});

describe("applyCorrectionActions", () => {
  it("updates transfer and removes expense", () => {
    let rec = emptyRecord();
    rec = applyCorrectionActions(rec, [
      { op: "set", field: "transfer", value: 3000 },
      { op: "removeExtraExpense", name: "แม็คโคร" },
    ]);
    expect(rec.transfer).toBe(3000);
    expect(rec.extraExpenses).toEqual([{ name: "ต่อ", amount: 670 }]);
  });

  it("sets pork price on existing qty", () => {
    const rec = applyCorrectionActions(emptyRecord(), [
      { op: "set", field: "porkPrice", pork: "red", value: 130 },
    ]);
    expect(rec.porkBreakdown?.redQty).toBe(4);
    expect(rec.porkBreakdown?.redPrice).toBe(130);
  });
});
