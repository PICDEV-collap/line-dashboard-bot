/**
 * AI reply latency defaults — refresh with: npm run benchmark:natural-reply
 * Groq LPU inference is significantly faster than Gemini (~100-500ms typical).
 */
export const AI_TIMING = {
  /** Minimal chat ping (health check) */
  pingMs: { p50: 200, p95: 500 },
  /** Natural Thai reply rewrite (short + full templates) */
  naturalReplyMs: { p50: 400, p95: 1200, max: 3000 },
  measuredAt: "2026-06-16",
  samples: 1,
} as const;

/** Default timeout = p95 natural reply × 1.5, rounded to 500ms, cap 30s */
export const AI_NATURAL_REPLY_TIMEOUT_MS = Math.min(
  30000,
  Math.ceil((AI_TIMING.naturalReplyMs.p95 * 1.5) / 500) * 500
);

// Backward-compat aliases
export const GEMINI_TIMING = AI_TIMING;
export const GEMINI_NATURAL_REPLY_TIMEOUT_MS = AI_NATURAL_REPLY_TIMEOUT_MS;

export function recommendedTimeoutFromSamples(samples: number[]): number {
  if (!samples.length) return AI_NATURAL_REPLY_TIMEOUT_MS;
  const sorted = [...samples].sort((a, b) => a - b);
  const p95 = sorted[Math.ceil(sorted.length * 0.95) - 1] ?? sorted[sorted.length - 1];
  return Math.min(30000, Math.ceil((p95 * 1.5) / 500) * 500);
}
