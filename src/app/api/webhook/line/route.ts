import { NextRequest, NextResponse } from "next/server";
import { validateLineSignature } from "@/lib/middleware/signature-validator";
import { rateLimitMiddleware, getRateLimitHeaders } from "@/lib/middleware/rate-limiter";
import { createLogger } from "@/lib/middleware/logger";
import { processWebhookEvents } from "@/lib/services/webhook-processor.service";
import { initializeSheets } from "@/lib/services/google-sheets.service";
import { errorToApiResponse, getStatusCode, AppError } from "@/lib/utils/error-handler";
import type { LineWebhookBody } from "@/lib/types/line.types";

export const runtime = "nodejs";
export const maxDuration = 60;

const logger = createLogger("WebhookRoute");

// Initialize sheets on first cold start (idempotent)
let sheetsInitialized = false;
async function ensureSheetsInitialized(): Promise<void> {
  if (sheetsInitialized) return;
  await initializeSheets();
  sheetsInitialized = true;
}

export async function POST(request: NextRequest): Promise<NextResponse> {
  const startTime = Date.now();

  // 1. Rate limiting by IP
  const ip =
    request.headers.get("x-forwarded-for")?.split(",")[0]?.trim() ??
    request.headers.get("x-real-ip") ??
    "unknown";

  const rateLimitHeaders = getRateLimitHeaders(ip);

  try {
    rateLimitMiddleware(ip);
  } catch (error) {
    logger.warn("Rate limit exceeded", { ip });
    return NextResponse.json(errorToApiResponse(error), {
      status: 429,
      headers: rateLimitHeaders,
    });
  }

  // 2. Read raw body for signature validation
  let bodyText: string;
  try {
    bodyText = await request.text();
  } catch {
    return NextResponse.json(errorToApiResponse(new AppError("Failed to read request body", 400)), {
      status: 400,
    });
  }

  // 3. Validate LINE signature
  const signature = request.headers.get("x-line-signature");
  try {
    validateLineSignature(bodyText, signature);
  } catch (error) {
    logger.warn("Signature validation failed", { ip, signature: signature?.slice(0, 10) });
    return NextResponse.json(errorToApiResponse(error), {
      status: 401,
      headers: rateLimitHeaders,
    });
  }

  // 4. Parse webhook body
  let body: LineWebhookBody;
  try {
    body = JSON.parse(bodyText) as LineWebhookBody;
  } catch {
    return NextResponse.json(
      errorToApiResponse(new AppError("Invalid JSON body", 400)),
      { status: 400 }
    );
  }

  logger.info("Received webhook", {
    destination: body.destination,
    eventCount: body.events.length,
    ip,
  });

  // 5. Early 200 response — LINE requires < 30s response
  // Process events asynchronously (Vercel allows this via maxDuration)
  const processingPromise = (async () => {
    await ensureSheetsInitialized().catch((err) =>
      logger.error("Sheets init failed", err)
    );
    await processWebhookEvents(body.events);
    logger.info("Webhook processing complete", {
      durationMs: Date.now() - startTime,
      eventCount: body.events.length,
    });
  })();

  // Respond immediately to LINE (prevents retry)
  const response = NextResponse.json(
    { success: true, timestamp: new Date().toISOString() },
    { status: 200, headers: rateLimitHeaders }
  );

  // Await processing within the serverless function lifetime
  await processingPromise.catch((err) =>
    logger.error("Webhook processing failed", err)
  );

  return response;
}

// LINE webhook verification endpoint
export async function GET(): Promise<NextResponse> {
  return NextResponse.json({
    status: "ok",
    service: "LINE Bot Webhook",
    timestamp: new Date().toISOString(),
  });
}
