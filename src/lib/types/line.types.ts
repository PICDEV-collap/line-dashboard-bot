// LINE Messaging API type definitions

export interface LineWebhookBody {
  destination: string;
  events: LineEvent[];
}

export type LineEventType =
  | "message"
  | "follow"
  | "unfollow"
  | "join"
  | "leave"
  | "postback"
  | "beacon";

export interface LineEvent {
  type: LineEventType;
  timestamp: number;
  source: LineEventSource;
  replyToken?: string;
  message?: LineMessage;
}

export interface LineEventSource {
  type: "user" | "group" | "room";
  userId?: string;
  groupId?: string;
  roomId?: string;
}

export type LineMessageType =
  | "text"
  | "image"
  | "video"
  | "audio"
  | "file"
  | "location"
  | "sticker";

export interface LineMessage {
  id: string;
  type: LineMessageType;
  // text
  text?: string;
  // location
  title?: string;
  address?: string;
  latitude?: number;
  longitude?: number;
  // file
  fileName?: string;
  fileSize?: number;
  // sticker
  packageId?: string;
  stickerId?: string;
}

export interface ProcessedMessage {
  id: string;
  timestamp: string;
  userId: string;
  displayName: string;
  type: LineMessageType;
  content: string;
  imageUrl?: string;
  fileUrl?: string;
  locationLat?: number;
  locationLng?: number;
  locationAddress?: string;
  replyToken?: string;
  status: "pending" | "completed" | "failed";
  errorMessage?: string;
}

export interface LineUserProfile {
  userId: string;
  displayName: string;
  pictureUrl?: string;
  statusMessage?: string;
  language?: string;
}

export interface OcrResult {
  id: string;
  messageId: string;
  timestamp: string;
  imageUrl: string;
  rawText: string;
  structuredJson: Record<string, unknown>;
  confidence: number;
  processingTimeMs: number;
}
