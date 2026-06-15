import type { ExtraExpense } from "@/lib/types/financial.types";

/** Recurring extra expenses stored in extraExpenses[] (no DB migration). */
export const RECURRING_EXTRA_CATEGORIES = {
  rent: { canonical: "ค่าเช่า", aliases: ["ค่าเช่า", "เช่า", "ค่าเช่าร้าน"] },
  water: { canonical: "ค่าน้ำ", aliases: ["ค่าน้ำ", "น้ำประปา", "ค่าน้ำประปา"] },
  electricity: {
    canonical: "ค่าไฟฟ้า",
    aliases: ["ค่าไฟฟ้า", "ค่าไฟ", "ไฟฟ้า", "ไฟ"],
  },
} as const;

export type RecurringExtraCategory = keyof typeof RECURRING_EXTRA_CATEGORIES;

export function recurringCategoryOf(name: string): RecurringExtraCategory | null {
  const n = name.trim().toLowerCase();
  for (const [key, cfg] of Object.entries(RECURRING_EXTRA_CATEGORIES) as [
    RecurringExtraCategory,
    (typeof RECURRING_EXTRA_CATEGORIES)[RecurringExtraCategory],
  ][]) {
    if (cfg.aliases.some((a) => n === a.toLowerCase() || n.includes(a.toLowerCase()))) {
      return key;
    }
  }
  return null;
}

export function normalizeRecurringExtraName(name: string): string {
  const cat = recurringCategoryOf(name);
  return cat ? RECURRING_EXTRA_CATEGORIES[cat].canonical : name.trim();
}

export function extraExpensesHasCategory(
  items: ExtraExpense[],
  category: RecurringExtraCategory
): boolean {
  return items.some((e) => recurringCategoryOf(e.name) === category);
}

/** Pick expense: incoming → same-day existing → carried from prior day → hard default. */
export function pickCarriedExpense(
  incoming: number | undefined,
  existing: number,
  carried: number,
  fallbackDefault: number
): { value: number; fromCarry: boolean } {
  if (incoming !== undefined && incoming > 0) return { value: incoming, fromCarry: false };
  if (existing > 0) return { value: existing, fromCarry: false };
  if (carried > 0) return { value: carried, fromCarry: true };
  return { value: fallbackDefault, fromCarry: false };
}

/** Add missing recurring extras (เช่า/น้ำ/ไฟ) from prior records. */
export function applyCarriedRecurringExtras(
  current: ExtraExpense[],
  carried: ExtraExpense[]
): { extras: ExtraExpense[]; carriedNames: string[] } {
  const merged = [...current];
  const carriedNames: string[] = [];

  for (const item of carried) {
    const cat = recurringCategoryOf(item.name);
    if (!cat) continue;
    if (extraExpensesHasCategory(merged, cat)) continue;
    const canonical = RECURRING_EXTRA_CATEGORIES[cat].canonical;
    merged.push({ name: canonical, amount: item.amount });
    carriedNames.push(canonical);
  }
  return { extras: merged, carriedNames };
}

/** Lines like "ค่าเช่า 5000", "ค่าไฟ 1200" (no จ่าย prefix). */
const RECURRING_LINE =
  /^(ค่า(?:เช่า|น้ำ(?:ประปา)?|ไฟ(?:ฟ้า)?)|เช่า|น้ำประปา|ไฟฟ้า|ไฟ)\s*([\d,]+)\s*$/i;

export function extractRecurringExpenses(text: string): ExtraExpense[] {
  const out: ExtraExpense[] = [];
  for (const raw of text.split(/\n/)) {
    const line = raw.trim();
    const m = line.match(RECURRING_LINE);
    if (!m) continue;
    const amount = parseInt(m[2].replace(/,/g, ""), 10) || 0;
    if (amount <= 0) continue;
    out.push({ name: normalizeRecurringExtraName(m[1]), amount });
  }
  return out;
}

export interface CarriedStandardExpenses {
  labor: number;
  ice: number;
  gas: number;
  laborFrom?: string;
  iceFrom?: string;
  gasFrom?: string;
  recurringExtras: ExtraExpense[];
  recurringFrom?: string;
}

/** Scan prior records for labor/ice/gas columns + recurring extras. */
export function scanCarriedStandardExpenses(
  rows: { date: string; labor?: number; ice?: number; gas?: number; extra_expenses?: ExtraExpense[] }[]
): CarriedStandardExpenses {
  let labor = 0;
  let ice = 0;
  let gas = 0;
  let laborFrom: string | undefined;
  let iceFrom: string | undefined;
  let gasFrom: string | undefined;
  const recurringFound: Partial<Record<RecurringExtraCategory, ExtraExpense>> = {};
  let recurringFrom: string | undefined;

  for (const row of rows) {
    if (!labor && Number(row.labor ?? 0) > 0) {
      labor = Number(row.labor);
      laborFrom = row.date;
    }
    if (!ice && Number(row.ice ?? 0) > 0) {
      ice = Number(row.ice);
      iceFrom = row.date;
    }
    if (!gas && Number(row.gas ?? 0) > 0) {
      gas = Number(row.gas);
      gasFrom = row.date;
    }

    for (const e of (row.extra_expenses as ExtraExpense[] | undefined) ?? []) {
      const cat = recurringCategoryOf(e.name);
      if (!cat || recurringFound[cat] || e.amount <= 0) continue;
      recurringFound[cat] = {
        name: RECURRING_EXTRA_CATEGORIES[cat].canonical,
        amount: e.amount,
      };
      recurringFrom ??= row.date;
    }

    const allRecurring = Object.keys(RECURRING_EXTRA_CATEGORIES).length;
    if (labor && ice && gas && Object.keys(recurringFound).length >= allRecurring) break;
  }

  return {
    labor,
    ice,
    gas,
    laborFrom,
    iceFrom,
    gasFrom,
    recurringExtras: Object.values(recurringFound),
    recurringFrom,
  };
}

export interface CarriedDefaultsNotice {
  porkFrom?: string[];
  standardFrom?: string[];
  recurringCarried?: string[];
}

export function buildCarriedDefaultsNotice(meta: CarriedDefaultsNotice): string | undefined {
  const parts: string[] = [];
  if (meta.porkFrom?.length) {
    parts.push(`ราคาหมู/กก. จาก ${[...new Set(meta.porkFrom)].join(", ")}`);
  }
  if (meta.standardFrom?.length) {
    parts.push(`ค่าแรง/น้ำแข็ง/แก๊ส จาก ${[...new Set(meta.standardFrom)].join(", ")}`);
  }
  if (meta.recurringCarried?.length) {
    parts.push(`${meta.recurringCarried.join(", ")} จากวันก่อน`);
  }
  if (!parts.length) return undefined;
  return `\n📌 ใช้ค่าประจำจากข้อมูลก่อนหน้า: ${parts.join(" · ")}\n   (พิมพ์ "แก้ ค่าแรง 850" หรือ "แก้ ค่าเช่า 5000" เพื่อเปลี่ยน)`;
}
