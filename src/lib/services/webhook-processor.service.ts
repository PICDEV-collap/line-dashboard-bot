import { createLogger } from "@/lib/middleware/logger";
import { generateId, getCurrentTimestamp, getTodayDateString, safeJsonStringify } from "@/lib/utils/helpers";
import { normalizeError } from "@/lib/utils/error-handler";
import {
  getUserProfile,
  getMessageContent,
  replyText,
  buildSuccessReply,
} from "@/lib/services/line.service";
import { appendMessage, appendOcrResult, updateDailyStats } from "@/lib/services/messages.service";
import { uploadImage, uploadPdf } from "@/lib/services/storage.service";
import { extractTextFromImage } from "@/lib/services/gemini.service";
import {
  parseFinancialMessage,
  looksLikeFinancialData,
  buildRecordConfirmation,
} from "@/lib/services/financial-parser.service";
import { upsertParsedRecord, applyLineCorrection } from "@/lib/services/financial-records.service";
import {
  looksLikeCorrection,
  looksLikeCorrectionHelp,
  buildCorrectionHelpMessage,
  buildUnrecognizedFinancialHint,
  normalizeCommandText,
  parseCorrectionMessage,
} from "@/lib/services/financial-correction.service";
import { detectShopFromText } from "@/lib/services/financial-parser.service";
import { ENV } from "@/config/constants";
import type { LineEvent, ProcessedMessage } from "@/lib/types/line.types";
import type { MessageRow, OcrResultRow, StatsRow } from "@/lib/types/db.types";

const logger = createLogger("WebhookProcessor");

export async function processWebhookEvents(events: LineEvent[]): Promise<void> {
  const chunks = chunkArray(events, 3);
  for (const chunk of chunks) {
    await Promise.allSettled(chunk.map((event) => processEvent(event)));
  }
}

async function processEvent(event: LineEvent): Promise<void> {
  if (event.type !== "message" || !event.message) {
    logger.info("Skipping non-message event", { type: event.type });
    return;
  }

  const userId = event.source.userId ?? "unknown";
  const messageId = event.message.id;
  const messageType = event.message.type;

  logger.info("Processing message event", { userId, messageId, messageType });

  const profile = await getUserProfile(userId).catch(() => ({
    userId,
    displayName: userId,
  }));

  const statsDelta: Partial<StatsRow> = { totalMessages: 1 };

  let processed: ProcessedMessage = {
    id: generateId(),
    timestamp: new Date(event.timestamp).toISOString(),
    userId,
    displayName: profile.displayName,
    type: messageType,
    content: "",
    replyToken: event.replyToken,
    status: "pending",
  };

  let replyMsg = buildSuccessReply(messageType);

  try {
    switch (messageType) {
      case "text": {
        const result = await processTextMessage(processed, event);
        processed = result.processed;
        replyMsg = result.replyMsg;
        statsDelta.textCount = 1;
        break;
      }

      case "image":
        processed = await processImageMessage(processed, event);
        statsDelta.imageCount = 1;
        statsDelta.ocrCount = 1;
        replyMsg = buildSuccessReply("image");
        break;

      case "file":
        processed = await processFileMessage(processed, event);
        statsDelta.pdfCount = 1;
        replyMsg = buildSuccessReply("file");
        break;

      case "location":
        processed = await processLocationMessage(processed, event);
        statsDelta.locationCount = 1;
        replyMsg = buildSuccessReply("location");
        break;

      default:
        processed.content = `[${messageType} message]`;
        processed.status = "completed";
    }

    if (event.replyToken) {
      await replyText(event.replyToken, replyMsg).catch((err) =>
        logger.warn("Reply failed (non-critical)", err)
      );
    }
  } catch (error) {
    const err = normalizeError(error);
    logger.error("Failed to process message", err, { userId, messageId });
    processed.status = "failed";
    processed.errorMessage = err.message;
    statsDelta.errorCount = 1;

    if (event.replyToken) {
      await replyText(
        event.replyToken,
        "❌ เกิดข้อผิดพลาด กรุณาลองใหม่อีกครั้ง"
      ).catch(() => {});
    }
  }

  // Persist to Sheets
  const row = processedMessageToRow(processed);
  await appendMessage(row).catch((err) =>
    logger.error("Failed to save message to Sheets", err)
  );
  await updateDailyStats(statsDelta).catch((err) =>
    logger.error("Failed to update daily stats", err)
  );
}

// ──────────────────────────────────────────────────────────────
// Message type handlers
// ──────────────────────────────────────────────────────────────

