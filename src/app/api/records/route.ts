import { NextRequest, NextResponse } from "next/server";
import { validateDashboardApiKey } from "@/lib/middleware/signature-validator";
import { createLogger } from "@/lib/middleware/logger";
import {
  getAllRecords,
  createRecord,
  getFinancialStats,
} from "@/lib/services/financial-records.service";
import {
  errorToApiResponse,
  getStatusCode,
  toApiResponse,
  ValidationError,
} from "@/lib/utils/error-handler";
import { CreateRecordSchema, RecordQueryParamsSchema, validateWithZod } from "@/lib/types/financial.schema";
import { ENV } from "@/config/constants";
import type { PorkBreakdown } from "@/lib/types/financial.types";

export const runtime = "nodejs";
export const maxDuration = 30;

const logger = createLogger("RecordsRoute");

// ──────────────────────────────────────────────────────────────
// GET /api/records — list records with filters
// ──────────────────────────────────────────────────────────────
export async function GET(request: NextRequest): Promise<NextResponse> {
  try {
    validateDashboardApiKey(request.headers.get("authorization"));
  } catch (error) {
    return NextResponse.json(errorToApiResponse(error), {
      status: getStatusCode(error),
    });
  }

  const { searchParams } = new URL(request.url);
  const rawQuery = Object.fromEntries(searchParams.entries());

  try {
    const params = validateWithZod(RecordQueryParamsSchema, rawQuery);
    const page = params.page ?? 1;
    const limit = params.limit ?? 100;

    if (params.view === "stats") {
      const stats = await getFinancialStats(
        params.shopId,
        params.startDate ?? (params.month ? `${params.month}-01` : undefined),
        params.endDate ?? (params.month ? `${params.month}-31` : undefined)
      );
      return NextResponse.json(toApiResponse(stats), {
        headers: { "Cache-Control": "s-maxage=30, stale-while-revalidate=60" },
      });
    }

    let records = await getAllRecords(params.shopId);

    // Date filters
    if (params.month) records = records.filter((r) => r.date.startsWith(params.month!));
    if (params.startDate) records = records.filter((r) => r.date >= params.startDate!);
    if (params.endDate) records = records.filter((r) => r.date <= params.endDate!);

    // Sort by date desc by default
    records.sort((a, b) => b.date.localeCompare(a.date));

    const total = records.length;
    const offset = (page - 1) * limit;
    const paged = records.slice(offset, offset + limit);

    logger.info("Records fetched", { total, page, limit, shopId: params.shopId });

    return NextResponse.json(
      toApiResponse({
        records: paged,
        pagination: { page, limit, total, hasMore: offset + limit < total },
      }),
      {
        headers: {
          "Cache-Control": "private, no-store, no-cache, must-revalidate",
          "Access-Control-Allow-Origin": "*",
        },
      }
    );
  } catch (error) {
    logger.error("GET /api/records failed", error);
    return NextResponse.json(errorToApiResponse(error), {
      status: getStatusCode(error),
    });
  }
}

// ──────────────────────────────────────────────────────────────
// POST /api/records — create new record
// ──────────────────────────────────────────────────────────────
export async function POST(request: NextRequest): Promise<NextResponse> {
  try {
    validateDashboardApiKey(request.headers.get("authorization"));
  } catch (error) {
    return NextResponse.json(errorToApiResponse(error), {
      status: getStatusCode(error),
    });
  }

  let body: unknown;
  try {
    body = await request.json();
  } catch {
    return NextResponse.json(
      errorToApiResponse(new ValidationError("Invalid JSON body")),
      { status: 400 }
    );
  }

  try {
    const v = validateWithZod(CreateRecordSchema, body);
    const rev = v.revenue ?? 0;
    const exp = v.expense ?? 0;

    let porkBreakdown: PorkBreakdown | undefined = undefined;
    if (v.porkBreakdown) {
      porkBreakdown = {
        redQty: v.porkBreakdown.redQty ?? 0,
        redPrice: v.porkBreakdown.redPrice ?? 0,
        redTotal: v.porkBreakdown.redTotal ?? 0,
        mincedQty: v.porkBreakdown.mincedQty ?? 0,
        mincedPrice: v.porkBreakdown.mincedPrice ?? 0,
        mincedTotal: v.porkBreakdown.mincedTotal ?? 0,
        fatQty: v.porkBreakdown.fatQty ?? 0,
        fatPrice: v.porkBreakdown.fatPrice ?? 0,
        fatTotal: v.porkBreakdown.fatTotal ?? 0,
        total: v.porkBreakdown.total ?? 0,
      };
    }

    const record = await createRecord({
      date: v.date,
      shopId: v.shopId || ENV.DEFAULT_SHOP_ID(),
      shopName: v.shopName || ENV.DEFAULT_SHOP_NAME(),
      revenue: rev,
      transfer: v.transfer ?? 0,
      cash: v.cash ?? 0,
      delivery: v.delivery ?? 0,
      expense: exp,
      pork: v.pork ?? 0,
      porkBreakdown,
      materials: v.materials ?? 0,
      supplies: v.supplies ?? 0,
      gas: v.gas ?? 150,
      labor: v.labor ?? 1500,
      ice: v.ice ?? 35,
      extraExpenses: v.extraExpenses ?? [],
      extraIncome: v.extraIncome ?? [],
      profit: v.profit ?? rev - exp,
      note: v.note ?? "",
      status: v.status ?? "complete",
    });

    logger.info("Record created via API", { id: record.id });
    return NextResponse.json(toApiResponse(record), { status: 201 });
  } catch (error) {
    logger.error("POST /api/records failed", error);
    return NextResponse.json(errorToApiResponse(error), {
      status: getStatusCode(error),
    });
  }
}

export async function OPTIONS(): Promise<NextResponse> {
  return new NextResponse(null, {
    status: 204,
    headers: {
      "Access-Control-Allow-Origin": "*",
      "Access-Control-Allow-Methods": "GET, POST, OPTIONS",
      "Access-Control-Allow-Headers": "Authorization, Content-Type",
    },
  });
}
