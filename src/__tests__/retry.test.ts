import { withRetry, RetryError } from "@/lib/utils/retry";

describe("withRetry", () => {
  it("returns result on first success", async () => {
    const fn = jest.fn().mockResolvedValue("ok");
    const result = await withRetry(fn, { maxAttempts: 3, baseDelayMs: 0, maxDelayMs: 0, backoffMultiplier: 1 });
    expect(result).toBe("ok");
    expect(fn).toHaveBeenCalledTimes(1);
  });

  it("retries on failure and succeeds", async () => {
    const fn = jest
      .fn()
      .mockRejectedValueOnce(new Error("fail"))
      .mockRejectedValueOnce(new Error("fail"))
      .mockResolvedValue("ok");

    const result = await withRetry(fn, { maxAttempts: 3, baseDelayMs: 0, maxDelayMs: 0, backoffMultiplier: 1 });
    expect(result).toBe("ok");
    expect(fn).toHaveBeenCalledTimes(3);
  });

  it("throws RetryError after max attempts", async () => {
    const fn = jest.fn().mockRejectedValue(new Error("always fails"));
    await expect(
      withRetry(fn, { maxAttempts: 3, baseDelayMs: 0, maxDelayMs: 0, backoffMultiplier: 1 })
    ).rejects.toBeInstanceOf(RetryError);
    expect(fn).toHaveBeenCalledTimes(3);
  });

  it("calls onRetry callback on each retry", async () => {
    const fn = jest.fn().mockRejectedValue(new Error("fail"));
    const onRetry = jest.fn();
    await expect(
      withRetry(fn, { maxAttempts: 3, baseDelayMs: 0, maxDelayMs: 0, backoffMultiplier: 1, onRetry })
    ).rejects.toBeInstanceOf(RetryError);
    expect(onRetry).toHaveBeenCalledTimes(2);
  });
});
