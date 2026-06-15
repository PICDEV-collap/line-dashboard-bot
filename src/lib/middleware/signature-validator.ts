import { createHmac, timingSafeEqual } from "crypto";
import { ENV } from "@/config/constants";
import { AuthenticationError } from "@/lib/utils/error-handler";

/**
 * Validates the LINE webhook signature using HMAC-SHA256.
 * LINE signs requests with: HMAC-SHA256(channelSecret, requestBody)
 * The signature is base64-encoded and sent in X-Line-Signature header.
 */
export function validateLineSignature(
  body: string,
  signature: string | null
): void {
  if (!signature) {
    throw new AuthenticationError("Missing X-Line-Signature header");
  }

  const channelSecret = ENV.LINE_CHANNEL_SECRET();

  const expected = createHmac("sha256", channelSecret)
    .update(body, "utf8")
    .digest("base64");

  // Use timingSafeEqual to prevent timing attacks
  const expectedBuffer = Buffer.from(expected);
  const receivedBuffer = Buffer.from(signature);

  if (
    expectedBuffer.length !== receivedBuffer.length ||
    !timingSafeEqual(expectedBuffer, receivedBuffer)
  ) {
    throw new AuthenticationError("Invalid LINE signature");
  }
}

/**
 * Validates the Dashboard API key from Authorization header.
 * Expected format: "Bearer <api-key>"
 */
export function validateDashboardApiKey(
  authHeader: string | null
): void {
  if (!authHeader) {
    throw new AuthenticationError("Missing Authorization header");
  }

  const [scheme, token] = authHeader.split(" ");

  if (scheme !== "Bearer" || !token) {
    throw new AuthenticationError("Invalid Authorization header format");
  }

  const expectedKey = ENV.DASHBOARD_API_KEY();
  const expectedBuffer = Buffer.from(expectedKey);
  const receivedBuffer = Buffer.from(token);

  if (
    expectedBuffer.length !== receivedBuffer.length ||
    !timingSafeEqual(expectedBuffer, receivedBuffer)
  ) {
    throw new AuthenticationError("Invalid API key");
  }
}
