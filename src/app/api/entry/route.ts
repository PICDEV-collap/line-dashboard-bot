import { NextRequest, NextResponse } from "next/server";
import { rateLimitMiddleware, getRateLimitHeaders } from "@/lib/middleware/rate-limiter";
import { createLogger } from "@/lib/middleware/logger";
import { createRecord, getLatestBranchDefaults } from "@/lib/services/financial-records.service";
import { CreateRecordSchema, validateWithZod } from "@/lib/types/financial.schema";
import { errorToApiResponse, getStatusCode, toApiResponse, ValidationError } from "@/lib/utils/error-handler";
import { ENV } from "@/config/constants";
import type { PorkBreakdown } from "@/lib/types/financial.types";

export const runtime = "nodejs";
export const maxDuration = 30;

const logger = createLogger("EntryFormRoute");

export async function GET(request: NextRequest): Promise<NextResponse> {
  const { searchParams } = new URL(request.url);
  const shopId = searchParams.get("shopId") || "shop1";
  const date = searchParams.get("date") || new Date().toISOString().split("T")[0];

  try {
    const data = await getLatestBranchDefaults(shopId, date);
    return NextResponse.json(toApiResponse(data));
  } catch (err) {
    logger.warn("GET /api/entry fallback", { err });
    return NextResponse.json(toApiResponse({
      existing: null,
      latestPorkPrices: { redPrice: 130, mincedPrice: 120, fatPrice: 80 },
      latestExpenses: { materials: 0, labor: 1500, gas: 150, ice: 35, extraExpenses: [] }
    }));
  }
}

export async function POST(request: NextRequest): Promise<NextResponse> {
  const ip =
    request.headers.get("x-forwarded-for")?.split(",")[0]?.trim() ??
    request.headers.get("x-real-ip") ??
    "unknown";

  const rateLimitHeaders = getRateLimitHeaders(ip);

  try {
    rateLimitMiddleware(ip);
  } catch (error) {
    logger.warn("Rate limit exceeded for entry form", { ip });
    return NextResponse.json(errorToApiResponse(error), {
      status: 429,
      headers: rateLimitHeaders,
    });
  }

  let body: unknown;
  try {
    body = await request.json();
  } catch {
    return NextResponse.json(
      errorToApiResponse(new ValidationError("Invalid JSON body")),
      { status: 400, headers: rateLimitHeaders }
    );
  }

  try {
    const v = validateWithZod(CreateRecordSchema, body);

    const transfer = v.transfer ?? 0;
    const cash = v.cash ?? 0;
    const delivery = v.delivery ?? 0;
    const extraIncomeTotal = (v.extraIncome ?? []).reduce((acc, cur) => acc + (cur.amount ?? 0), 0);
    const revenue = transfer + cash + delivery + extraIncomeTotal;

    let porkBreakdown: PorkBreakdown | undefined = undefined;
    let porkTotal = v.pork ?? 0;

    if (v.porkBreakdown) {
      const redTotal = (v.porkBreakdown.redQty ?? 0) * (v.porkBreakdown.redPrice ?? 0);
      const mincedTotal = (v.porkBreakdown.mincedQty ?? 0) * (v.porkBreakdown.mincedPrice ?? 0);
      const fatTotal = (v.porkBreakdown.fatQty ?? 0) * (v.porkBreakdown.fatPrice ?? 0);
      const calcTotal = redTotal + mincedTotal + fatTotal;

      porkBreakdown = {
        redQty: v.porkBreakdown.redQty ?? 0,
        redPrice: v.porkBreakdown.redPrice ?? 0,
        redTotal: v.porkBreakdown.redTotal ?? redTotal,
        mincedQty: v.porkBreakdown.mincedQty ?? 0,
        mincedPrice: v.porkBreakdown.mincedPrice ?? 0,
        mincedTotal: v.porkBreakdown.mincedTotal ?? mincedTotal,
        fatQty: v.porkBreakdown.fatQty ?? 0,
        fatPrice: v.porkBreakdown.fatPrice ?? 0,
        fatTotal: v.porkBreakdown.fatTotal ?? fatTotal,
        total: v.porkBreakdown.total ?? (calcTotal > 0 ? calcTotal : porkTotal),
      };
      if (porkBreakdown.total > 0) {
        porkTotal = porkBreakdown.total;
      }
    }

    const materials = v.materials ?? 0;
    const supplies = v.supplies ?? 0;
    const gas = v.gas ?? 0;
    const labor = v.labor ?? 0;
    const ice = v.ice ?? 0;
    const extraExpensesTotal = (v.extraExpenses ?? []).reduce((acc, cur) => acc + (cur.amount ?? 0), 0);
    const expense = porkTotal + materials + supplies + gas + labor + ice + extraExpensesTotal;

    const profit = revenue - expense;

    const record = await createRecord({
      date: v.date,
      shopId: v.shopId || ENV.DEFAULT_SHOP_ID(),
      shopName: v.shopName || ENV.DEFAULT_SHOP_NAME(),
      revenue,
      transfer,
      cash,
      delivery,
      expense,
      pork: porkTotal,
      porkBreakdown,
      materials,
      supplies,
      gas,
      labor,
      ice,
      extraExpenses: v.extraExpenses ?? [],
      extraIncome: v.extraIncome ?? [],
      profit,
      note: v.note ?? "",
      status: v.status ?? "complete",
    });

    logger.info("Record saved via Entry Form", { id: record.id, shopId: record.shopId, date: record.date });

    return NextResponse.json(toApiResponse(record), {
      status: 201,
      headers: rateLimitHeaders,
    });
  } catch (error) {
    logger.error("POST /api/entry failed", error);
    return NextResponse.json(errorToApiResponse(error), {
      status: getStatusCode(error),
      headers: rateLimitHeaders,
    });
  }
}
