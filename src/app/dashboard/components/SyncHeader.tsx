"use client";

import React from "react";
import type { ApiConfig, SyncStatus } from "./types";

interface SyncHeaderProps {
  apiConfig: ApiConfig;
  setApiConfig: React.Dispatch<React.SetStateAction<ApiConfig>>;
  syncStatus: SyncStatus;
  onConnect: () => void;
  onRefresh: () => void;
}

export function SyncHeader({
  apiConfig,
  setApiConfig,
  syncStatus,
  onConnect,
  onRefresh,
}: SyncHeaderProps) {
  return (
    <div
      style={{
        background: "var(--surface)",
        borderBottom: "1px solid var(--border)",
        padding: "8px 24px",
        display: "flex",
        alignItems: "center",
        justifyContent: "space-between",
        fontSize: "0.8rem",
        color: "var(--text-secondary)",
        gap: "12px",
        flexWrap: "wrap",
      }}
    >
      <div style={{ display: "flex", alignItems: "center", gap: "8px" }}>
        <span
          style={{
            width: 8,
            height: 8,
            borderRadius: "var(--radius-pill)",
            backgroundColor:
              syncStatus.state === "online"
                ? "var(--success)"
                : syncStatus.state === "syncing"
                ? "var(--warning)"
                : "var(--danger)",
            flexShrink: 0,
            boxShadow:
              syncStatus.state === "online"
                ? "0 0 8px rgba(16, 185, 129, 0.4)"
                : "none",
          }}
        />
        <span>{syncStatus.message}</span>
        {syncStatus.lastUpdated && (
          <span style={{ color: "var(--text-muted)" }}>· {syncStatus.lastUpdated}</span>
        )}
      </div>

      <div style={{ display: "flex", gap: "8px", alignItems: "center" }}>
        <input
          type="text"
          placeholder="https://your-app.vercel.app"
          value={apiConfig.url}
          onChange={(e) =>
            setApiConfig((prev) => ({ ...prev, url: e.target.value }))
          }
          style={{
            background: "var(--surface-raised)",
            border: "1px solid var(--border)",
            borderRadius: "var(--radius-sm)",
            padding: "6px 10px",
            fontSize: "0.8rem",
            color: "var(--text-primary)",
            outline: "none",
            width: 200,
          }}
        />
        <input
          type="password"
          placeholder="API Key"
          value={apiConfig.key}
          onChange={(e) =>
            setApiConfig((prev) => ({ ...prev, key: e.target.value }))
          }
          style={{
            background: "var(--surface-raised)",
            border: "1px solid var(--border)",
            borderRadius: "var(--radius-sm)",
            padding: "6px 10px",
            fontSize: "0.8rem",
            color: "var(--text-primary)",
            outline: "none",
            width: 140,
          }}
        />
        <button
          type="button"
          onClick={onConnect}
          style={{
            padding: "6px 14px",
            borderRadius: "var(--radius-sm)",
            fontSize: "0.8rem",
            fontWeight: 700,
            cursor: "pointer",
            border: "none",
            background: "var(--primary)",
            color: "#FFFFFF",
            transition: "all 0.15s ease",
          }}
        >
          เชื่อมต่อ
        </button>
        <button
          type="button"
          onClick={onRefresh}
          style={{
            padding: "6px 12px",
            borderRadius: "var(--radius-sm)",
            fontSize: "0.8rem",
            fontWeight: 600,
            cursor: "pointer",
            border: "1px solid var(--border)",
            background: "var(--surface-raised)",
            color: "var(--text-secondary)",
            transition: "all 0.15s ease",
          }}
        >
          ↻ รีเฟรช
        </button>
      </div>
    </div>
  );
}
