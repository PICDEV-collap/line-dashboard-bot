"use client";

import React from "react";
import type { DashboardTab } from "./types";

interface NavbarProps {
  activeTab: DashboardTab;
  setActiveTab: (tab: DashboardTab) => void;
  onExportCsv: () => void;
  onOpenAddModal: () => void;
}

export function Navbar({
  activeTab,
  setActiveTab,
  onExportCsv,
  onOpenAddModal,
}: NavbarProps) {
  const tabs: { id: DashboardTab; label: string; icon: string }[] = [
    { id: "dashboard", label: "Dashboard", icon: "📊" },
    { id: "records", label: "รายวัน", icon: "📋" },
    { id: "analysis", label: "วิเคราะห์", icon: "📈" },
    { id: "report", label: "รายงาน PDF", icon: "📄" },
    { id: "setup", label: "ตั้งค่า", icon: "⚙️" },
  ];

  return (
    <>
      <header
        style={{
          background:
            "linear-gradient(135deg, #150800, #1e0d00 60%, #150800)",
          borderBottom: "1px solid rgba(249, 115, 22, 0.3)",
          padding: "14px 24px",
          display: "flex",
          alignItems: "center",
          justifyContent: "space-between",
          position: "sticky",
          top: 0,
          zIndex: 200,
          boxShadow: "0 2px 40px rgba(249, 115, 22, 0.15)",
        }}
      >
        <div style={{ display: "flex", alignItems: "center", gap: "10px" }}>
          <div
            style={{
              width: 42,
              height: 42,
              borderRadius: 10,
              background: "linear-gradient(135deg, #f97316, #c2410c)",
              display: "flex",
              alignItems: "center",
              justifyContent: "center",
              fontSize: 22,
              boxShadow: "0 0 20px rgba(249, 115, 22, 0.25)",
              flexShrink: 0,
            }}
          >
            🍖
          </div>
          <div>
            <div
              style={{
                fontFamily: "Chakra Petch, sans-serif",
                fontSize: 17,
                fontWeight: 700,
                color: "#f97316",
              }}
            >
              ร้านครูตอม — Dashboard
            </div>
            <div style={{ fontSize: 11, color: "#94a3b8", marginTop: 1 }}>
              Next.js 16 App Router · Connected to Supabase
            </div>
          </div>
        </div>

        <div style={{ display: "flex", gap: 8 }}>
          <button
            onClick={onExportCsv}
            style={{
              padding: "7px 14px",
              borderRadius: 7,
              fontSize: 12,
              fontWeight: 600,
              cursor: "pointer",
              border: "1px solid #374151",
              background: "transparent",
              color: "#94a3b8",
            }}
          >
            📥 CSV
          </button>
          <button
            onClick={onOpenAddModal}
            style={{
              padding: "7px 14px",
              borderRadius: 7,
              fontSize: 12,
              fontWeight: 600,
              cursor: "pointer",
              border: "none",
              background: "linear-gradient(135deg, #f97316, #c2410c)",
              color: "#fff",
            }}
          >
            ＋ เพิ่มข้อมูล
          </button>
        </div>
      </header>

      <nav
        style={{
          display: "flex",
          background: "#111418",
          borderBottom: "1px solid #2a3140",
          padding: "0 24px",
          gap: 4,
        }}
      >
        {tabs.map((tab) => {
          const isActive = activeTab === tab.id;
          return (
            <button
              key={tab.id}
              onClick={() => setActiveTab(tab.id)}
              style={{
                padding: "11px 18px",
                fontSize: 13,
                fontWeight: 600,
                cursor: "pointer",
                border: "none",
                background: "transparent",
                color: isActive ? "#f97316" : "#94a3b8",
                borderBottom: isActive
                  ? "2px solid #f97316"
                  : "2px solid transparent",
                transition: "all 0.2s",
              }}
            >
              {tab.icon} {tab.label}
            </button>
          );
        })}
      </nav>
    </>
  );
}
