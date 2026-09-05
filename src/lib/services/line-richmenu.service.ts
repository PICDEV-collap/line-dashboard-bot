import fs from "fs";
import path from "path";
import { ENV } from "@/config/constants";
import { createLogger } from "@/lib/middleware/logger";

const logger = createLogger("LineRichMenuService");

/**
 * LINE Rich Menu Definition for ร้านครูตอม Dashboard Bot.
 * Provides a 6-grid action menu layout for fast user interaction.
 * `selected: true` ensures the menu is pinned (expanded) by default.
 */
export function getRichMenuDefinition() {
  return {
    size: { width: 2500, height: 843 },
    selected: true,
    name: "ร้านครูตอม Main Menu v8 (Tomorrow Pork Option)",
    chatBarText: "📌 เมนูร้านครูตอม",
    areas: [
      // Tile 1: 📝 กรอกรายรับ-รายจ่าย (Top Left)
      {
        bounds: { x: 0, y: 0, width: 1250, height: 421 },
        action: { type: "message", label: "กรอกรายรับ-รายจ่าย", text: "กรอกข้อมูล" },
      },
      // Tile 2: 📊 สรุปวันนี้ (Top Right) -> Allows branch selection
      {
        bounds: { x: 1250, y: 0, width: 1250, height: 421 },
        action: { type: "message", label: "สรุปวันนี้", text: "สรุป" },
      },
      // Tile 3: 🥩 เช็คยอดหมู (Bottom Left) -> Allows date selection
      {
        bounds: { x: 0, y: 421, width: 1250, height: 422 },
        action: { type: "message", label: "เช็คยอดหมู", text: "เช็คหมู" },
      },
      // Tile 4: ❓ ช่วยเหลือ (Bottom Right)
      {
        bounds: { x: 1250, y: 421, width: 1250, height: 422 },
        action: { type: "message", label: "ช่วยเหลือ", text: "ช่วย" },
      },
    ],
  };
}

/**
 * Synchronizes and activates the Rich Menu on LINE Official Account:
 * 1. Checks if a menu with name "ร้านครูตอม Main Menu v2" already exists
 * 2. If not, creates it via LINE Messaging API
 * 3. Uploads public/richmenu.png
 * 4. Sets as default for all users (pinned by default)
 * 5. If userId is passed, also links directly to the user for instant display
 */
export async function syncRichMenuToLine(userId?: string): Promise<{ success: boolean; richMenuId: string }> {
  const token = ENV.LINE_CHANNEL_ACCESS_TOKEN();
  if (!token) {
    throw new Error("LINE_CHANNEL_ACCESS_TOKEN is missing");
  }

  const menuDef = getRichMenuDefinition();
  let targetMenuId = "";

  // 1. Check existing rich menus
  try {
    const listRes = await fetch("https://api.line.me/v2/bot/richmenu/list", {
      headers: { Authorization: `Bearer ${token}` },
    });
    if (listRes.ok) {
      const listData = (await listRes.json()) as { richmenus: Array<{ richMenuId: string; name: string }> };
      const existing = (listData.richmenus || []).find((m) => m.name === menuDef.name);
      if (existing) {
        targetMenuId = existing.richMenuId;
        logger.info("Found existing rich menu", { richMenuId: targetMenuId });
      }
    }
  } catch (err) {
    logger.warn("Failed to query rich menu list", err);
  }

  // 2. If not found, create new rich menu & upload image
  if (!targetMenuId) {
    logger.info("Creating new rich menu on LINE API...");
    const createRes = await fetch("https://api.line.me/v2/bot/richmenu", {
      method: "POST",
      headers: {
        Authorization: `Bearer ${token}`,
        "Content-Type": "application/json",
      },
      body: JSON.stringify(menuDef),
    });

    if (!createRes.ok) {
      const errText = await createRes.text();
      throw new Error(`Failed to create rich menu: ${createRes.status} - ${errText}`);
    }

    const created = (await createRes.json()) as { richMenuId: string };
    targetMenuId = created.richMenuId;

    // Upload image
    const imgPath = path.join(process.cwd(), "public", "richmenu.png");
    if (fs.existsSync(imgPath)) {
      const imgBuffer = fs.readFileSync(imgPath);
      const uploadRes = await fetch(
        `https://api-data.line.me/v2/bot/richmenu/${targetMenuId}/content`,
        {
          method: "POST",
          headers: {
            Authorization: `Bearer ${token}`,
            "Content-Type": "image/png",
          },
          body: imgBuffer,
        }
      );
      if (!uploadRes.ok) {
        const errText = await uploadRes.text();
        throw new Error(`Failed to upload rich menu image: ${uploadRes.status} - ${errText}`);
      }
      logger.info("Rich menu image uploaded successfully");
    }
  }

  // 3. Set as default rich menu for all users
  const defaultRes = await fetch(
    `https://api.line.me/v2/bot/user/all/richmenu/${targetMenuId}`,
    {
      method: "POST",
      headers: { Authorization: `Bearer ${token}` },
    }
  );
  if (!defaultRes.ok) {
    const errText = await defaultRes.text();
    logger.warn("Set default rich menu warning", { errText });
  } else {
    logger.info("Rich menu set as default for all users", { richMenuId: targetMenuId });
  }

  // 4. Link directly to specific user if userId is provided
  if (userId) {
    await fetch(
      `https://api.line.me/v2/bot/user/${userId}/richmenu/${targetMenuId}`,
      {
        method: "POST",
        headers: { Authorization: `Bearer ${token}` },
      }
    ).catch((e) => logger.warn("Link user rich menu failed", e));
  }

  return { success: true, richMenuId: targetMenuId };
}
