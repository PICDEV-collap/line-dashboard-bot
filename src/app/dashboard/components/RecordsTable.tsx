"use client";

import React, { useState } from "react";
import type { FinancialRecord } from "@/lib/types/financial.types";
import type { RecordFilterState } from "./types";
import { exportRecordsToCsv, exportRecordsToExcel } from "@/lib/utils/export-records";

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
    <div style={{ display: "flex", flexDirection: "column", gap: 16 }}>
      {/* Filter bar for records */}
      <div
        style={{
          background: "var(--surface)",
          border: "1px solid var(--border)",
          borderRadius: "var(--radius-lg)",
          padding: "16px 20px",
          display: "flex",
          flexWrap: "wrap",
          gap: 12,
          alignItems: "flex-end",
          boxShadow: "0 2px 8px rgba(0, 0, 0, 0.1)",
        }}
      >
        <div style={{ display: "flex", flexDirection: "column", gap: 6 }}>
          <label style={{ fontSize: "0.75rem", color: "var(--text-secondary)", fontWeight: 700 }}>
            ค้นหา
          </label>
          <input
            type="text"
            placeholder="ค้นหาวันที่, สาขา, หมายเหตุ..."
            value={filter.search}
            onChange={(e) => setFilter((p) => ({ ...p, search: e.target.value }))}
            style={{
              background: "var(--surface-raised)",
              border: "1px solid var(--border)",
              borderRadius: "var(--radius-sm)",
              padding: "8px 12px",
              fontSize: "0.85rem",
              color: "var(--text-primary)",
              outline: "none",
              minWidth: 180,
            }}
          />
        </div>

        <div style={{ display: "flex", flexDirection: "column", gap: 6 }}>
          <label style={{ fontSize: "0.75rem", color: "var(--text-secondary)", fontWeight: 700 }}>
            สาขา
          </label>
          <select
            value={filter.shop}
            onChange={(e) => setFilter((p) => ({ ...p, shop: e.target.value }))}
            style={{
              background: "var(--surface-raised)",
              border: "1px solid var(--border)",
              borderRadius: "var(--radius-sm)",
              padding: "8px 12px",
              fontSize: "0.85rem",
              color: "var(--text-primary)",
              outline: "none",
              cursor: "pointer",
            }}
          >
            <option value="all">ทั้งหมด</option>
            <option value="shop1">ตลาดญี่ปุ่น</option>
            <option value="shop2">สายหนองปิง</option>
          </select>
        </div>

        <div style={{ display: "flex", flexDirection: "column", gap: 6 }}>
          <label style={{ fontSize: "0.75rem", color: "var(--text-secondary)", fontWeight: 700 }}>
            สถานะ
          </label>
          <select
            value={filter.status}
            onChange={(e) => setFilter((p) => ({ ...p, status: e.target.value }))}
            style={{
              background: "var(--surface-raised)",
              border: "1px solid var(--border)",
              borderRadius: "var(--radius-sm)",
              padding: "8px 12px",
              fontSize: "0.85rem",
              color: "var(--text-primary)",
              outline: "none",
              cursor: "pointer",
            }}
          >
            <option value="all">ทั้งหมด</option>
            <option value="complete">✅ สมบูรณ์</option>
            <option value="pending">⌛ รอข้อมูล</option>
            <option value="draft">📝 ร่าง</option>
          </select>
        </div>

        <div style={{ display: "flex", flexDirection: "column", gap: 6 }}>
          <label style={{ fontSize: "0.75rem", color: "var(--text-secondary)", fontWeight: 700 }}>
            เรียงโดย
          </label>
          <select
            value={filter.sort}
            onChange={(e) => setFilter((p) => ({ ...p, sort: e.target.value }))}
            style={{
              background: "var(--surface-raised)",
              border: "1px solid var(--border)",
              borderRadius: "var(--radius-sm)",
              padding: "8px 12px",
              fontSize: "0.85rem",
              color: "var(--text-primary)",
              outline: "none",
              cursor: "pointer",
            }}
          >
            <option value="date-desc">วันที่ (ใหม่→เก่า)</option>
            <option value="date-asc">วันที่ (เก่า→ใหม่)</option>
            <option value="rev-desc">รายรับ มาก→น้อย</option>
            <option value="profit-desc">กำไร มาก→น้อย</option>
          </select>
        </div>

        <div style={{ display: "flex", gap: 8, marginLeft: "auto", flexWrap: "wrap" }}>
          <button
            type="button"
            onClick={() => exportRecordsToExcel(filteredRecords)}
            disabled={filteredRecords.length === 0}
            style={{
              padding: "8px 14px",
              borderRadius: "var(--radius-sm)",
              fontSize: "0.85rem",
              fontWeight: 600,
              cursor: filteredRecords.length === 0 ? "not-allowed" : "pointer",
              border: "1px solid rgba(6, 199, 85, 0.3)",
              background: "var(--primary-tint)",
              color: "var(--primary)",
              opacity: filteredRecords.length === 0 ? 0.5 : 1,
              transition: "all 0.15s ease",
            }}
            title="ส่งออกรายการที่กรองเป็นไฟล์ Excel (.xls)"
          >
            📥 ส่งออก Excel
          </button>
          <button
            type="button"
            onClick={() => exportRecordsToCsv(filteredRecords)}
            disabled={filteredRecords.length === 0}
            style={{
              padding: "8px 14px",
              borderRadius: "var(--radius-sm)",
              fontSize: "0.85rem",
              fontWeight: 600,
              cursor: filteredRecords.length === 0 ? "not-allowed" : "pointer",
              border: "1px solid var(--border)",
              background: "var(--surface-raised)",
              color: "var(--text-secondary)",
              opacity: filteredRecords.length === 0 ? 0.5 : 1,
              transition: "all 0.15s ease",
            }}
            title="ส่งออกรายการที่กรองเป็นไฟล์ CSV (UTF-8 BOM รองรับภาษาไทย)"
          >
            📄 ส่งออก CSV
          </button>
          <button
            type="button"
            onClick={onOpenAddModal}
            style={{
              padding: "8px 16px",
              borderRadius: "var(--radius-sm)",
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
            ＋ เพิ่ม
          </button>
        </div>
      </div>

      {/* Main Table Card */}
      <div
        style={{
          background: "var(--surface)",
          border: "1px solid var(--border)",
          borderRadius: "var(--radius-lg)",
          padding: 18,
          boxShadow: "0 4px 16px rgba(0, 0, 0, 0.12)",
        }}
      >
        <div
          style={{
            fontSize: "0.95rem",
            fontWeight: 700,
            color: "var(--text-primary)",
            marginBottom: 14,
            display: "flex",
            alignItems: "center",
            gap: 8,
          }}
        >
          <span
            style={{
              width: 8,
              height: 8,
              borderRadius: "var(--radius-pill)",
              background: "var(--primary)",
            }}
          />
          ข้อมูลรายวัน ({filteredRecords.length} รายการ)
          <button
            type="button"
            onClick={onRefresh}
            style={{
              marginLeft: "auto",
              background: "none",
              border: "none",
              color: "var(--text-secondary)",
              cursor: "pointer",
              fontSize: "1rem",
            }}
            title="รีเฟรช"
          >
            ↻
          </button>
        </div>

        <div style={{ overflowX: "auto", maxHeight: 520 }}>
          <table
            style={{
              width: "100%",
              borderCollapse: "collapse",
              fontSize: "0.85rem",
            }}
          >
            <thead>
              <tr style={{ background: "var(--surface-raised)", borderBottom: "1px solid var(--border)" }}>
                <th style={{ padding: "10px 12px", textAlign: "left", color: "var(--text-secondary)" }}>
                  วันที่
                </th>
                <th style={{ padding: "10px 12px", textAlign: "left", color: "var(--text-secondary)" }}>
                  สาขา
                </th>
                <th style={{ padding: "10px 12px", textAlign: "right", color: "var(--text-secondary)" }}>
                  รายรับ (฿)
                </th>
                <th style={{ padding: "10px 12px", textAlign: "right", color: "var(--text-secondary)" }}>
                  ค่าใช้จ่าย (฿)
                </th>
                <th style={{ padding: "10px 12px", textAlign: "right", color: "var(--text-secondary)" }}>
                  กำไร (฿)
                </th>
                <th style={{ padding: "10px 12px", textAlign: "right", color: "var(--text-secondary)" }}>
                  %กำไร
                </th>
                <th style={{ padding: "10px 12px", textAlign: "right", color: "var(--text-secondary)" }}>
                  โอน
                </th>
                <th style={{ padding: "10px 12px", textAlign: "right", color: "var(--text-secondary)" }}>
                  สด
                </th>
                <th style={{ padding: "10px 12px", textAlign: "right", color: "var(--text-secondary)" }}>
                  Delivery
                </th>
                <th style={{ padding: "10px 12px", textAlign: "center", color: "var(--text-secondary)" }}>
                  สถานะ
                </th>
                <th style={{ padding: "10px 12px", textAlign: "center", color: "var(--text-secondary)" }}>
                  จัดการ
                </th>
              </tr>
            </thead>
            <tbody>
              {filteredRecords.length === 0 ? (
                <tr>
                  <td
                    colSpan={11}
                    style={{ textAlign: "center", padding: 32, color: "var(--text-muted)" }}
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
                        borderBottom: "1px solid var(--border)",
                      }}
                    >
                      <td style={{ padding: "10px 12px", color: "var(--text-primary)" }}>{fmtDate(r.date)}</td>
                      <td style={{ padding: "10px 12px", color: "var(--text-secondary)" }}>{shopLabel}</td>
                      <td
                        className="tabular-nums"
                        style={{
                          padding: "10px 12px",
                          textAlign: "right",
                          color: "var(--primary)",
                          fontWeight: 600,
                        }}
                      >
                        ฿{fmt(rev)}
                      </td>
                      <td
                        className="tabular-nums"
                        style={{
                          padding: "10px 12px",
                          textAlign: "right",
                          color: "var(--danger)",
                          fontWeight: 600,
                        }}
                      >
                        ฿{fmt(exp)}
                      </td>
                      <td
                        className="tabular-nums"
                        style={{
                          padding: "10px 12px",
                          textAlign: "right",
                          fontWeight: 700,
                          color: profit >= 0 ? "var(--primary)" : "var(--danger)",
                        }}
                      >
                        ฿{fmt(profit)}
                      </td>
                      <td
                        className="tabular-nums"
                        style={{
                          padding: "10px 12px",
                          textAlign: "right",
                          color: "var(--warning)",
                          fontWeight: 600,
                        }}
                      >
                        {pct}%
                      </td>
                      <td className="tabular-nums" style={{ padding: "10px 12px", textAlign: "right", color: "var(--text-secondary)" }}>
                        {fmt(r.transfer)}
                      </td>
                      <td className="tabular-nums" style={{ padding: "10px 12px", textAlign: "right", color: "var(--text-secondary)" }}>
                        {fmt(r.cash)}
                      </td>
                      <td className="tabular-nums" style={{ padding: "10px 12px", textAlign: "right", color: "var(--text-secondary)" }}>
                        {fmt(r.delivery)}
                      </td>
                      <td style={{ padding: "10px 12px", textAlign: "center" }}>
                        <span
                          style={{
                            display: "inline-block",
                            padding: "3px 8px",
                            borderRadius: "var(--radius-pill)",
                            fontSize: "0.75rem",
                            fontWeight: 600,
                            background:
                              r.status === "complete"
                                ? "var(--primary-tint)"
                                : "var(--warning-tint)",
                            color: r.status === "complete" ? "var(--primary)" : "var(--warning)",
                            border: `1px solid ${
                              r.status === "complete"
                                ? "rgba(6, 199, 85, 0.3)"
                                : "rgba(245, 158, 11, 0.3)"
                            }`,
                          }}
                        >
                          {r.status === "complete" ? "✅ สมบูรณ์" : "⌛ รอข้อมูล"}
                        </span>
                      </td>
                      <td style={{ padding: "10px 12px", textAlign: "center" }}>
                        <button
                          type="button"
                          onClick={() => onEditRecord(r)}
                          style={{
                            padding: "4px 10px",
                            borderRadius: "var(--radius-sm)",
                            fontSize: "0.75rem",
                            cursor: "pointer",
                            border: "1px solid rgba(6, 199, 85, 0.3)",
                            background: "var(--primary-tint)",
                            color: "var(--primary)",
                            marginRight: 6,
                            fontWeight: 600,
                          }}
                        >
                          แก้ไข
                        </button>
                        <button
                          type="button"
                          onClick={() => onDeleteRecord(r.id)}
                          style={{
                            padding: "4px 10px",
                            borderRadius: "var(--radius-sm)",
                            fontSize: "0.75rem",
                            cursor: "pointer",
                            border: "1px solid rgba(239, 68, 68, 0.3)",
                            background: "var(--danger-tint)",
                            color: "var(--danger)",
                            fontWeight: 600,
                          }}
                        >
                          ลบ
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