async function processTextMessage(
  msg: ProcessedMessage,
  event: LineEvent
): Promise<{ processed: ProcessedMessage; replyMsg: string }> {
  const text = event.message?.text ?? "";
  const today = getTodayDateString();
  const shop = detectShopFromText(text);

  if (looksLikeCorrectionHelp(text)) {
    return {
      processed: { ...msg, content: "[HELP] correction", status: "completed" },
      replyMsg: buildCorrectionHelpMessage(),
    };
  }

  if (looksLikeCorrection(text)) {
    const result = await applyLineCorrection({
      text: normalizeCommandText(text) || text,
      date: today,
      shopId: shop?.shopId ?? ENV.DEFAULT_SHOP_ID(),
      shopName: shop?.shopName ?? ENV.DEFAULT_SHOP_NAME(),
    });
    if (!result.record) {
      return {
        processed: { ...msg, content: `[CORRECTION] ${text.slice(0, 200)}`, status: "completed" },
        replyMsg: result.message,
      };
    }
    return {
      processed: { ...msg, content: `[CORRECTION] ${text.slice(0, 200)}`, status: "completed" },
      replyMsg: buildRecordConfirmation(result.record, { prefix: result.message }),
    };
  }

  // Check if this looks like financial data before calling Gemini
  if (looksLikeFinancialData(text)) {
    const parsed = await parseFinancialMessage(text);

    if (parsed.isFinancialData && parsed.confidence >= 0.6) {
      logger.info("Financial message detected", { confidence: parsed.confidence });

      // Merge into the day's record (accumulates across multiple messages)
      const record = await upsertParsedRecord({
        date: parsed.date ?? getTodayDateString(),
        shopId: parsed.shopId ?? ENV.DEFAULT_SHOP_ID(),
        shopName: parsed.shopName ?? ENV.DEFAULT_SHOP_NAME(),
        parsed,
      });

      const { carryMeta, ...saved } = record;
      return {
        processed: {
          ...msg,
          content: `[FINANCIAL] ${text.slice(0, 200)}`,
          status: "completed",
        },
        replyMsg: buildRecordConfirmation(saved, { carryMeta }),
      };
    }

    // Heuristic matched but parser couldn't extract — try correction / shorthand
    const norm = normalizeCommandText(text);
    if (parseCorrectionMessage(norm || text).length > 0) {
      const result = await applyLineCorrection({
        text: norm || text,
        date: today,
        shopId: shop?.shopId ?? ENV.DEFAULT_SHOP_ID(),
        shopName: shop?.shopName ?? ENV.DEFAULT_SHOP_NAME(),
      });
      if (result.record) {
        return {
          processed: { ...msg, content: `[CORRECTION] ${text.slice(0, 200)}`, status: "completed" },
          replyMsg: buildRecordConfirmation(result.record, { prefix: result.message }),
        };
      }
    }

    return {
      processed: { ...msg, content: `[UNRECOGNIZED] ${text.slice(0, 200)}`, status: "completed" },
      replyMsg: buildUnrecognizedFinancialHint(),
    };
  }

  // Regular text message
  return {
    processed: {
      ...msg,
      content: text,
      status: "completed",
    },
    replyMsg: buildSuccessReply("text"),
  };
}

async function processImageMessage(
  msg: ProcessedMessage,
  event: LineEvent
): Promise<ProcessedMessage> {
  const messageId = event.message!.id;
  const startTime = Date.now();

  const buffer = await getMessageContent(messageId);
  const upload = await uploadImage(buffer, msg.userId, messageId);
  const ocr = await extractTextFromImage(buffer, "image/jpeg");
  const processingTimeMs = Date.now() - startTime;

  const ocrRow: OcrResultRow = {
    id: generateId(),
    messageId: msg.id,
    timestamp: getCurrentTimestamp(),
    imageUrl: upload.webViewLink,
    rawText: ocr.rawText,
    structuredJson: safeJsonStringify(ocr.structuredData),
    confidence: ocr.confidence.toFixed(2),
    processingTimeMs: String(processingTimeMs),
  };
  await appendOcrResult(ocrRow).catch((err) =>
    logger.error("Failed to save OCR result", err)
  );

  return {
    ...msg,
    content: ocr.rawText.slice(0, 500),
    imageUrl: upload.webViewLink,
    status: "completed",
  };
}

async function processFileMessage(
  msg: ProcessedMessage,
  event: LineEvent
): Promise<ProcessedMessage> {
  const message = event.message!;
  const buffer = await getMessageContent(message.id);
  const upload = await uploadPdf(
    buffer,
    msg.userId,
    message.fileName ?? "file.pdf",
    message.id
  );

  return {
    ...msg,
    content: message.fileName ?? "file",
    fileUrl: upload.webViewLink,
    status: "completed",
  };
}

async function processLocationMessage(
  msg: ProcessedMessage,
  event: LineEvent
): Promise<ProcessedMessage> {
  const message = event.message!;
  return {
    ...msg,
    content: message.title ?? message.address ?? "Location",
    locationLat: message.latitude,
    locationLng: message.longitude,
    locationAddress: message.address ?? "",
    status: "completed",
  };
}

// ──────────────────────────────────────────────────────────────
// Helpers
// ──────────────────────────────────────────────────────────────

function processedMessageToRow(msg: ProcessedMessage): MessageRow {
  return {
    id: msg.id,
    timestamp: msg.timestamp,
    userId: msg.userId,
    displayName: msg.displayName,
    type: msg.type,
    content: msg.content,
    imageUrl: msg.imageUrl ?? "",
    fileUrl: msg.fileUrl ?? "",
    locationLat: msg.locationLat?.toString() ?? "",
    locationLng: msg.locationLng?.toString() ?? "",
    locationAddress: msg.locationAddress ?? "",
    replyToken: msg.replyToken ?? "",
    status: msg.status,
    errorMessage: msg.errorMessage ?? "",
  };
}

function chunkArray<T>(arr: T[], size: number): T[][] {
  const chunks: T[][] = [];
  for (let i = 0; i < arr.length; i += size) {
    chunks.push(arr.slice(i, i + size));
  }
  return chunks;
}
