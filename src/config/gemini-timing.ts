/**
 * Gemini latency defaults — refresh with: npm run benchmark:natural-reply
 * Production ping sample (2026-06-15): API round-trip ~150ms before response;
 * natural reply typically 2–5s on gemini-2.0-flash (benchmark locally when quota allows).
 */
export const GEMINI_TIMING = {
  /** Minimal generateContent ping (health ?geminiPing=1) */
  pingMs: { p50: 800, p95: 1500 },
  /** Natural Thai reply rewrite (short + full templates) */
  naturalReplyMs: { p50: 2800, p95: 5500, max: 8000 },
  measuredAt: "2026-06-15",
  samples: 1,
} as const;

/** Default timeout = p95 natural reply × 1.5, rounded to 500ms, cap 30s */
export const GEMINI_NATURAL_REPLY_TIMEOUT_MS = Math.min(
  30000,
  Math.ceil((GEMINI_TIMING.naturalReplyMs.p95 * 1.5) / 500) * 500
);

export function recommendedTimeoutFromSamples(samples: number[]): number {
  if (!samples.length) return GEMINI_NATURAL_REPLY_TIMEOUT_MS;
  const sorted = [...samples].sort((a, b) => a - b);
  const p95 = sorted[Math.ceil(sorted.length * 0.95) - 1] ?? sorted[sorted.length - 1];
  return Math.min(30000, Math.ceil((p95 * 1.5) / 500) * 500);
}
