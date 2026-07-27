"use client";

import React from "react";
import type { FilterState } from "./types";

interface FilterBarProps {
  filter: FilterState;
  setFilter: React.Dispatch<React.SetStateAction<FilterState>>;
  availableMonths: string[];
  onReset: () => void;
}

export function FilterBar({
  filter,
  setFilter,
  availableMonths,
  onReset,
}: FilterBarProps) {
  return (
    <div
      style={{
        background: "#161b22",
        border: "1px solid #2a3140",
        borderRadius: 12,
        padding: "14px 18px",
        marginBottom: 18,
        display: "flex",
        flexWrap: "wrap",
        gap: 10,
        alignItems: "flex-end",
      }}
    >
      <div style={{ display: "flex", flexDirection: "column", gap: 4 }}>
        <label
          style={{
            fontSize: 10,
            color: "#94a3b8",
            fontWeight: 700,
            textTransform: "uppercase",
            letterSpacing: 0.5,
          }}
        >
          เดือน/ปี
        </label>
        <select
          value={filter.month}
          onChange={(e) =>
            setFilter((prev) => ({ ...prev, month: e.target.value }))
          }
          style={{
            background: "#1c2128",
            border: "1px solid #374151",
            borderRadius: 7,
            padding: "7px 11px",
            fontSize: 13,
            color: "#e2e8f0",
            outline: "none",
            minWidth: 130,
          }}
        >
          <option value="all">ทั้งหมด</option>
          {availableMonths.map((m) => (
            <option key={m} value={m}>
              {m}
            </option>
          ))}
        </select>
      </div>

      <div style={{ display: "flex", flexDirection: "column", gap: 4 }}>
        <label
          style={{
            fontSize: 10,
            color: "#94a3b8",
            fontWeight: 700,
            textTransform: "uppercase",
            letterSpacing: 0.5,
          }}
        >
          ตั้งแต่วันที่
        </label>
        <input
          type="date"
          value={filter.dateFrom}
          onChange={(e) =>
            setFilter((prev) => ({ ...prev, dateFrom: e.target.value }))
          }
          style={{
            background: "#1c2128",
            border: "1px solid #374151",
            borderRadius: 7,
            padding: "7px 11px",
            fontSize: 13,
            color: "#e2e8f0",
            outline: "none",
            minWidth: 130,
          }}
        />
      </div>

      <div style={{ display: "flex", flexDirection: "column", gap: 4 }}>
        <label
          style={{
            fontSize: 10,
            color: "#94a3b8",
            fontWeight: 700,
            textTransform: "uppercase",
            letterSpacing: 0.5,
          }}
        >
          ถึงวันที่
        </label>
        <input
          type="date"
          value={filter.dateTo}
          onChange={(e) =>
            setFilter((prev) => ({ ...prev, dateTo: e.target.value }))
          }
          style={{
            background: "#1c2128",
            border: "1px solid #374151",
            borderRadius: 7,
            padding: "7px 11px",
            fontSize: 13,
            color: "#e2e8f0",
            outline: "none",
            minWidth: 130,
          }}
        />
      </div>

      <div style={{ display: "flex", flexDirection: "column", gap: 4 }}>
        <label
          style={{
            fontSize: 10,
            color: "#94a3b8",
            fontWeight: 700,
            textTransform: "uppercase",
            letterSpacing: 0.5,
          }}
        >
          สาขา
        </label>
        <select
          value={filter.shop}
          onChange={(e) =>
            setFilter((prev) => ({ ...prev, shop: e.target.value }))
          }
          style={{
            background: "#1c2128",
            border: "1px solid #374151",
            borderRadius: 7,
            padding: "7px 11px",
            fontSize: 13,
            color: "#e2e8f0",
            outline: "none",
            minWidth: 130,
          }}
        >
          <option value="all">ทั้งหมด</option>
          <option value="shop1">ตลาดญี่ปุ่น</option>
          <option value="shop2">สายหนองปิง</option>
        </select>
      </div>

      <div style={{ display: "flex", flexDirection: "column", gap: 4 }}>
        <label
          style={{
            fontSize: 10,
            color: "#94a3b8",
            fontWeight: 700,
            textTransform: "uppercase",
            letterSpacing: 0.5,
          }}
        >
          กำไร/ขาดทุน
        </label>
        <select
          value={filter.profitLoss}
          onChange={(e) =>
            setFilter((prev) => ({ ...prev, profitLoss: e.target.value }))
          }
          style={{
            background: "#1c2128",
            border: "1px solid #374151",
            borderRadius: 7,
            padding: "7px 11px",
            fontSize: 13,
            color: "#e2e8f0",
            outline: "none",
            minWidth: 120,
          }}
        >
          <option value="all">ทั้งหมด</option>
          <option value="profit">กำไร</option>
          <option value="loss">ขาดทุน</option>
        </select>
      </div>

      <div style={{ display: "flex", gap: 8, alignItems: "flex-end" }}>
        <button
          onClick={onReset}
          style={{
            padding: "7px 14px",
            borderRadius: 7,
            fontSize: 12,
            fontWeight: 600,
            cursor: "pointer",
            border: "1px solid #374151",
            background: "#1c2128",
            color: "#94a3b8",
          }}
        >
          ✕ ล้างตัวกรอง
        </button>
      </div>
    </div>
  );
}
