import type { FinancialRecord } from "@/lib/types/financial.types";
import { formatCurrency, formatDateThai } from "@/lib/utils/helpers";

/**
 * Build LINE Flex Message JSON for a saved financial record.
 */
export function buildRecordConfirmationFlexCard(
  record: FinancialRecord,
  options: { title?: string; addedItems?: string[] } = {}
) {
  const isProfit = record.profit >= 0;
  const mainColor = isProfit ? "#1DB446" : "#E53E3E";
  const headerTitle = options.title || (isProfit ? "✅ บันทึกยอดสำเร็จ" : "⚠️ บันทึกยอด (ขาดทุน)");

  const items: any[] = [
    {
      type: "box",
      layout: "baseline",
      contents: [
        { type: "text", text: "ร้าน / สาขา", color: "#8C8C8C", size: "sm", flex: 2 },
        { type: "text", text: record.shopName || record.shopId, weight: "bold", size: "sm", flex: 3, align: "end" },
      ],
    },
    {
      type: "box",
      layout: "baseline",
      contents: [
        { type: "text", text: "วันที่", color: "#8C8C8C", size: "sm", flex: 2 },
        { type: "text", text: formatDateThai(record.date), size: "sm", flex: 3, align: "end" },
      ],
    },
    { type: "separator", margin: "md" },
    {
      type: "box",
      layout: "baseline",
      margin: "md",
      contents: [
        { type: "text", text: "💰 รายได้รวม", weight: "bold", size: "sm", flex: 2 },
        { type: "text", text: `฿${formatCurrency(record.revenue)}`, weight: "bold", size: "sm", flex: 3, align: "end", color: "#1DB446" },
      ],
    },
  ];

  if (record.transfer > 0) {
    items.push({
      type: "box", layout: "baseline", margin: "xs",
      contents: [
        { type: "text", text: "  💳 โอน", color: "#555555", size: "xs", flex: 2 },
        { type: "text", text: `฿${formatCurrency(record.transfer)}`, size: "xs", flex: 3, align: "end" },
      ],
    });
  }
  if (record.cash > 0) {
    items.push({
      type: "box", layout: "baseline", margin: "xs",
      contents: [
        { type: "text", text: "  💵 เงินสด", color: "#555555", size: "xs", flex: 2 },
        { type: "text", text: `฿${formatCurrency(record.cash)}`, size: "xs", flex: 3, align: "end" },
      ],
    });
  }
  if (record.delivery > 0) {
    items.push({
      type: "box", layout: "baseline", margin: "xs",
      contents: [
        { type: "text", text: "  🛵 Delivery", color: "#555555", size: "xs", flex: 2 },
        { type: "text", text: `฿${formatCurrency(record.delivery)}`, size: "xs", flex: 3, align: "end" },
      ],
    });
  }

  items.push(
    { type: "separator", margin: "md" },
    {
      type: "box", layout: "baseline", margin: "md",
      contents: [
        { type: "text", text: "💸 รายจ่ายรวม", weight: "bold", size: "sm", flex: 2 },
        { type: "text", text: `฿${formatCurrency(record.expense)}`, weight: "bold", size: "sm", flex: 3, align: "end", color: "#E53E3E" },
      ],
    },
    { type: "separator", margin: "md" },
    {
      type: "box", layout: "baseline", margin: "md",
      contents: [
        { type: "text", text: `${isProfit ? "📈" : "📉"} กำไรสุทธิ`, weight: "bold", size: "md", flex: 2 },
        { type: "text", text: `${isProfit ? "+" : ""}฿${formatCurrency(record.profit)}`, weight: "bold", size: "md", flex: 3, align: "end", color: mainColor },
      ],
    }
  );

  return {
    type: "flex",
    altText: `${headerTitle} - ฿${formatCurrency(record.revenue)}`,
    contents: {
      type: "bubble",
      header: {
        type: "box",
        layout: "vertical",
        backgroundColor: mainColor,
        contents: [
          { type: "text", text: headerTitle, weight: "bold", color: "#FFFFFF", size: "md" },
          { type: "text", text: record.shopName || record.shopId, color: "#EBF8FF", size: "xs", margin: "xs" },
        ],
      },
      body: {
        type: "box",
        layout: "vertical",
        contents: items,
      },
      footer: {
        type: "box",
        layout: "horizontal",
        spacing: "sm",
        contents: [
          {
            type: "button",
            style: "primary",
            height: "sm",
            color: "#128C7E",
            action: { type: "message", label: "📊 สรุปยอด", text: "สรุป" },
          },
          {
            type: "button",
            style: "secondary",
            height: "sm",
            action: { type: "message", label: "🥩 เช็คหมู", text: "สรุปหมู" },
          },
        ],
      },
    },
  };
}

/**
 * Build LINE Flex Message JSON for Pork Summary Breakdown.
 */
export function buildPorkSummaryFlexCard(record: FinancialRecord) {
  const pb = record.porkBreakdown;

  return {
    type: "flex",
    altText: `🥩 รายงานยอดหมู - ${record.shopName || record.shopId}`,
    contents: {
      type: "bubble",
      header: {
        type: "box",
        layout: "vertical",
        backgroundColor: "#D69E2E",
        contents: [
          { type: "text", text: "🥩 รายงานยอดหมูสด", weight: "bold", color: "#FFFFFF", size: "md" },
          { type: "text", text: `${record.shopName || record.shopId} · ${formatDateThai(record.date)}`, color: "#FEFCBF", size: "xs" },
        ],
      },
      body: {
        type: "box",
        layout: "vertical",
        spacing: "md",
        contents: [
          {
            type: "box", layout: "baseline",
            contents: [
              { type: "text", text: "🔴 หมูแดง", size: "sm", flex: 2, weight: "bold" },
              { type: "text", text: `${pb?.redQty ?? 0} กก (฿${formatCurrency(pb?.redTotal ?? 0)})`, size: "sm", flex: 3, align: "end" },
            ],
          },
          {
            type: "box", layout: "baseline",
            contents: [
              { type: "text", text: "🟠 หมูสับ", size: "sm", flex: 2, weight: "bold" },
              { type: "text", text: `${pb?.mincedQty ?? 0} กก (฿${formatCurrency(pb?.mincedTotal ?? 0)})`, size: "sm", flex: 3, align: "end" },
            ],
          },
          {
            type: "box", layout: "baseline",
            contents: [
              { type: "text", text: "🟡 มันหมู", size: "sm", flex: 2, weight: "bold" },
              { type: "text", text: `${pb?.fatQty ?? 0} กก (฿${formatCurrency(pb?.fatTotal ?? 0)})`, size: "sm", flex: 3, align: "end" },
            ],
          },
          { type: "separator" },
          {
            type: "box", layout: "baseline",
            contents: [
              { type: "text", text: "🛒 รวมค่าหมูทั้งหมด", size: "md", flex: 2, weight: "bold" },
              { type: "text", text: `฿${formatCurrency(record.pork)}`, size: "md", flex: 3, align: "end", color: "#D69E2E", weight: "bold" },
            ],
          },
        ],
      },
    },
  };
}
