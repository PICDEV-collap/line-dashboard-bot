import { createHash } from "crypto";
import { ENV } from "@/config/constants";
import type { ReportSummaryIntent } from "@/lib/thai/types";

const THAI_MONTHS_FULL = [
  "", "มกราคม", "กุมภาพันธ์", "มีนาคม", "เมษายน", "พฤษภาคม", "มิถุนายน",
  "กรกฎาคม", "สิงหาคม", "กันยายน", "ตุลาคม", "พฤศจิกายน", "ธันวาคม",
];

/** Public base URL of this deployment, used to build report links for LINE. */
export function getAppBaseUrl(): string {
  const explicit = process.env.APP_BASE_URL ?? process.env.NEXT_PUBLIC_APP_URL;
  if (explicit) return explicit.replace(/\/$/, "");
  const vercel = process.env.VERCEL_URL;
  if (vercel) return `https://${vercel}`;
  return "";
}

/**
 * Read access token for the report page / data endpoint.
 * Uses REPORT_TOKEN if set, otherwise a stable hash of DASHBOARD_API_KEY so the
 * raw dashboard key is never exposed in a LINE-shared link.
 */
export function getReportToken(): string {
  const explicit = process.env.REPORT_TOKEN;
  if (explicit) return explicit;
  return createHash("sha256").update(ENV.DASHBOARD_API_KEY()).digest("hex").slice(0, 24);
}

/** Build the public report-page URL the LINE bot links to. */
export function buildReportUrl(baseUrl: string, intent: ReportSummaryIntent): string {
  const params = new URLSearchParams();
  params.set("period", intent.period);
  if (intent.period === "year" && intent.year) params.set("year", intent.year);
  if (intent.period === "month" && intent.month) params.set("month", intent.month);
  if (intent.shopId) params.set("shopId", intent.shopId);
  params.set("t", getReportToken());
  const base = (baseUrl || getAppBaseUrl()).replace(/\/$/, "");
  return `${base}/report.html?${params.toString()}`;
}

/** Human label for the report period, e.g. "ประจำเดือน มิถุนายน 2569" / "ประจำปี 2569". */
export function describeReportPeriod(intent: ReportSummaryIntent): string {
  if (intent.period === "year" && intent.year) {
    return `ประจำปี ${parseInt(intent.year, 10) + 543}`;
  }
  if (intent.month) {
    const [y, mo] = intent.month.split("-").map(Number);
    return `ประจำเดือน ${THAI_MONTHS_FULL[mo] ?? mo} ${y + 543}`;
  }
  return "";
}

function shopLabel(intent: ReportSummaryIntent): string {
  if (intent.shopId === "shop2") return "🏪 สาขาสายหนองปิง";
  if (intent.shopId === "shop1") return "🏪 สาขาตลาดญี่ปุ่น";
  return "🏪 ทุกสาขา";
}

/** LINE reply: a tappable link to the report page (which exports to PDF on-device). */
export function buildReportLinkMessage(intent: ReportSummaryIntent, url: string): string {
  return [
    `📄 รายงาน${describeReportPeriod(intent)}`,
    shopLabel(intent),
    "",
    "แตะลิงก์เพื่อเปิดรายงานและบันทึกเป็น PDF 👇",
    url,
    "",
    '💡 ในหน้ารายงานกด "📥 ดาวน์โหลด PDF" หรือ "🖨️ พิมพ์/บันทึก PDF"',
  ].join("\n");
}
