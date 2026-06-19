import { createLogger } from "@/lib/middleware/logger";
import { generateId, getCurrentTimestamp, getTodayDateString, resolveRecordDateFromText, safeJsonStringify } from "@/lib/utils/helpers";
import { normalizeError } from "@/lib/utils/error-handler";
import {
  getUserProfile,
  getMessageContent,
  getMessageContentWithType,
  replyText,
  buildSuccessReply,
} from "@/lib/services/line.service";
import { appendMessage, appendOcrResult, updateDailyStats } from "@/lib/services/messages.service";
import { uploadImage, uploadPdf } from "@/lib/services/storage.service";
import { extractTextFromImage } from "@/lib/services/gemini.service";
import {
  parseFinancialMessage,
  buildRecordConfirmation,
  buildSummaryNotFoundMessage,
  formatParsedDeltaItems,
  shouldUseShortConfirmation,
} from "@/lib/services/financial-parser.service";
import {
  buildAllBranchesSummary,
  buildPorkTotalSummary,
  getAllBranchShops,
} from "@/lib/services/summary-command.service";
import { upsertParsedRecord, applyLineCorrection, getRecordByShopDate } from "@/lib/services/financial-records.service";
import { buildReportUrl, buildReportLinkMessage, getAppBaseUrl } from "@/lib/services/report.service";
import {
  isLearningEnabled,
  learningKey,
  lookupAlias,
  learnAlias,
  interpretCommand,
  decideCommandAction,
  getPendingCommand,
  setPendingCommand,
  clearPendingCommand,
  isAffirmative,
  isNegative,
  isPendingFresh,
} from "@/lib/services/command-learning.service";
import type { LineIntent } from "@/lib/thai/types";
import {
  naturalizeReply,
  type NaturalReplyKind,
} from "@/lib/services/natural-reply.service";
import {
  buildCorrectionHelpMessage,
  buildUnrecognizedFinancialHint,
} from "@/lib/services/financial-correction.service";
import { detectShopFromText, looksLikeFinancialData, routeLineMessage } from "@/lib/services/thai-intent-router.service";
import { ENV, SUPPORTED_OCR_TYPES } from "@/config/constants";
import type { LineEvent, ProcessedMessage } from "@/lib/types/line.types";
import type { MessageRow, OcrResultRow, StatsRow } from "@/lib/types/db.types";

const logger = createLogger("WebhookProcessor");

async function geminiReply(
  userMessage: string,
  template: string,
  kind: NaturalReplyKind,
  extra: {
    record?: import("@/lib/types/financial.types").FinancialRecord | null;
    addedItems?: string[];
    prefix?: string;
    /** Query replies: skip Groq rewrite for instant LINE response */
    instant?: boolean;
  } = {}
): Promise<string> {
  if (extra.instant) return template;
  return naturalizeReply({
    kind,
    userMessage,
    template,
    record: extra.record ?? undefined,
    addedItems: extra.addedItems,
    prefix: extra.prefix,
  });
}

export async function processWebhookEvents(
  events: LineEvent[],
  baseUrl = ""
): Promise<void> {
  const chunks = chunkArray(events, 3);
  for (const chunk of chunks) {
    await Promise.allSettled(chunk.map((event) => processEvent(event, baseUrl)));
  }
}

async function processEvent(event: LineEvent, baseUrl = ""): Promise<void> {
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
        const result = await processTextMessage(processed, event, baseUrl);
        processed = result.processed;
        replyMsg = result.replyMsg;
        statsDelta.textCount = 1;
        break;
      }

      case "image": {
        const imgResult = await processImageMessage(processed, event);
        processed = imgResult.processed;
        replyMsg = imgResult.replyMsg;
        statsDelta.imageCount = 1;
        statsDelta.ocrCount = 1;
        break;
      }

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
  event: LineEvent,
  baseUrl = ""
): Promise<{ processed: ProcessedMessage; replyMsg: string }> {
  const text = event.message?.text ?? "";
  const today = getTodayDateString();

  // 0. If we previously asked "did you mean …?", resolve the ใช่/ไม่ reply first.
  if (isLearningEnabled()) {
    const resolved = await resolvePendingConfirmation(text, msg, baseUrl, today);
    if (resolved) return resolved;
  }

  // 1. Deterministic routing (fast, free) — unchanged behavior for known commands.
  const intent = routeLineMessage(text, today);
  if (intent.kind !== "UNKNOWN") {
    return handleIntent(intent, text, msg, baseUrl, today);
  }

  // 2. Unknown command → learned alias, then AI interpretation + learning.
  if (isLearningEnabled()) {
    return resolveUnknownWithLearning(text, msg, baseUrl, today);
  }
  return genericTextReply(msg, text);
}

