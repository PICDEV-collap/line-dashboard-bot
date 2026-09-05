import { getRichMenuDefinition } from "@/lib/services/line-richmenu.service";
import {
  buildDataEntryFlexCard,
  buildMainMenuFlexCard,
  buildSummaryBranchSelectorCard,
} from "@/lib/services/line-entry-form.service";
import { routeLineMessage } from "@/lib/services/thai-intent-router.service";

describe("LINE Menu Redesign & Easy Data Entry (TDD)", () => {
  describe("1. Rich Menu Definition", () => {
    it("provides standard 4-grid tiles with proper labels and actions", () => {
      const menu = getRichMenuDefinition();
      expect(menu.size).toEqual({ width: 2500, height: 843 });
      expect(menu.areas.length).toBe(4);

      // Tile 1: กรอกรายรับ-รายจ่าย (Top-Left)
      expect(menu.areas[0].action.label).toContain("กรอก");
      // Tile 2: สรุปวันนี้ (Top-Right)
      expect(menu.areas[1].action.label).toContain("สรุป");
      // Tile 3: เช็คหมู (Bottom-Left)
      expect(menu.areas[2].action.label).toContain("หมู");
      // Tile 4: ช่วยเหลือ (Bottom-Right)
      expect(menu.areas[3].action.label).toContain("ช่วย");
    });
  });

  describe("2. Interactive Flex Cards", () => {
    it("generates Data Entry Flex Card with web form link and prefill actions", () => {
      const baseUrl = "https://line-dashboard-bot.vercel.app";
      const flex = buildDataEntryFlexCard(baseUrl);

      expect(flex.type).toBe("flex");
      expect(flex.altText).toContain("ตารางบันทึกรายรับ - รายจ่าย");
      expect(flex.contents.type).toBe("bubble");

      // Verify it includes a direct action or link to /entry
      const jsonStr = JSON.stringify(flex);
      expect(jsonStr).toContain("/entry");
      expect(jsonStr).toContain("ตลาดญี่ปุ่น");
      expect(jsonStr).toContain("สายหนองปิง");
    });

    it("generates Main Menu Flex Card with 6 primary navigation tiles", () => {
      const baseUrl = "https://line-dashboard-bot.vercel.app";
      const flex = buildMainMenuFlexCard(baseUrl);

      expect(flex.type).toBe("flex");
      expect(flex.altText).toContain("เมนูหลัก");
      expect(flex.contents.type).toBe("bubble");

      const jsonStr = JSON.stringify(flex);
      expect(jsonStr).toContain("สรุปวันนี้");
      expect(jsonStr).toContain("เช็คยอดหมู");
    });

    it("generates Summary Branch Selector Flex Card with branch options", () => {
      const card = buildSummaryBranchSelectorCard();
      expect(card.type).toBe("flex");
      expect(card.altText).toContain("สรุปยอดขาย");
      expect(card.contents.type).toBe("bubble");

      const jsonStr = JSON.stringify(card);
      expect(jsonStr).toContain("รวมทุกสาขา");
      expect(jsonStr).toContain("ตลาดญี่ปุ่น");
      expect(jsonStr).toContain("สายหนองปิง");
      expect(jsonStr).toContain("สรุป ทั้งหมด");
      expect(jsonStr).toContain("สรุป ตลาดญี่ปุ่น");
      expect(jsonStr).toContain("สรุป สายหนองปิง");
    });
  });

  describe("3. Thai Intent Routing for Menu and Entry Form", () => {
    const today = "2026-09-05";

    it("routes entry form keywords to ENTRY_FORM intent", () => {
      const phrases = [
        "กรอกข้อมูล",
        "กรอกรายรับ",
        "กรอกรายจ่าย",
        "บันทึกยอด",
        "ลงยอด",
        "ลงรายจ่าย",
        "ฟอร์ม",
      ];
      for (const phrase of phrases) {
        const res = routeLineMessage(phrase, today);
        expect(res.kind).toBe("ENTRY_FORM");
      }
    });

    it("routes menu keywords to MENU intent", () => {
      const phrases = ["เมนู", "menu", "Menu", "แถบเมนู"];
      for (const phrase of phrases) {
        const res = routeLineMessage(phrase, today);
        expect(res.kind).toBe("MENU");
      }
    });
  });
});
