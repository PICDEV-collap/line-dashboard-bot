import { NextRequest, NextResponse } from "next/server";
import { validateDashboardApiKey } from "@/lib/middleware/signature-validator";
import { createLogger } from "@/lib/middleware/logger";
import {
  bulkImportRecords,
  initializeFinancialSheets,
} from "@/lib/services/financial-sheets.service";
import { errorToApiResponse, getStatusCode, toApiResponse } from "@/lib/utils/error-handler";
import { ENV } from "@/config/constants";
import type { FinancialRecord } from "@/lib/types/financial.types";

export const runtime = "nodejs";
export const maxDuration = 60;

const logger = createLogger("SeedRoute");

// ──────────────────────────────────────────────────────────────
// Seed data — 31 records จาก HTML Dashboard (มีนาคม 2569)
// ──────────────────────────────────────────────────────────────
const SEED_DATA = [
  {date:'2026-03-01',revenue:11061,expense:4100,profit:6961,pork:1200,materials:1180,supplies:0,gas:150,labor:1500,ice:70,transfer:6665,cash:3500,delivery:896},
  {date:'2026-03-02',revenue:6287,expense:6186,profit:101,pork:680,materials:2060,supplies:1726,gas:150,labor:1500,ice:70,transfer:2550,cash:3200,delivery:537},
  {date:'2026-03-03',revenue:5583,expense:3667,profit:1916,pork:540,materials:1247,supplies:460,gas:150,labor:1200,ice:70,transfer:2600,cash:2600,delivery:383},
  {date:'2026-03-04',revenue:5413,expense:6425,profit:-1012,pork:1060,materials:880,supplies:2800,gas:150,labor:1500,ice:35,transfer:2240,cash:3000,delivery:173},
  {date:'2026-03-05',revenue:1920,expense:5699,profit:-3779,pork:1200,materials:1285,supplies:1529,gas:150,labor:1500,ice:35,transfer:1920,cash:0,delivery:0},
  {date:'2026-03-06',revenue:6090,expense:4267,profit:1823,pork:1190,materials:932,supplies:460,gas:150,labor:1500,ice:35,transfer:2930,cash:2600,delivery:560},
  {date:'2026-03-07',revenue:6806,expense:4005,profit:2801,pork:820,materials:1500,supplies:0,gas:150,labor:1500,ice:35,transfer:4130,cash:2100,delivery:576},
  {date:'2026-03-08',revenue:12176,expense:4890,profit:7286,pork:1470,materials:1735,supplies:0,gas:150,labor:1500,ice:35,transfer:5055,cash:6000,delivery:1121},
  {date:'2026-03-09',revenue:6047,expense:4305,profit:1742,pork:680,materials:1940,supplies:0,gas:150,labor:1500,ice:35,transfer:2190,cash:3000,delivery:857},
  {date:'2026-03-10',revenue:4590,expense:6983,profit:-2393,pork:1330,materials:977,supplies:3291,gas:150,labor:1200,ice:35,transfer:990,cash:3000,delivery:600},
  {date:'2026-03-11',revenue:5855,expense:3945,profit:1910,pork:680,materials:1280,supplies:300,gas:150,labor:1500,ice:35,transfer:2370,cash:3000,delivery:485},
  {date:'2026-03-12',revenue:4580,expense:4609,profit:-29,pork:1330,materials:1214,supplies:380,gas:150,labor:1500,ice:35,transfer:1575,cash:2500,delivery:505},
  {date:'2026-03-13',revenue:4572,expense:3735,profit:837,pork:950,materials:1100,supplies:0,gas:150,labor:1500,ice:35,transfer:2505,cash:1400,delivery:667},
  {date:'2026-03-14',revenue:9827,expense:4725,profit:5102,pork:2140,materials:1200,supplies:0,gas:150,labor:1200,ice:35,transfer:4000,cash:4300,delivery:1527},
  {date:'2026-03-15',revenue:10730,expense:4711,profit:6019,pork:1760,materials:1566,supplies:0,gas:150,labor:1200,ice:35,transfer:4185,cash:5400,delivery:1145},
  {date:'2026-03-16',revenue:5216,expense:7132,profit:-1916,pork:1870,materials:1077,supplies:2500,gas:150,labor:1500,ice:35,transfer:2470,cash:2300,delivery:446},
  {date:'2026-03-17',revenue:6402,expense:3626,profit:2776,pork:1090,materials:851,supplies:0,gas:150,labor:1500,ice:35,transfer:4180,cash:1800,delivery:422},
  {date:'2026-03-18',revenue:5976,expense:4975,profit:1001,pork:1470,materials:1250,supplies:570,gas:150,labor:1500,ice:35,transfer:2235,cash:3200,delivery:541},
  {date:'2026-03-19',revenue:5002,expense:3945,profit:1057,pork:1090,materials:1170,supplies:0,gas:150,labor:1500,ice:35,transfer:2915,cash:1700,delivery:387},
  {date:'2026-03-20',revenue:5684,expense:6726,profit:-1042,pork:1470,materials:900,supplies:2671,gas:150,labor:1500,ice:35,transfer:2805,cash:2500,delivery:379},
  {date:'2026-03-21',revenue:8631,expense:6255,profit:2376,pork:950,materials:1120,supplies:2500,gas:150,labor:1500,ice:35,transfer:3515,cash:3300,delivery:1816},
  {date:'2026-03-22',revenue:10122,expense:4975,profit:5147,pork:1470,materials:1200,supplies:620,gas:150,labor:1500,ice:35,transfer:4105,cash:5000,delivery:1017},
  {date:'2026-03-23',revenue:5012,expense:7006,profit:-1994,pork:950,materials:1320,supplies:3051,gas:150,labor:1500,ice:35,transfer:2270,cash:2300,delivery:442},
  {date:'2026-03-24',revenue:4971,expense:5345,profit:-374,pork:1470,materials:1200,supplies:990,gas:150,labor:1500,ice:35,transfer:3570,cash:1200,delivery:201},
  {date:'2026-03-25',revenue:4640,expense:4055,profit:585,pork:950,materials:960,supplies:460,gas:150,labor:1500,ice:35,transfer:1970,cash:2000,delivery:670},
  {date:'2026-03-26',revenue:6369,expense:4625,profit:1744,pork:1470,materials:970,supplies:500,gas:150,labor:1500,ice:35,transfer:3515,cash:2000,delivery:854},
  {date:'2026-03-27',revenue:5491,expense:3935,profit:1556,pork:820,materials:1130,supplies:300,gas:150,labor:1500,ice:35,transfer:2330,cash:2500,delivery:661},
  {date:'2026-03-28',revenue:8797,expense:5794,profit:3003,pork:1360,materials:900,supplies:1849,gas:150,labor:1500,ice:35,transfer:4370,cash:3500,delivery:927},
  {date:'2026-03-29',revenue:4462,expense:5965,profit:-1503,pork:680,materials:920,supplies:2680,gas:150,labor:1500,ice:35,transfer:835,cash:3300,delivery:327},
  {date:'2026-03-30',revenue:4766,expense:3720,profit:1046,pork:1060,materials:975,supplies:0,gas:150,labor:1500,ice:35,transfer:2100,cash:1900,delivery:766},
  {date:'2026-03-31',revenue:7005,expense:5408,profit:1597,pork:680,materials:1174,supplies:1869,gas:150,labor:1500,ice:35,transfer:5670,cash:0,delivery:1335},
];

