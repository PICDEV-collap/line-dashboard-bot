import { getSupabaseClient } from "@/lib/services/supabase.service";
import { createLogger } from "@/lib/middleware/logger";
import { generateId, getCurrentTimestamp } from "@/lib/utils/helpers";
import { DEFAULT_EXPENSES } from "@/config/constants";
import { sanitizeExtraLedger } from "@/lib/services/financial-parser.service";
import type {
  FinancialRecord,
  FinancialStats,
  PorkBreakdown,
  ExtraExpense,
  ExtraIncome,
  ParsedFinancialInput,
  RecordStatus,
} from "@/lib/types/financial.types";

const logger = createLogger("FinancialRecordsService");

// ──────────────────────────────────────────────────────────────
// Row mapper
// ──────────────────────────────────────────────────────────────

function rowToRecord(row: Record<string, unknown>): FinancialRecord {
  const revenue = Number(row.revenue ?? 0);
  const profit = Number(row.profit ?? 0);
  return {
    id: String(row.id ?? ""),
    date: String(row.date ?? ""),
    shopId: String(row.shop_id ?? ""),
    shopName: String(row.shop_name ?? ""),
    revenue,
    transfer: Number(row.transfer ?? 0),
    cash: Number(row.cash ?? 0),
    delivery: Number(row.delivery ?? 0),
    expense: Number(row.expense ?? 0),
    pork: Number(row.pork ?? 0),
    porkBreakdown: row.pork_breakdown as PorkBreakdown | undefined,
    materials: Number(row.materials ?? 0),
    supplies: Number(row.supplies ?? 0),
    gas: Number(row.gas ?? DEFAULT_EXPENSES.gas),
    labor: Number(row.labor ?? DEFAULT_EXPENSES.labor),
    ice: Number(row.ice ?? DEFAULT_EXPENSES.ice),
    extraExpenses: (row.extra_expenses as ExtraExpense[]) ?? [],
    extraIncome: (row.extra_income as ExtraIncome[]) ?? [],
    profit,
    marginPct: Number(row.margin_pct ?? 0),
    note: String(row.note ?? ""),
    status: (row.status as FinancialRecord["status"]) ?? "complete",
    incomplete: row.status !== "complete",
    createdAt: String(row.created_at ?? ""),
    updatedAt: String(row.updated_at ?? ""),
  };
}

// ──────────────────────────────────────────────────────────────
// CRUD
// ──────────────────────────────────────────────────────────────

export async function getAllRecords(shopId?: string): Promise<FinancialRecord[]> {
  const db = getSupabaseClient();
  let q = db
    .from("financial_records")
    .select("*")
    .order("date", { ascending: true });
  if (shopId) q = q.eq("shop_id", shopId);
  const { data, error } = await q;
  if (error) throw new Error(`DB query error (financial_records): ${error.message}`);
  return (data ?? []).map((r) => rowToRecord(r as Record<string, unknown>));
}

export async function getRecordById(id: string): Promise<FinancialRecord | null> {
  const db = getSupabaseClient();
  const { data, error } = await db
    .from("financial_records")
    .select("*")
    .eq("id", id)
    .maybeSingle();
  if (error) throw new Error(`DB query error (financial_records): ${error.message}`);
  return data ? rowToRecord(data as Record<string, unknown>) : null;
}

