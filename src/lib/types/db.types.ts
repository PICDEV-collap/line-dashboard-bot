// Google Sheets data types

export interface MessageRow {
  id: string;
  timestamp: string;
  userId: string;
  displayName: string;
  type: string;
  content: string;
  imageUrl: string;
  fileUrl: string;
  locationLat: string;
  locationLng: string;
  locationAddress: string;
  replyToken: string;
  status: string;
  errorMessage: string;
}

export interface LogRow {
  id: string;
  timestamp: string;
  level: string;
  service: string;
  message: string;
  data: string;
}

export interface StatsRow {
  date: string;
  totalMessages: number;
  textCount: number;
  imageCount: number;
  pdfCount: number;
  locationCount: number;
  ocrCount: number;
  errorCount: number;
}

export interface OcrResultRow {
  id: string;
  messageId: string;
  timestamp: string;
  imageUrl: string;
  rawText: string;
  structuredJson: string;
  confidence: string;
  processingTimeMs: string;
}

export interface DashboardStats {
  totalMessages: number;
  todayMessages: number;
  textCount: number;
  imageCount: number;
  pdfCount: number;
  locationCount: number;
  ocrCount: number;
  errorCount: number;
  successRate: number;
  recentMessages: MessageRow[];
}

export interface DateRangeQuery {
  startDate: string;
  endDate: string;
}
