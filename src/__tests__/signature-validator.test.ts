import { createHmac } from "crypto";
import { validateLineSignature } from "@/lib/middleware/signature-validator";
import { AuthenticationError } from "@/lib/utils/error-handler";

const CHANNEL_SECRET = "test_secret_1234567890";

beforeEach(() => {
  process.env.LINE_CHANNEL_SECRET = CHANNEL_SECRET;
});

function makeSignature(body: string): string {
  return createHmac("sha256", CHANNEL_SECRET).update(body, "utf8").digest("base64");
}

describe("validateLineSignature", () => {
  it("passes with correct signature", () => {
    const body = '{"events":[]}';
    const sig = makeSignature(body);
    expect(() => validateLineSignature(body, sig)).not.toThrow();
  });

  it("throws AuthenticationError when signature is missing", () => {
    expect(() => validateLineSignature("body", null)).toThrow(AuthenticationError);
  });

  it("throws AuthenticationError when signature is wrong", () => {
    expect(() => validateLineSignature("body", "wrongsignature")).toThrow(AuthenticationError);
  });

  it("throws AuthenticationError when body is tampered", () => {
    const body = '{"events":[]}';
    const sig = makeSignature(body);
    expect(() => validateLineSignature('{"events":[{"tampered":true}]}', sig)).toThrow(AuthenticationError);
  });
});
