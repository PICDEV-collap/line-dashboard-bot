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
        background: "var(--surface)",
        border: "1px solid var(--border)",
        borderRadius: "var(--radius-lg)",
        padding: "16px 20px",
        marginBottom: 20,
        display: "flex",
        flexWrap: "wrap",
        gap: 12,
        alignItems: "flex-end",
        boxShadow: "0 2px 8px rgba(0, 0, 0, 0.1)",
      }}
    >
      <div style={{ display: "flex", flexDirection: "column", gap: 6 }}>
        <label
          style={{
            fontSize: "0.75rem",
            color: "var(--text-secondary)",
            fontWeight: 700,
            textTransform: "uppercase",
            letterSpacing: "0.5px",
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
            background: "var(--surface-raised)",
            border: "1px solid var(--border)",
            borderRadius: "var(--radius-sm)",
            padding: "8px 12px",
            fontSize: "0.85rem",
            color: "var(--text-primary)",
            outline: "none",
            minWidth: 140,
            cursor: "pointer",
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

      <div style={{ display: "flex", flexDirection: "column", gap: 6 }}>
        <label
          style={{
            fontSize: "0.75rem",
            color: "var(--text-secondary)",
            fontWeight: 700,
            textTransform: "uppercase",
            letterSpacing: "0.5px",
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
          className="tabular-nums"
          style={{
            background: "var(--surface-raised)",
            border: "1px solid var(--border)",
            borderRadius: "var(--radius-sm)",
            padding: "8px 12px",
            fontSize: "0.85rem",
            color: "var(--text-primary)",
            outline: "none",
            minWidth: 140,
          }}
        />
      </div>

      <div style={{ display: "flex", flexDirection: "column", gap: 6 }}>
        <label
          style={{
            fontSize: "0.75rem",
            color: "var(--text-secondary)",
            fontWeight: 700,
            textTransform: "uppercase",
            letterSpacing: "0.5px",
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
          className="tabular-nums"
          style={{
            background: "var(--surface-raised)",
            border: "1px solid var(--border)",
            borderRadius: "var(--radius-sm)",
            padding: "8px 12px",
            fontSize: "0.85rem",
            color: "var(--text-primary)",
            outline: "none",
            minWidth: 140,
          }}
        />
      </div>

      <div style={{ display: "flex", flexDirection: "column", gap: 6 }}>
        <label
          style={{
            fontSize: "0.75rem",
            color: "var(--text-secondary)",
            fontWeight: 700,
            textTransform: "uppercase",
            letterSpacing: "0.5px",
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
            background: "var(--surface-raised)",
            border: "1px solid var(--border)",
            borderRadius: "var(--radius-sm)",
            padding: "8px 12px",
            fontSize: "0.85rem",
            color: "var(--text-primary)",
            outline: "none",
            minWidth: 140,
            cursor: "pointer",
          }}
        >
          <option value="all">ทั้งหมด</option>
          <option value="shop1">ตลาดญี่ปุ่น</option>
          <option value="shop2">สายหนองปิง</option>
        </select>
      </div>

      <div style={{ display: "flex", flexDirection: "column", gap: 6 }}>
        <label
          style={{
            fontSize: "0.75rem",
            color: "var(--text-secondary)",
            fontWeight: 700,
            textTransform: "uppercase",
            letterSpacing: "0.5px",
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
            background: "var(--surface-raised)",
            border: "1px solid var(--border)",
            borderRadius: "var(--radius-sm)",
            padding: "8px 12px",
            fontSize: "0.85rem",
            color: "var(--text-primary)",
            outline: "none",
            minWidth: 130,
            cursor: "pointer",
          }}
        >
          <option value="all">ทั้งหมด</option>
          <option value="profit">กำไร</option>
          <option value="loss">ขาดทุน</option>
        </select>
      </div>

      <div style={{ display: "flex", gap: 8, alignItems: "flex-end" }}>
        <button
          type="button"
          onClick={onReset}
          style={{
            padding: "8px 16px",
            borderRadius: "var(--radius-sm)",
            fontSize: "0.85rem",
            fontWeight: 600,
            cursor: "pointer",
            border: "1px solid var(--border)",
            background: "var(--surface-raised)",
            color: "var(--text-secondary)",
            transition: "all 0.15s ease",
          }}
        >
          ✕ ล้างตัวกรอง
        </button>
      </div>
    </div>
  );
}
