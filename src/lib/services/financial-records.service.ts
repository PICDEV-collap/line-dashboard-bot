import { getSupabaseClient } from "@/lib/services/supabase.service";
import { createLogger } from "@/lib/middleware/logger";
import { generateId, getCurrentTimestamp } from "@/lib/utils/helpers";
import { DEFAULT_EXPENSES } from "@/config/constants";
import { sanitizeExtraLedger } from "@/lib/services/financial-parser.service";
import {
  applyCorrectionActions,
  parseCorrectionMessage,
} from "@/lib/services/financial-correction.service";
import { parseCorrectionWithGemini } from "@/lib/services/financial-parser.service";
import {
  buildCorrectionSummary,
  buildPorkPriceSavedHint,
  hasPorkPriceOnlyUpdate,
} from "@/lib/services/smart-command.service";
import {
  applyCarriedRecurringExtras,
  pickCarriedExpense,
  scanCarriedStandardExpenses,
  type CarriedDefaultsNotice,
} from "@/lib/services/recurring-expenses.service";
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

/** Fetch a single shop+date record (for summary replies). */
export async function getRecordByShopDate(
  shopId: string,
  date: string
): Promise<FinancialRecord | null> {
  return getByShopDate(shopId, date);
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
  oldPrice: number,
  carriedPrice = 0
): { qty: number; price: number; total: number; priceCarried: boolean } {
  const qty = incoming && incoming.qty > 0 ? incoming.qty : oldQty;
  let price = oldPrice;
  if (incoming && incoming.price > 0) price = incoming.price;
  else if (price === 0 && carriedPrice > 0 && qty > 0) price = carriedPrice;
  const priceCarried =
    price === carriedPrice &&
    carriedPrice > 0 &&
    qty > 0 &&
    !(incoming?.price ?? 0) &&
    oldPrice === 0;
  return { qty, price, total: qty * price, priceCarried };
}

export interface CarriedPorkPrices {
  redPrice: number;
  mincedPrice: number;
  fatPrice: number;
  redFrom?: string;
  mincedFrom?: string;
  fatFrom?: string;
}

/** Latest per-kg pork prices from records before `beforeDate` (same shop). */
export async function getCarriedPorkPrices(
  shopId: string,
  beforeDate: string
): Promise<CarriedPorkPrices> {
  const rows = await fetchPriorRecords(shopId, beforeDate);
  return scanCarriedPorkPrices(rows);
}

export interface CarriedPorkQuantities {
  porkRed?: { qty: number; price: number };
  porkMinced?: { qty: number; price: number };
  porkFat?: { qty: number; price: number };
  fromDate?: string;
}

/** Latest pork qty breakdown from a prior record (same shop). */
export async function getCarriedPorkQuantities(
  shopId: string,
  beforeDate: string
): Promise<CarriedPorkQuantities> {
  const rows = await fetchPriorRecords(shopId, beforeDate);
  for (const row of rows) {
    const pb = row.pork_breakdown;
    if (!pb) continue;
    if (pb.redQty > 0 || pb.mincedQty > 0 || pb.fatQty > 0) {
      return {
        porkRed: pb.redQty > 0 ? { qty: pb.redQty, price: 0 } : undefined,
        porkMinced: pb.mincedQty > 0 ? { qty: pb.mincedQty, price: 0 } : undefined,
        porkFat: pb.fatQty > 0 ? { qty: pb.fatQty, price: 0 } : undefined,
        fromDate: row.date,
      };
    }
  }
  return {};
}

