import { ENV } from "@/config/constants";
import { RateLimitError } from "@/lib/utils/error-handler";
import type { RateLimitResult } from "@/lib/types/common.types";

// In-memory store for serverless (resets per cold start).
// For production at scale, replace with Vercel KV / Redis.
interface RateLimitEntry {
  count: number;
  windowStart: number;
}

const store = new Map<string, RateLimitEntry>();

// Periodic cleanup to prevent memory leak across warm invocations
let lastCleanup = Date.now();
const CLEANUP_INTERVAL_MS = 5 * 60 * 1000; // 5 min

function cleanup(): void {
  const now = Date.now();
  if (now - lastCleanup < CLEANUP_INTERVAL_MS) return;
  lastCleanup = now;
  const windowMs = ENV.RATE_LIMIT_WINDOW_MS();
  for (const [key, entry] of store.entries()) {
    if (now - entry.windowStart > windowMs) {
      store.delete(key);
    }
  }
}

export function checkRateLimit(identifier: string): RateLimitResult {
  cleanup();

  const windowMs = ENV.RATE_LIMIT_WINDOW_MS();
  const maxRequests = ENV.RATE_LIMIT_MAX_REQUESTS();
  const now = Date.now();

  const entry = store.get(identifier);

  if (!entry || now - entry.windowStart > windowMs) {
    store.set(identifier, { count: 1, windowStart: now });
    return {
      allowed: true,
      remaining: maxRequests - 1,
      resetAt: now + windowMs,
    };
  }

  entry.count++;

  return {
    allowed: entry.count <= maxRequests,
    remaining: Math.max(0, maxRequests - entry.count),
    resetAt: entry.windowStart + windowMs,
  };
}

export function rateLimitMiddleware(identifier: string): void {
  const result = checkRateLimit(identifier);
  if (!result.allowed) {
    throw new RateLimitError(
      `Rate limit exceeded. Reset at ${new Date(result.resetAt).toISOString()}`
    );
  }
}

export function getRateLimitHeaders(identifier: string): Record<string, string> {
  const windowMs = ENV.RATE_LIMIT_WINDOW_MS();
  const maxRequests = ENV.RATE_LIMIT_MAX_REQUESTS();
  const entry = store.get(identifier);
  const now = Date.now();

  return {
    "X-RateLimit-Limit": String(maxRequests),
    "X-RateLimit-Remaining": entry
      ? String(Math.max(0, maxRequests - entry.count))
      : String(maxRequests),
    "X-RateLimit-Reset": entry
      ? String(Math.ceil((entry.windowStart + windowMs) / 1000))
      : String(Math.ceil((now + windowMs) / 1000)),
  };
}
