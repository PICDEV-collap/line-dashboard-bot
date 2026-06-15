import { RETRY_CONFIG } from "@/config/constants";
import type { RetryOptions } from "@/lib/types/common.types";

export class RetryError extends Error {
  constructor(
    message: string,
    public readonly attempts: number,
    public readonly lastError: Error
  ) {
    super(message);
    this.name = "RetryError";
  }
}

export async function withRetry<T>(
  fn: () => Promise<T>,
  options: Partial<RetryOptions> = {}
): Promise<T> {
  const config: RetryOptions = {
    maxAttempts: options.maxAttempts ?? RETRY_CONFIG.MAX_ATTEMPTS,
    baseDelayMs: options.baseDelayMs ?? RETRY_CONFIG.BASE_DELAY_MS,
    maxDelayMs: options.maxDelayMs ?? RETRY_CONFIG.MAX_DELAY_MS,
    backoffMultiplier:
      options.backoffMultiplier ?? RETRY_CONFIG.BACKOFF_MULTIPLIER,
    onRetry: options.onRetry,
  };

  let lastError: Error = new Error("Unknown error");

  for (let attempt = 1; attempt <= config.maxAttempts; attempt++) {
    try {
      return await fn();
    } catch (error) {
      lastError = error instanceof Error ? error : new Error(String(error));

      if (attempt === config.maxAttempts) break;

      const delay = Math.min(
        config.baseDelayMs * Math.pow(config.backoffMultiplier, attempt - 1),
        config.maxDelayMs
      );

      config.onRetry?.(attempt, lastError);

      await sleep(delay);
    }
  }

  throw new RetryError(
    `Failed after ${config.maxAttempts} attempts: ${lastError.message}`,
    config.maxAttempts,
    lastError
  );
}

function sleep(ms: number): Promise<void> {
  return new Promise((resolve) => setTimeout(resolve, ms));
}

// Retry only for specific error types (e.g. network errors, rate limits)
export function isRetryableError(error: unknown): boolean {
  if (!(error instanceof Error)) return false;

  const retryableMessages = [
    "ECONNRESET",
    "ENOTFOUND",
    "ECONNREFUSED",
    "ETIMEDOUT",
    "socket hang up",
    "429",
    "503",
    "502",
  ];

  return retryableMessages.some(
    (msg) =>
      error.message.includes(msg) ||
      (error as NodeJS.ErrnoException).code === msg
  );
}
