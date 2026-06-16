import {
  AI_NATURAL_REPLY_TIMEOUT_MS,
  AI_TIMING,
  GEMINI_NATURAL_REPLY_TIMEOUT_MS,
  recommendedTimeoutFromSamples,
} from "@/config/gemini-timing";
import { getNaturalReplyTimeoutMs } from "@/lib/services/natural-reply.service";

jest.mock("@/config/constants", () => ({
  ENV: {
    AI_NATURAL_REPLY_TIMEOUT_MS: () => 0,
    GROQ_API_KEY: () => "test-key",
    GROQ_MODEL: () => "llama-3.3-70b-versatile",
  },
}));

describe("ai-timing", () => {
  it("has a sensible default natural-reply timeout", () => {
    expect(AI_NATURAL_REPLY_TIMEOUT_MS).toBeGreaterThanOrEqual(1000);
    expect(AI_NATURAL_REPLY_TIMEOUT_MS).toBeLessThanOrEqual(30000);
  });

  it("backward-compat alias matches", () => {
    expect(GEMINI_NATURAL_REPLY_TIMEOUT_MS).toBe(AI_NATURAL_REPLY_TIMEOUT_MS);
  });

  it("recommendedTimeoutFromSamples scales p95 by 1.5x", () => {
    expect(recommendedTimeoutFromSamples([2000, 2500, 3000, 3500, 4000])).toBe(6000);
  });

  it("uses static default before adaptive samples exist", () => {
    expect(getNaturalReplyTimeoutMs()).toBe(AI_NATURAL_REPLY_TIMEOUT_MS);
  });

  it("documents expected latency ranges", () => {
    expect(AI_TIMING.naturalReplyMs.p95).toBeGreaterThan(AI_TIMING.pingMs.p95);
  });
});
