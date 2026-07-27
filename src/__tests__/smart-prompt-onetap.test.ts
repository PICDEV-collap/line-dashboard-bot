import { buildMissingPorkPriceQuickReplies } from "@/lib/services/line-quick-reply.service";
import { detectMissingPorkPricePrompt } from "@/lib/services/financial-parser.service";
import { parseCorrectionMessage } from "@/lib/services/financial-correction.service";
import type { FinancialRecord } from "@/lib/types/financial.types";

describe("Feature 5: Smart Prompt & One-Tap Quick Reply Form", () => {
  const baseRecord: FinancialRecord = {
    id: "rec_prompt",
    date: "2026-07-27",
    shopId: "shop1",
    shopName: "ตลาดญี่ปุ่น",
    revenue: 10000,
    transfer: 6000,
    cash: 4000,
    delivery: 0,
    expense: 0,
    pork: 0,
    porkBreakdown: {
      redQty: 5, redPrice: 0, redTotal: 0,
      mincedQty: 0, mincedPrice: 0, mincedTotal: 0,
      fatQty: 0, fatPrice: 0, fatTotal: 0,
      total: 0,
    },
    materials: 0, supplies: 0, gas: 0, labor: 0, ice: 0,
    extraExpenses: [], extraIncome: [],
    profit: 10000, marginPct: 100, note: "", incomplete: true, status: "pending",
    createdAt: "2026-07-27T10:00:00Z", updatedAt: "2026-07-27T10:00:00Z",
  };

  describe("Quick Reply Form Builder", () => {
    it("includes 4 preset price buttons, 1 custom price button, and 1 summary shortcut", () => {
      const items = buildMissingPorkPriceQuickReplies("red");
      expect(items.length).toBe(6);
      expect(items[0].action.label).toBe("120 บ./กก.");
      expect(items[0].action.text).toBe("ราคาหมูแดง 120");

      expect(items[4].action.label).toBe("✏️ ระบุราคาเอง");
      expect(items[4].action.text).toBe("ตั้งราคาหมูแดง ");

      expect(items[5].action.label).toBe("📊 สรุปยอด");
    });
  });

  describe("Missing Price Prompt Detection", () => {
    it("detects unpriced red pork and returns prompt text + quick replies", () => {
      const prompt = detectMissingPorkPricePrompt(baseRecord);
      expect(prompt).not.toBeNull();
      expect(prompt?.kind).toBe("red");
      expect(prompt?.promptText).toContain("ขาดราคาต่อ กก. สำหรับหมูแดง (5 กก.)");
      expect(prompt?.quickReplies.length).toBe(6);
    });

    it("returns null when all pork prices are already specified", () => {
      const completeRecord: FinancialRecord = {
        ...baseRecord,
        porkBreakdown: {
          ...baseRecord.porkBreakdown!,
          redPrice: 130,
          redTotal: 650,
          total: 650,
        },
        status: "complete",
      };
      const prompt = detectMissingPorkPricePrompt(completeRecord);
      expect(prompt).toBeNull();
    });
  });

  describe("One-Tap and Custom Price Command Parsing", () => {
    it("parses preset price reply 'ราคาหมูแดง 130'", () => {
      const actions = parseCorrectionMessage("ราคาหมูแดง 130");
      expect(actions).toEqual([
        { op: "set", field: "porkPrice", pork: "red", value: 130 },
      ]);
    });

    it("parses custom price reply 'ตั้งราคาหมูแดง 135'", () => {
      const actions = parseCorrectionMessage("ตั้งราคาหมูแดง 135");
      expect(actions).toEqual([
        { op: "set", field: "porkPrice", pork: "red", value: 135 },
      ]);
    });
  });
});
