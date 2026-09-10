"use client";

import React from "react";
import type { FinancialRecord } from "@/lib/types/financial.types";

interface KpiCardsProps {
  records: FinancialRecord[];
}

export function KpiCards({ records }: KpiCardsProps) {
  const totalRevenue = records.reduce((sum, r) => sum + (r.revenue || 0), 0);
  const totalExpenses = records.reduce((sum, r) => sum + (r.expense || 0), 0);
  const netProfit = totalRevenue - totalExpenses;
  const marginPct = totalRevenue > 0 ? (netProfit / totalRevenue) * 100 : 0;
  const count = records.length;

  const fmt = (n: number) => n.toLocaleString("th-TH");

  const cards = [
    {
      title: "รายรับรวม",
      value: `฿${fmt(totalRevenue)}`,
      sub: `${count} รายการในระบบ`,
      color: "var(--primary)",
      tint: "var(--primary-tint)",
      icon: "💰",
    },
    {
      title: "ค่าใช้จ่ายรวม",
      value: `฿${fmt(totalExpenses)}`,
      sub: `${count > 0 ? fmt(Math.round(totalExpenses / count)) : 0} ฿/วัน โดยเฉลี่ย`,
      color: "var(--danger)",
      tint: "var(--danger-tint)",
      icon: "💸",
    },
    {
      title: "กำไรสุทธิ",
      value: `฿${fmt(netProfit)}`,
      sub: netProfit >= 0 ? "กำไรสุทธิสะสม" : "ขาดทุนสะสม",
      color: netProfit >= 0 ? "var(--primary)" : "var(--danger)",
      tint: netProfit >= 0 ? "var(--primary-tint)" : "var(--danger-tint)",
      icon: "📈",
    },
    {
      title: "% อัตรากำไร",
      value: `${marginPct.toFixed(1)}%`,
      sub: "Net Profit Margin",
      color: "var(--warning)",
      tint: "var(--warning-tint)",
      icon: "📊",
    },
    {
      title: "จำนวนวันบันทึก",
      value: `${count} วัน`,
      sub: "ข้อมูลบันทึกทั้งหมด",
      color: "var(--info)",
      tint: "var(--info-tint)",
      icon: "📅",
    },
  ];

  return (
    <div
      style={{
        display: "grid",
        gridTemplateColumns: "repeat(auto-fit, minmax(220px, 1fr))",
        gap: 14,
        marginBottom: 20,
      }}
    >
      {cards.map((card, idx) => (
        <div
          key={idx}
          style={{
            background: "var(--surface)",
            border: "1px solid var(--border)",
            borderRadius: "var(--radius-lg)",
            padding: "18px 20px",
            position: "relative",
            overflow: "hidden",
            boxShadow: "0 4px 16px rgba(0, 0, 0, 0.12)",
            display: "flex",
            flexDirection: "column",
            justifyContent: "space-between",
            gap: 12,
          }}
        >
          <div
            style={{
              display: "flex",
              justifyContent: "space-between",
              alignItems: "center",
            }}
          >
            <div style={{ fontSize: "0.85rem", color: "var(--text-secondary)", fontWeight: 600 }}>
              {card.title}
            </div>
            <div
              style={{
                width: 34,
                height: 34,
                borderRadius: "var(--radius-sm)",
                background: card.tint,
                border: "1px solid var(--border)",
                display: "flex",
                alignItems: "center",
                justifyContent: "center",
                fontSize: 16,
              }}
            >
              {card.icon}
            </div>
          </div>

          <div>
            <div
              className="tabular-nums"
              style={{
                fontSize: "1.5rem",
                fontWeight: 800,
                lineHeight: 1.2,
                color: card.color,
              }}
            >
              {card.value}
            </div>
            <div
              style={{
                fontSize: "0.75rem",
                color: "var(--text-muted)",
                marginTop: 6,
              }}
            >
              {card.sub}
            </div>
          </div>
        </div>
      ))}
    </div>
  );
}
