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
  GOOGLE_SERVICE_ACCOUNT_KEY: () => requireEnv("GOOGLE_SERVICE_ACCOUNT_KEY"),
  GOOGLE_SHEETS_ID: () => requireEnv("GOOGLE_SHEETS_ID"),
  GOOGLE_DRIVE_FOLDER_ID: () => requireEnv("GOOGLE_DRIVE_FOLDER_ID"),
  GEMINI_API_KEY: () => requireEnv("GEMINI_API_KEY"),
  GEMINI_MODEL: () => optionalEnv("GEMINI_MODEL", "gemini-1.5-flash"),
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

// Google Sheets tab names
export const SHEETS = {
  MESSAGES: "Messages",
  LOGS: "Logs",
  STATS: "Stats",
  OCR_RESULTS: "OCR_Results",
  FINANCIAL_RECORDS: "Financial_Records",
  SHOPS: "Shops",
} as const;

// Google Sheets column headers per sheet
export const SHEET_HEADERS = {
  FINANCIAL_RECORDS: [
    "ID","Date","ShopID","ShopName",
    "Revenue","Transfer","Cash","Delivery",
    "Expense","Pork","PorkBreakdown","Materials","Supplies","Gas","Labor","Ice","ExtraExpenses",
    "Profit","MarginPct","Note","Status","CreatedAt","UpdatedAt",
  ],
  SHOPS: ["ID","Name","Emoji","Color","CreatedAt"],
  MESSAGES: [
    "ID",
    "Timestamp",
    "UserID",
    "DisplayName",
    "Type",
    "Content",
    "ImageURL",
    "FileURL",
    "LocationLat",
    "LocationLng",
    "LocationAddress",
    "ReplyToken",
    "Status",
    "ErrorMessage",
  ],
  LOGS: ["ID", "Timestamp", "Level", "Service", "Message", "Data"],
  STATS: [
    "Date",
    "TotalMessages",
    "TextCount",
    "ImageCount",
    "PDFCount",
    "LocationCount",
    "OCRCount",
    "ErrorCount",
  ],
  OCR_RESULTS: [
    "ID",
    "MessageID",
    "Timestamp",
    "ImageURL",
    "RawText",
    "StructuredJSON",
    "Confidence",
    "ProcessingTimeMs",
  ],
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
