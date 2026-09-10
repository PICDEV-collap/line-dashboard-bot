"use client";

import React, { useState } from "react";
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
import { groupRecordsByWeek, groupRecordsByMonth } from "@/lib/utils/analytics-aggregator";

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
  const [period, setPeriod] = useState<"daily" | "weekly" | "monthly">("daily");

  // Daily records sorted
  const sortedRecords = [...records].sort((a, b) => a.date.localeCompare(b.date));

  // Weekly & Monthly aggregations
  const weeklySummaries = groupRecordsByWeek(records);
  const monthlySummaries = groupRecordsByMonth(records);

  // Determine active dataset according to selected period
  let labels: string[] = [];
  let revenues: number[] = [];
  let expenses: number[] = [];
  let profits: number[] = [];
  let chartMainTitle = "รายรับ / ค่าใช้จ่าย / กำไรรายวัน";
  let barMainTitle = "กำไรสุทธิรายวัน";

  if (period === "weekly") {
    labels = weeklySummaries.map((w) => w.label);
    revenues = weeklySummaries.map((w) => w.revenue);
    expenses = weeklySummaries.map((w) => w.expense);
    profits = weeklySummaries.map((w) => w.profit);
    chartMainTitle = `แนวโน้มรายสัปดาห์ (${weeklySummaries.length} สัปดาห์)`;
    barMainTitle = "กำไรสุทธิรายสัปดาห์";
  } else if (period === "monthly") {
    labels = monthlySummaries.map((m) => m.label);
    revenues = monthlySummaries.map((m) => m.revenue);
    expenses = monthlySummaries.map((m) => m.expense);
    profits = monthlySummaries.map((m) => m.profit);
    chartMainTitle = `แนวโน้มรายเดือน (${monthlySummaries.length} เดือน)`;
    barMainTitle = "กำไรสุทธิรายเดือน";
  } else {
    labels = sortedRecords.map((r) => {
      const parts = r.date.split("-");
      if (parts.length === 3) {
        return `${parseInt(parts[2], 10)}/${parseInt(parts[1], 10)}`;
      }
      return r.date;
    });
    revenues = sortedRecords.map((r) => r.revenue || 0);
    expenses = sortedRecords.map((r) => r.expense || 0);
    profits = sortedRecords.map((r) => r.profit ?? ((r.revenue || 0) - (r.expense || 0)));
    chartMainTitle = `แนวโน้มรายวัน (${sortedRecords.length} วัน)`;
    barMainTitle = "กำไรสุทธิรายวัน";
  }

  // Summary calculations for period
  const totalProfitPeriod = profits.reduce((s, v) => s + v, 0);
  const avgProfitPeriod = profits.length > 0 ? Math.round(totalProfitPeriod / profits.length) : 0;
  const maxProfitIndex = profits.length > 0 ? profits.indexOf(Math.max(...profits)) : -1;
  const bestPeriodLabel = maxProfitIndex >= 0 ? labels[maxProfitIndex] : "-";
  const bestProfitVal = maxProfitIndex >= 0 ? profits[maxProfitIndex] : 0;

  const lineData = {
    labels,
    datasets: [
      {
        label: "รายรับ (฿)",
        data: revenues,
        borderColor: "#06c755",
        backgroundColor: "rgba(6, 199, 85, 0.12)",
        fill: true,
        tension: 0.3,
      },
      {
        label: "ค่าใช้จ่าย (฿)",
        data: expenses,
        borderColor: "#ef4444",
        backgroundColor: "rgba(239, 68, 68, 0.06)",
        fill: true,
        tension: 0.3,
      },
      {
        label: "กำไรสุทธิ (฿)",
        data: profits,
        borderColor: "#10b981",
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
        labels: {
          color: "#8e99b0",
          font: { family: "-apple-system, BlinkMacSystemFont, 'Segoe UI', sans-serif" },
        },
      },
      tooltip: {
        mode: "index" as const,
        intersect: false,
      },
    },
    scales: {
      x: {
        ticks: {
          color: "#8e99b0",
          font: { family: "-apple-system, BlinkMacSystemFont, 'Segoe UI', sans-serif", size: 11 },
        },
        grid: { color: "rgba(43, 50, 72, 0.6)" },
      },
      y: {
        ticks: {
          color: "#8e99b0",
          font: { family: "-apple-system, BlinkMacSystemFont, 'Segoe UI', sans-serif", size: 11 },
        },
        grid: { color: "rgba(43, 50, 72, 0.6)" },
      },
    },
  };

  // Profit Bar Data
  const profitBarColors = profits.map((p) =>
    p >= 0 ? "rgba(6, 199, 85, 0.85)" : "rgba(239, 68, 68, 0.85)"
  );
  const barData = {
    labels,
    datasets: [
      {
        label: `${barMainTitle} (฿)`,
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
        ticks: {
          color: "#8e99b0",
          font: { family: "-apple-system, BlinkMacSystemFont, 'Segoe UI', sans-serif", size: 10 },
        },
        grid: { display: false },
      },
      y: {
        ticks: {
          color: "#8e99b0",
          font: { family: "-apple-system, BlinkMacSystemFont, 'Segoe UI', sans-serif", size: 10 },
        },
        grid: { color: "rgba(43, 50, 72, 0.6)" },
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
        backgroundColor: ["#38bdf8", "#06c755", "#8c44db"],
        borderColor: "var(--surface)",
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
        labels: {
          color: "#8e99b0",
          font: { family: "-apple-system, BlinkMacSystemFont, 'Segoe UI', sans-serif", size: 11 },
        },
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
    { label: "🥩 ค่าหมูรวม", amount: totalPork, color: "var(--danger)" },
    { label: "🥬 วัตถุดิบ", amount: totalMaterials, color: "var(--warning)" },
    { label: "👥 ค่าแรงพนักงาน", amount: totalLabor, color: "var(--delivery-robinhood)" },
    { label: "🔥 ค่าแก๊ส", amount: totalGas, color: "var(--warning)" },
    { label: "📦 สิ้นเปลือง/น้ำแข็ง/อื่นๆ", amount: totalOther, color: "var(--info)" },
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
        {/* Main Line Chart with Period Selector */}
        <div
          style={{
            background: "var(--surface)",
            border: "1px solid var(--border)",
            borderRadius: "var(--radius-lg)",
            padding: 18,
            gridColumn: "span 2",
            boxShadow: "0 4px 16px rgba(0, 0, 0, 0.12)",
          }}
        >
          <div
            style={{
              display: "flex",
              justifyContent: "space-between",
              alignItems: "center",
              flexWrap: "wrap",
              gap: 10,
              marginBottom: 14,
            }}
          >
            <div
              style={{
                fontSize: "0.95rem",
                fontWeight: 700,
                color: "var(--text-primary)",
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
              {chartMainTitle}
            </div>

            {/* Period Selector Toggle */}
            <div
              style={{
                display: "flex",
                background: "var(--surface-raised)",
                padding: 3,
                borderRadius: "var(--radius-sm)",
                border: "1px solid var(--border)",
                gap: 4,
              }}
            >
              <button
                type="button"
                onClick={() => setPeriod("daily")}
                style={{
                  padding: "6px 14px",
                  fontSize: "0.8rem",
                  fontWeight: 600,
                  cursor: "pointer",
                  border: "none",
                  borderRadius: "var(--radius-sm)",
                  transition: "all 0.15s ease",
                  background: period === "daily" ? "var(--primary)" : "transparent",
                  color: period === "daily" ? "#FFFFFF" : "var(--text-secondary)",
                }}
              >
                📊 รายวัน
              </button>
              <button
                type="button"
                onClick={() => setPeriod("weekly")}
                style={{
                  padding: "6px 14px",
                  fontSize: "0.8rem",
                  fontWeight: 600,
                  cursor: "pointer",
                  border: "none",
                  borderRadius: "var(--radius-sm)",
                  transition: "all 0.15s ease",
                  background: period === "weekly" ? "var(--primary)" : "transparent",
                  color: period === "weekly" ? "#FFFFFF" : "var(--text-secondary)",
                }}
              >
                📅 รายสัปดาห์
              </button>
              <button
                type="button"
                onClick={() => setPeriod("monthly")}
                style={{
                  padding: "6px 14px",
                  fontSize: "0.8rem",
                  fontWeight: 600,
                  cursor: "pointer",
                  border: "none",
                  borderRadius: "var(--radius-sm)",
                  transition: "all 0.15s ease",
                  background: period === "monthly" ? "var(--primary)" : "transparent",
                  color: period === "monthly" ? "#FFFFFF" : "var(--text-secondary)",
                }}
              >
                📆 รายเดือน
              </button>
            </div>
          </div>

          {/* Quick Metrics Bar for the Period */}
          <div
            style={{
              display: "flex",
              flexWrap: "wrap",
              gap: 12,
              marginBottom: 16,
              padding: "10px 14px",
              background: "var(--surface-raised)",
              borderRadius: "var(--radius-sm)",
              border: "1px solid var(--border)",
              fontSize: "0.8rem",
              color: "var(--text-secondary)",
            }}
          >
            <div>
              ช่วงเวลาที่เลือก:{" "}
              <span className="tabular-nums" style={{ color: "var(--text-primary)", fontWeight: 700 }}>
                {labels.length} ช่วง
              </span>
            </div>
            <div style={{ color: "var(--border)" }}>|</div>
            <div>
              กำไรเฉลี่ย:{" "}
              <span
                className="tabular-nums"
                style={{
                  color: avgProfitPeriod >= 0 ? "var(--primary)" : "var(--danger)",
                  fontWeight: 700,
                }}
              >
                ฿{fmt(avgProfitPeriod)} / {period === "daily" ? "วัน" : period === "weekly" ? "สัปดาห์" : "เดือน"}
              </span>
            </div>
            <div style={{ color: "var(--border)" }}>|</div>
            <div>
              ช่วงที่กำไรสูงสุด:{" "}
              <span className="tabular-nums" style={{ color: "var(--warning)", fontWeight: 700 }}>
                {bestPeriodLabel} (฿{fmt(bestProfitVal)})
              </span>
            </div>
          </div>

          <div style={{ height: 260, position: "relative" }}>
            <Line data={lineData} options={lineOptions} />
          </div>
        </div>

        {/* Payment Channels Donut Chart */}
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
              fontSize: "0.9rem",
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
                width: 6,
                height: 6,
                borderRadius: "var(--radius-pill)",
                background: "var(--info)",
              }}
            />
            สัดส่วนช่องทางรับเงิน
          </div>
          <div style={{ height: 160, position: "relative" }}>
            <Doughnut data={donutData} options={donutOptions} />
          </div>
          <div
            style={{
              display: "grid",
              gridTemplateColumns: "repeat(3, 1fr)",
              gap: 8,
              marginTop: 12,
            }}
          >
            <div
              style={{
                background: "var(--surface-raised)",
                border: "1px solid var(--border)",
                borderRadius: "var(--radius-sm)",
                padding: "8px 6px",
                textAlign: "center",
              }}
            >
              <div style={{ fontSize: 16 }}>💳</div>
              <div style={{ fontSize: "0.75rem", color: "var(--text-secondary)", marginTop: 2 }}>โอนเงิน</div>
              <div
                className="tabular-nums"
                style={{
                  fontSize: "0.85rem",
                  fontWeight: 700,
                  color: "var(--info)",
                  marginTop: 2,
                }}
              >
                ฿{fmt(totalTransfer)}
              </div>
              <div className="tabular-nums" style={{ fontSize: "0.75rem", color: "var(--text-muted)", marginTop: 2 }}>
                {pct(totalTransfer)}%
              </div>
            </div>

            <div
              style={{
                background: "var(--surface-raised)",
                border: "1px solid var(--border)",
                borderRadius: "var(--radius-sm)",
                padding: "8px 6px",
                textAlign: "center",
              }}
            >
              <div style={{ fontSize: 16 }}>💵</div>
              <div style={{ fontSize: "0.75rem", color: "var(--text-secondary)", marginTop: 2 }}>เงินสด</div>
              <div
                className="tabular-nums"
                style={{
                  fontSize: "0.85rem",
                  fontWeight: 700,
                  color: "var(--primary)",
                  marginTop: 2,
                }}
              >
                ฿{fmt(totalCash)}
              </div>
              <div className="tabular-nums" style={{ fontSize: "0.75rem", color: "var(--text-muted)", marginTop: 2 }}>
                {pct(totalCash)}%
              </div>
            </div>

            <div
              style={{
                background: "var(--surface-raised)",
                border: "1px solid var(--border)",
                borderRadius: "var(--radius-sm)",
                padding: "8px 6px",
                textAlign: "center",
              }}
            >
              <div style={{ fontSize: 16 }}>🛵</div>
              <div style={{ fontSize: "0.75rem", color: "var(--text-secondary)", marginTop: 2 }}>Delivery</div>
              <div
                className="tabular-nums"
                style={{
                  fontSize: "0.85rem",
                  fontWeight: 700,
                  color: "var(--delivery-robinhood)",
                  marginTop: 2,
                }}
              >
                ฿{fmt(totalDelivery)}
              </div>
              <div className="tabular-nums" style={{ fontSize: "0.75rem", color: "var(--text-muted)", marginTop: 2 }}>
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
            background: "var(--surface)",
            border: "1px solid var(--border)",
            borderRadius: "var(--radius-lg)",
            padding: 18,
            boxShadow: "0 4px 16px rgba(0, 0, 0, 0.12)",
          }}
        >
          <div
            style={{
              fontSize: "0.9rem",
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
                width: 6,
                height: 6,
                borderRadius: "var(--radius-pill)",
                background: "var(--primary)",
              }}
            />
            {barMainTitle}
          </div>
          <div style={{ height: 200, position: "relative" }}>
            <Bar data={barData} options={barOptions} />
          </div>
        </div>

        {/* Expense Distribution Progress Bars */}
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
              fontSize: "0.9rem",
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
                width: 6,
                height: 6,
                borderRadius: "var(--radius-pill)",
                background: "var(--danger)",
              }}
            />
            สัดส่วนค่าใช้จ่าย (รวม <span className="tabular-nums">฿{fmt(grandExpense)}</span>)
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
                      fontSize: "0.85rem",
                      marginBottom: 6,
                    }}
                  >
                    <span style={{ color: "var(--text-primary)" }}>{item.label}</span>
                    <span className="tabular-nums" style={{ color: "var(--text-secondary)", fontWeight: 600 }}>
                      ฿{fmt(item.amount)} ({itemPct}%)
                    </span>
                  </div>
                  <div
                    style={{
                      height: 6,
                      background: "var(--surface-raised)",
                      borderRadius: "var(--radius-pill)",
                      overflow: "hidden",
                    }}
                  >
                    <div
                      style={{
                        height: "100%",
                        width: `${itemPct}%`,
                        background: item.color,
                        borderRadius: "var(--radius-pill)",
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
