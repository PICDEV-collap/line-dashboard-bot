import { z } from "zod";
import { ValidationError } from "@/lib/utils/error-handler";
import type { PorkBreakdown } from "./financial.types";

export const PorkBreakdownSchema = z.object({
  redQty: z.number().default(0),
  redPrice: z.number().default(0),
  redTotal: z.number().default(0),
  mincedQty: z.number().default(0),
  mincedPrice: z.number().default(0),
  mincedTotal: z.number().default(0),
  fatQty: z.number().default(0),
  fatPrice: z.number().default(0),
  fatTotal: z.number().default(0),
  total: z.number().default(0),
});

export const ExtraExpenseSchema = z.object({
  name: z.string().min(1),
  amount: z.number(),
});

export const ExtraIncomeSchema = z.object({
  name: z.string().min(1),
  amount: z.number(),
});

export const RecordStatusSchema = z.enum(["complete", "pending", "draft"]);

export const CreateRecordSchema = z.object({
  date: z.string().regex(/^\d{4}-\d{2}-\d{2}$/, "Format date must be YYYY-MM-DD"),
  shopId: z.string().default("shop1"),
  shopName: z.string().optional(),
  revenue: z.number().default(0),
  transfer: z.number().default(0),
  cash: z.number().default(0),
  delivery: z.number().default(0),
  expense: z.number().default(0),
  pork: z.number().default(0),
  porkBreakdown: PorkBreakdownSchema.optional(),
  materials: z.number().default(0),
  supplies: z.number().default(0),
  gas: z.number().default(150),
  labor: z.number().default(1500),
  ice: z.number().default(35),
  extraExpenses: z.array(ExtraExpenseSchema).default([]),
  extraIncome: z.array(ExtraIncomeSchema).default([]),
  profit: z.number().optional(),
  note: z.string().default(""),
  status: RecordStatusSchema.default("complete"),
});

export const UpdateRecordSchema = CreateRecordSchema.partial().omit({ date: true });

export const RecordQueryParamsSchema = z.object({
  shopId: z.string().optional(),
  startDate: z.string().optional(),
  endDate: z.string().optional(),
  month: z.string().regex(/^\d{4}-\d{2}$/).optional(),
  page: z.coerce.number().int().min(1).default(1),
  limit: z.coerce.number().int().min(1).max(366).default(100),
  view: z.enum(["stats", "records"]).optional(),
});

/**
 * Validates data against a Zod schema and throws a clean ValidationError if validation fails.
 */
export function validateWithZod<T>(schema: z.ZodSchema<T>, data: unknown): T {
  const result = schema.safeParse(data);
  if (!result.success) {
    const issue = result.error.issues[0];
    const pathStr = issue.path.join(".");
    const errorMsg = pathStr ? `Invalid field '${pathStr}': ${issue.message}` : issue.message;
    throw new ValidationError(errorMsg);
  }
  return result.data;
}