export async function createRecord(
  data: Omit<FinancialRecord, "id" | "createdAt" | "updatedAt" | "marginPct" | "incomplete">
): Promise<FinancialRecord> {
  const now = getCurrentTimestamp();
  const id = generateId();
  const marginPct = data.revenue > 0 ? (data.profit / data.revenue) * 100 : 0;

  const db = getSupabaseClient();
  const row = {
    id,
    date: data.date,
    shop_id: data.shopId,
    shop_name: data.shopName,
    revenue: data.revenue,
    transfer: data.transfer,
    cash: data.cash,
    delivery: data.delivery,
    expense: data.expense,
    pork: data.pork,
    pork_breakdown: data.porkBreakdown ?? null,
    materials: data.materials,
    supplies: data.supplies,
    gas: data.gas,
    labor: data.labor,
    ice: data.ice,
    extra_expenses: data.extraExpenses,
    extra_income: data.extraIncome ?? [],
    profit: data.profit,
    margin_pct: marginPct,
    note: data.note,
    status: data.status,
    created_at: now,
    updated_at: now,
  };

  const { data: inserted, error } = await db
    .from("financial_records")
    .upsert(row, { onConflict: "shop_id,date" })
    .select()
    .single();

  if (error) throw new Error(`DB insert error (financial_records): ${error.message}`);
  logger.info("Record created", { id, date: data.date });
  return rowToRecord(inserted as Record<string, unknown>);
}

export async function updateRecord(
  id: string,
  data: Partial<Omit<FinancialRecord, "id" | "createdAt">>
): Promise<FinancialRecord | null> {
  const db = getSupabaseClient();
  const { data: existing } = await db
    .from("financial_records")
    .select("*")
    .eq("id", id)
    .maybeSingle();
  if (!existing) return null;

  const merged = {
    ...rowToRecord(existing as Record<string, unknown>),
    ...data,
  };
  const marginPct =
    merged.revenue > 0 ? (merged.profit / merged.revenue) * 100 : 0;

  const { data: updated, error } = await db
    .from("financial_records")
    .update({
      date: merged.date,
      shop_id: merged.shopId,
      shop_name: merged.shopName,
      revenue: merged.revenue,
      transfer: merged.transfer,
      cash: merged.cash,
      delivery: merged.delivery,
      expense: merged.expense,
      pork: merged.pork,
      pork_breakdown: merged.porkBreakdown ?? null,
      materials: merged.materials,
      supplies: merged.supplies,
      gas: merged.gas,
      labor: merged.labor,
      ice: merged.ice,
      extra_expenses: merged.extraExpenses,
      extra_income: merged.extraIncome ?? [],
      profit: merged.profit,
      margin_pct: marginPct,
      note: merged.note,
      status: merged.status,
      updated_at: getCurrentTimestamp(),
    })
    .eq("id", id)
    .select()
    .single();

  if (error) throw new Error(`DB update error (financial_records): ${error.message}`);
  logger.info("Record updated", { id });
  return rowToRecord(updated as Record<string, unknown>);
}

// ──────────────────────────────────────────────────────────────
// Merge-upsert from a parsed LINE message
// Accumulates across multiple messages for the same shop+date
// instead of overwriting (e.g. revenue in one message, pork in another).
// ──────────────────────────────────────────────────────────────

async function getByShopDate(
  shopId: string,
  date: string
): Promise<FinancialRecord | null> {
  const db = getSupabaseClient();
  const { data, error } = await db
    .from("financial_records")
    .select("*")
    .eq("shop_id", shopId)
    .eq("date", date)
    .maybeSingle();
  if (error) throw new Error(`DB query error (financial_records): ${error.message}`);
  return data ? rowToRecord(data as Record<string, unknown>) : null;
}

// A newly-mentioned (non-zero) value wins; otherwise keep what's stored.
function pickNum(incoming: number | undefined, existing: number): number {
  return incoming && incoming > 0 ? incoming : existing;
}

// Pork: update qty/price only when the message provides them (qty from the
// bot, price often filled later on the dashboard — don't clobber it with 0).
function mergePork(
  incoming: { qty: number; price: number } | undefined,
  oldQty: number,
  oldPrice: number
): { qty: number; price: number; total: number } {
  const qty = incoming && incoming.qty > 0 ? incoming.qty : oldQty;
  const price = incoming && incoming.price > 0 ? incoming.price : oldPrice;
  return { qty, price, total: qty * price };
}

