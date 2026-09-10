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
          background: "var(--surface)",
          backdropFilter: "blur(12px)",
          borderBottom: "1px solid var(--border)",
          padding: "14px 24px",
          display: "flex",
          alignItems: "center",
          justifyContent: "space-between",
          position: "sticky",
          top: 0,
          zIndex: 100,
          boxShadow: "0 4px 20px rgba(0, 0, 0, 0.15)",
        }}
      >
        <div style={{ display: "flex", alignItems: "center", gap: "12px" }}>
          <div
            style={{
              width: 42,
              height: 42,
              borderRadius: "var(--radius-md)",
              background: "var(--primary-tint)",
              border: "1px solid rgba(6, 199, 85, 0.3)",
              display: "flex",
              alignItems: "center",
              justifyContent: "center",
              fontSize: 20,
              flexShrink: 0,
            }}
          >
            📊
          </div>
          <div>
            <div
              style={{
                fontSize: "1.1rem",
                fontWeight: 700,
                color: "var(--text-primary)",
                letterSpacing: "0.2px",
                display: "flex",
                alignItems: "center",
                gap: 8,
              }}
            >
              <span>ร้านครูตอม</span>
              <span
                style={{
                  fontSize: "0.75rem",
                  fontWeight: 600,
                  color: "var(--primary)",
                  backgroundColor: "var(--primary-tint)",
                  padding: "2px 8px",
                  borderRadius: "var(--radius-pill)",
                }}
              >
                Dashboard
              </span>
            </div>
            <div style={{ fontSize: "0.8rem", color: "var(--text-secondary)", marginTop: 2 }}>
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
              padding: "8px 14px",
              borderRadius: "var(--radius-md)",
              fontSize: "0.85rem",
              fontWeight: 600,
              textDecoration: "none",
              border: "1px solid rgba(6, 199, 85, 0.3)",
              background: "var(--primary-tint)",
              color: "var(--primary)",
              transition: "all 0.15s ease",
            }}
            title="เปิดตารางบันทึกรายได้-รายจ่าย (Mobile & Web Entry Form)"
          >
            <span>📝</span> ตารางกรอกยอด
          </Link>

          <button
            type="button"
            onClick={onExportCsv}
            style={{
              padding: "8px 14px",
              borderRadius: "var(--radius-md)",
              fontSize: "0.85rem",
              fontWeight: 600,
              cursor: "pointer",
              border: "1px solid var(--border)",
              background: "var(--surface-raised)",
              color: "var(--text-secondary)",
              transition: "all 0.15s ease",
            }}
            title="ส่งออกข้อมูลเป็น CSV"
          >
            📥 CSV
          </button>

          <button
            type="button"
            onClick={onOpenAddModal}
            style={{
              padding: "8px 16px",
              borderRadius: "var(--radius-md)",
              fontSize: "0.85rem",
              fontWeight: 700,
              cursor: "pointer",
              border: "none",
              background: "var(--primary)",
              color: "#FFFFFF",
              boxShadow: "0 2px 10px var(--primary-glow)",
              transition: "all 0.15s ease",
            }}
          >
            ＋ เพิ่มข้อมูล
          </button>
        </div>
      </header>

      <nav
        style={{
          display: "flex",
          background: "var(--surface-raised)",
          borderBottom: "1px solid var(--border)",
          padding: "0 24px",
          gap: 6,
          overflowX: "auto",
        }}
      >
        {tabs.map((tab) => {
          const isActive = activeTab === tab.id;
          return (
            <button
              key={tab.id}
              type="button"
              onClick={() => setActiveTab(tab.id)}
              style={{
                padding: "12px 18px",
                fontSize: "0.9rem",
                fontWeight: isActive ? 700 : 500,
                cursor: "pointer",
                border: "none",
                background: "transparent",
                color: isActive ? "var(--primary)" : "var(--text-secondary)",
                borderBottom: isActive
                  ? "2px solid var(--primary)"
                  : "2px solid transparent",
                transition: "all 0.15s ease",
                whiteSpace: "nowrap",
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
