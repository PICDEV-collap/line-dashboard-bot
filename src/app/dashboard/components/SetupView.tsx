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
  const [syncingMenu, setSyncingMenu] = useState(false);
  const [menuStatus, setMenuStatus] = useState<{ type: "success" | "error" | "info"; msg: string } | null>(null);

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

  const handleSyncRichMenu = async () => {
    if (!url) {
      setMenuStatus({ type: "error", msg: "กรุณาระบุ Vercel App URL ก่อน" });
      return;
    }
    setSyncingMenu(true);
    setMenuStatus({ type: "info", msg: "กำลังส่งข้อมูลและอัปโหลดภาพแถบเมนูไปยัง LINE API..." });
    try {
      const baseUrl = url.replace(/\/$/, "");
      const res = await fetch(`${baseUrl}/api/line/richmenu`, {
        method: "POST",
        headers: {
          Authorization: `Bearer ${key}`,
          "Content-Type": "application/json",
        },
      });

      const json = await res.json();
      if (!res.ok || json.success === false) {
        throw new Error(json.error || `HTTP error ${res.status}`);
      }

      setMenuStatus({
        type: "success",
        msg: `✅ สำเร็จ! ${json.data?.message || "ติดตั้งแถบเมนูสำเร็จแล้ว"} (ID: ${json.data?.richMenuId || ""})`,
      });
    } catch (err: unknown) {
      const errMsg = err instanceof Error ? err.message : String(err);
      setMenuStatus({ type: "error", msg: `❌ เกิดข้อผิดพลาด: ${errMsg}` });
    } finally {
      setSyncingMenu(false);
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

      {/* LINE Rich Menu Sync Card */}
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
            marginBottom: 10,
          }}
        >
          📌 ติดตั้งแถบเมนู LINE (LINE Rich Menu)
        </div>
        <p style={{ fontSize: 12, color: "#94a3b8", marginBottom: 14, lineHeight: 1.6 }}>
          ส่งแถบเมนู 6 ช่อง (กรอกรายรับ-รายจ่าย, สรุปวันนี้, เช็คยอดหมู, 2 สาขา, ช่วยเหลือ) เข้าสู่ระบบ LINE Official Account เพื่อให้แสดงผลด้านล่างของหน้าจอแชทสำหรับลูกค้า/ผู้ใช้ทุกคนทันที
        </p>

        <div style={{ display: "flex", gap: 10, flexWrap: "wrap", alignItems: "center" }}>
          <button
            onClick={handleSyncRichMenu}
            disabled={syncingMenu}
            style={{
              padding: "9px 16px",
              borderRadius: 7,
              fontSize: 13,
              fontWeight: 600,
              cursor: syncingMenu ? "not-allowed" : "pointer",
              border: "none",
              background: "linear-gradient(135deg, #059669, #10b981)",
              color: "#fff",
              boxShadow: "0 2px 10px rgba(16, 185, 129, 0.3)",
              opacity: syncingMenu ? 0.7 : 1,
            }}
          >
            {syncingMenu ? "⌛ กำลังส่งข้อมูลไปยัง LINE..." : "🚀 ติดตั้งแถบเมนูให้ผู้ใช้ทุกคน"}
          </button>

          <a
            href="/richmenu.png"
            target="_blank"
            rel="noopener noreferrer"
            style={{
              padding: "8px 14px",
              borderRadius: 7,
              fontSize: 12,
              fontWeight: 600,
              textDecoration: "none",
              border: "1px solid #374151",
              background: "#1c2128",
              color: "#38bdf8",
            }}
          >
            🖼️ ดูรูปแถบเมนู (2500x1686)
          </a>
        </div>

        {menuStatus && (
          <div
            style={{
              marginTop: 12,
              padding: "8px 12px",
              borderRadius: 6,
              fontSize: 12,
              fontWeight: 500,
              background:
                menuStatus.type === "success"
                  ? "rgba(34, 197, 94, 0.15)"
                  : menuStatus.type === "error"
                  ? "rgba(239, 68, 68, 0.15)"
                  : "rgba(59, 130, 246, 0.15)",
              color:
                menuStatus.type === "success"
                  ? "#4ade80"
                  : menuStatus.type === "error"
                  ? "#f87171"
                  : "#60a5fa",
              border:
                menuStatus.type === "success"
                  ? "1px solid rgba(34, 197, 94, 0.3)"
                  : menuStatus.type === "error"
                  ? "1px solid rgba(239, 68, 68, 0.3)"
                  : "1px solid rgba(59, 130, 246, 0.3)",
            }}
          >
            {menuStatus.msg}
          </div>
        )}
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
