"use client";

import React from "react";
import Link from "next/link";
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
            "linear-gradient(135deg, rgba(21, 8, 0, 0.95), rgba(30, 13, 0, 0.9) 60%, rgba(21, 8, 0, 0.95))",
          backdropFilter: "blur(12px)",
          borderBottom: "1px solid rgba(249, 115, 22, 0.25)",
          padding: "12px 24px",
          display: "flex",
          alignItems: "center",
          justifyContent: "space-between",
          position: "sticky",
          top: 0,
          zIndex: 200,
          boxShadow: "0 4px 30px rgba(0, 0, 0, 0.35)",
        }}
      >
        <div style={{ display: "flex", alignItems: "center", gap: "12px" }}>
          <div
            style={{
              width: 44,
              height: 44,
              borderRadius: 12,
              background: "linear-gradient(135deg, #f97316, #ea580c)",
              display: "flex",
              alignItems: "center",
              justifyContent: "center",
              fontSize: 22,
              boxShadow: "0 0 20px rgba(249, 115, 22, 0.35)",
              flexShrink: 0,
            }}
          >
            🍖
          </div>
          <div>
            <div
              style={{
                fontFamily: "Chakra Petch, sans-serif",
                fontSize: 18,
                fontWeight: 700,
                color: "#f97316",
                letterSpacing: "0.3px",
              }}
            >
              ร้านครูตอม — Dashboard
            </div>
            <div style={{ fontSize: 11, color: "#94a3b8", marginTop: 2 }}>
              ระบบรายงานการเงินและวิเคราะห์ธุรกิจ · LINE Automation
            </div>
          </div>
        </div>

        <div style={{ display: "flex", alignItems: "center", gap: 8 }}>
          <Link
            href="/entry"
            target="_blank"
            style={{
              display: "inline-flex",
              alignItems: "center",
              gap: 6,
              padding: "7px 14px",
              borderRadius: 8,
              fontSize: 12,
              fontWeight: 600,
              textDecoration: "none",
              border: "1px solid rgba(59, 130, 246, 0.4)",
              background: "rgba(59, 130, 246, 0.15)",
              color: "#60a5fa",
              transition: "all 0.2s",
            }}
            title="เปิดตารางบันทึกรายได้-รายจ่าย (Mobile & Web Entry Form)"
          >
            <span>📝</span> ตารางกรอกยอด
          </Link>

          <button
            onClick={onExportCsv}
            style={{
              padding: "7px 13px",
              borderRadius: 8,
              fontSize: 12,
              fontWeight: 600,
              cursor: "pointer",
              border: "1px solid #374151",
              background: "rgba(28, 33, 40, 0.8)",
              color: "#94a3b8",
              transition: "all 0.2s",
            }}
            title="ส่งออกข้อมูลเป็น CSV"
          >
            📥 CSV
          </button>

          <button
            onClick={onOpenAddModal}
            style={{
              padding: "7px 15px",
              borderRadius: 8,
              fontSize: 12,
              fontWeight: 600,
              cursor: "pointer",
              border: "none",
              background: "linear-gradient(135deg, #f97316, #c2410c)",
              color: "#fff",
              boxShadow: "0 2px 12px rgba(249, 115, 22, 0.4)",
              transition: "all 0.2s",
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
