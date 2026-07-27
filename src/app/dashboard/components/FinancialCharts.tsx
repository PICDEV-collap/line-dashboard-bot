"use client";

import React from "react";
import {
  Chart as ChartJS,
  CategoryScale,
  LinearScale,
  PointElement,
  LineElement,
  BarElement,
  ArcElement,
  Title,
  Tooltip,
  Legend,
  Filler,
} from "chart.js";
import { Line, Doughnut, Bar } from "react-chartjs-2";
import type { FinancialRecord, ExtraExpense } from "@/lib/types/financial.types";

ChartJS.register(
  CategoryScale,
  LinearScale,
  PointElement,
  LineElement,
  BarElement,
  ArcElement,
  Title,
  Tooltip,
  Legend,
  Filler
);

interface FinancialChartsProps {
  records: FinancialRecord[];
}

export function FinancialCharts({ records }: FinancialChartsProps) {
  // Sort records chronologically
  const sortedRecords = [...records].sort((a, b) => a.date.localeCompare(b.date));

  const labels = sortedRecords.map((r) => {
    const parts = r.date.split("-");
    if (parts.length === 3) {
      return `${parseInt(parts[2])}/${parseInt(parts[1])}`;
    }
    return r.date;
  });

  const revenues = sortedRecords.map((r) => r.revenue || 0);
  const expenses = sortedRecords.map((r) => r.expense || 0);
  const profits = sortedRecords.map((r) => r.profit ?? ((r.revenue || 0) - (r.expense || 0)));

  const lineData = {
    labels,
    datasets: [
      {
        label: "รายรับ (฿)",
        data: revenues,
        borderColor: "#3b82f6",
        backgroundColor: "rgba(59, 130, 246, 0.1)",
        fill: true,
        tension: 0.3,
      },
      {
        label: "ค่าใช้จ่าย (฿)",
        data: expenses,
        borderColor: "#ef4444",
        backgroundColor: "rgba(239, 68, 68, 0.05)",
        fill: true,
        tension: 0.3,
      },
      {
        label: "กำไรสุทธิ (฿)",
        data: profits,
        borderColor: "#22c55e",
        backgroundColor: "transparent",
        borderDash: [4, 4],
        tension: 0.3,
      },
    ],
  };

  const lineOptions = {
    responsive: true,
    maintainAspectRatio: false,
    plugins: {
      legend: {
        labels: { color: "#94a3b8", font: { family: "Sarabun" } },
      },
      tooltip: {
        mode: "index" as const,
        intersect: false,
      },
    },
    scales: {
      x: {
        ticks: { color: "#64748b", font: { family: "Chakra Petch", size: 11 } },
        grid: { color: "#2a3140" },
      },
      y: {
        ticks: { color: "#64748b", font: { family: "Chakra Petch", size: 11 } },
        grid: { color: "#2a3140" },
      },
    },
  };

  // Payment channel totals
  const totalTransfer = records.reduce((sum, r) => sum + (r.transfer || 0), 0);
  const totalCash = records.reduce((sum, r) => sum + (r.cash || 0), 0);
  const totalDelivery = records.reduce((sum, r) => sum + (r.delivery || 0), 0);

  const donutData = {
    labels: ["โอนเงิน", "เงินสด", "Delivery"],
    datasets: [
      {
        data: [totalTransfer, totalCash, totalDelivery],
        backgroundColor: ["#3b82f6", "#22c55e", "#f97316"],
        borderColor: "#161b22",
        borderWidth: 2,
      },
    ],
  };

  const donutOptions = {
    responsive: true,
    maintainAspectRatio: false,
    plugins: {
      legend: {
        position: "bottom" as const,
        labels: { color: "#94a3b8", font: { family: "Sarabun", size: 11 } },
      },
    },
  };

  // Profit Bar Data
  const profitBarColors = profits.map((p) => (p >= 0 ? "rgba(34, 197, 94, 0.7)" : "rgba(239, 68, 68, 0.7)"));
  const barData = {
    labels,
    datasets: [
      {
        label: "กำไรสุทธิรายวัน (฿)",
        data: profits,
        backgroundColor: profitBarColors,
        borderRadius: 4,
      },
    ],
  };

  const barOptions = {
    responsive: true,
    maintainAspectRatio: false,
    plugins: {
      legend: { display: false },
    },
    scales: {
      x: {
        ticks: { color: "#64748b", font: { family: "Chakra Petch", size: 10 } },
        grid: { display: false },
      },
      y: {
        ticks: { color: "#64748b", font: { family: "Chakra Petch", size: 10 } },
        grid: { color: "#2a3140" },
      },
    },
  };

  // Expense Categories calculation
  const totalPork = records.reduce((sum, r) => sum + (r.pork || 0), 0);
  const totalMaterials = records.reduce((sum, r) => sum + (r.materials || 0), 0);
  const totalLabor = records.reduce((sum, r) => sum + (r.labor || 0), 0);
  const totalGas = records.reduce((sum, r) => sum + (r.gas || 0), 0);
  const totalOther = records.reduce((sum, r) => {
    const ice = r.ice || 0;
    const supp = r.supplies || 0;
    const extraExp = (r.extraExpenses || []).reduce((eSum: number, e: ExtraExpense) => eSum + (e.amount || 0), 0);
    return sum + ice + supp + extraExp;
  }, 0);

  const grandExpense = totalPork + totalMaterials + totalLabor + totalGas + totalOther;

  const expenseItems = [
    { label: "🥩 ค่าหมูรวม", amount: totalPork, color: "#f87171" },
    { label: "🥬 วัตถุดิบ", amount: totalMaterials, color: "#fb923c" },
    { label: "👥 ค่าแรงพนักงาน", amount: totalLabor, color: "#a855f7" },
    { label: "🔥 ค่าแก๊ส", amount: totalGas, color: "#eab308" },
    { label: "📦 สิ้นเปลือง/น้ำแข็ง/อื่นๆ", amount: totalOther, color: "#38bdf8" },
  ];

  const fmt = (n: number) => n.toLocaleString("th-TH");
  const pct = (amount: number) => (grandExpense > 0 ? ((amount / grandExpense) * 100).toFixed(1) : "0.0");

  return (
    <>
      <div
        style={{
          display: "grid",
          gridTemplateColumns: "repeat(auto-fit, minmax(320px, 1fr))",
          gap: 14,
          marginBottom: 18,
        }}
      >
        {/* Main Line Chart */}
        <div
          style={{
            background: "#161b22",
            border: "1px solid #2a3140",
            borderRadius: 12,
            padding: 18,
            gridColumn: "span 2",
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
            รายรับ / ค่าใช้จ่าย / กำไรรายวัน
          </div>
          <div style={{ height: 260, position: "relative" }}>
            <Line data={lineData} options={lineOptions} />
          </div>
        </div>

        {/* Payment Channels Donut Chart */}
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
            ช่องทางรับเงิน
          </div>
          <div style={{ height: 160, position: "relative" }}>
            <Doughnut data={donutData} options={donutOptions} />
          </div>
          <div
            style={{
              display: "grid",
              gridTemplateColumns: "repeat(3, 1fr)",
              gap: 8,
              marginTop: 10,
            }}
          >
            <div
              style={{
                background: "#1c2128",
                border: "1px solid #2a3140",
                borderRadius: 8,
                padding: 8,
                textAlign: "center",
              }}
            >
              <div style={{ fontSize: 16 }}>💳</div>
              <div style={{ fontSize: 10, color: "#94a3b8" }}>โอนเงิน</div>
              <div
                style={{
                  fontFamily: "Chakra Petch, sans-serif",
                  fontSize: 12,
                  fontWeight: 700,
                  color: "#60a5fa",
                }}
              >
                ฿{fmt(totalTransfer)}
              </div>
              <div style={{ fontSize: 9, color: "#fb923c", marginTop: 2 }}>
                {pct(totalTransfer)}%
              </div>
            </div>
            <div
              style={{
                background: "#1c2128",
                border: "1px solid #2a3140",
                borderRadius: 8,
                padding: 8,
                textAlign: "center",
              }}
            >
              <div style={{ fontSize: 16 }}>💵</div>
              <div style={{ fontSize: 10, color: "#94a3b8" }}>เงินสด</div>
              <div
                style={{
                  fontFamily: "Chakra Petch, sans-serif",
                  fontSize: 12,
                  fontWeight: 700,
                  color: "#4ade80",
                }}
              >
                ฿{fmt(totalCash)}
              </div>
              <div style={{ fontSize: 9, color: "#fb923c", marginTop: 2 }}>
                {pct(totalCash)}%
              </div>
            </div>
            <div
              style={{
                background: "#1c2128",
                border: "1px solid #2a3140",
                borderRadius: 8,
                padding: 8,
                textAlign: "center",
              }}
            >
              <div style={{ fontSize: 16 }}>🛵</div>
              <div style={{ fontSize: 10, color: "#94a3b8" }}>Delivery</div>
              <div
                style={{
                  fontFamily: "Chakra Petch, sans-serif",
                  fontSize: 12,
                  fontWeight: 700,
                  color: "#fb923c",
                }}
              >
                ฿{fmt(totalDelivery)}
              </div>
              <div style={{ fontSize: 9, color: "#fb923c", marginTop: 2 }}>
                {pct(totalDelivery)}%
              </div>
            </div>
          </div>
        </div>
      </div>

      <div
        style={{
          display: "grid",
          gridTemplateColumns: "repeat(auto-fit, minmax(320px, 1fr))",
          gap: 14,
          marginBottom: 18,
        }}
      >
        {/* Profit Bar Chart */}
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
            กำไรสุทธิรายวัน
          </div>
          <div style={{ height: 200, position: "relative" }}>
            <Bar data={barData} options={barOptions} />
          </div>
        </div>

        {/* Expense Distribution Progress Bars */}
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
            สัดส่วนค่าใช้จ่าย (รวม ฿{fmt(grandExpense)})
          </div>
          <div style={{ display: "flex", flexDirection: "column", gap: 12 }}>
            {expenseItems.map((item, idx) => {
              const itemPct = pct(item.amount);
              return (
                <div key={idx}>
                  <div
                    style={{
                      display: "flex",
                      justifyContent: "space-between",
                      fontSize: 12,
                      marginBottom: 4,
                    }}
                  >
                    <span style={{ color: "#e2e8f0" }}>{item.label}</span>
                    <span style={{ color: "#94a3b8", fontFamily: "Chakra Petch" }}>
                      ฿{fmt(item.amount)} ({itemPct}%)
                    </span>
                  </div>
                  <div
                    style={{
                      height: 6,
                      background: "#1c2128",
                      borderRadius: 3,
                      overflow: "hidden",
                    }}
                  >
                    <div
                      style={{
                        height: "100%",
                        width: `${itemPct}%`,
                        background: item.color,
                        borderRadius: 3,
                        transition: "width 0.8s ease",
                      }}
                    />
                  </div>
                </div>
              );
            })}
          </div>
        </div>
      </div>
    </>
  );
}
