import { NextResponse } from "next/server";
import { ENV } from "@/config/constants";
import { getSupabaseClient } from "@/lib/services/supabase.service";
import { pingGemini } from "@/lib/services/natural-reply.service";
import { GEMINI_NATURAL_REPLY_TIMEOUT_MS } from "@/config/gemini-timing";
import { createLogger } from "@/lib/middleware/logger";

export const runtime = "nodejs";
export const maxDuration = 15;

const logger = createLogger("HealthRoute");

interface ServiceHealth {
  status: "ok" | "error" | "unknown";
  latencyMs?: number;
  error?: string;
}

interface HealthReport {
  status: "healthy" | "degraded" | "unhealthy";
  timestamp: string;
  services: {
    supabase: ServiceHealth;
    supabaseStorage: ServiceHealth;
    gemini: ServiceHealth;
    line: ServiceHealth;
  };
  geminiNaturalReplyTimeoutMs?: number;
  version: string;
  environment: string;
}

async function checkSupabase(): Promise<ServiceHealth> {
  const start = Date.now();
  try {
    const db = getSupabaseClient();
    const { error } = await db
      .from("financial_records")
      .select("id")
      .limit(1);
    if (error) throw new Error(error.message);
    return { status: "ok", latencyMs: Date.now() - start };
  } catch (error) {
    return {
      status: "error",
      latencyMs: Date.now() - start,
      error: error instanceof Error ? error.message : String(error),
    };
  }
}

async function checkSupabaseStorage(): Promise<ServiceHealth> {
  const start = Date.now();
  try {
    const db = getSupabaseClient();
    const { error } = await db.storage.getBucket("line-files");
    if (error) throw new Error(error.message);
    return { status: "ok", latencyMs: Date.now() - start };
  } catch (error) {
    return {
      status: "error",
      latencyMs: Date.now() - start,
      error: error instanceof Error ? error.message : String(error),
    };
  }
}

async function checkGemini(): Promise<ServiceHealth> {
  const ping = await pingGemini();
  if (!ping.ok) {
    return {
      status: "error",
      latencyMs: ping.latencyMs,
      error: ping.error ?? "Gemini ping failed",
    };
  }
  return { status: "ok", latencyMs: ping.latencyMs };
}

async function checkLine(): Promise<ServiceHealth> {
  const start = Date.now();
  try {
    const token = ENV.LINE_CHANNEL_ACCESS_TOKEN();
    const response = await fetch("https://api.line.me/v2/bot/info", {
      headers: { Authorization: `Bearer ${token}` },
      signal: AbortSignal.timeout(5000),
    });
    if (!response.ok) throw new Error(`HTTP ${response.status}`);
    return { status: "ok", latencyMs: Date.now() - start };
  } catch (error) {
    return {
      status: "error",
      latencyMs: Date.now() - start,
      error: error instanceof Error ? error.message : String(error),
    };
  }
}

export async function GET(): Promise<NextResponse> {
  logger.info("Health check initiated");

  const [dbHealth, storageHealth, geminiHealth, lineHealth] =
    await Promise.allSettled([
      checkSupabase(),
      checkSupabaseStorage(),
      checkGemini(),
      checkLine(),
    ]);

  const services = {
    supabase:
      dbHealth.status === "fulfilled"
        ? dbHealth.value
        : { status: "error" as const, error: String(dbHealth.reason) },
    supabaseStorage:
      storageHealth.status === "fulfilled"
        ? storageHealth.value
        : { status: "error" as const, error: String(storageHealth.reason) },
    gemini:
      geminiHealth.status === "fulfilled"
        ? geminiHealth.value
        : { status: "error" as const, error: String(geminiHealth.reason) },
    line:
      lineHealth.status === "fulfilled"
        ? lineHealth.value
        : { status: "error" as const, error: String(lineHealth.reason) },
  };

  const critical = [services.supabase, services.line, services.gemini];
  const anyError = critical.some((s) => s.status === "error");
  const allOk = critical.every((s) => s.status === "ok");

  const report: HealthReport = {
    status: allOk ? "healthy" : anyError ? "unhealthy" : "degraded",
    timestamp: new Date().toISOString(),
    services,
    geminiNaturalReplyTimeoutMs: GEMINI_NATURAL_REPLY_TIMEOUT_MS,
    version: process.env.npm_package_version ?? "1.0.0",
    environment: ENV.NODE_ENV(),
  };

  return NextResponse.json(report, {
    status: report.status === "healthy" ? 200 : report.status === "degraded" ? 207 : 503,
  });
}
