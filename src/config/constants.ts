// Application-wide constants and validated environment config

function requireEnv(key: string): string {
  const value = process.env[key];
  if (!value) throw new Error(`Missing required environment variable: ${key}`);
  return value;
}

function optionalEnv(key: string, fallback: string): string {
  return process.env[key] ?? fallback;
}

export const ENV = {
  LINE_CHANNEL_ACCESS_TOKEN: () => requireEnv("LINE_CHANNEL_ACCESS_TOKEN"),
  LINE_CHANNEL_SECRET: () => requireEnv("LINE_CHANNEL_SECRET"),
  SUPABASE_URL: () => requireEnv("SUPABASE_URL"),
  SUPABASE_SERVICE_KEY: () => requireEnv("SUPABASE_SERVICE_KEY"),
  GEMINI_API_KEY: () => requireEnv("GEMINI_API_KEY"),
  GEMINI_MODEL: () => optionalEnv("GEMINI_MODEL", "gemini-2.0-flash"),
  DASHBOARD_API_KEY: () => requireEnv("DASHBOARD_API_KEY"),
  DEFAULT_SHOP_ID: () => optionalEnv("DEFAULT_SHOP_ID", "shop1"),
  DEFAULT_SHOP_NAME: () => optionalEnv("DEFAULT_SHOP_NAME", "ร้านครูตอม"),
  RATE_LIMIT_WINDOW_MS: () =>
    parseInt(optionalEnv("RATE_LIMIT_WINDOW_MS", "60000")),
  RATE_LIMIT_MAX_REQUESTS: () =>
    parseInt(optionalEnv("RATE_LIMIT_MAX_REQUESTS", "100")),
  LOG_LEVEL: () => optionalEnv("LOG_LEVEL", "info"),
  NODE_ENV: () => optionalEnv("NODE_ENV", "development"),
} as const;

// Retry configuration
export const RETRY_CONFIG = {
  MAX_ATTEMPTS: 3,
  BASE_DELAY_MS: 1000,
  MAX_DELAY_MS: 10000,
  BACKOFF_MULTIPLIER: 2,
} as const;

// LINE message types
export const LINE_MESSAGE_TYPES = {
  TEXT: "text",
  IMAGE: "image",
  FILE: "file",
  LOCATION: "location",
  VIDEO: "video",
  AUDIO: "audio",
  STICKER: "sticker",
} as const;

// Supported mime types for OCR
export const SUPPORTED_OCR_TYPES = [
  "image/jpeg",
  "image/png",
  "image/gif",
  "image/webp",
] as const;
