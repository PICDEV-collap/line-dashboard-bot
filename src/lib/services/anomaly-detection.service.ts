import type { FinancialRecord } from "@/lib/types/financial.types";
import { createLogger } from "@/lib/middleware/logger";

const logger = createLogger("AnomalyDetection");

export type AnomalySeverity = "high" | "medium" | "info";

export interface AnomalyAlert {
  type: "EXPENSE_SPIKE" | "REVENUE_MISMATCH" | "LOW_MARGIN" | "MISSING_PORK_BREAKDOWN";
  severity: AnomalySeverity;
  title: string;
  description: string;
}

/**
 * Analyzes a financial record against historical data to detect anomalies and audit issues.
 */
export function analyzeRecordAnomalies(
  target: FinancialRecord,
  history: FinancialRecord[] = []
): AnomalyAlert[] {
  const alerts: AnomalyAlert[] = [];

  const rev = target.revenue || 0;
  const exp = target.expense || 0;
  const prof = target.profit ?? (rev - exp);
  const transfer = target.transfer || 0;
  const cash = target.cash || 0;
  const delivery = target.delivery || 0;

  // 1. Revenue Component Mismatch
  const sumPayment = transfer + cash + delivery;
  if (sumPayment > 0 && rev > 0 && Math.abs(sumPayment - rev) > 10) {
    alerts.push({
      type: "REVENUE_MISMATCH",
      severity: "high",
      title: "⚠️ ยอดรับเงินไม่ตรงกับรายรับรวม",
      description: `ยอดรวมช่องทาง (โอน ฿${transfer} + สด ฿${cash} + Delivery ฿${delivery} = ฿${sumPayment}) ไม่ตรงกับรายรับรวม (฿${rev})`,
    });
  }

  // 2. Low / Negative Profit Margin
  if (prof < 0) {
    alerts.push({
      type: "LOW_MARGIN",
      severity: "high",
      title: "🚨 ขาดทุนสุทธิ",
      description: `ยอดรายจ่าย (฿${exp}) สูงกว่ารายรับ (฿${rev}) ขาดทุน ฿${Math.abs(prof)}`,
    });
  } else if (rev > 0 && prof / rev < 0.1) {
    const margin = ((prof / rev) * 100).toFixed(1);
    alerts.push({
      type: "LOW_MARGIN",
      severity: "medium",
      title: "⚠️ อัตรากำไรต่ำกว่าเกณฑ์ (< 10%)",
      description: `กำไรสุทธิ ฿${prof} คิดเป็นเพียง ${margin}% ของรายรับรวม`,
    });
  }

  // 3. Expense Spike (> 30% above 7-day average for the same shop)
  const sameShopHistory = history
    .filter((r) => r.shopId === target.shopId && r.id !== target.id && r.expense > 0)
    .slice(0, 7);

  if (sameShopHistory.length >= 3) {
    const avgExpense =
      sameShopHistory.reduce((sum, r) => sum + r.expense, 0) / sameShopHistory.length;

    if (exp > avgExpense * 1.3) {
      const pctOver = (((exp - avgExpense) / avgExpense) * 100).toFixed(0);
      alerts.push({
        type: "EXPENSE_SPIKE",
        severity: "medium",
        title: "📈 ค่าใช้จ่ายพุ่งสูงผิดปกติ",
        description: `ค่าใช้จ่ายวันนี้ (฿${exp}) สูงกว่าค่าเฉลี่ยย้อนหลัง (฿${Math.round(avgExpense)}) อยู่ ${pctOver}%`,
      });
    }
  }

  // 4. Missing Pork Breakdown Details
  if (target.pork > 0 && (!target.porkBreakdown || target.porkBreakdown.total === 0)) {
    alerts.push({
      type: "MISSING_PORK_BREAKDOWN",
      severity: "info",
      title: "💡 ขาดรายละเอียดหมูแยกชนิด",
      description: `มีการระบุค่าหมูรวม ฿${target.pork} แต่ยังไม่ได้ระบุจำนวน/ราคาของหมูแดง หมูสับ หรือมันหมู`,
    });
  }

  logger.info("Anomaly analysis complete", {
    recordId: target.id,
    alertCount: alerts.length,
  });

  return alerts;
}

/**
 * Formats anomaly alerts into readable Thai text for LINE bot reply or report push.
 */
export function formatAnomalyNotice(alerts: AnomalyAlert[]): string {
  if (alerts.length === 0) return "";

  const lines = ["\n🔍 **ผลการตรวจสอบความผิดปกติ (Audit Alert):**"];
  for (const alert of alerts) {
    lines.push(`• ${alert.title}`);
    lines.push(`  └ ${alert.description}`);
  }
  return lines.join("\n");
}
