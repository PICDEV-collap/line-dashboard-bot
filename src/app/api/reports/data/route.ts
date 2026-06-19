import { NextRequest, NextResponse } from "next/server";
import { createLogger } from "@/lib/middleware/logger";
import { getAllRecords } from "@/lib/services/financial-records.service";
import { getReportToken } from "@/lib/services/report.service";
import { errorToApiResponse, getStatusCode, toApiResponse } from "@/lib/utils/error-handler";

export const runtime = "nodejs";
export const maxDuration = 30;

const logger = createLogger("ReportsDataRoute");

const CORS = {
  "Access-Control-Allow-Origin": "*",
  "Access-Control-Allow-Methods": "GET, OPTIONS",
  "Access-Control-Allow-Headers": "Content-Type",
};

/**
 * GET /api/reports/data?period=month&month=YYYY-MM&shopId=shop1&t=<token>
 * Public read endpoint for the standalone report page (report.html).
 * Authorized by a per-deployment report token (NOT the raw dashboard key).
 */
export async function GET(request: NextRequest): Promise<NextResponse> {
  const { searchParams } = new URL(request.url);

  let expected: string;
  try {
    expected = getReportToken();
  } catch (error) {
    logger.error("Report token unavailable (missing DASHBOARD_API_KEY?)", error);
    return NextResponse.json({ success: false, error: "Server not configured" }, { status: 500, headers: CORS });
  }

  const token = searchParams.get("t");
  if (!token || token !== expected) {
    return NextResponse.json({ success: false, error: "Unauthorized" }, { status: 401, headers: CORS });
  }

  const period = searchParams.get("period") === "year" ? "year" : "month";
  const shopId = searchParams.get("shopId") || undefined;
  const key = period === "year" ? (searchParams.get("year") || "") : (searchParams.get("month") || "");

  try {
    let records = await getAllRecords(shopId);
    if (key) records = records.filter((r) => r.date.startsWith(key));

    logger.info("Report data fetched", { period, key, shopId: shopId ?? "all", count: records.length });

    return NextResponse.json(
      toApiResponse({ records, period, key, shopId: shopId ?? "all" }),
      { headers: { ...CORS, "Cache-Control": "private, no-store" } }
    );
  } catch (error) {
    logger.error("Report data fetch failed", error);
    return NextResponse.json(errorToApiResponse(error), { status: getStatusCode(error), headers: CORS });
  }
}

export async function OPTIONS(): Promise<NextResponse> {
  return new NextResponse(null, { status: 204, headers: CORS });
}
