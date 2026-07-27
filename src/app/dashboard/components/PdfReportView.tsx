"use client";

import React, { useState } from "react";
import type { FinancialRecord } from "@/lib/types/financial.types";

interface PdfReportViewProps {
  records: FinancialRecord[];
  availableMonths: string[];
}

export function PdfReportView({ records, availableMonths }: PdfReportViewProps) {
  const [selectedMonth, setSelectedMonth] = useState<string>(
    availableMonths[0] || "all"
  );
  const [selectedShop, setSelectedShop] = useState<string>("all");

  const filtered = records.filter((r) => {
    if (selectedShop !== "all" && r.shopId !== selectedShop) return false;
    if (selectedMonth !== "all" && !r.date.startsWith(selectedMonth)) return false;
    return true;
  });

  const totalRev = filtered.reduce((sum, r) => sum + (r.revenue || 0), 0);
  const totalExp = filtered.reduce((sum, r) => sum + (r.expense || 0), 0);
  const netProf = totalRev - totalExp;
  const margin = totalRev > 0 ? ((netProf / totalRev) * 100).toFixed(1) : "0.0";

  const fmt = (n: number) => n.toLocaleString("th-TH");

  const handlePrint = () => {
    window.print();
  };

  return (
    <div style={{ display: "flex", flexDirection: "column", gap: 14 }}>
      {/* Control bar */}
      <div
        style={{
          background: "#161b22",
          border: "1px solid #2a3140",
          borderRadius: 12,
          padding: "14px 18px",
          display: "flex",
          flexWrap: "wrap",
          gap: 10,
          alignItems: "flex-end",
        }}
      >
        <div style={{ display: "flex", flexDirection: "column", gap: 4 }}>
          <label style={{ fontSize: 10, color: "#94a3b8", fontWeight: 700 }}>
            เลือกเดือน
          </label>
          <select
            value={selectedMonth}
            onChange={(e) => setSelectedMonth(e.target.value)}
            style={{
              background: "#1c2128",
              border: "1px solid #374151",
              borderRadius: 7,
              padding: "7px 11px",
              fontSize: 13,
              color: "#e2e8f0",
              outline: "none",
            }}
          >
            <option value="all">ทุกเดือน</option>
            {availableMonths.map((m) => (
              <option key={m} value={m}>
                {m}
              </option>
            ))}
          </select>
        </div>

        <div style={{ display: "flex", flexDirection: "column", gap: 4 }}>
          <label style={{ fontSize: 10, color: "#94a3b8", fontWeight: 700 }}>
            เลือกสาขา
          </label>
          <select
            value={selectedShop}
            onChange={(e) => setSelectedShop(e.target.value)}
            style={{
              background: "#1c2128",
              border: "1px solid #374151",
              borderRadius: 7,
              padding: "7px 11px",
              fontSize: 13,
              color: "#e2e8f0",
              outline: "none",
            }}
          >
            <option value="all">ทุกสาขา</option>
            <option value="shop1">ตลาดญี่ปุ่น</option>
            <option value="shop2">สายหนองปิง</option>
          </select>
        </div>

        <div style={{ display: "flex", gap: 8, marginLeft: "auto" }}>
          <button
            onClick={handlePrint}
            style={{
              padding: "7px 14px",
              borderRadius: 7,
              fontSize: 12,
              fontWeight: 600,
              cursor: "pointer",
              border: "none",
              background: "#f97316",
              color: "#fff",
            }}
          >
            🖨️ พิมพ์ / บันทึกเป็น PDF
          </button>
        </div>
      </div>

      {/* Printable Sheet */}
      <div
        id="printableReportSheet"
        style={{
          background: "#ffffff",
          color: "#1f2937",
          maxWidth: 920,
          margin: "0 auto",
          padding: "34px 40px",
          borderRadius: 8,
          boxShadow: "0 10px 40px rgba(0,0,0,0.4)",
          fontFamily: "Sarabun, sans-serif",
          width: "100%",
        }}
      >
        <div
          style={{
            display: "flex",
            justifyContent: "space-between",
            alignItems: "flex-start",
            borderBottom: "3px solid #f97316",
            paddingBottom: 16,
            marginBottom: 20,
          }}
        >
          <div style={{ display: "flex", alignItems: "center", gap: 12 }}>
            <div
              style={{
                width: 46,
                height: 46,
                borderRadius: 10,
                background: "linear-gradient(135deg, #f97316, #c2410c)",
                display: "flex",
                alignItems: "center",
                justifyContent: "center",
                fontSize: 24,
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
                  color: "#111827",
                }}
              >
                รายงานผลการดำเนินงาน — ร้านครูตอม
              </div>
              <div style={{ fontSize: 12, color: "#6b7280" }}>
                สาขา:{" "}
                {selectedShop === "shop1"
                  ? "ตลาดญี่ปุ่น"
                  : selectedShop === "shop2"
                  ? "สายหนองปิง"
                  : "ทุกสาขา"}
              </div>
            </div>
          </div>
          <div style={{ textAlign: "right" }}>
            <div
              style={{
                fontFamily: "Chakra Petch, sans-serif",
                fontSize: 17,
                color: "#c2410c",
                fontWeight: 700,
              }}
            >
              ประจำเดือน {selectedMonth}
            </div>
            <div style={{ fontSize: 10, color: "#9ca3af", marginTop: 3 }}>
              สร้างเมื่อ: {new Date().toLocaleDateString("th-TH")}
            </div>
          </div>
        </div>

        {/* KPI Grid */}
        <div
          style={{
            display: "grid",
            gridTemplateColumns: "repeat(4, 1fr)",
            gap: 10,
            marginBottom: 20,
          }}
        >
          <div
            style={{
              border: "1px solid #e5e7eb",
              borderRadius: 10,
              padding: "12px 14px",
              background: "#fafafa",
            }}
          >
            <div style={{ fontSize: 11, color: "#6b7280" }}>รายรับรวม</div>
            <div
              style={{
                fontFamily: "Chakra Petch",
                fontSize: 18,
                fontWeight: 700,
                color: "#2563eb",
              }}
            >
              ฿{fmt(totalRev)}
            </div>
          </div>
          <div
            style={{
              border: "1px solid #e5e7eb",
              borderRadius: 10,
              padding: "12px 14px",
              background: "#fafafa",
            }}
          >
            <div style={{ fontSize: 11, color: "#6b7280" }}>ค่าใช้จ่ายรวม</div>
            <div
              style={{
                fontFamily: "Chakra Petch",
                fontSize: 18,
                fontWeight: 700,
                color: "#dc2626",
              }}
            >
              ฿{fmt(totalExp)}
            </div>
          </div>
          <div
            style={{
              border: "1px solid #e5e7eb",
              borderRadius: 10,
              padding: "12px 14px",
              background: "#fafafa",
            }}
          >
            <div style={{ fontSize: 11, color: "#6b7280" }}>กำไรสุทธิ</div>
            <div
              style={{
                fontFamily: "Chakra Petch",
                fontSize: 18,
                fontWeight: 700,
                color: netProf >= 0 ? "#16a34a" : "#dc2626",
              }}
            >
              ฿{fmt(netProf)}
            </div>
          </div>
          <div
            style={{
              border: "1px solid #e5e7eb",
              borderRadius: 10,
              padding: "12px 14px",
              background: "#fafafa",
            }}
          >
            <div style={{ fontSize: 11, color: "#6b7280" }}>อัตรากำไร</div>
            <div
              style={{
                fontFamily: "Chakra Petch",
                fontSize: 18,
                fontWeight: 700,
                color: "#d97706",
              }}
            >
              {margin}%
            </div>
          </div>
        </div>

        {/* Printable Table */}
        <table
          style={{
            width: "100%",
            borderCollapse: "collapse",
            fontSize: 11,
          }}
        >
          <thead>
            <tr style={{ background: "#f97316", color: "#fff" }}>
              <th style={{ padding: "7px 9px", textAlign: "left" }}>วันที่</th>
              <th style={{ padding: "7px 9px", textAlign: "left" }}>สาขา</th>
              <th style={{ padding: "7px 9px", textAlign: "right" }}>รายรับ (฿)</th>
              <th style={{ padding: "7px 9px", textAlign: "right" }}>ค่าใช้จ่าย (฿)</th>
              <th style={{ padding: "7px 9px", textAlign: "right" }}>กำไรสุทธิ (฿)</th>
            </tr>
          </thead>
          <tbody>
            {filtered.map((r, idx) => {
              const rev = r.revenue || 0;
              const exp = r.expense || 0;
              const prof = r.profit ?? (rev - exp);
              return (
                <tr
                  key={r.id}
                  style={{
                    background: idx % 2 === 0 ? "#fff" : "#fafafa",
                    borderBottom: "1px solid #eef0f2",
                  }}
                >
                  <td style={{ padding: "6px 9px" }}>{r.date}</td>
                  <td style={{ padding: "6px 9px" }}>
                    {r.shopId === "shop1"
                      ? "ตลาดญี่ปุ่น"
                      : r.shopId === "shop2"
                      ? "สายหนองปิง"
                      : r.shopId}
                  </td>
                  <td style={{ padding: "6px 9px", textAlign: "right" }}>
                    ฿{fmt(rev)}
                  </td>
                  <td style={{ padding: "6px 9px", textAlign: "right" }}>
                    ฿{fmt(exp)}
                  </td>
                  <td
                    style={{
                      padding: "6px 9px",
                      textAlign: "right",
                      fontWeight: 600,
                      color: prof >= 0 ? "#16a34a" : "#dc2626",
                    }}
                  >
                    ฿{fmt(prof)}
                  </td>
                </tr>
              );
            })}
          </tbody>
        </table>
      </div>
    </div>
  );
}