function scanCarriedPorkPrices(
  rows: { date: string; pork_breakdown?: PorkBreakdown | null }[]
): CarriedPorkPrices {
  let redPrice = 0;
  let mincedPrice = 0;
  let fatPrice = 0;
  let redFrom: string | undefined;
  let mincedFrom: string | undefined;
  let fatFrom: string | undefined;

  for (const row of rows) {
    const pb = row.pork_breakdown;
    if (!pb) continue;
    if (!redPrice && pb.redPrice > 0) {
      redPrice = pb.redPrice;
      redFrom = row.date;
    }
    if (!mincedPrice && pb.mincedPrice > 0) {
      mincedPrice = pb.mincedPrice;
      mincedFrom = row.date;
    }
    if (!fatPrice && pb.fatPrice > 0) {
      fatPrice = pb.fatPrice;
      fatFrom = row.date;
    }
    if (redPrice && mincedPrice && fatPrice) break;
  }
  return { redPrice, mincedPrice, fatPrice, redFrom, mincedFrom, fatFrom };
}

async function fetchPriorRecords(shopId: string, beforeDate: string) {
  const db = getSupabaseClient();
  const { data, error } = await db
    .from("financial_records")
    .select("date, pork_breakdown, labor, ice, gas, extra_expenses")
    .eq("shop_id", shopId)
    .lt("date", beforeDate)
    .order("date", { ascending: false })
    .limit(60);
  if (error) throw new Error(`DB query error (carried defaults): ${error.message}`);
  return (data ?? []).map((row) => ({
    date: String(row.date),
    pork_breakdown: row.pork_breakdown as PorkBreakdown | null,
    labor: Number(row.labor ?? 0),
    ice: Number(row.ice ?? 0),
    gas: Number(row.gas ?? 0),
    extra_expenses: (row.extra_expenses as ExtraExpense[]) ?? [],
  }));
}

async function getCarriedDefaults(shopId: string, beforeDate: string) {
  const rows = await fetchPriorRecords(shopId, beforeDate);
  return {
    pork: scanCarriedPorkPrices(rows),
    standard: scanCarriedStandardExpenses(rows),
  };
}

export type { CarriedDefaultsNotice };

function finalizePorkBreakdown(pb: PorkBreakdown): PorkBreakdown {
  pb.redTotal = pb.redQty * pb.redPrice;
  pb.mincedTotal = pb.mincedQty * pb.mincedPrice;
  pb.fatTotal = pb.fatQty * pb.fatPrice;
  pb.total = pb.redTotal + pb.mincedTotal + pb.fatTotal;
  return pb;
}

