import { NextRequest, NextResponse } from "next/server";
import { validateDashboardApiKey } from "@/lib/middleware/signature-validator";
import { createLogger } from "@/lib/middleware/logger";
import {
  getAllRecords,
  createRecord,
  getFinancialStats,
  initializeFinancialSheets,
} from "@/lib/services/financial-sheets.service";
import {
  errorToApiResponse,
  getStatusCode,
  toApiResponse,
  ValidationError,
} from "@/lib/utils/error-handler";
import { ENV } from "@/config/constants";
import type { FinancialRecord } from "@/lib/types/financial.types";

export const runtime = "nodejs";
export const maxDuration = 30;

const logger = createLogger("RecordsRoute");

let initialized = false;
async function ensureInit() {
  if (initialized) return;
  await initializeFinancialSheets();
  initialized = true;
}

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

  await ensureInit();

  const { searchParams } = new URL(request.url);
  const shopId = searchParams.get("shopId") ?? undefined;
  const startDate = searchParams.get("startDate") ?? undefined;
  const endDate = searchParams.get("endDate") ?? undefined;
  const month = searchParams.get("month") ?? undefined; // YYYY-MM
  const view = searchParams.get("view"); // "stats" | "records"
  const page = Math.max(1, parseInt(searchParams.get("page") ?? "1"));
  const limit = Math.min(366, Math.max(1, parseInt(searchParams.get("limit") ?? "100")));

  try {
    if (view === "stats") {
      const stats = await getFinancialStats(
        shopId,
        startDate ?? (month ? `${month}-01` : undefined),
        endDate ?? (month ? `${month}-31` : undefined)
      );
      return NextResponse.json(toApiResponse(stats), {
        headers: { "Cache-Control": "s-maxage=30, stale-while-revalidate=60" },
      });
    }

    let records = await getAllRecords(shopId);

    // Date filters
    if (month) records = records.filter((r) => r.date.startsWith(month));
    if (startDate) records = records.filter((r) => r.date >= startDate);
    if (endDate) records = records.filter((r) => r.date <= endDate);

    // Sort by date desc by default
    records.sort((a, b) => b.date.localeCompare(a.date));

    const total = records.length;
    const offset = (page - 1) * limit;
    const paged = records.slice(offset, offset + limit);

    logger.info("Records fetched", { total, page, limit, shopId });

    return NextResponse.json(
      toApiResponse({
        records: paged,
        pagination: { page, limit, total, hasMore: offset + limit < total },
      }),
      {
        headers: {
          "Cache-Control": "s-maxage=10, stale-while-revalidate=30",
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

  await ensureInit();

  let body: Partial<FinancialRecord>;
  try {
    body = await request.json();
  } catch {
    return NextResponse.json(
      errorToApiResponse(new ValidationError("Invalid JSON body")),
      { status: 400 }
    );
  }

  if (!body.date) {
    return NextResponse.json(
      errorToApiResponse(new ValidationError("date is required")),
      { status: 400 }
    );
  }

  try {
    const record = await createRecord({
      date: body.date,
      shopId: body.shopId ?? ENV.DEFAULT_SHOP_ID(),
      shopName: body.shopName ?? ENV.DEFAULT_SHOP_NAME(),
      revenue: body.revenue ?? 0,
      transfer: body.transfer ?? 0,
      cash: body.cash ?? 0,
      delivery: body.delivery ?? 0,
      expense: body.expense ?? 0,
      pork: body.pork ?? 0,
      porkBreakdown: body.porkBreakdown,
      materials: body.materials ?? 0,
      supplies: body.supplies ?? 0,
      gas: body.gas ?? 150,
      labor: body.labor ?? 1500,
      ice: body.ice ?? 35,
      extraExpenses: body.extraExpenses ?? [],
      extraIncome: body.extraIncome ?? [],
      profit: body.profit ?? (body.revenue ?? 0) - (body.expense ?? 0),
      note: body.note ?? "",
      status: body.status ?? "complete",
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