/**
 * POST /api/seed
 * Imports the 31 historical records from the HTML Dashboard into Google Sheets.
 * Protected by Dashboard API Key.
 * Idempotent — skips records where the same shopId+date already exists.
 */
export async function POST(request: NextRequest): Promise<NextResponse> {
  try {
    validateDashboardApiKey(request.headers.get("authorization"));
  } catch (error) {
    return NextResponse.json(errorToApiResponse(error), {
      status: getStatusCode(error),
    });
  }

  logger.info("Seed import started", { recordCount: SEED_DATA.length });

  try {
    await initializeFinancialSheets();

    const shopId = ENV.DEFAULT_SHOP_ID();
    const shopName = ENV.DEFAULT_SHOP_NAME();

    const records = SEED_DATA.map(
      (d): Omit<FinancialRecord, "id" | "createdAt" | "updatedAt" | "marginPct" | "incomplete"> => ({
        date: d.date,
        shopId,
        shopName,
        revenue: d.revenue,
        transfer: d.transfer,
        cash: d.cash,
        delivery: d.delivery,
        expense: d.expense,
        pork: d.pork,
        materials: d.materials,
        supplies: d.supplies,
        gas: d.gas,
        labor: d.labor,
        ice: d.ice,
        extraExpenses: [],
        profit: d.profit,
        note: "",
        status: "complete",
      })
    );

    const result = await bulkImportRecords(records);

    logger.info("Seed import complete", result);

    return NextResponse.json(
      toApiResponse({
        message: result.imported > 0
          ? `✅ นำเข้า ${result.imported} รายการ (ข้าม ${result.skipped} รายการที่มีอยู่แล้ว)`
          : `⚠️ ข้ามทั้งหมด ${result.skipped} รายการ (มีข้อมูลอยู่แล้ว)`,
        ...result,
      }),
      { status: result.imported > 0 ? 201 : 200 }
    );
  } catch (error) {
    logger.error("Seed import failed", error);
    return NextResponse.json(errorToApiResponse(error), {
      status: getStatusCode(error),
    });
  }
}

// GET — ดูจำนวน seed records ที่จะ import
export async function GET(request: NextRequest): Promise<NextResponse> {
  try {
    validateDashboardApiKey(request.headers.get("authorization"));
  } catch (error) {
    return NextResponse.json(errorToApiResponse(error), {
      status: getStatusCode(error),
    });
  }

  return NextResponse.json(
    toApiResponse({
      seedRecords: SEED_DATA.length,
      dateRange: { from: SEED_DATA[0].date, to: SEED_DATA[SEED_DATA.length - 1].date },
      shopId: ENV.DEFAULT_SHOP_ID(),
      shopName: ENV.DEFAULT_SHOP_NAME(),
      instructions: "POST to this endpoint with Authorization header to import",
    })
  );
}