function recomputeRecordTotals(
  fields: Pick<
    FinancialRecord,
    | "transfer"
    | "cash"
    | "delivery"
    | "extraIncome"
    | "extraExpenses"
    | "porkBreakdown"
    | "materials"
    | "supplies"
    | "gas"
    | "labor"
    | "ice"
    | "revenue"
  >
): {
  revenue: number;
  expense: number;
  profit: number;
  pork: number;
  porkBreakdown: PorkBreakdown;
  status: RecordStatus;
} {
  const pb = finalizePorkBreakdown({ ...(fields.porkBreakdown ?? {
    redQty: 0, redPrice: 0, redTotal: 0,
    mincedQty: 0, mincedPrice: 0, mincedTotal: 0,
    fatQty: 0, fatPrice: 0, fatTotal: 0,
    total: 0,
  }) });

  const extraIncomeTotal = (fields.extraIncome ?? []).reduce((s, e) => s + e.amount, 0);
  const extraExpenseTotal = (fields.extraExpenses ?? []).reduce((s, e) => s + e.amount, 0);
  const revenue = fields.transfer + fields.cash + fields.delivery + extraIncomeTotal;
  const pork = pb.total;
  const expense =
    pork + fields.materials + fields.supplies + fields.gas + fields.labor + fields.ice + extraExpenseTotal;
  const profit = revenue - expense;

  const porkNeedsPrice =
    (pb.redQty > 0 && pb.redPrice === 0) ||
    (pb.mincedQty > 0 && pb.mincedPrice === 0) ||
    (pb.fatQty > 0 && pb.fatPrice === 0);
  const status: RecordStatus = revenue === 0 || porkNeedsPrice ? "pending" : "complete";

  return { revenue, expense, profit, pork, porkBreakdown: pb, status };
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
}): Promise<FinancialRecord & { carryMeta?: CarriedDefaultsNotice }> {
  const existing = await getByShopDate(input.shopId, input.date);
  const p = input.parsed;
  const pb = existing?.porkBreakdown;
  const carried = await getCarriedDefaults(input.shopId, input.date);

  const transfer = pickNum(p.transfer, existing?.transfer ?? 0);
  const cash = pickNum(p.cash, existing?.cash ?? 0);
  const delivery = pickNum(p.delivery, existing?.delivery ?? 0);

  let extraIncome = mergeList(existing?.extraIncome ?? [], p.extraIncome ?? []);
  let extraExpenses = mergeList(existing?.extraExpenses ?? [], p.extraExpenses ?? []);
  ({ extraIncome, extraExpenses } = sanitizeExtraLedger(extraIncome, extraExpenses));

  const recurringMerge = applyCarriedRecurringExtras(
    extraExpenses,
    carried.standard.recurringExtras
  );
  extraExpenses = recurringMerge.extras;

  const red = mergePork(p.porkRed, pb?.redQty ?? 0, pb?.redPrice ?? 0, carried.pork.redPrice);
  const minced = mergePork(p.porkMinced, pb?.mincedQty ?? 0, pb?.mincedPrice ?? 0, carried.pork.mincedPrice);
  const fat = mergePork(p.porkFat, pb?.fatQty ?? 0, pb?.fatPrice ?? 0, carried.pork.fatPrice);

  const porkBreakdown: PorkBreakdown = {
    redQty: red.qty, redPrice: red.price, redTotal: red.total,
    mincedQty: minced.qty, mincedPrice: minced.price, mincedTotal: minced.total,
    fatQty: fat.qty, fatPrice: fat.price, fatTotal: fat.total,
    total: red.total + minced.total + fat.total,
  };

  const materials = pickNum(p.materials, existing?.materials ?? 0);
  const supplies = pickNum(p.supplies, existing?.supplies ?? 0);

  const gasPick = pickCarriedExpense(
    p.gas,
    existing?.gas ?? 0,
    carried.standard.gas,
    DEFAULT_EXPENSES.gas
  );
  const laborPick = pickCarriedExpense(
    p.labor,
    existing?.labor ?? 0,
    carried.standard.labor,
    DEFAULT_EXPENSES.labor
  );
  const icePick = pickCarriedExpense(
    p.ice,
    existing?.ice ?? 0,
    carried.standard.ice,
    DEFAULT_EXPENSES.ice
  );

  const note = p.note?.trim() ? p.note.trim() : existing?.note ?? "";

  const totals = recomputeRecordTotals({
    transfer, cash, delivery, extraIncome, extraExpenses, porkBreakdown,
    materials, supplies,
    gas: gasPick.value,
    labor: laborPick.value,
    ice: icePick.value,
    revenue: 0,
  });

  const carryMeta: CarriedDefaultsNotice = {};
  const porkFrom = [
    red.priceCarried ? carried.pork.redFrom : undefined,
    minced.priceCarried ? carried.pork.mincedFrom : undefined,
    fat.priceCarried ? carried.pork.fatFrom : undefined,
  ].filter(Boolean) as string[];
  if (porkFrom.length) carryMeta.porkFrom = porkFrom;

  const standardFrom = [
    laborPick.fromCarry ? carried.standard.laborFrom : undefined,
    icePick.fromCarry ? carried.standard.iceFrom : undefined,
    gasPick.fromCarry ? carried.standard.gasFrom : undefined,
  ].filter(Boolean) as string[];
  if (standardFrom.length) carryMeta.standardFrom = standardFrom;
  if (recurringMerge.carriedNames.length) {
    carryMeta.recurringCarried = recurringMerge.carriedNames;
  }

  const fields = {
    date: input.date,
    shopId: input.shopId,
    shopName: input.shopName,
    revenue: totals.revenue,
    transfer, cash, delivery,
    expense: totals.expense,
    pork: totals.pork,
    porkBreakdown: totals.porkBreakdown,
    materials, supplies,
    gas: gasPick.value,
    labor: laborPick.value,
    ice: icePick.value,
    extraExpenses, extraIncome,
    profit: totals.profit,
    note,
    status: totals.status,
  };

  const hasCarryMeta =
    (carryMeta.porkFrom?.length ?? 0) > 0 ||
    (carryMeta.standardFrom?.length ?? 0) > 0 ||
    (carryMeta.recurringCarried?.length ?? 0) > 0;

  if (existing) {
    const updated = await updateRecord(existing.id, fields);
    return { ...(updated as FinancialRecord), carryMeta: hasCarryMeta ? carryMeta : undefined };
  }
  const created = await createRecord(fields);
  return { ...created, carryMeta: hasCarryMeta ? carryMeta : undefined };
}

