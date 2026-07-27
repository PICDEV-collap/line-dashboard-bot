import { getRichMenuDefinition } from "@/lib/services/line-richmenu.service";
import { buildQuickReplyPayload, getDefaultQuickReplies } from "@/lib/services/line-quick-reply.service";
import { buildPorkSummaryFlexCard, buildRecordConfirmationFlexCard } from "@/lib/services/line-flex.service";
import type { FinancialRecord } from "@/lib/types/financial.types";

describe("LINE Advanced Experience (Features 1-4)", () => {
  const dummyRecord: FinancialRecord = {
    id: "rec_flex",
    date: "2026-07-27",
    shopId: "shop1",
    shopName: "ตลาดญี่ปุ่น",
    revenue: 10000,
    transfer: 6000,
    cash: 4000,
    delivery: 0,
    expense: 5000,
    pork: 1500,
    porkBreakdown: {
      redQty: 5, redPrice: 130, redTotal: 650,
      mincedQty: 3, mincedPrice: 120, mincedTotal: 360,
      fatQty: 2, fatPrice: 80, fatTotal: 160,
      total: 1170,
    },
    materials: 1200,
    supplies: 300,
    gas: 150,
    labor: 1500,
    ice: 35,
    extraExpenses: [],
    extraIncome: [],
    profit: 5000,
    marginPct: 50,
    note: "",
    incomplete: false,
    status: "complete",
    createdAt: "2026-07-27T10:00:00Z",
    updatedAt: "2026-07-27T10:00:00Z",
  };

  describe("Feature 1: LINE Rich Menu Definition", () => {
    it("returns valid Rich Menu JSON with 6 grid areas", () => {
      const menu = getRichMenuDefinition();
      expect(menu.size).toEqual({ width: 2500, height: 1686 });
      expect(menu.areas.length).toBe(6);
      expect(menu.name).toContain("ร้านครูตอม");
    });
  });

  describe("Feature 2: LINE Quick Reply Builder", () => {
    it("returns default 6 quick reply action pills", () => {
      const items = getDefaultQuickReplies();
      expect(items.length).toBe(6);
      expect(items[0].action.label).toBe("📊 สรุปวันนี้");
    });

    it("formats LINE quick reply payload object", () => {
      const payload = buildQuickReplyPayload();
      expect(payload.items.length).toBe(6);
      expect(payload.items[0].type).toBe("action");
    });
  });

  describe("Feature 3: LINE Flex Message Templates", () => {
    it("generates record confirmation Flex Message JSON", () => {
      const flex = buildRecordConfirmationFlexCard(dummyRecord);
      expect(flex.type).toBe("flex");
      expect(flex.altText).toContain("บันทึกยอดสำเร็จ");
      expect(flex.contents.type).toBe("bubble");
    });

    it("generates pork summary Flex Message JSON", () => {
      const flex = buildPorkSummaryFlexCard(dummyRecord);
      expect(flex.type).toBe("flex");
      expect(flex.altText).toContain("รายงานยอดหมู");
      expect(flex.contents.header.backgroundColor).toBe("#D69E2E");
    });
  });

  describe("Pork Query Intent Routing", () => {
    it("routes ข้อมูลราคาหมู and สรุปหมู to QUERY_PORK intent", () => {
      const { routeLineMessage } = require("@/lib/services/thai-intent-router.service");
      const res1 = routeLineMessage("ข้อมูลราคาหมู");
      expect(res1.kind).toBe("QUERY_PORK");

      const res2 = routeLineMessage("สรุปหมู");
      expect(res2.kind).toBe("QUERY_PORK");

      const res3 = routeLineMessage("เช็คหมู");
      expect(res3.kind).toBe("QUERY_PORK");
    });
  });
});
