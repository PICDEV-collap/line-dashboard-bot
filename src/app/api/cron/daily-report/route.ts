import { NextRequest, NextResponse } from "next/server";
import { getAllRecords } from "@/lib/services/financial-records.service";
import { compareBranches } from "@/lib/services/branch-analytics.service";
import { analyzeRecordAnomalies, formatAnomalyNotice, type AnomalyAlert } from "@/lib/services/anomaly-detection.service";
import { pushText } from "@/lib/services/line.service";
import { getTodayDateString } from "@/lib/utils/helpers";
import { createLogger } from "@/lib/middleware/logger";
import { ENV } from "@/config/constants";
import type { FinancialRecord } from "@/lib/types/financial.types";

export const runtime = "nodejs";
export const maxDuration = 60;

const logger = createLogger("DailyReportCron");

export async function GET(request: NextRequest): Promise<NextResponse> {
  return handleDailyReport(request);
}

export async function POST(request: NextRequest): Promise<NextResponse> {
  return handleDailyReport(request);
}

async function handleDailyReport(request: NextRequest): Promise<NextResponse> {
  // 1. Authorization check
  const authHeader = request.headers.get("authorization");
  const isVercelCron = request.headers.get("x-vercel-cron") === "1";
  const expectedApiKey = ENV.DASHBOARD_API_KEY();

  const isAuthorized =
    isVercelCron ||
    !expectedApiKey ||
    authHeader === `Bearer ${expectedApiKey}` ||
    authHeader === `Bearer ${process.env.CRON_SECRET}`;

  if (!isAuthorized) {
    return NextResponse.json({ success: false, error: "Unauthorized" }, { status: 401 });
  }

  const { searchParams } = new URL(request.url);
  const date = searchParams.get("date") || getTodayDateString();
  const targetId = searchParams.get("target") || process.env.LINE_NOTIFY_TARGET_ID || "";

  try {
    // 2. Fetch today's records and historical records for anomaly analysis
    const allRecords: FinancialRecord[] = await getAllRecords();
    const todayRecords = allRecords.filter((r) => r.date === date);

    if (todayRecords.length === 0) {
      logger.info("No records found for date", { date });
      return NextResponse.json({
        success: true,
        message: `ไม่พบรายการการเงินประจำวันที่ ${date}`,
        pushed: false,
      });
    }

    // 3. Multi-branch summary & anomaly scan
    const comparison = compareBranches(todayRecords, `วันที่ ${date}`);
    const allAlerts: AnomalyAlert[] = [];

    for (const r of todayRecords) {
      const alerts = analyzeRecordAnomalies(r, allRecords);
      allAlerts.push(...alerts);
    }

    // 4. Format push text
    const fmt = (n: number) => n.toLocaleString("th-TH");

    const proto = request.headers.get("x-forwarded-proto") ?? "https";
    const host = request.headers.get("x-forwarded-host") ?? request.headers.get("host") ?? "";
    const dashboardUrl = host ? `${proto}://${host}/dashboard` : "/dashboard";

    const reportLines: string[] = [
      `🔔 **สรุปผลการดำเนินงานประจำวัน — ร้านครูตอม**`,
      `📅 วันที่: ${date}\n`,
      `💰 **รายรับรวม:** ฿${fmt(comparison.totalSystemRevenue)}`,
      `💸 **ค่าใช้จ่ายรวม:** ฿${fmt(comparison.totalSystemExpense)}`,
      `📈 **กำไรสุทธิ:** ฿${fmt(comparison.totalSystemProfit)}\n`,
    ];

    for (const b of Object.values(comparison.branches)) {
      reportLines.push(
        `🏪 **สาขา ${b.shopName}:**\n  • รายรับ: ฿${fmt(b.totalRevenue)} | กำไร: ฿${fmt(
          b.totalProfit
        )} (${b.avgMarginPct.toFixed(1)}%)`
      );
    }

    if (allAlerts.length > 0) {
      reportLines.push(formatAnomalyNotice(allAlerts));
    }

    reportLines.push(`\n📊 ดูข้อมูลละเอียดบน Web Dashboard: ${dashboardUrl}`);

    const reportText = reportLines.join("\n");

    // 5. Send LINE push message if target ID configured
    let pushed = false;
    if (targetId) {
      await pushText(targetId, reportText);
      pushed = true;
      logger.info("Daily report pushed to LINE target", { targetId });
    }

    return NextResponse.json({
      success: true,
      message: `สร้างรายงานประจำวันที่ ${date} สำเร็จ`,
      pushed,
      data: {
        date,
        totalRevenue: comparison.totalSystemRevenue,
        totalExpense: comparison.totalSystemExpense,
        totalProfit: comparison.totalSystemProfit,
        alertCount: allAlerts.length,
        reportText,
      },
    });
  } catch (error) {
    logger.error("Daily report cron failed", error);
    return NextResponse.json(
      { success: false, error: error instanceof Error ? error.message : "Internal error" },
      { status: 500 }
    );
  }
}
