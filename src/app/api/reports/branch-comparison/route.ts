import { NextRequest, NextResponse } from "next/server";
import { getAllRecords } from "@/lib/services/financial-records.service";
import { compareBranches } from "@/lib/services/branch-analytics.service";
import { errorToApiResponse, AppError } from "@/lib/utils/error-handler";
import { ENV } from "@/config/constants";

export const runtime = "nodejs";

export async function GET(request: NextRequest): Promise<NextResponse> {
  const authHeader = request.headers.get("authorization");
  const expectedKey = ENV.DASHBOARD_API_KEY();

  if (expectedKey && (!authHeader || authHeader !== `Bearer ${expectedKey}`)) {
    return NextResponse.json(
      errorToApiResponse(new AppError("Unauthorized", 401)),
      { status: 401 }
    );
  }

  const { searchParams } = new URL(request.url);
  const month = searchParams.get("month") ?? undefined;

  try {
    let records = await getAllRecords();
    if (month) {
      records = records.filter((r) => r.date.startsWith(month));
    }
    const comparison = compareBranches(records, month ? `เดือน ${month}` : "ทั้งหมด");

    return NextResponse.json({
      success: true,
      data: comparison,
    });
  } catch (error) {
    return NextResponse.json(errorToApiResponse(error), { status: 500 });
  }
}