function genericTextReply(
  msg: ProcessedMessage,
  text: string
): { processed: ProcessedMessage; replyMsg: string } {
  return {
    processed: { ...msg, content: text, status: "completed" },
    replyMsg: buildSuccessReply("text"),
  };
}

/** Resolve a pending "หมายถึง X ใช่ไหม?" prompt. Returns null if there's nothing to resolve. */
async function resolvePendingConfirmation(
  text: string,
  msg: ProcessedMessage,
  baseUrl: string,
  today: string
): Promise<{ processed: ProcessedMessage; replyMsg: string } | null> {
  const pending = await getPendingCommand(msg.userId).catch(() => null);
  if (!pending || !isPendingFresh(pending.createdAt)) {
    if (pending) await clearPendingCommand(msg.userId).catch(() => {});
    return null;
  }

  if (isAffirmative(text)) {
    await clearPendingCommand(msg.userId).catch(() => {});
    await learnAlias({
      normalized: pending.normalized,
      canonicalText: pending.canonicalText,
      intent: pending.intent,
      confidence: pending.confidence,
      source: "confirmed",
    }).catch((e) => logger.warn("learnAlias (confirmed) failed", String(e)));
    const canonIntent = routeLineMessage(pending.canonicalText, today);
    const res = await handleIntent(canonIntent, pending.canonicalText, msg, baseUrl, today);
    return {
      processed: { ...res.processed, content: `[LEARN confirmed] ${pending.canonicalText}` },
      replyMsg: `✅ จำไว้แล้วครับ คราวหน้าพิมพ์แบบเดิมได้เลย\n\n${res.replyMsg}`,
    };
  }

  if (isNegative(text)) {
    await clearPendingCommand(msg.userId).catch(() => {});
    return {
      processed: { ...msg, content: "[LEARN rejected]", status: "completed" },
      replyMsg: 'โอเคครับ ยกเลิกให้แล้ว 🙏 ลองพิมพ์ใหม่อีกครั้ง หรือพิมพ์ "ช่วย" ดูคำสั่งทั้งหมด',
    };
  }

  // Neither ใช่ nor ไม่ → user moved on; drop the stale prompt and process normally.
  await clearPendingCommand(msg.userId).catch(() => {});
  return null;
}