// Append new line-items, skipping exact (name+amount) duplicates.
function mergeList<T extends { name: string; amount: number }>(
  existing: T[],
  incoming: T[]
): T[] {
  const out = [...existing];
  for (const item of incoming) {
    if (!out.some((e) => e.name === item.name && e.amount === item.amount)) {
      out.push(item);
    }
  }
  return out;
}

export async function upsertParsedRecord(input: {
  date: string;
  shopId: string;
  shopName: string;
  parsed: ParsedFinancialInput;
}): Promise<FinancialRecord> {
  const existing = await getByShopDate(input.shopId, input.date);
  const p = input.parsed;
  const pb = existing?.porkBreakdown;

  const transfer = pickNum(p.transfer, existing?.transfer ?? 0);
  const cash = pickNum(p.cash, existing?.cash ?? 0);
  const delivery = pickNum(p.delivery, existing?.delivery ?? 0);

  let extraIncome = mergeList(existing?.extraIncome ?? [], p.extraIncome ?? []);
  let extraExpenses = mergeList(existing?.extraExpenses ?? [], p.extraExpenses ?? []);
  // Fix misclassified items (ได้/รับ in expenses) — also cleans legacy DB rows
  ({ extraIncome, extraExpenses } = sanitizeExtraLedger(extraIncome, extraExpenses));
  const extraIncomeTotal = extraIncome.reduce((s, e) => s + e.amount, 0);
  const revenue = transfer + cash + delivery + extraIncomeTotal;

  const red = mergePork(p.porkRed, pb?.redQty ?? 0, pb?.redPrice ?? 0);
  const minced = mergePork(p.porkMinced, pb?.mincedQty ?? 0, pb?.mincedPrice ?? 0);
  const fat = mergePork(p.porkFat, pb?.fatQty ?? 0, pb?.fatPrice ?? 0);
  const pork = red.total + minced.total + fat.total;
  const porkBreakdown: PorkBreakdown = {
    redQty: red.qty, redPrice: red.price, redTotal: red.total,
    mincedQty: minced.qty, mincedPrice: minced.price, mincedTotal: minced.total,
    fatQty: fat.qty, fatPrice: fat.price, fatTotal: fat.total,
    total: pork,
  };

  const materials = pickNum(p.materials, existing?.materials ?? 0);
  const supplies = pickNum(p.supplies, existing?.supplies ?? 0);
  const gas = pickNum(p.gas, existing?.gas ?? DEFAULT_EXPENSES.gas);
  const labor = pickNum(p.labor, existing?.labor ?? DEFAULT_EXPENSES.labor);
  const ice = pickNum(p.ice, existing?.ice ?? DEFAULT_EXPENSES.ice);

  const extraExpenseTotal = extraExpenses.reduce((s, e) => s + e.amount, 0);

  const expense = pork + materials + supplies + gas + labor + ice + extraExpenseTotal;
  const profit = revenue - expense;

  // Incomplete when there's no revenue yet, or pork qty was entered without a price.
  const porkNeedsPrice =
    (red.qty > 0 && red.price === 0) ||
    (minced.qty > 0 && minced.price === 0) ||
    (fat.qty > 0 && fat.price === 0);
  const status: RecordStatus = revenue === 0 || porkNeedsPrice ? "pending" : "complete";

  const note = p.note?.trim() ? p.note.trim() : existing?.note ?? "";

  const fields = {
    date: input.date,
    shopId: input.shopId,
    shopName: input.shopName,
    revenue, transfer, cash, delivery,
    expense, pork, porkBreakdown,
    materials, supplies, gas, labor, ice,
    extraExpenses, extraIncome,
    profit, note, status,
  };

  if (existing) {
    const updated = await updateRecord(existing.id, fields);
    return updated as FinancialRecord;
  }
  return createRecord(fields);
}

export async function deleteRecord(id: string): Promise<boolean> {
  const db = getSupabaseClient();
  const { error, count } = await db
    .from("financial_records")
    .delete({ count: "exact" })
    .eq("id", id);
  if (error) throw new Error(`DB delete error (financial_records): ${error.message}`);
  logger.info("Record deleted", { id });
  return (count ?? 0) > 0;
}

