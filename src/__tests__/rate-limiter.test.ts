import { checkRateLimit } from "@/lib/middleware/rate-limiter";

beforeEach(() => {
  process.env.RATE_LIMIT_WINDOW_MS = "60000";
  process.env.RATE_LIMIT_MAX_REQUESTS = "3";
});

describe("checkRateLimit", () => {
  it("allows requests within limit", () => {
    const id = `test-${Date.now()}-${Math.random()}`;
    const r1 = checkRateLimit(id);
    const r2 = checkRateLimit(id);
    const r3 = checkRateLimit(id);

    expect(r1.allowed).toBe(true);
    expect(r2.allowed).toBe(true);
    expect(r3.allowed).toBe(true);
  });

  it("blocks requests beyond limit", () => {
    const id = `test-${Date.now()}-${Math.random()}`;
    checkRateLimit(id);
    checkRateLimit(id);
    checkRateLimit(id);
    const r4 = checkRateLimit(id);
    expect(r4.allowed).toBe(false);
    expect(r4.remaining).toBe(0);
  });

  it("uses different counters for different identifiers", () => {
    const id1 = `test-a-${Date.now()}`;
    const id2 = `test-b-${Date.now()}`;
    checkRateLimit(id1);
    checkRateLimit(id1);
    checkRateLimit(id1);

    const r = checkRateLimit(id2);
    expect(r.allowed).toBe(true);
  });
});