async function buildCarriedBaselineFields(shopId: string, date: string) {
  const carried = await getCarriedDefaults(shopId, date);
  const gasPick = pickCarriedExpense(undefined, 0, carried.standard.gas, DEFAULT_EXPENSES.gas);
  const laborPick = pickCarriedExpense(undefined, 0, carried.standard.labor, DEFAULT_EXPENSES.labor);
  const icePick = pickCarriedExpense(undefined, 0, carried.standard.ice, DEFAULT_EXPENSES.ice);
  const recurring = applyCarriedRecurringExtras([], carried.standard.recurringExtras);
  return {
    gas: gasPick.value,
    labor: laborPick.value,
    ice: icePick.value,
    extraExpenses: recurring.extras,
  };
}

/** Apply LINE correction commands (แก้/ลบ/เปลี่ยน) to today's record. */
export async function applyLineCorrection(input: {
  text: string;
  date: string;
  shopId: string;
  shopName: string;
}): Promise<{ record: FinancialRecord | null; message: string; applied: number }> {
  let actions = parseCorrectionMessage(input.text);
  if (actions.length === 0 && /หมู|แดง|สับ|มัน|ปรับ|แก้/.test(input.text)) {
    actions = await parseCorrectionWithGemini(input.text);
  }
  if (actions.length === 0) {
    return { record: null, message: "❌ ไม่เข้าใจคำสั่งแก้ไข — พิมพ์ \"ช่วย\" ดูวิธีใช้", applied: 0 };
  }

  let existing = await getByShopDate(input.shopId, input.date);
  if (!existing) {
    const baseline = await buildCarriedBaselineFields(input.shopId, input.date);
    existing = await createRecord({
      date: input.date,
      shopId: input.shopId,
      shopName: input.shopName,
      revenue: 0, transfer: 0, cash: 0, delivery: 0,
      expense: 0, pork: 0,
      porkBreakdown: {
        redQty: 0, redPrice: 0, redTotal: 0,
        mincedQty: 0, mincedPrice: 0, mincedTotal: 0,
        fatQty: 0, fatPrice: 0, fatTotal: 0,
        total: 0,
      },
      materials: 0, supplies: 0,
      gas: baseline.gas,
      labor: baseline.labor,
      ice: baseline.ice,
      extraExpenses: baseline.extraExpenses,
      extraIncome: [],
      profit: 0, note: "", status: "pending",
    });
  }

  const corrected = applyCorrectionActions(existing, actions);
  const totals = recomputeRecordTotals(corrected);

  const updated = await updateRecord(existing.id, {
    ...corrected,
    revenue: totals.revenue,
    expense: totals.expense,
    profit: totals.profit,
    pork: totals.pork,
    porkBreakdown: totals.porkBreakdown,
    status: totals.status,
  });

  let message = buildCorrectionSummary(actions);
  if (hasPorkPriceOnlyUpdate(actions)) {
    message += `\n${buildPorkPriceSavedHint()}`;
  }

  return {
    record: updated,
    message,
    applied: actions.length,
  };
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
