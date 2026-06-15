import { getSupabaseClient } from "@/lib/services/supabase.service";
import { createLogger } from "@/lib/middleware/logger";
import { generateId, getCurrentTimestamp } from "@/lib/utils/helpers";
import type {
  FinancialRecord,
  FinancialStats,
  PorkBreakdown,
  ExtraExpense,
} from "@/lib/types/financial.types";

const logger = createLogger("FinancialDBService");

// ──────────────────────────────────────────────────────────────
// Init (no-op — tables created via supabase/schema.sql)
// ──────────────────────────────────────────────────────────────

export async function initializeFinancialSheets(): Promise<void> {
  logger.info("Financial DB init skipped — Supabase tables managed via schema.sql");
}

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
    gas: Number(row.gas ?? 150),
    labor: Number(row.labor ?? 1500),
    ice: Number(row.ice ?? 35),
    extraExpenses: (row.extra_expenses as ExtraExpense[]) ?? [],
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
