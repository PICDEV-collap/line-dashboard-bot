import { NextRequest, NextResponse } from "next/server";
import { getRichMenuDefinition } from "@/lib/services/line-richmenu.service";
import { validateDashboardApiKey } from "@/lib/middleware/signature-validator";
import { errorToApiResponse, getStatusCode, toApiResponse } from "@/lib/utils/error-handler";

export const runtime = "nodejs";

export async function GET(request: NextRequest): Promise<NextResponse> {
  try {
    validateDashboardApiKey(request.headers.get("authorization"));
  } catch (error) {
    return NextResponse.json(errorToApiResponse(error), {
      status: getStatusCode(error),
    });
  }

  const menu = getRichMenuDefinition();
  return NextResponse.json(toApiResponse({ richMenu: menu }));
}