/** UNKNOWN message → check learned aliases, then ask AI to interpret + (auto-act | confirm | learn). */
async function resolveUnknownWithLearning(
  text: string,
  msg: ProcessedMessage,
  baseUrl: string,
  today: string
): Promise<{ processed: ProcessedMessage; replyMsg: string }> {
  const normalized = learningKey(text);

  // 2a. Already learned this phrasing → re-route instantly (no AI call).
  const alias = await lookupAlias(normalized).catch(() => null);
  if (alias) {
    const canonIntent = routeLineMessage(alias.canonicalText, today);
    if (canonIntent.kind !== "UNKNOWN") {
      const res = await handleIntent(canonIntent, alias.canonicalText, msg, baseUrl, today);
      return { processed: { ...res.processed, content: `[LEARN hit] ${alias.canonicalText}` }, replyMsg: res.replyMsg };
    }
  }

  // 2b. Ask Groq to interpret the messy text.
  const ai = await interpretCommand(text);
  const decision = decideCommandAction(
    ai,
    ENV.AI_COMMAND_CONFIDENCE_HIGH(),
    ENV.AI_COMMAND_CONFIDENCE_MIN()
  );

  if (decision.action === "financial") {
    return handleIntent({ kind: "SAVE_FINANCIAL" }, text, msg, baseUrl, today);
  }

  if (decision.action === "auto" || decision.action === "confirm") {
    const canonIntent = routeLineMessage(decision.canonical, today);
    if (canonIntent.kind !== "UNKNOWN") {
      if (decision.action === "auto") {
        await learnAlias({
          normalized,
          canonicalText: decision.canonical,
          intent: canonIntent.kind,
          confidence: ai.confidence,
          source: "ai",
        }).catch((e) => logger.warn("learnAlias (ai) failed", String(e)));
        const res = await handleIntent(canonIntent, decision.canonical, msg, baseUrl, today);
        return {
          processed: { ...res.processed, content: `[LEARN auto] ${decision.canonical}` },
          replyMsg: `🔧 เข้าใจว่าหมายถึง “${decision.canonical}” นะครับ\n\n${res.replyMsg}`,
        };
      }
      await setPendingCommand({
        userId: msg.userId,
        rawText: text,
        normalized,
        canonicalText: decision.canonical,
        intent: canonIntent.kind,
        confidence: ai.confidence,
      }).catch((e) => logger.warn("setPendingCommand failed", String(e)));
      return {
        processed: { ...msg, content: `[LEARN confirm?] ${decision.canonical}`, status: "completed" },
        replyMsg: `🤔 หมายถึง “${decision.canonical}” ใช่ไหมครับ?\nพิมพ์ “ใช่” เพื่อยืนยัน (แล้วผมจะจำไว้ให้) หรือพิมพ์คำสั่งใหม่อีกครั้ง`,
      };
    }
  }

  // Couldn't resolve confidently → gentle hint.
  return {
    processed: { ...msg, content: `[UNKNOWN] ${text.slice(0, 200)}`, status: "completed" },
    replyMsg:
      'ขอโทษครับ ผมยังไม่เข้าใจข้อความนี้ 🙏\nลองพิมพ์ "ช่วย" เพื่อดูคำสั่งทั้งหมด หรือพิมพ์ยอด เช่น "โอน 5000 สด 3000"',
  };
}