// ──────────────────────────────────────────────────────────────
// Bulk import (seed data) — idempotent via unique(shop_id, date)
// ──────────────────────────────────────────────────────────────

export async function bulkImportRecords(
  records: Omit<FinancialRecord, "id" | "createdAt" | "updatedAt" | "marginPct" | "incomplete">[]
): Promise<{ imported: number; skipped: number }> {
  const now = getCurrentTimestamp();
  const toInsert = records.map((r) => ({
    id: generateId(),
    date: r.date,
    shop_id: r.shopId,
    shop_name: r.shopName,
    revenue: r.revenue,
    transfer: r.transfer,
    cash: r.cash,
    delivery: r.delivery,
    expense: r.expense,
    pork: r.pork,
    pork_breakdown: r.porkBreakdown ?? null,
    materials: r.materials,
    supplies: r.supplies,
    gas: r.gas,
    labor: r.labor,
    ice: r.ice,
    extra_expenses: r.extraExpenses,
    extra_income: r.extraIncome ?? [],
    profit: r.profit,
    margin_pct: r.revenue > 0 ? (r.profit / r.revenue) * 100 : 0,
    note: r.note,
    status: r.status,
    created_at: now,
    updated_at: now,
  }));

  const db = getSupabaseClient();
  const { data, error } = await db
    .from("financial_records")
    .upsert(toInsert, { onConflict: "shop_id,date", ignoreDuplicates: true })
    .select();

  if (error) throw new Error(`DB bulk import error: ${error.message}`);

  const imported = (data ?? []).length;
  const skipped = records.length - imported;
  logger.info("Bulk import complete", { imported, skipped });
  return { imported, skipped };
}

// ──────────────────────────────────────────────────────────────
// Stats aggregation
// ──────────────────────────────────────────────────────────────

export async function getFinancialStats(
  shopId?: string,
  startDate?: string,
  endDate?: string
): Promise<FinancialStats> {
  let records = await getAllRecords(shopId);
  if (startDate) records = records.filter((r) => r.date >= startDate);
  if (endDate) records = records.filter((r) => r.date <= endDate);

  const totalRevenue = records.reduce((s, r) => s + r.revenue, 0);
  const totalExpense = records.reduce((s, r) => s + r.expense, 0);
  const totalProfit = records.reduce((s, r) => s + r.profit, 0);
  const n = records.length || 1;
  const extraTotal = records.reduce(
    (s, r) => s + r.extraExpenses.reduce((es, e) => es + e.amount, 0),
    0
  );

  return {
    totalRevenue,
    totalExpense,
    totalProfit,
    avgMarginPct: totalRevenue > 0 ? (totalProfit / totalRevenue) * 100 : 0,
    totalDays: records.length,
    profitDays: records.filter((r) => r.profit > 0 && !r.incomplete).length,
    lossDays: records.filter((r) => r.profit < 0).length,
    avgDailyRevenue: Math.round(totalRevenue / n),
    avgDailyProfit: Math.round(totalProfit / n),
    byPaymentMethod: {
      transfer: records.reduce((s, r) => s + r.transfer, 0),
      cash: records.reduce((s, r) => s + r.cash, 0),
      delivery: records.reduce((s, r) => s + r.delivery, 0),
    },
    byExpenseCategory: {
      pork: records.reduce((s, r) => s + r.pork, 0),
      materials: records.reduce((s, r) => s + r.materials, 0),
      supplies: records.reduce((s, r) => s + r.supplies, 0),
      gas: records.reduce((s, r) => s + r.gas, 0),
      labor: records.reduce((s, r) => s + r.labor, 0),
      ice: records.reduce((s, r) => s + r.ice, 0),
      extra: extraTotal,
    },
    recentRecords: records.slice(-20).reverse(),
  };
}
