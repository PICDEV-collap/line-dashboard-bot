import { ENV } from "@/config/constants";
import { withRetry } from "@/lib/utils/retry";
import { ExternalServiceError } from "@/lib/utils/error-handler";
import { createLogger } from "@/lib/middleware/logger";
import type { LineUserProfile } from "@/lib/types/line.types";

const logger = createLogger("LineService");

const LINE_API_BASE = "https://api.line.me/v2/bot";
const LINE_DATA_API_BASE = "https://api-data.line.me/v2/bot";

async function lineRequest<T>(
  path: string,
  options: RequestInit = {}
): Promise<T> {
  const token = ENV.LINE_CHANNEL_ACCESS_TOKEN();
  const url = `${LINE_API_BASE}${path}`;

  const response = await fetch(url, {
    ...options,
    headers: {
      Authorization: `Bearer ${token}`,
      "Content-Type": "application/json",
      ...options.headers,
    },
  });

  if (!response.ok) {
    const text = await response.text().catch(() => "");
    throw new ExternalServiceError(
      "LINE API",
      `${response.status} ${response.statusText}: ${text}`
    );
  }

  const contentType = response.headers.get("content-type") ?? "";
  if (contentType.includes("application/json")) {
    return response.json() as Promise<T>;
  }

  return response as unknown as T;
}

export async function getUserProfile(userId: string): Promise<LineUserProfile> {
  logger.info("Fetching user profile", { userId });

  return withRetry(async () => {
    const data = await lineRequest<{
      userId: string;
      displayName: string;
      pictureUrl?: string;
      statusMessage?: string;
      language?: string;
    }>(`/profile/${userId}`);

    return {
      userId: data.userId,
      displayName: data.displayName,
      pictureUrl: data.pictureUrl,
      statusMessage: data.statusMessage,
      language: data.language,
    };
  });
}

export interface MessageContent {
  buffer: Buffer;
  mimeType: string;
}

function normalizeLineMimeType(contentType: string | null): string {
  const raw = (contentType ?? "image/jpeg").split(";")[0].trim().toLowerCase();
  if (raw === "image/jpg") return "image/jpeg";
  return raw || "image/jpeg";
}

export async function getMessageContentWithType(messageId: string): Promise<MessageContent> {
  logger.info("Downloading message content", { messageId });

  return withRetry(async () => {
    const token = ENV.LINE_CHANNEL_ACCESS_TOKEN();
    const url = `${LINE_DATA_API_BASE}/message/${messageId}/content`;

    const response = await fetch(url, {
      headers: { Authorization: `Bearer ${token}` },
    });

    if (!response.ok) {
      throw new ExternalServiceError(
        "LINE API",
        `Failed to download content: ${response.status}`
      );
    }

    const mimeType = normalizeLineMimeType(response.headers.get("content-type"));
    const arrayBuffer = await response.arrayBuffer();
    return { buffer: Buffer.from(arrayBuffer), mimeType };
  });
}

export async function getMessageContent(messageId: string): Promise<Buffer> {
  const { buffer } = await getMessageContentWithType(messageId);
  return buffer;
}

export async function replyMessage(
  replyToken: string,
  messages: Array<{ type: string; text?: string }>
): Promise<void> {
  if (!replyToken) {
    logger.warn("No replyToken provided, skipping reply");
    return;
  }

  logger.info("Sending reply", { replyToken });

  await withRetry(() =>
    lineRequest("/message/reply", {
      method: "POST",
      body: JSON.stringify({ replyToken, messages }),
    })
  );
}

export async function replyText(replyToken: string, text: string): Promise<void> {
  await replyMessage(replyToken, [{ type: "text", text }]);
}

export function buildSuccessReply(type: string): string {
  const messages: Record<string, string> = {
    text: "✅ รับข้อความเรียบร้อยแล้ว",
    image: "✅ รับรูปภาพเรียบร้อยแล้ว กำลังประมวลผล OCR...",
    file: "✅ รับไฟล์เรียบร้อยแล้ว",
    location: "✅ รับข้อมูลตำแหน่งเรียบร้อยแล้ว",
    video: "✅ รับวิดีโอเรียบร้อยแล้ว",
    audio: "✅ รับเสียงเรียบร้อยแล้ว",
    sticker: "✅ รับสติ๊กเกอร์เรียบร้อยแล้ว",
  };
  return messages[type] ?? "✅ รับข้อมูลเรียบร้อยแล้ว";
}
