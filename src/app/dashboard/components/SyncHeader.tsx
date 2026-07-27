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
        background: "#111418",
        borderBottom: "1px solid #2a3140",
        padding: "8px 24px",
        display: "flex",
        alignItems: "center",
        justifyContent: "space-between",
        fontSize: "12px",
        color: "#94a3b8",
        gap: "12px",
        flexWrap: "wrap",
      }}
    >
      <div style={{ display: "flex", alignItems: "center", gap: "8px" }}>
        <span
          style={{
            width: 8,
            height: 8,
            borderRadius: "50%",
            backgroundColor:
              syncStatus.state === "online"
                ? "#22c55e"
                : syncStatus.state === "syncing"
                ? "#eab308"
                : "#ef4444",
            flexShrink: 0,
            boxShadow:
              syncStatus.state === "online"
                ? "0 0 8px #22c55e"
                : "none",
          }}
        />
        <span>{syncStatus.message}</span>
        {syncStatus.lastUpdated && (
          <span style={{ color: "#64748b" }}>· {syncStatus.lastUpdated}</span>
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
            background: "#1c2128",
            border: "1px solid #374151",
            borderRadius: 6,
            padding: "4px 10px",
            fontSize: "12px",
            color: "#e2e8f0",
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
            background: "#1c2128",
            border: "1px solid #374151",
            borderRadius: 6,
            padding: "4px 10px",
            fontSize: "12px",
            color: "#e2e8f0",
            outline: "none",
            width: 140,
          }}
        />
        <button
          onClick={onConnect}
          style={{
            padding: "4px 12px",
            borderRadius: 6,
            fontSize: "12px",
            fontWeight: 600,
            cursor: "pointer",
            border: "none",
            background: "#f97316",
            color: "#fff",
          }}
        >
          🔗 เชื่อมต่อ
        </button>
        <button
          onClick={onRefresh}
          style={{
            padding: "4px 12px",
            borderRadius: 6,
            fontSize: "12px",
            fontWeight: 600,
            cursor: "pointer",
            border: "1px solid #374151",
            background: "#1c2128",
            color: "#94a3b8",
          }}
        >
          ↻ รีเฟรช
        </button>
      </div>
    </div>
  );
}
