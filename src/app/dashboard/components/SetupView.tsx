"use client";

import React, { useState } from "react";
import type { ApiConfig } from "./types";

interface SetupViewProps {
  apiConfig: ApiConfig;
  onSaveConfig: (url: string, key: string) => void;
  onSeedData: () => Promise<void>;
}

export function SetupView({
  apiConfig,
  onSaveConfig,
  onSeedData,
}: SetupViewProps) {
  const [url, setUrl] = useState(apiConfig.url);
  const [key, setKey] = useState(apiConfig.key);
  const [seeding, setSeeding] = useState(false);

  const handleSave = () => {
    onSaveConfig(url, key);
  };

  const handleSeed = async () => {
    setSeeding(true);
    try {
      await onSeedData();
    } finally {
      setSeeding(false);
    }
  };

  return (
    <div
      style={{
        display: "grid",
        gridTemplateColumns: "repeat(auto-fit, minmax(320px, 1fr))",
        gap: 16,
      }}
    >
      {/* API Config Card */}
      <div
        style={{
          background: "#161b22",
          border: "1px solid #2a3140",
          borderRadius: 12,
          padding: 18,
        }}
      >
        <div
          style={{
            fontFamily: "Chakra Petch, sans-serif",
            fontSize: 14,
            fontWeight: 700,
            color: "#e2e8f0",
            marginBottom: 14,
          }}
        >
          🔗 ตั้งค่าการเชื่อมต่อ API (API Configuration)
        </div>
        <div style={{ display: "flex", flexDirection: "column", gap: 12 }}>
          <div style={{ display: "flex", flexDirection: "column", gap: 4 }}>
            <label style={{ fontSize: 11, color: "#94a3b8", fontWeight: 600 }}>
              Vercel App URL
            </label>
            <input
              type="text"
              placeholder="https://your-app.vercel.app"
              value={url}
              onChange={(e) => setUrl(e.target.value)}
              style={{
                background: "#1c2128",
                border: "1px solid #374151",
                borderRadius: 7,
                padding: "9px 11px",
                fontSize: 13,
                color: "#e2e8f0",
                outline: "none",
              }}
            />
          </div>
          <div style={{ display: "flex", flexDirection: "column", gap: 4 }}>
            <label style={{ fontSize: 11, color: "#94a3b8", fontWeight: 600 }}>
              API Key (DASHBOARD_API_KEY)
            </label>
            <input
              type="password"
              placeholder="your-secret-api-key"
              value={key}
              onChange={(e) => setKey(e.target.value)}
              style={{
                background: "#1c2128",
                border: "1px solid #374151",
                borderRadius: 7,
                padding: "9px 11px",
                fontSize: 13,
                color: "#e2e8f0",
                outline: "none",
              }}
            />
          </div>
          <button
            onClick={handleSave}
            style={{
              padding: "9px 14px",
              borderRadius: 7,
              fontSize: 13,
              fontWeight: 600,
              cursor: "pointer",
              border: "none",
              background: "#f97316",
              color: "#fff",
              marginTop: 4,
            }}
          >
            💾 บันทึกการตั้งค่า
          </button>
        </div>
      </div>

      {/* Data Import & Seed Card */}
      <div
        style={{
          background: "#161b22",
          border: "1px solid #2a3140",
          borderRadius: 12,
          padding: 18,
        }}
      >
        <div
          style={{
            fontFamily: "Chakra Petch, sans-serif",
            fontSize: 14,
            fontWeight: 700,
            color: "#e2e8f0",
            marginBottom: 14,
          }}
        >
          🌱 นำเข้าข้อมูลเริ่มต้น (Seed Data)
        </div>
        <p style={{ fontSize: 12, color: "#94a3b8", marginBottom: 14 }}>
          สร้างข้อมูลทดลอง 31 ข้อมูลทางการเงินย้อนหลัง (เดือนมีนาคม 2569) เข้าสู่ฐานข้อมูล Supabase
        </p>
        <button
          onClick={handleSeed}
          disabled={seeding}
          style={{
            padding: "9px 14px",
            borderRadius: 7,
            fontSize: 13,
            fontWeight: 600,
            cursor: seeding ? "not-allowed" : "pointer",
            border: "none",
            background: "linear-gradient(135deg, #22c55e, #10b981)",
            color: "#fff",
            opacity: seeding ? 0.7 : 1,
          }}
        >
          {seeding ? "⌛ กำลัง Seed ข้อมูล..." : "🌱 Import 31 Records (มี.ค. 2569)"}
        </button>
      </div>

      {/* API Reference Card */}
      <div
        style={{
          background: "#161b22",
          border: "1px solid #2a3140",
          borderRadius: 12,
          padding: 18,
          gridColumn: "1 / -1",
        }}
      >
        <div
          style={{
            fontFamily: "Chakra Petch, sans-serif",
            fontSize: 14,
            fontWeight: 700,
            color: "#e2e8f0",
            marginBottom: 10,
          }}
        >
          📡 รายการ API Endpoints ทั้งหมด
        </div>
        <div
          style={{
            fontSize: 12,
            color: "#94a3b8",
            lineHeight: 1.8,
            fontFamily: "monospace",
          }}
        >
          <div>GET  /api/records?month=2026-03 — ดึงข้อมูลรายการการเงิน</div>
          <div>POST /api/records               — บันทึกรายการใหม่</div>
          <div>PUT  /api/records/[id]          — แก้ไขรายการตาม ID</div>
          <div>DELETE /api/records/[id]       — ลบรายการตาม ID</div>
          <div>POST /api/seed                  — Import 31 ข้อมูลเริ่มต้น</div>
          <div>GET  /api/health                — ตรวจสอบสถานะการเชื่อมต่อบริการต่างๆ</div>
        </div>
      </div>
    </div>
  );
}
