import {
  pickCarriedExpense,
  applyCarriedRecurringExtras,
  scanCarriedStandardExpenses,
  extractRecurringExpenses,
  recurringCategoryOf,
} from "@/lib/services/recurring-expenses.service";

describe("pickCarriedExpense", () => {
  it("prefers incoming, then existing, then carried, then default", () => {
    expect(pickCarriedExpense(900, 0, 850, 1500)).toEqual({ value: 900, fromCarry: false });
    expect(pickCarriedExpense(undefined, 800, 850, 1500)).toEqual({ value: 800, fromCarry: false });
    expect(pickCarriedExpense(undefined, 0, 850, 1500)).toEqual({ value: 850, fromCarry: true });
    expect(pickCarriedExpense(undefined, 0, 0, 1500)).toEqual({ value: 1500, fromCarry: false });
  });
});

describe("applyCarriedRecurringExtras", () => {
  it("adds missing rent/water/electricity from carried", () => {
    const result = applyCarriedRecurringExtras(
      [{ name: "แม็คโคร", amount: 3000 }],
      [
        { name: "ค่าเช่า", amount: 5000 },
        { name: "ค่าน้ำ", amount: 200 },
        { name: "ค่าไฟฟ้า", amount: 1200 },
      ]
    );
    expect(result.carriedNames).toEqual(["ค่าเช่า", "ค่าน้ำ", "ค่าไฟฟ้า"]);
    expect(result.extras).toHaveLength(4);
  });

  it("does not duplicate existing category", () => {
    const result = applyCarriedRecurringExtras(
      [{ name: "ค่าเช่า", amount: 4800 }],
      [{ name: "เช่า", amount: 5000 }]
    );
    expect(result.carriedNames).toEqual([]);
    expect(result.extras).toEqual([{ name: "ค่าเช่า", amount: 4800 }]);
  });
});

describe("scanCarriedStandardExpenses", () => {
  it("finds latest labor/ice/gas and recurring extras", () => {
    const result = scanCarriedStandardExpenses([
      { date: "2026-06-14", labor: 850, ice: 35, gas: 150, extra_expenses: [{ name: "ค่าเช่า", amount: 5000 }] },
      { date: "2026-06-10", labor: 800, extra_expenses: [{ name: "ค่าไฟ", amount: 1100 }, { name: "ค่าน้ำ", amount: 180 }] },
    ]);
    expect(result.labor).toBe(850);
    expect(result.laborFrom).toBe("2026-06-14");
    expect(result.recurringExtras).toEqual(
      expect.arrayContaining([
        { name: "ค่าเช่า", amount: 5000 },
        { name: "ค่าไฟฟ้า", amount: 1100 },
        { name: "ค่าน้ำ", amount: 180 },
      ])
    );
  });
});

describe("extractRecurringExpenses", () => {
  it("parses standalone recurring expense lines", () => {
    expect(extractRecurringExpenses("ค่าเช่า 5000\nค่าไฟ 1200")).toEqual([
      { name: "ค่าเช่า", amount: 5000 },
      { name: "ค่าไฟฟ้า", amount: 1200 },
    ]);
  });

  it("classifies recurring categories", () => {
    expect(recurringCategoryOf("เช่า")).toBe("rent");
    expect(recurringCategoryOf("ค่าไฟ")).toBe("electricity");
  });
});
