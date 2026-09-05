import { NextRequest, NextResponse } from "next/server";
import fs from "fs";
import path from "path";
import { getRichMenuDefinition } from "@/lib/services/line-richmenu.service";
import { validateDashboardApiKey } from "@/lib/middleware/signature-validator";
import { errorToApiResponse, getStatusCode, toApiResponse } from "@/lib/utils/error-handler";
import { ENV } from "@/config/constants";
import { createLogger } from "@/lib/middleware/logger";

const logger = createLogger("LineRichMenuRoute");

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

/**
 * POST /api/line/richmenu
 * Deploys the Rich Menu to LINE Official Account:
 * 1. Creates Rich Menu definition via LINE API
 * 2. Uploads public/richmenu.png
 * 3. Sets it as the default Rich Menu for all users
 * 4. Cleans up old inactive rich menus
 */
export async function POST(request: NextRequest): Promise<NextResponse> {
  try {
    validateDashboardApiKey(request.headers.get("authorization"));
  } catch (error) {
    return NextResponse.json(errorToApiResponse(error), {
      status: getStatusCode(error),
    });
  }

  const token = ENV.LINE_CHANNEL_ACCESS_TOKEN();
  if (!token) {
    return NextResponse.json(
      { success: false, error: "LINE_CHANNEL_ACCESS_TOKEN is missing" },
      { status: 500 }
    );
  }

  try {
    const menuDefinition = getRichMenuDefinition();

    // 1. Create Rich Menu
    logger.info("Creating rich menu on LINE API...");
    const createRes = await fetch("https://api.line.me/v2/bot/richmenu", {
      method: "POST",
      headers: {
        Authorization: `Bearer ${token}`,
        "Content-Type": "application/json",
      },
      body: JSON.stringify(menuDefinition),
    });

    if (!createRes.ok) {
      const errText = await createRes.text();
      throw new Error(`Failed to create rich menu: ${createRes.status} - ${errText}`);
    }

    const { richMenuId } = (await createRes.json()) as { richMenuId: string };
    logger.info("Rich menu created", { richMenuId });

    // 2. Upload Rich Menu Image
    const imagePath = path.join(process.cwd(), "public", "richmenu.png");
    if (!fs.existsSync(imagePath)) {
      throw new Error("Rich menu image (public/richmenu.png) not found on server");
    }

    const imageBuffer = fs.readFileSync(imagePath);
    logger.info("Uploading rich menu image...", { sizeBytes: imageBuffer.length });

    const uploadRes = await fetch(
      `https://api-data.line.me/v2/bot/richmenu/${richMenuId}/content`,
      {
        method: "POST",
        headers: {
          Authorization: `Bearer ${token}`,
          "Content-Type": "image/png",
        },
        body: imageBuffer,
      }
    );

    if (!uploadRes.ok) {
      const errText = await uploadRes.text();
      throw new Error(`Failed to upload rich menu image: ${uploadRes.status} - ${errText}`);
    }
    logger.info("Rich menu image uploaded successfully");

    // 3. Set as Default Rich Menu for all users
    const setDefaultRes = await fetch(
      `https://api.line.me/v2/bot/user/all/richmenu/${richMenuId}`,
      {
        method: "POST",
        headers: {
          Authorization: `Bearer ${token}`,
        },
      }
    );

    if (!setDefaultRes.ok) {
      const errText = await setDefaultRes.text();
      throw new Error(`Failed to set default rich menu: ${setDefaultRes.status} - ${errText}`);
    }
    logger.info("Rich menu set as default for all users");

    // 4. Optional: Delete old rich menus
    try {
      const listRes = await fetch("https://api.line.me/v2/bot/richmenu/list", {
        headers: { Authorization: `Bearer ${token}` },
      });
      if (listRes.ok) {
        const listData = (await listRes.json()) as { richmenus: Array<{ richMenuId: string }> };
        for (const rm of listData.richmenus || []) {
          if (rm.richMenuId !== richMenuId) {
            await fetch(`https://api.line.me/v2/bot/richmenu/${rm.richMenuId}`, {
              method: "DELETE",
              headers: { Authorization: `Bearer ${token}` },
            }).catch(() => {});
          }
        }
      }
    } catch {}

    return NextResponse.json(
      toApiResponse({
        message: "✅ อัปเดตและเปิดใช้งานแถบเมนู (Rich Menu) สำเร็จเรียบร้อย!",
        richMenuId,
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
