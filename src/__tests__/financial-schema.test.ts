import {
  CreateRecordSchema,
  RecordQueryParamsSchema,
  validateWithZod,
} from "@/lib/types/financial.schema";
import { ValidationError } from "@/lib/utils/error-handler";

describe("Financial Zod Schema Validation", () => {
  it("validates correct record creation payload", () => {
    const validData = {
      date: "2026-07-27",
      shopId: "shop1",
      revenue: 5000,
      transfer: 3000,
      cash: 2000,
      expense: 2500,
    };
    const parsed = validateWithZod(CreateRecordSchema, validData);
    expect(parsed.date).toBe("2026-07-27");
    expect(parsed.shopId).toBe("shop1");
    expect(parsed.revenue).toBe(5000);
    expect(parsed.gas).toBe(150); // default
  });

  it("throws ValidationError for invalid date format", () => {
    const invalidData = {
      date: "27-07-2026", // invalid format
      shopId: "shop1",
    };
    expect(() => validateWithZod(CreateRecordSchema, invalidData)).toThrow(
      ValidationError
    );
  });

  it("parses and coerces query parameters correctly", () => {
    const query = {
      page: "2",
      limit: "50",
      month: "2026-03",
    };
    const parsed = validateWithZod(RecordQueryParamsSchema, query);
    expect(parsed.page).toBe(2);
    expect(parsed.limit).toBe(50);
    expect(parsed.month).toBe("2026-03");
  });
});
