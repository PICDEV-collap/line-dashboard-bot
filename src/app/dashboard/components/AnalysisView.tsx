"use client";

import React from "react";
import { Bar, Pie } from "react-chartjs-2";
import type { FinancialRecord } from "@/lib/types/financial.types";

interface AnalysisViewProps {
  records: FinancialRecord[];
}

export function AnalysisView({ records }: AnalysisViewProps) {
  const shop1Records = records.filter((r) => r.shopId === "shop1");
  const shop2Records = records.filter((r) => r.shopId === "shop2");

  const shop1Rev = shop1Records.reduce((sum, r) => sum + (r.revenue || 0), 0);
  const shop1Exp = shop1Records.reduce((sum, r) => sum + (r.expense || 0), 0);
  const shop1Prof = shop1Rev - shop1Exp;

  const shop2Rev = shop2Records.reduce((sum, r) => sum + (r.revenue || 0), 0);
  const shop2Exp = shop2Records.reduce((sum, r) => sum + (r.expense || 0), 0);
  const shop2Prof = shop2Rev - shop2Exp;

  // Profit / Loss days count
  const profitDays = records.filter((r) => (r.revenue || 0) >= (r.expense || 0)).length;
  const lossDays = records.length - profitDays;

  // Top 5 highest revenue days
  const topDays = [...records]
    .sort((a, b) => (b.revenue || 0) - (a.revenue || 0))
    .slice(0, 5);

  const topChartData = {
    labels: topDays.map((r) => r.date),
    datasets: [
      {
        label: "รายรับสูงสุด (฿)",
        data: topDays.map((r) => r.revenue || 0),
        backgroundColor: "rgba(59, 130, 246, 0.7)",
        borderRadius: 4,
      },
    ],
  };

  const plPieData = {
    labels: ["วันกำไร", "วันขาดทุน"],
    datasets: [
      {
        data: [profitDays, lossDays],
        backgroundColor: ["#22c55e", "#ef4444"],
        borderColor: "#161b22",
        borderWidth: 2,
      },
    ],
  };

  const branchBarData = {
    labels: ["ตลาดญี่ปุ่น (Shop 1)", "สายหนองปิง (Shop 2)"],
    datasets: [
      {
        label: "รายรับรวม",
        data: [shop1Rev, shop2Rev],
        backgroundColor: "rgba(59, 130, 246, 0.7)",
      },
      {
        label: "ค่าใช้จ่ายรวม",
        data: [shop1Exp, shop2Exp],
        backgroundColor: "rgba(239, 68, 68, 0.7)",
      },
      {
        label: "กำไรสุทธิ",
        data: [shop1Prof, shop2Prof],
        backgroundColor: "rgba(34, 197, 94, 0.7)",
      },
    ],
  };

  return (
    <div style={{ display: "flex", flexDirection: "column", gap: 18 }}>
      {/* Branch Comparison */}
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
          การเปรียบเทียบผลประกอบการรายสาขา
        </div>
        <div style={{ height: 220, position: "relative" }}>
          <Bar
            data={branchBarData}
            options={{
              responsive: true,
              maintainAspectRatio: false,
              plugins: {
                legend: {
                  labels: { color: "#94a3b8", font: { family: "Sarabun" } },
                },
              },
              scales: {
                x: {
                  ticks: { color: "#64748b", font: { family: "Chakra Petch" } },
                  grid: { display: false },
                },
                y: {
                  ticks: { color: "#64748b", font: { family: "Chakra Petch" } },
                  grid: { color: "#2a3140" },
                },
              },
            }}
          />
        </div>
      </div>

      <div
        style={{
          display: "grid",
          gridTemplateColumns: "repeat(auto-fit, minmax(320px, 1fr))",
          gap: 14,
        }}
      >
        {/* Top 5 Days */}
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
            }}
          >
            🏆 Top 5 วันรายได้สูงสุด
          </div>
          <div style={{ height: 220, position: "relative" }}>
            <Bar
              data={topChartData}
              options={{
                responsive: true,
                maintainAspectRatio: false,
                plugins: { legend: { display: false } },
                scales: {
                  x: { ticks: { color: "#64748b" }, grid: { display: false } },
                  y: { ticks: { color: "#64748b" }, grid: { color: "#2a3140" } },
                },
              }}
            />
          </div>
        </div>

        {/* Profit vs Loss Pie */}
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
            }}
          >
            ⚖️ สัดส่วนวันกำไร vs ขาดทุน
          </div>
          <div style={{ height: 180, position: "relative" }}>
            <Pie
              data={plPieData}
              options={{
                responsive: true,
                maintainAspectRatio: false,
                plugins: {
                  legend: {
                    position: "bottom",
                    labels: { color: "#94a3b8" },
                  },
                },
              }}
            />
          </div>
          <div
            style={{
              display: "flex",
              justifyContent: "space-around",
              marginTop: 10,
              fontSize: 12,
            }}
          >
            <span style={{ color: "#4ade80" }}>✅ กำไร: {profitDays} วัน</span>
            <span style={{ color: "#f87171" }}>❌ ขาดทุน: {lossDays} วัน</span>
          </div>
        </div>
      </div>
    </div>
  );
}
