import type { FinancialRecord } from "@/lib/types/financial.types";

/**
 * Generates CSV string with UTF-8 BOM for Microsoft Excel & Google Sheets compatibility.
 */
export function buildCsvContent(records: FinancialRecord[]): string {
  const headers = [
    "วันที่",
    "สาขา",
    "ยอดโอน(บาท)",
    "เงินสด(บาท)",
    "Delivery(บาท)",
    "รายรับรวม(บาท)",
    "หมูแดง(กก)",
    "หมูสับ(กก)",
    "มันหมู(กก)",
    "รวมค่าหมู(บาท)",
    "วัตถุดิบ(บาท)",
    "ค่าแรง(บาท)",
    "แก๊ส(บาท)",
    "น้ำแข็ง(บาท)",
    "รายจ่ายอื่นๆ(บาท)",
    "รายจ่ายรวม(บาท)",
    "กำไรสุทธิ(บาท)",
    "อัตรากำไร(%)",
    "หมายเหตุ",
  ];

  const rows = records.map((r) => {
    const extraExpSum = (r.extraExpenses || []).reduce((sum, e) => sum + (e.amount || 0), 0);
    const margin = r.marginPct !== undefined ? r.marginPct.toFixed(1) : (r.revenue > 0 ? (((r.profit || 0) / r.revenue) * 100).toFixed(1) : "0.0");
    const noteClean = (r.note || "").replace(/"/g, '""');

    return [
      `"${r.date}"`,
      `"${r.shopName || r.shopId}"`,
      r.transfer || 0,
      r.cash || 0,
      r.delivery || 0,
      r.revenue || 0,
      r.porkBreakdown?.redQty || 0,
      r.porkBreakdown?.mincedQty || 0,
      r.porkBreakdown?.fatQty || 0,
      r.pork || 0,
      r.materials || 0,
      r.labor || 0,
      r.gas || 0,
      r.ice || 0,
      extraExpSum,
      r.expense || 0,
      r.profit ?? ((r.revenue || 0) - (r.expense || 0)),
      margin,
      `"${noteClean}"`,
    ].join(",");
  });

  // Prepend UTF-8 BOM (\uFEFF) to guarantee Excel displays Thai characters properly
  return "\uFEFF" + [headers.join(","), ...rows].join("\r\n");
}

/**
 * Generates XML Spreadsheet format for Excel.
 */
export function buildExcelXmlContent(records: FinancialRecord[]): string {
  const rowsXml = records
    .map((r) => {
      const extraExpSum = (r.extraExpenses || []).reduce((sum, e) => sum + (e.amount || 0), 0);
      const margin = r.marginPct !== undefined ? r.marginPct.toFixed(1) : (r.revenue > 0 ? (((r.profit || 0) / r.revenue) * 100).toFixed(1) : "0.0");

      return `      <Row>
        <Cell><Data ss:Type="String">${r.date}</Data></Cell>
        <Cell><Data ss:Type="String">${r.shopName || r.shopId}</Data></Cell>
        <Cell><Data ss:Type="Number">${r.transfer || 0}</Data></Cell>
        <Cell><Data ss:Type="Number">${r.cash || 0}</Data></Cell>
        <Cell><Data ss:Type="Number">${r.delivery || 0}</Data></Cell>
        <Cell><Data ss:Type="Number">${r.revenue || 0}</Data></Cell>
        <Cell><Data ss:Type="Number">${r.porkBreakdown?.redQty || 0}</Data></Cell>
        <Cell><Data ss:Type="Number">${r.porkBreakdown?.mincedQty || 0}</Data></Cell>
        <Cell><Data ss:Type="Number">${r.porkBreakdown?.fatQty || 0}</Data></Cell>
        <Cell><Data ss:Type="Number">${r.pork || 0}</Data></Cell>
        <Cell><Data ss:Type="Number">${r.materials || 0}</Data></Cell>
        <Cell><Data ss:Type="Number">${r.labor || 0}</Data></Cell>
        <Cell><Data ss:Type="Number">${r.gas || 0}</Data></Cell>
        <Cell><Data ss:Type="Number">${r.ice || 0}</Data></Cell>
        <Cell><Data ss:Type="Number">${extraExpSum}</Data></Cell>
        <Cell><Data ss:Type="Number">${r.expense || 0}</Data></Cell>
        <Cell><Data ss:Type="Number">${r.profit ?? ((r.revenue || 0) - (r.expense || 0))}</Data></Cell>
        <Cell><Data ss:Type="String">${margin}%</Data></Cell>
      </Row>`;
    })
    .join("\n");

  return `<?xml version="1.0"?>
<?mso-application progid="Excel.Sheet"?>
<Workbook xmlns="urn:schemas-microsoft-com:office:spreadsheet"
 xmlns:ss="urn:schemas-microsoft-com:office:spreadsheet">
  <Worksheet ss:Name="รายงานบัญชีร้านครูตอม">
    <Table>
      <Row ss:StyleID="Header">
        <Cell><Data ss:Type="String">วันที่</Data></Cell>
        <Cell><Data ss:Type="String">สาขา</Data></Cell>
        <Cell><Data ss:Type="String">ยอดโอน (บาท)</Data></Cell>
        <Cell><Data ss:Type="String">เงินสด (บาท)</Data></Cell>
        <Cell><Data ss:Type="String">Delivery (บาท)</Data></Cell>
        <Cell><Data ss:Type="String">รายรับรวม (บาท)</Data></Cell>
        <Cell><Data ss:Type="String">หมูแดง (กก)</Data></Cell>
        <Cell><Data ss:Type="String">หมูสับ (กก)</Data></Cell>
        <Cell><Data ss:Type="String">มันหมู (กก)</Data></Cell>
        <Cell><Data ss:Type="String">รวมค่าหมู (บาท)</Data></Cell>
        <Cell><Data ss:Type="String">วัตถุดิบ (บาท)</Data></Cell>
        <Cell><Data ss:Type="String">ค่าแรง (บาท)</Data></Cell>
        <Cell><Data ss:Type="String">แก๊ส (บาท)</Data></Cell>
        <Cell><Data ss:Type="String">น้ำแข็ง (บาท)</Data></Cell>
        <Cell><Data ss:Type="String">รายจ่ายอื่นๆ (บาท)</Data></Cell>
        <Cell><Data ss:Type="String">รายจ่ายรวม (บาท)</Data></Cell>
        <Cell><Data ss:Type="String">กำไรสุทธิ (บาท)</Data></Cell>
        <Cell><Data ss:Type="String">อัตรากำไร (%)</Data></Cell>
      </Row>
${rowsXml}
    </Table>
  </Worksheet>
</Workbook>`;
}

/**
 * Triggers native browser download for CSV file.
 */
export function exportRecordsToCsv(records: FinancialRecord[], filename?: string): void {
  if (typeof window === "undefined") return;
  const name = filename || `รายงานบัญชี_ร้านครูตอม_${new Date().toISOString().split("T")[0]}.csv`;
  const content = buildCsvContent(records);
  const blob = new Blob([content], { type: "text/csv;charset=utf-8;" });
  const url = URL.createObjectURL(blob);
  const a = document.createElement("a");
  a.href = url;
  a.download = name;
  document.body.appendChild(a);
  a.click();
  document.body.removeChild(a);
  URL.revokeObjectURL(url);
}

/**
 * Triggers native browser download for Excel XML file.
 */
export function exportRecordsToExcel(records: FinancialRecord[], filename?: string): void {
  if (typeof window === "undefined") return;
  const name = filename || `รายงานบัญชี_ร้านครูตอม_${new Date().toISOString().split("T")[0]}.xls`;
  const content = buildExcelXmlContent(records);
  const blob = new Blob([content], { type: "application/vnd.ms-excel;charset=utf-8;" });
  const url = URL.createObjectURL(blob);
  const a = document.createElement("a");
  a.href = url;
  a.download = name;
  document.body.appendChild(a);
  a.click();
  document.body.removeChild(a);
  URL.revokeObjectURL(url);
}
