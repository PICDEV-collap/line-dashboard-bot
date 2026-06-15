import {
  GEMINI_NATURAL_REPLY_TIMEOUT_MS,
  GEMINI_TIMING,
  recommendedTimeoutFromSamples,
} from "@/config/gemini-timing";
import { getNaturalReplyTimeoutMs } from "@/lib/services/natural-reply.service";

jest.mock("@/config/constants", () => ({
  ENV: {
    GEMINI_NATURAL_REPLY_TIMEOUT_MS: () => 0,
    GEMINI_API_KEY: () => "test-key",
    GEMINI_MODEL: () => "gemini-2.0-flash",
  },
}));

describe("gemini-timing", () => {
  it("has a sensible default natural-reply timeout", () => {
    expect(GEMINI_NATURAL_REPLY_TIMEOUT_MS).toBeGreaterThanOrEqual(5000);
    expect(GEMINI_NATURAL_REPLY_TIMEOUT_MS).toBeLessThanOrEqual(30000);
  });

  it("recommendedTimeoutFromSamples scales p95 by 1.5x", () => {
    expect(recommendedTimeoutFromSamples([2000, 2500, 3000, 3500, 4000])).toBe(6000);
  });

  it("uses static default before adaptive samples exist", () => {
    expect(getNaturalReplyTimeoutMs()).toBe(GEMINI_NATURAL_REPLY_TIMEOUT_MS);
  });

  it("documents expected latency ranges", () => {
    expect(GEMINI_TIMING.naturalReplyMs.p95).toBeGreaterThan(GEMINI_TIMING.pingMs.p95);
  });
});
