import {
  buildReportLinkMessage,
  buildReportUrl,
  describeReportPeriod,
  getAppBaseUrl,
  getReportToken,
} from "@/lib/services/report.service";
import type { ReportSummaryIntent } from "@/lib/thai/types";

describe("report.service", () => {
  const prevToken = process.env.REPORT_TOKEN;
  const prevBase = process.env.APP_BASE_URL;

  beforeAll(() => {
    process.env.REPORT_TOKEN = "testtoken";
    process.env.APP_BASE_URL = "https://shop.example.com/";
  });
  afterAll(() => {
    process.env.REPORT_TOKEN = prevToken;
    process.env.APP_BASE_URL = prevBase;
  });

  it("getReportToken prefers REPORT_TOKEN", () => {
    expect(getReportToken()).toBe("testtoken");
  });

  it("getAppBaseUrl strips trailing slash", () => {
    expect(getAppBaseUrl()).toBe("https://shop.example.com");
  });

  it("builds a month report URL with shop + token", () => {
    const intent: ReportSummaryIntent = { period: "month", month: "2026-06", shopId: "shop1" };
    const url = buildReportUrl("https://shop.example.com", intent);
    expect(url).toContain("/report.html?");
    expect(url).toContain("period=month");
    expect(url).toContain("month=2026-06");
    expect(url).toContain("shopId=shop1");
    expect(url).toContain("t=testtoken");
  });

  it("builds a year report URL without a shop", () => {
    const intent: ReportSummaryIntent = { period: "year", year: "2026" };
    const url = buildReportUrl("https://shop.example.com", intent);
    expect(url).toContain("period=year");
    expect(url).toContain("year=2026");
    expect(url).not.toContain("shopId");
  });

  it("describes the period in Buddhist year", () => {
    expect(describeReportPeriod({ period: "month", month: "2026-06" })).toBe("ประจำเดือน มิถุนายน 2569");
    expect(describeReportPeriod({ period: "year", year: "2026" })).toBe("ประจำปี 2569");
  });

  it("builds a LINE reply containing the period label and link", () => {
    const intent: ReportSummaryIntent = { period: "month", month: "2026-06", shopId: "shop2" };
    const url = buildReportUrl("https://shop.example.com", intent);
    const msg = buildReportLinkMessage(intent, url);
    expect(msg).toContain("ประจำเดือน มิถุนายน 2569");
    expect(msg).toContain("สายหนองปิง");
    expect(msg).toContain(url);
    expect(msg).toContain("ดาวน์โหลด PDF");
  });
});
