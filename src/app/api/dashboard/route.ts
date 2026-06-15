import { NextRequest, NextResponse } from "next/server";
import { validateDashboardApiKey } from "@/lib/middleware/signature-validator";
import { createLogger } from "@/lib/middleware/logger";
import { getDashboardStats, getMessages } from "@/lib/services/google-sheets.service";
import { errorToApiResponse, getStatusCode, toApiResponse } from "@/lib/utils/error-handler";

export const runtime = "nodejs";
export const maxDuration = 30;

const logger = createLogger("DashboardRoute");

export async function GET(request: NextRequest): Promise<NextResponse> {
  // Validate API key
  try {
    validateDashboardApiKey(request.headers.get("authorization"));
  } catch (error) {
    return NextResponse.json(errorToApiResponse(error), {
      status: getStatusCode(error),
    });
  }

  const { searchParams } = new URL(request.url);
  const page = Math.max(1, parseInt(searchParams.get("page") ?? "1"));
  const limit = Math.min(100, Math.max(1, parseInt(searchParams.get("limit") ?? "50")));
  const offset = (page - 1) * limit;

  try {
    const messages = await getMessages(limit, offset);

    logger.info("Dashboard messages fetched", { page, limit, count: messages.length });

    return NextResponse.json(
      toApiResponse({
        messages,
        pagination: { page, limit, offset, count: messages.length },
      })
    );
  } catch (error) {
    logger.error("Dashboard fetch failed", error);
    return NextResponse.json(errorToApiResponse(error), {
      status: getStatusCode(error),
    });
  }
}

// CORS preflight for Looker Studio
export async function OPTIONS(): Promise<NextResponse> {
  return new NextResponse(null, {
    status: 204,
    headers: {
      "Access-Control-Allow-Origin": "*",
      "Access-Control-Allow-Methods": "GET, OPTIONS",
      "Access-Control-Allow-Headers": "Authorization, Content-Type",
    },
  });
}
