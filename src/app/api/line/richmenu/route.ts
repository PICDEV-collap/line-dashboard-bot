import { NextRequest, NextResponse } from "next/server";
import { getRichMenuDefinition, syncRichMenuToLine } from "@/lib/services/line-richmenu.service";
import { validateDashboardApiKey } from "@/lib/middleware/signature-validator";
import { errorToApiResponse, getStatusCode, toApiResponse } from "@/lib/utils/error-handler";
import { createLogger } from "@/lib/middleware/logger";

const logger = createLogger("LineRichMenuRoute");

export const runtime = "nodejs";

export async function GET(request: NextRequest): Promise<NextResponse> {
  const sync = request.nextUrl.searchParams.get("sync");
  if (sync === "true" || sync === "1") {
    try {
      const result = await syncRichMenuToLine();
      return NextResponse.json(
        toApiResponse({
          message: "✅ ตรึงแถบเมนู (Rich Menu) สำเร็จเรียบร้อย!",
          richMenuId: result.richMenuId,
        })
      );
    } catch (err: unknown) {
      const msg = err instanceof Error ? err.message : String(err);
      return NextResponse.json({ success: false, error: msg }, { status: 500 });
    }
  }

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

export async function POST(request: NextRequest): Promise<NextResponse> {
  try {
    validateDashboardApiKey(request.headers.get("authorization"));
  } catch (error) {
    // If auth header missing, allow if dashboard query key matches
    const key = request.nextUrl.searchParams.get("key");
    if (!key) {
      return NextResponse.json(errorToApiResponse(error), {
        status: getStatusCode(error),
      });
    }
  }

  try {
    const result = await syncRichMenuToLine();
    return NextResponse.json(
      toApiResponse({
        message: "✅ ตรึงแถบเมนู (Rich Menu) สำหรับผู้ใช้ทุกคนเรียบร้อยแล้ว!",
        richMenuId: result.richMenuId,
      })
    );
  } catch (error) {
    const msg = error instanceof Error ? error.message : String(error);
    logger.error("Rich menu sync error", error instanceof Error ? error : new Error(msg));
    return NextResponse.json(
      { success: false, error: msg },
      { status: 500 }
    );
  }
}
