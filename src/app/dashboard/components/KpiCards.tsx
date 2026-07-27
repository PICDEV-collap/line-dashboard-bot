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
      sub: `${count} รายการ`,
      color: "#60a5fa",
      accentGradient: "linear-gradient(90deg, #3b82f6, #6366f1)",
      icon: "💰",
    },
    {
      title: "ค่าใช้จ่ายรวม",
      value: `฿${fmt(totalExpenses)}`,
      sub: `${count > 0 ? fmt(Math.round(totalExpenses / count)) : 0} ฿/วัน`,
      color: "#f87171",
      accentGradient: "linear-gradient(90deg, #ef4444, #f97316)",
      icon: "💸",
    },
    {
      title: "กำไรสุทธิ",
      value: `฿${fmt(netProfit)}`,
      sub: netProfit >= 0 ? "กำไรสุทธิสะสม" : "ขาดทุนสะสม",
      color: netProfit >= 0 ? "#4ade80" : "#f87171",
      accentGradient: "linear-gradient(90deg, #22c55e, #10b981)",
      icon: "📈",
    },
    {
      title: "% อัตรากำไร",
      value: `${marginPct.toFixed(1)}%`,
      sub: "Net Margin",
      color: "#fbbf24",
      accentGradient: "linear-gradient(90deg, #eab308, #f97316)",
      icon: "📊",
    },
    {
      title: "จำนวนวันบันทึก",
      value: `${count} วัน`,
      sub: "มีข้อมูลในระบบ",
      color: "#c084fc",
      accentGradient: "linear-gradient(90deg, #a855f7, #6366f1)",
      icon: "📅",
    },
  ];

  return (
    <div
      style={{
        display: "grid",
        gridTemplateColumns: "repeat(auto-fit, minmax(200px, 1fr))",
        gap: 12,
        marginBottom: 18,
      }}
    >
      {cards.map((card, idx) => (
        <div
          key={idx}
          style={{
            background: "#161b22",
            border: "1px solid #2a3140",
            borderRadius: 12,
            padding: 16,
            position: "relative",
            overflow: "hidden",
            transition: "transform 0.2s",
          }}
        >
          <div
            style={{
              position: "absolute",
              top: 0,
              left: 0,
              right: 0,
              height: 3,
              background: card.accentGradient,
            }}
          />
          <div style={{ fontSize: 20, marginBottom: 6 }}>{card.icon}</div>
          <div style={{ fontSize: 11, color: "#94a3b8", marginBottom: 3 }}>
            {card.title}
          </div>
          <div
            style={{
              fontFamily: "Chakra Petch, sans-serif",
              fontSize: 22,
              fontWeight: 700,
              lineHeight: 1,
              color: card.color,
            }}
          >
            {card.value}
          </div>
          <div style={{ fontSize: 10, color: "#64748b", marginTop: 4 }}>
            {card.sub}
          </div>
        </div>
      ))}
    </div>
  );
}