async function handleIntent(
  intent: LineIntent,
  text: string,
  msg: ProcessedMessage,
  baseUrl: string,
  today: string
): Promise<{ processed: ProcessedMessage; replyMsg: string }> {
  const recordDate = resolveRecordDateFromText(text) ?? today;
  const shop = detectShopFromText(text);

  switch (intent.kind) {
    case "HELP":
      return {
        processed: { ...msg, content: "[HELP] correction", status: "completed" },
        replyMsg: buildCorrectionHelpMessage(),
      };

    case "QUERY_REPORT": {
      const report = intent.payload;
      const base = baseUrl || getAppBaseUrl();
      if (!base) {
        return {
          processed: { ...msg, content: "[REPORT] no base url", status: "completed" },
          replyMsg:
            'ℹ️ เปิดรายงาน PDF ได้ที่หน้า Dashboard แท็บ "📄 รายงาน PDF"\n' +
            "(ผู้ดูแลระบบ: ตั้งค่า APP_BASE_URL เพื่อให้บอทส่งลิงก์รายงานได้)",
        };
      }
      const url = buildReportUrl(base, report);
      return {
        processed: { ...msg, content: `[REPORT] ${text.slice(0, 200)}`, status: "completed" },
        replyMsg: buildReportLinkMessage(report, url),
      };
    }

    case "QUERY_SUMMARY": {
      const summaryIntent = intent.payload;
      if (summaryIntent.type === "all_branches") {
        const records = (
          await Promise.all(
            getAllBranchShops().map((s) => getRecordByShopDate(s.shopId, summaryIntent.date))
          )
        ).filter((r): r is NonNullable<typeof r> => r !== null);

        const template = buildAllBranchesSummary(records, summaryIntent.date, today);
        return {
          processed: { ...msg, content: "[SUMMARY] all branches", status: "completed" },
          replyMsg: await geminiReply(text, template, "all_branches_summary"),
        };
      }

      const { shopId, date } = summaryIntent;
      const record = await getRecordByShopDate(shopId, date);
      if (!record) {
        const template = buildSummaryNotFoundMessage(date, today);
        return {
          processed: { ...msg, content: "[SUMMARY] empty", status: "completed" },
          replyMsg: await geminiReply(text, template, "summary_not_found"),
        };
      }

      const template = buildRecordConfirmation(record, { mode: "full" });
      const kind: NaturalReplyKind =
        summaryIntent.type === "single_shop" ? "shop_summary" : "summary";
      return {
        processed: { ...msg, content: `[SUMMARY] ${kind}`, status: "completed" },
        replyMsg: await geminiReply(text, template, kind, { record }),
      };
    }

    case "QUERY_PORK": {
      const porkSummary = intent.payload;
      try {
        const record = await getRecordByShopDate(porkSummary.shopId, porkSummary.date);
        const replyMsg = await buildPorkTotalSummary({ intent: porkSummary, record, today });
        return {
          processed: { ...msg, content: `[PORK QUERY] ${text.slice(0, 200)}`, status: "completed" },
          replyMsg,
        };
      } catch (err) {
        logger.error("Pork summary query failed", err instanceof Error ? err : new Error(String(err)));
        return {
          processed: { ...msg, content: `[PORK QUERY FAILED] ${text.slice(0, 200)}`, status: "failed" },
          replyMsg: "❌ ดึงยอดหมูไม่ได้ชั่วคราว ลองใหม่หรือพิมพ์ \"สรุป\"",
        };
      }
    }

    case "CORRECTION": {
      const result = await applyLineCorrection({
        text: intent.normalizedText,
        date: recordDate,
        shopId: shop?.shopId ?? ENV.DEFAULT_SHOP_ID(),
        shopName: shop?.shopName ?? ENV.DEFAULT_SHOP_NAME(),
      });
      if (!result.record) {
        return {
          processed: { ...msg, content: `[CORRECTION] ${text.slice(0, 200)}`, status: "completed" },
          replyMsg: await geminiReply(text, result.message, "unrecognized"),
        };
      }
      const template = buildRecordConfirmation(result.record, {
        prefix: result.message,
        mode: "short",
      });
      return {
        processed: { ...msg, content: `[CORRECTION] ${text.slice(0, 200)}`, status: "completed" },
        replyMsg: await geminiReply(text, template, "correction", {
          record: result.record,
          prefix: result.message,
        }),
      };
    }

    case "SAVE_FINANCIAL": {
      const parsed = await parseFinancialMessage(text);

      if (parsed.isFinancialData && parsed.confidence >= 0.6) {
        logger.info("Financial message detected", { confidence: parsed.confidence });

        const record = await upsertParsedRecord({
          date: parsed.date ?? recordDate,
          shopId: parsed.shopId ?? ENV.DEFAULT_SHOP_ID(),
          shopName: parsed.shopName ?? ENV.DEFAULT_SHOP_NAME(),
          parsed,
        });

        const { carryMeta, ...saved } = record;
        const addedItems = formatParsedDeltaItems(parsed);
        const useShort = shouldUseShortConfirmation(parsed, text);
        const template = buildRecordConfirmation(saved, {
          carryMeta,
          addedItems,
          mode: useShort ? "short" : "full",
        });
        return {
          processed: {
            ...msg,
            content: `[FINANCIAL] ${text.slice(0, 200)}`,
            status: "completed",
          },
          replyMsg: await geminiReply(
            text,
            template,
            useShort ? "record_saved_short" : "record_saved_full",
            { record: saved, addedItems }
          ),
        };
      }

      const hint = buildUnrecognizedFinancialHint();
      return {
        processed: { ...msg, content: `[UNRECOGNIZED] ${text.slice(0, 200)}`, status: "completed" },
        replyMsg: await geminiReply(text, hint, "unrecognized"),
      };
    }

    case "UNKNOWN":
    default:
      return {
        processed: {
          ...msg,
          content: text,
          status: "completed",
        },
        replyMsg: buildSuccessReply("text"),
      };
  }
}

