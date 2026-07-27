process.env.SUPABASE_URL = "https://dummy.supabase.co";
process.env.SUPABASE_ANON_KEY = "dummy_key";
process.env.SUPABASE_SERVICE_KEY = "dummy_service_key";
process.env.LINE_CHANNEL_SECRET = "dummy_secret";
process.env.LINE_CHANNEL_ACCESS_TOKEN = "dummy_token";

import { parseFinancialMessageWithRegex } from "@/lib/services/financial-parser.service";
import { upsertParsedRecord } from "@/lib/services/financial-records.service";

// In-memory mock for Supabase database during tests
const memoryDb = new Map<string, any>();

jest.mock("@/lib/services/supabase.service", () => ({
  getSupabaseClient: () => ({
    from: (table: string) => {
      const builder: any = {
        select: () => builder,
        eq: () => builder,
        lt: () => builder,
        order: () => builder,
        limit: () => builder,
        maybeSingle: async () => {
          for (const [k, v] of memoryDb.entries()) {
            return { data: v, error: null };
          }
          return { data: null, error: null };
        },
        insert: (items: any[]) => ({
          select: () => ({
            single: async () => {
              const item = items[0];
              const key = `${item.shop_id}:${item.date}`;
              const row = {
                id: item.id || `rec_${Date.now()}`,
                date: item.date,
                shop_id: item.shop_id,
                shop_name: item.shop_name,
                revenue: item.revenue,
                transfer: item.transfer,
                cash: item.cash,
                delivery: item.delivery,
                expense: item.expense,
                pork: item.pork,
                pork_breakdown: item.pork_breakdown,
                materials: item.materials,
                supplies: item.supplies,
                gas: item.gas,
                labor: item.labor,
                ice: item.ice,
                extra_expenses: item.extra_expenses,
                extra_income: item.extra_income,
                profit: item.profit,
                note: item.note,
                status: item.status,
                created_at: new Date().toISOString(),
                updated_at: new Date().toISOString(),
              };
              memoryDb.set(key, row);
              return { data: row, error: null };
            },
          }),
        }),
        update: (item: any) => ({
          eq: (col: string, val: string) => ({
            select: () => ({
              single: async () => {
                let existingKey = Array.from(memoryDb.keys())[0] || "shop1:2026-07-27";
                const old = memoryDb.get(existingKey) || {};
                const row = { ...old, ...item, updated_at: new Date().toISOString() };
                memoryDb.set(existingKey, row);
                return { data: row, error: null };
              },
            }),
          }),
        }),
        upsert: (item: any) => ({
          select: () => ({
            single: async () => {
              const key = `${item.shop_id}:${item.date}`;
              const row = {
                id: item.id || `rec_${Date.now()}`,
                date: item.date,
                shop_id: item.shop_id,
                shop_name: item.shop_name,
                revenue: item.revenue,
                transfer: item.transfer,
                cash: item.cash,
                delivery: item.delivery,
                expense: item.expense,
                pork: item.pork,
                pork_breakdown: item.pork_breakdown,
                materials: item.materials,
                supplies: item.supplies,
                gas: item.gas,
                labor: item.labor,
                ice: item.ice,
                extra_expenses: item.extra_expenses,
                extra_income: item.extra_income,
                profit: item.profit,
                note: item.note,
                status: item.status,
                created_at: new Date().toISOString(),
                updated_at: new Date().toISOString(),
              };
              memoryDb.set(key, row);
              return { data: row, error: null };
            },
          }),
        }),
      };
      return builder;
    },
  }),
}));

describe("Incremental Additions and Ambiguous Input Handling", () => {
  beforeEach(() => {
    memoryDb.clear();
  });

  describe("Bug 1: Incremental Additions (e.g., เพิ่ม ครึ่ง 300)", () => {
    it("parses delivery aliases correctly (ไลน์แมน, ครึ่ง, เดลิเวอรี่)", () => {
      const res1 = parseFinancialMessageWithRegex("ไลน์แมน 500");
      expect(res1.delivery).toBe(500);

      const res2 = parseFinancialMessageWithRegex("เพิ่ม ครึ่ง 300");
      expect(res2.delivery).toBe(300);
      expect(res2.isIncremental).toBe(true);
    });

    it("accumulates delivery when isIncremental is true (500 + 300 = 800)", async () => {
      const date = "2026-07-27";
      const input1 = parseFinancialMessageWithRegex("ไลน์แมน 500");
      const rec1 = await upsertParsedRecord({
        date,
        shopId: "shop1",
        shopName: "ตลาดญี่ปุ่น",
        parsed: input1,
      });
      expect(rec1.delivery).toBe(500);

      const input2 = parseFinancialMessageWithRegex("เพิ่ม ครึ่ง 300");
      expect(input2.isIncremental).toBe(true);

      const rec2 = await upsertParsedRecord({
        date,
        shopId: "shop1",
        shopName: "ตลาดญี่ปุ่น",
        parsed: input2,
      });
      expect(rec2.delivery).toBe(800); // 500 + 300 = 800
    });

    it("accumulates pork quantity when isIncremental is true", async () => {
      const date = "2026-07-27";
      const input1 = parseFinancialMessageWithRegex("หมูแดง 3 กก");
      await upsertParsedRecord({
        date,
        shopId: "shop1",
        shopName: "ตลาดญี่ปุ่น",
        parsed: input1,
      });

      const input2 = parseFinancialMessageWithRegex("เพิ่ม หมูแดง 2 กก");
      expect(input2.isIncremental).toBe(true);

      const rec2 = await upsertParsedRecord({
        date,
        shopId: "shop1",
        shopName: "ตลาดญี่ปุ่น",
        parsed: input2,
      });
      expect(rec2.porkBreakdown?.redQty).toBe(5); // 3 + 2 = 5
    });
  });

  describe("Bug 2: Ambiguous Financial Input Handling", () => {
    it("flags ambiguous financial messages without numbers as isAmbiguous: true", () => {
      const parsed1 = parseFinancialMessageWithRegex("ไลน์แมน");
      expect(parsed1.isAmbiguous).toBe(true);
      expect(parsed1.isFinancialData).toBe(false);

      const parsed2 = parseFinancialMessageWithRegex("โอน");
      expect(parsed2.isAmbiguous).toBe(true);
      expect(parsed2.isFinancialData).toBe(false);

      const parsed3 = parseFinancialMessageWithRegex("สั่งหมูแดงอย่างเดียว");
      expect(parsed3.isAmbiguous).toBe(true);
      expect(parsed3.isFinancialData).toBe(false);
    });

    it("does not flag complete financial messages as ambiguous", () => {
      const parsed = parseFinancialMessageWithRegex("โอน 500 สด 300");
      expect(parsed.isAmbiguous).toBeUndefined();
      expect(parsed.isFinancialData).toBe(true);
      expect(parsed.transfer).toBe(500);
      expect(parsed.cash).toBe(300);
    });
  });
});
