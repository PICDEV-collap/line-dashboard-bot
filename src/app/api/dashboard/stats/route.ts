import { NextRequest, NextResponse } from "next/server";
import { validateDashboardApiKey } from "@/lib/middleware/signature-validator";
import { createLogger } from "@/lib/middleware/logger";
import { getDashboardStats } from "@/lib/services/google-sheets.service";
import { errorToApiResponse, getStatusCode, toApiResponse } from "@/lib/utils/error-handler";

export const runtime = "nodejs";
export const maxDuration = 30;

const logger = createLogger("DashboardStatsRoute");

/**
 * GET /api/dashboard/stats
 * Returns aggregated statistics for Looker Studio data source.
 *
 * Looker Studio Community Connector endpoint:
 * - No auth required for public connector OR pass API key in Authorization header
 * - Returns flat data structure for easy schema mapping
 */
export async function GET(request: NextRequest): Promise<NextResponse> {
  const authHeader = request.headers.get("authorization");

  // Allow unauthenticated access only if DASHBOARD_API_KEY is not set (dev mode)
  if (authHeader || process.env.NODE_ENV === "production") {
    try {
      validateDashboardApiKey(authHeader);
    } catch (error) {
      return NextResponse.json(errorToApiResponse(error), {
        status: getStatusCode(error),
      });
    }
  }

  try {
    const stats = await getDashboardStats();

    logger.info("Stats fetched for dashboard", {
      totalMessages: stats.totalMessages,
    });

    // Flat format optimized for Looker Studio
    const lookerStudioData = {
      summary: {
        totalMessages: stats.totalMessages,
        todayMessages: stats.todayMessages,
        successRate: stats.successRate,
        errorCount: stats.errorCount,
      },
      byType: {
        text: stats.textCount,
        image: stats.imageCount,
        pdf: stats.pdfCount,
        location: stats.locationCount,
        ocr: stats.ocrCount,
      },
      recentMessages: stats.recentMessages.slice(0, 10).map((m) => ({
        id: m.id,
        timestamp: m.timestamp,
        userId: m.userId,
        displayName: m.displayName,
        type: m.type,
        status: m.status,
        hasImage: !!m.imageUrl,
        hasLocation: !!m.locationLat,
      })),
      updatedAt: new Date().toISOString(),
    };

    return NextResponse.json(toApiResponse(lookerStudioData), {
      headers: {
        "Cache-Control": "s-maxage=60, stale-while-revalidate=300",
        "Access-Control-Allow-Origin": "*",
      },
    });
  } catch (error) {
    logger.error("Stats fetch failed", error);
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
      "Access-Control-Allow-Methods": "GET, OPTIONS",
      "Access-Control-Allow-Headers": "Authorization, Content-Type",
    },
  });
}
