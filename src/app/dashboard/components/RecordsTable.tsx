"use client";

import React, { useState } from "react";
import type { FinancialRecord } from "@/lib/types/financial.types";
import type { RecordFilterState } from "./types";

interface RecordsTableProps {
  records: FinancialRecord[];
  onEditRecord: (record: FinancialRecord) => void;
  onDeleteRecord: (id: string) => void;
  onOpenAddModal: () => void;
  onRefresh: () => void;
}

export function RecordsTable({
  records,
  onEditRecord,
  onDeleteRecord,
  onOpenAddModal,
  onRefresh,
}: RecordsTableProps) {
  const [filter, setFilter] = useState<RecordFilterState>({
    search: "",
    dateFrom: "",
    dateTo: "",
    shop: "all",
    status: "all",
    sort: "date-desc",
  });

  const fmt = (n?: number) => (n || 0).toLocaleString("th-TH");
  const fmtDate = (d: string) => {
    const dt = new Date(d + "T00:00:00");
    if (isNaN(dt.getTime())) return d;
    const months = [
      "",
      "ม.ค.",
      "ก.พ.",
      "มี.ค.",
      "เม.ย.",
      "พ.ค.",
      "มิ.ย.",
      "ก.ค.",
      "ส.ค.",
      "ก.ย.",
      "ต.ค.",
      "พ.ย.",
      "ธ.ค.",
    ];
    return `${dt.getDate()} ${months[dt.getMonth() + 1]} ${dt.getFullYear() + 543}`;
  };

  const filteredRecords = records.filter((r) => {
    if (filter.shop !== "all" && r.shopId !== filter.shop) return false;
    if (filter.status !== "all" && r.status !== filter.status) return false;
    if (filter.dateFrom && r.date < filter.dateFrom) return false;
    if (filter.dateTo && r.date > filter.dateTo) return false;
    if (filter.search) {
      const query = filter.search.toLowerCase();
      const matchDate = r.date.includes(query);
      const matchNote = (r.note || "").toLowerCase().includes(query);
      const matchShop = (r.shopName || r.shopId).toLowerCase().includes(query);
      if (!matchDate && !matchNote && !matchShop) return false;
    }
    return true;
  });

  filteredRecords.sort((a, b) => {
    if (filter.sort === "date-desc") return b.date.localeCompare(a.date);
    if (filter.sort === "date-asc") return a.date.localeCompare(b.date);
    if (filter.sort === "rev-desc") return (b.revenue || 0) - (a.revenue || 0);
    if (filter.sort === "profit-desc") {
      const pA = a.profit ?? ((a.revenue || 0) - (a.expense || 0));
      const pB = b.profit ?? ((b.revenue || 0) - (b.expense || 0));
      return pB - pA;
    }
    return 0;
  });

  return (
    <div style={{ display: "flex", flexDirection: "column", gap: 14 }}>
      {/* Filter bar for records */}
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
            ค้นหา
          </label>
          <input
            type="text"
            placeholder="ค้นหาวันที่, สาขา, หมายเหตุ..."
            value={filter.search}
            onChange={(e) => setFilter((p) => ({ ...p, search: e.target.value }))}
            style={{
              background: "#1c2128",
              border: "1px solid #374151",
              borderRadius: 7,
              padding: "7px 11px",
              fontSize: 13,
              color: "#e2e8f0",
              outline: "none",
              minWidth: 180,
            }}
          />
        </div>

        <div style={{ display: "flex", flexDirection: "column", gap: 4 }}>
          <label style={{ fontSize: 10, color: "#94a3b8", fontWeight: 700 }}>
            สาขา
          </label>
          <select
            value={filter.shop}
            onChange={(e) => setFilter((p) => ({ ...p, shop: e.target.value }))}
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
            <option value="all">ทั้งหมด</option>
            <option value="shop1">ตลาดญี่ปุ่น</option>
            <option value="shop2">สายหนองปิง</option>
          </select>
        </div>

        <div style={{ display: "flex", flexDirection: "column", gap: 4 }}>
          <label style={{ fontSize: 10, color: "#94a3b8", fontWeight: 700 }}>
            สถานะ
          </label>
          <select
            value={filter.status}
            onChange={(e) => setFilter((p) => ({ ...p, status: e.target.value }))}
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
            <option value="all">ทั้งหมด</option>
            <option value="complete">✅ สมบูรณ์</option>
            <option value="pending">⌛ รอข้อมูล</option>
            <option value="draft">📝 ร่าง</option>
          </select>
        </div>

        <div style={{ display: "flex", flexDirection: "column", gap: 4 }}>
          <label style={{ fontSize: 10, color: "#94a3b8", fontWeight: 700 }}>
            เรียงโดย
          </label>
          <select
            value={filter.sort}
            onChange={(e) => setFilter((p) => ({ ...p, sort: e.target.value }))}
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
            <option value="date-desc">วันที่ (ใหม่→เก่า)</option>
            <option value="date-asc">วันที่ (เก่า→ใหม่)</option>
            <option value="rev-desc">รายรับ มาก→น้อย</option>
            <option value="profit-desc">กำไร มาก→น้อย</option>
          </select>
        </div>

        <div style={{ display: "flex", gap: 8, marginLeft: "auto" }}>
          <button
            onClick={onOpenAddModal}
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
            ＋ เพิ่ม
          </button>
        </div>
      </div>

      {/* Main Table Card */}
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
            fontSize: 13,
            fontWeight: 600,
            color: "#e2e8f0",
            marginBottom: 14,
            display: "flex",
            alignItems: "center",
            gap: 7,
          }}
        >
          <span
            style={{
              width: 6,
              height: 6,
              borderRadius: "50%",
              background: "#f97316",
              boxShadow: "0 0 6px #f97316",
            }}
          />
          ข้อมูลรายวัน ({filteredRecords.length} รายการ)
          <button
            onClick={onRefresh}
            style={{
              marginLeft: "auto",
              background: "none",
              border: "none",
              color: "#94a3b8",
              cursor: "pointer",
              fontSize: 16,
            }}
            title="รีเฟรช"
          >
            ↻
          </button>
        </div>

        <div style={{ overflowX: "auto", maxHeight: 500 }}>
          <table
            style={{
              width: "100%",
              borderCollapse: "collapse",
              fontSize: 12,
            }}
          >
            <thead>
              <tr style={{ background: "#1c2128", borderBottom: "1px solid #2a3140" }}>
                <th style={{ padding: "9px 11px", textAlign: "left", color: "#94a3b8" }}>
                  วันที่
                </th>
                <th style={{ padding: "9px 11px", textAlign: "left", color: "#94a3b8" }}>
                  สาขา
                </th>
                <th style={{ padding: "9px 11px", textAlign: "right", color: "#94a3b8" }}>
                  รายรับ (฿)
                </th>
                <th style={{ padding: "9px 11px", textAlign: "right", color: "#94a3b8" }}>
                  ค่าใช้จ่าย (฿)
                </th>
                <th style={{ padding: "9px 11px", textAlign: "right", color: "#94a3b8" }}>
                  กำไร (฿)
                </th>
                <th style={{ padding: "9px 11px", textAlign: "right", color: "#94a3b8" }}>
                  %กำไร
                </th>
                <th style={{ padding: "9px 11px", textAlign: "right", color: "#94a3b8" }}>
                  โอน
                </th>
                <th style={{ padding: "9px 11px", textAlign: "right", color: "#94a3b8" }}>
                  สด
                </th>
                <th style={{ padding: "9px 11px", textAlign: "right", color: "#94a3b8" }}>
                  Delivery
                </th>
                <th style={{ padding: "9px 11px", textAlign: "center", color: "#94a3b8" }}>
                  สถานะ
                </th>
                <th style={{ padding: "9px 11px", textAlign: "center", color: "#94a3b8" }}>
                  จัดการ
                </th>
              </tr>
            </thead>
            <tbody>
              {filteredRecords.length === 0 ? (
                <tr>
                  <td
                    colSpan={11}
                    style={{ textAlign: "center", padding: 30, color: "#64748b" }}
                  >
                    ไม่พบข้อมูลที่ตรงตามเงื่อนไข
                  </td>
                </tr>
              ) : (
                filteredRecords.map((r) => {
                  const rev = r.revenue || 0;
                  const exp = r.expense || 0;
                  const profit = r.profit ?? (rev - exp);
                  const pct = rev > 0 ? ((profit / rev) * 100).toFixed(1) : "0.0";
                  const shopLabel =
                    r.shopId === "shop1"
                      ? "ตลาดญี่ปุ่น"
                      : r.shopId === "shop2"
                      ? "สายหนองปิง"
                      : r.shopName || r.shopId;

                  return (
                    <tr
                      key={r.id}
                      style={{
                        borderBottom: "1px solid rgba(42, 49, 64, 0.5)",
                      }}
                    >
                      <td style={{ padding: "8px 11px" }}>{fmtDate(r.date)}</td>
                      <td style={{ padding: "8px 11px" }}>{shopLabel}</td>
                      <td
                        style={{
                          padding: "8px 11px",
                          textAlign: "right",
                          fontFamily: "Chakra Petch",
                          color: "#60a5fa",
                        }}
                      >
                        ฿{fmt(rev)}
                      </td>
                      <td
                        style={{
                          padding: "8px 11px",
                          textAlign: "right",
                          fontFamily: "Chakra Petch",
                          color: "#f87171",
                        }}
                      >
                        ฿{fmt(exp)}
                      </td>
                      <td
                        style={{
                          padding: "8px 11px",
                          textAlign: "right",
                          fontFamily: "Chakra Petch",
                          fontWeight: 600,
                          color: profit >= 0 ? "#4ade80" : "#f87171",
                        }}
                      >
                        ฿{fmt(profit)}
                      </td>
                      <td
                        style={{
                          padding: "8px 11px",
                          textAlign: "right",
                          fontFamily: "Chakra Petch",
                          color: "#fbbf24",
                        }}
                      >
                        {pct}%
                      </td>
                      <td style={{ padding: "8px 11px", textAlign: "right", fontFamily: "Chakra Petch" }}>
                        {fmt(r.transfer)}
                      </td>
                      <td style={{ padding: "8px 11px", textAlign: "right", fontFamily: "Chakra Petch" }}>
                        {fmt(r.cash)}
                      </td>
                      <td style={{ padding: "8px 11px", textAlign: "right", fontFamily: "Chakra Petch" }}>
                        {fmt(r.delivery)}
                      </td>
                      <td style={{ padding: "8px 11px", textAlign: "center" }}>
                        <span
                          style={{
                            display: "inline-block",
                            padding: "2px 7px",
                            borderRadius: 9,
                            fontSize: 10,
                            fontWeight: 600,
                            background:
                              r.status === "complete"
                                ? "rgba(34, 197, 94, 0.15)"
                                : "rgba(234, 179, 8, 0.15)",
                            color: r.status === "complete" ? "#4ade80" : "#fbbf24",
                            border:
                              r.status === "complete"
                                ? "1px solid rgba(34, 197, 94, 0.3)"
                                : "1px solid rgba(234, 179, 8, 0.3)",
                          }}
                        >
                          {r.status === "complete" ? "✅ สมบูรณ์" : "⌛ รอข้อมูล"}
                        </span>
                      </td>
                      <td style={{ padding: "8px 11px", textAlign: "center" }}>
                        <button
                          onClick={() => onEditRecord(r)}
                          style={{
                            padding: "3px 9px",
                            borderRadius: 5,
                            fontSize: 10,
                            cursor: "pointer",
                            border: "1px solid rgba(59, 130, 246, 0.3)",
                            background: "rgba(59, 130, 246, 0.2)",
                            color: "#60a5fa",
                            marginRight: 4,
                          }}
                        >
                          ✏️ แก้ไข
                        </button>
                        <button
                          onClick={() => onDeleteRecord(r.id)}
                          style={{
                            padding: "3px 9px",
                            borderRadius: 5,
                            fontSize: 10,
                            cursor: "pointer",
                            border: "1px solid rgba(239, 68, 68, 0.3)",
                            background: "rgba(239, 68, 68, 0.2)",
                            color: "#f87171",
                          }}
                        >
                          🗑️ ลบ
                        </button>
                      </td>
                    </tr>
                  );
                })
              )}
            </tbody>
          </table>
        </div>
      </div>
    </div>
  );
}
