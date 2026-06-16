import { NextResponse } from "next/server";
import { validateDashboardApiKey } from "@/lib/middleware/signature-validator";
import {
  benchmarkNaturalReply,
  getNaturalReplyTimeoutMs,
  getRecentNaturalReplyLatencies,
} from "@/lib/services/natural-reply.service";
import { AI_NATURAL_REPLY_TIMEOUT_MS } from "@/config/gemini-timing";
import { createLogger } from "@/lib/middleware/logger";

export const runtime = "nodejs";
export const maxDuration = 60;

const logger = createLogger("AIBenchmarkRoute");

/** POST — measure Groq natural-reply latency (requires DASHBOARD_API_KEY). */
export async function POST(request: Request): Promise<NextResponse> {
  try {
    validateDashboardApiKey(request.headers.get("authorization"));
  } catch {
    return NextResponse.json({ success: false, error: "Unauthorized" }, { status: 401 });
  }

  logger.info("Natural reply benchmark started");

  const short = await benchmarkNaturalReply("record_saved_short");
  const full = await benchmarkNaturalReply("summary");

  const samples = [short.latencyMs, full.latencyMs].filter((ms) => ms > 0);
  const timeoutMs = getNaturalReplyTimeoutMs();

  return NextResponse.json({
    success: true,
    data: {
      short,
      full,
      configuredTimeoutMs: AI_NATURAL_REPLY_TIMEOUT_MS,
      activeTimeoutMs: timeoutMs,
      recentLatenciesMs: [...getRecentNaturalReplyLatencies()],
      recommendedEnv: `AI_NATURAL_REPLY_TIMEOUT_MS=${timeoutMs}`,
    },
  });
}
