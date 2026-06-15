import { ENV } from "@/config/constants";
import { generateId, getCurrentTimestamp, safeJsonStringify, truncate } from "@/lib/utils/helpers";
import type { LogEntry, LogLevel } from "@/lib/types/common.types";

// In-memory log buffer for batch writes to Sheets
const logBuffer: LogEntry[] = [];
const MAX_BUFFER_SIZE = 50;

class Logger {
  private service: string;

  constructor(service: string) {
    this.service = service;
  }

  private shouldLog(level: LogLevel): boolean {
    const levels: LogLevel[] = ["debug", "info", "warn", "error"];
    const configuredLevel = ENV.LOG_LEVEL() as LogLevel;
    return levels.indexOf(level) >= levels.indexOf(configuredLevel);
  }

  private formatEntry(level: LogLevel, message: string, data?: unknown): LogEntry {
    return {
      id: generateId(),
      timestamp: getCurrentTimestamp(),
      level,
      service: this.service,
      message: truncate(message, 500),
      data: data ? JSON.parse(safeJsonStringify(data)) : undefined,
    };
  }

  private output(entry: LogEntry): void {
    if (!this.shouldLog(entry.level)) return;

    const prefix = `[${entry.timestamp}] [${entry.level.toUpperCase()}] [${entry.service}]`;
    const msg = entry.data
      ? `${prefix} ${entry.message} ${safeJsonStringify(entry.data)}`
      : `${prefix} ${entry.message}`;

    switch (entry.level) {
      case "error":
        console.error(msg);
        break;
      case "warn":
        console.warn(msg);
        break;
      case "debug":
        console.debug(msg);
        break;
      default:
        console.log(msg);
    }

    // Buffer for async write to Sheets (non-critical path)
    logBuffer.push(entry);
    if (logBuffer.length > MAX_BUFFER_SIZE) {
      logBuffer.shift(); // Drop oldest if buffer full
    }
  }

  debug(message: string, data?: unknown): void {
    this.output(this.formatEntry("debug", message, data));
  }

  info(message: string, data?: unknown): void {
    this.output(this.formatEntry("info", message, data));
  }

  warn(message: string, data?: unknown): void {
    this.output(this.formatEntry("warn", message, data));
  }

  error(message: string, error?: unknown, data?: unknown): void {
    const errorData =
      error instanceof Error
        ? { message: error.message, stack: error.stack, ...((data as object) ?? {}) }
        : { error, ...((data as object) ?? {}) };
    this.output(this.formatEntry("error", message, errorData));
  }
}

export function createLogger(service: string): Logger {
  return new Logger(service);
}

export function getLogBuffer(): LogEntry[] {
  return [...logBuffer];
}

export function clearLogBuffer(): void {
  logBuffer.length = 0;
}

export function drainLogBuffer(): LogEntry[] {
  const entries = [...logBuffer];
  logBuffer.length = 0;
  return entries;
}

// Convenience: serialize a log entry to a Sheets row
export function logEntryToRow(entry: LogEntry): string[] {
  return [
    entry.id,
    entry.timestamp,
    entry.level,
    entry.service,
    entry.message,
    entry.data ? safeJsonStringify(entry.data) : "",
  ];
}