async function processImageMessage(
  msg: ProcessedMessage,
  event: LineEvent
): Promise<{ processed: ProcessedMessage; replyMsg: string }> {
  const messageId = event.message!.id;
  const startTime = Date.now();
  let uploadLink = "";
  let mimeType = "image/jpeg";

  try {
    const { buffer, mimeType: lineMime } = await getMessageContentWithType(messageId);
    mimeType = SUPPORTED_OCR_TYPES.includes(lineMime as (typeof SUPPORTED_OCR_TYPES)[number])
      ? lineMime
      : "image/jpeg";

    let upload;
    try {
      upload = await uploadImage(buffer, msg.userId, messageId);
      uploadLink = upload.webViewLink;
    } catch (uploadErr) {
      logger.warn("Image upload failed, continuing with OCR", uploadErr instanceof Error ? uploadErr.message : String(uploadErr));
    }

    let ocr;
    try {
      ocr = await extractTextFromImage(buffer, mimeType);
    } catch (ocrErr) {
      const reason = ocrErr instanceof Error ? ocrErr.message : String(ocrErr);
      logger.warn("OCR failed", { reason, mimeType });
      return {
        processed: {
          ...msg,
          content: `[IMAGE OCR FAILED] ${reason.slice(0, 200)}`,
          imageUrl: uploadLink || undefined,
          status: "completed",
        },
        replyMsg:
          "📷 รับรูปแล้ว แต่อ่านข้อความไม่ได้ชั่วคราว\n\n" +
          "💡 ลองพิมพ์สรุปเป็นข้อความ เช่น\n" +
          "หนองปิง ค่าหมูทั้งหมด\n" +
          "หรือส่งรายการซื้อของทีละบรรทัด",
      };
    }

    const processingTimeMs = Date.now() - startTime;
    const ocrRow: OcrResultRow = {
      id: generateId(),
      messageId: msg.id,
      timestamp: getCurrentTimestamp(),
      imageUrl: uploadLink,
      rawText: ocr.rawText,
      structuredJson: safeJsonStringify(ocr.structuredData),
      confidence: ocr.confidence.toFixed(2),
      processingTimeMs: String(processingTimeMs),
    };
    await appendOcrResult(ocrRow).catch((err) =>
      logger.error("Failed to save OCR result", err)
    );

    if (ocr.rawText && looksLikeFinancialData(ocr.rawText)) {
      try {
        const parsed = await parseFinancialMessage(ocr.rawText);
        if (parsed.isFinancialData && parsed.confidence >= 0.6) {
          const today = getTodayDateString();
          const recordDate = resolveRecordDateFromText(ocr.rawText) ?? today;
          const shop = detectShopFromText(ocr.rawText);

          const record = await upsertParsedRecord({
            date: parsed.date ?? recordDate,
            shopId: parsed.shopId ?? shop?.shopId ?? ENV.DEFAULT_SHOP_ID(),
            shopName: parsed.shopName ?? shop?.shopName ?? ENV.DEFAULT_SHOP_NAME(),
            parsed,
          });

          const { carryMeta, ...saved } = record;
          const addedItems = formatParsedDeltaItems(parsed);
          const useShort = shouldUseShortConfirmation(parsed, ocr.rawText);
          const template = buildRecordConfirmation(saved, {
            carryMeta,
            addedItems,
            mode: useShort ? "short" : "full",
          });

          return {
            processed: {
              ...msg,
              content: `[IMAGE→FINANCIAL] ${ocr.rawText.slice(0, 200)}`,
              imageUrl: uploadLink || undefined,
              status: "completed",
            },
            replyMsg: await geminiReply(
              ocr.rawText,
              template,
              useShort ? "record_saved_short" : "record_saved_full",
              { record: saved, addedItems }
            ),
          };
        }
      } catch (err) {
        logger.warn("Image financial parse failed, using OCR preview", err instanceof Error ? err.message : String(err));
      }
    }

    return {
      processed: {
        ...msg,
        content: ocr.rawText.slice(0, 500),
        imageUrl: uploadLink || undefined,
        status: "completed",
      },
      replyMsg:
        `📷 รับรูปภาพแล้ว\n\n📝 ข้อความที่อ่านได้:\n${ocr.rawText.slice(0, 300)}${ocr.rawText.length > 300 ? "…" : ""}\n\n` +
        "💡 ถ้าต้องการบันทึก ลองพิมพ์รายการซื้อของเป็นข้อความ · พิมพ์ \"ค่าหมูทั้งหมด\" เพื่อดูยอดหมู",
    };
  } catch (error) {
    const reason = error instanceof Error ? error.message : String(error);
    logger.error("Image processing failed", error instanceof Error ? error : new Error(reason), {
      messageId,
      mimeType,
    });
    return {
      processed: {
        ...msg,
        content: `[IMAGE FAILED] ${reason.slice(0, 200)}`,
        status: "failed",
        errorMessage: reason,
      },
      replyMsg:
        "📷 รับรูปแล้ว แต่ประมวลผลไม่สำเร็จ\n\n" +
        "💡 ลองส่งใหม่ หรือพิมพ์ \"หนองปิง ค่าหมูทั้งหมด\" เพื่อดูยอด",
    };
  }
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
