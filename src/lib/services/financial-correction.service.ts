import type { FinancialRecord, PorkBreakdown } from "@/lib/types/financial.types";
import { recurringCategoryOf } from "@/lib/services/recurring-expenses.service";
import {
  CORRECTION_PREFIX,
  hasPorkRemovalMarker,
  PORK_REMOVE,
  porkKindFromKeyword,
  stripShopPrefix,
} from "@/lib/thai/lexicon";
import { normalizeCommandText, normalizeNaturalCommandLine } from "@/lib/thai/normalizer";
import { routeLineMessage } from "@/lib/services/thai-intent-router.service";

export { normalizeCommandText };

const SET_FIELD = new RegExp(
  `^${CORRECTION_PREFIX}\\s*(โอน|สด|delivery|เดลิเวอรี่|วัตถุดิบ|อุปกรณ์|(?:ค่า)?แก๊ส|ค่าแรง|(?:ค่า)?น้ำแข็ง|ค่าเช่า|เช่า|ค่าน้ำ|น้ำประปา|ค่าไฟฟ้า|ค่าไฟ|ไฟฟ้า)\\s*([\\d,]+)\\s*$`,
  "i"
);
const CLEAR_FIELD = /^ลบ\s+(โอน|สด|delivery|เดลิเวอรี่)\s*$/i;
const REMOVE_EXTRA = /^ลบ\s+(.+?)\s*$/i;
const PORK_QTY_PRICE = new RegExp(
  `^${CORRECTION_PREFIX}\\s*(หมูแดง|หมูเนื้อ|แดง|หมูสับ|สับ|มันหมู|หมูมัน|มัน)\\s+([\\d,]+)\\s+([\\d,]+)\\s*$`,
  "i"
);
const PORK_PRICE = new RegExp(
  `^(?:${CORRECTION_PREFIX}|ราคา)\\s*(หมูแดง|หมูเนื้อ|แดง|หมูสับ|สับ|มันหมู|หมูมัน|มัน)\\s*(?:ราคา\\s*)?([\\d,]+)\\s*(?:บาท|/กก)?\\s*$`,
  "i"
);
const PORK_PRICE_GLUED = new RegExp(
  `^${CORRECTION_PREFIX}\\s*(หมูแดง|หมูเนื้อ|แดง|หมูสับ|สับ|มันหมู|หมูมัน|มัน)\\s*ราคา\\s*([\\d,]+)\\s*$`,
  "i"
);
const LABOR_SHORTHAND = /^ค่า\s+([\d,]+)\s*$/i;
const LABOR_LINE = new RegExp(
  `^(?:${CORRECTION_PREFIX})?\\s*ค่าแรง\\s*([\\d,]+)\\s*$`,
  "i"
);

export type NumericRecordField =
  | "transfer"
  | "cash"
  | "delivery"
  | "materials"
  | "supplies"
  | "gas"
  | "labor"
  | "ice";

export type CorrectionAction =
  | { op: "set"; field: NumericRecordField; value: number }
  | { op: "set"; field: "porkPrice"; pork: "red" | "minced" | "fat"; value: number }
  | { op: "set"; field: "porkQtyPrice"; pork: "red" | "minced" | "fat"; qty: number; price: number }
  | { op: "adjustPorkQty"; pork: "red" | "minced" | "fat"; delta: number }
  | { op: "setExtraExpense"; name: string; amount: number }
  | { op: "removeExtraExpense"; name: string }
  | { op: "removeExtraIncome"; name: string }
  | { op: "clear"; field: "transfer" | "cash" | "delivery" };

const FIELD_MAP: Record<string, NumericRecordField> = {
  โอน: "transfer",
  สด: "cash",
  delivery: "delivery",
  เดลิเวอรี่: "delivery",
  วัตถุดิบ: "materials",
  อุปกรณ์: "supplies",
  แก๊ส: "gas",
  ค่าแก๊ส: "gas",
  ค่าแรง: "labor",
  น้ำแข็ง: "ice",
  ค่าน้ำแข็ง: "ice",
};

const RECURRING_SET_MAP: Record<string, string> = {
  ค่าเช่า: "ค่าเช่า",
  เช่า: "ค่าเช่า",
  ค่าน้ำ: "ค่าน้ำ",
  น้ำประปา: "ค่าน้ำ",
  ค่าไฟฟ้า: "ค่าไฟฟ้า",
  ค่าไฟ: "ค่าไฟฟ้า",
  ไฟฟ้า: "ค่าไฟฟ้า",
  ไฟ: "ค่าไฟฟ้า",
};

function num(s: string): number {
  return parseInt(s.replace(/,/g, ""), 10) || 0;
}

export function looksLikePorkRemoval(text: string): boolean {
  return hasPorkRemovalMarker(text) || hasPorkRemovalMarker(normalizeCommandText(text));
}

export function looksLikeCorrectionHelp(text: string): boolean {
  return routeLineMessage(text).kind === "HELP";
}

export function looksLikeCorrection(text: string): boolean {
  return routeLineMessage(text).kind === "CORRECTION";
}

export function parseCorrectionMessage(text: string): CorrectionAction[] {
  const actions: CorrectionAction[] = [];
  const normalized = normalizeCommandText(text);
  const lines = (normalized || text)
    .split(/\n/)
    .map((l) => stripShopPrefix(l.trim()))
    .filter(Boolean);

  for (const rawLine of lines) {
    const line = normalizeNaturalCommandLine(stripShopPrefix(rawLine));

    let m = line.match(PORK_REMOVE);
    if (m) {
      const pork = porkKindFromKeyword(m[1]);
      const qty = num(m[2]);
      if (pork && qty > 0) {
        actions.push({ op: "adjustPorkQty", pork, delta: -qty });
      }
      continue;
    }

    m = line.match(PORK_QTY_PRICE);
    if (m) {
      const pork = porkKindFromKeyword(m[1]);
      if (pork) actions.push({ op: "set", field: "porkQtyPrice", pork, qty: num(m[2]), price: num(m[3]) });
      continue;
    }

    m = line.match(PORK_PRICE) ?? line.match(PORK_PRICE_GLUED);
    if (m) {
      const pork = porkKindFromKeyword(m[1]);
      const price = num(m[2]);
      if (pork && price > 0) actions.push({ op: "set", field: "porkPrice", pork, value: price });
      continue;
    }

    m = line.match(LABOR_SHORTHAND) ?? line.match(LABOR_LINE);
    if (m) {
      actions.push({ op: "set", field: "labor", value: num(m[1]) });
      continue;
    }

    m = line.match(SET_FIELD);
    if (m) {
      const key = m[1];
      const recurringName = RECURRING_SET_MAP[key] ?? RECURRING_SET_MAP[key.toLowerCase()];
      if (recurringName) {
        actions.push({ op: "setExtraExpense", name: recurringName, amount: num(m[2]) });
        continue;
      }
      const field = FIELD_MAP[key.toLowerCase()] ?? FIELD_MAP[key];
      if (field) actions.push({ op: "set", field, value: num(m[2]) });
      continue;
    }

    m = line.match(CLEAR_FIELD);
    if (m) {
      const key = m[1].toLowerCase();
      const field = FIELD_MAP[key] ?? FIELD_MAP[m[1]];
      if (field === "transfer" || field === "cash" || field === "delivery") {
        actions.push({ op: "clear", field });
      }
      continue;
    }

    m = line.match(REMOVE_EXTRA);
    if (m) {
      const target = m[1].trim();
      const fieldKey = FIELD_MAP[target.toLowerCase()] ?? FIELD_MAP[target];
      if (fieldKey === "transfer" || fieldKey === "cash" || fieldKey === "delivery") {
        actions.push({ op: "clear", field: fieldKey });
        continue;
      }
      // Income-like names → remove from extraIncome; otherwise expense
      if (/คนละครึ่ง|ไลน์\s*แมน|lineman|รายรับ|รายได้|^\+/.test(target)) {
        actions.push({ op: "removeExtraIncome", name: target });
      } else {
        actions.push({ op: "removeExtraExpense", name: target });
      }
    }
  }
  return actions;
}

function fuzzyMatchName(stored: string, query: string): boolean {
  const s = stored.trim().toLowerCase();
  const q = query.trim().toLowerCase();
  if (!q) return false;
  return s === q || s.includes(q) || q.includes(s);
}

function emptyPorkBreakdown(): PorkBreakdown {
  return {
    redQty: 0, redPrice: 0, redTotal: 0,
    mincedQty: 0, mincedPrice: 0, mincedTotal: 0,
    fatQty: 0, fatPrice: 0, fatTotal: 0,
    total: 0,
  };
}

/** Apply parsed correction actions onto a record copy (mutates fields). */
export function applyCorrectionActions(
  record: FinancialRecord,
  actions: CorrectionAction[]
): FinancialRecord {
  const out = { ...record };
  out.porkBreakdown = { ...(record.porkBreakdown ?? emptyPorkBreakdown()) };
  out.extraExpenses = [...(record.extraExpenses ?? [])];
  out.extraIncome = [...(record.extraIncome ?? [])];

  for (const action of actions) {
    switch (action.op) {
      case "set":
        if (action.field === "porkPrice") {
          if (action.pork === "red") out.porkBreakdown!.redPrice = action.value;
          if (action.pork === "minced") out.porkBreakdown!.mincedPrice = action.value;
          if (action.pork === "fat") out.porkBreakdown!.fatPrice = action.value;
        } else if (action.field === "porkQtyPrice") {
          if (action.pork === "red") {
            out.porkBreakdown!.redQty = action.qty;
            out.porkBreakdown!.redPrice = action.price;
          }
          if (action.pork === "minced") {
            out.porkBreakdown!.mincedQty = action.qty;
            out.porkBreakdown!.mincedPrice = action.price;
          }
          if (action.pork === "fat") {
            out.porkBreakdown!.fatQty = action.qty;
            out.porkBreakdown!.fatPrice = action.price;
          }
        } else if (
          action.field === "transfer" ||
          action.field === "cash" ||
          action.field === "delivery" ||
          action.field === "materials" ||
          action.field === "supplies" ||
          action.field === "gas" ||
          action.field === "labor" ||
          action.field === "ice"
        ) {
          out[action.field] = action.value;
        }
        break;
      case "setExtraExpense": {
        const cat = recurringCategoryOf(action.name);
        out.extraExpenses = out.extraExpenses.filter(
          (e) => !cat || recurringCategoryOf(e.name) !== cat
        );
        out.extraExpenses.push({ name: action.name, amount: action.amount });
        break;
      }
      case "clear":
        out[action.field] = 0;
        break;
      case "removeExtraExpense":
        out.extraExpenses = out.extraExpenses.filter((e) => !fuzzyMatchName(e.name, action.name));
        break;
      case "removeExtraIncome":
        out.extraIncome = out.extraIncome.filter((e) => !fuzzyMatchName(e.name, action.name));
        break;
      case "adjustPorkQty": {
        const pb = out.porkBreakdown!;
        const applyDelta = (getQty: () => number, setQty: (n: number) => void) => {
          setQty(Math.max(0, getQty() + action.delta));
        };
        if (action.pork === "red") applyDelta(() => pb.redQty, (n) => { pb.redQty = n; });
        if (action.pork === "minced") applyDelta(() => pb.mincedQty, (n) => { pb.mincedQty = n; });
        if (action.pork === "fat") applyDelta(() => pb.fatQty, (n) => { pb.fatQty = n; });
        break;
      }
    }
  }
  return out;
}

export function buildCorrectionHelpMessage(): string {
  return [
    "📖 วิธีแก้ไขข้อมูลผ่าน LINE",
    "",
    "🔧 แก้/ปรับค่า (ใส่ชื่อสาขานำหน้าได้ เช่น ญี่ปุ่น ...):",
    "  แก้ โอน 3000",
    "  ปรับค่าแรง 850",
    "  ค่า 850            (ย่อ = ค่าแรง)",
    "  แก้ ค่าเช่า 5000",
    "  แก้ ค่าไฟฟ้า 1200",
    "  ปรับหมูสับราคา 120",
    "  ปรับหมูแดง ราคา 130",
    "  เอาหมูแดง ออก 1 กก   (ลดจำนวนหมู)",
    "",
    "🗑️ ลบรายการ:",
    "  ลบ แม็คโคร",
    "  ลบ โอน",
    "",
    "📋 ดูยอด / สรุป:",
    "  สรุป / ดูยอด / เช็คยอด",
    "  สรุปทุกสาขา / ทุกสาขา",
    "  สรุปหนองปิง / สรุปญี่ปุ่น",
    "  หนองปิงด้วย / ญี่ปุ่นด้วย",
    "  ดูหนองปิง / ดูยอดญี่ปุ่น",
    "  สรุปพรุ่งนี้",
    "",
    "💡 ค่าประจำ (แรง/น้ำแข็ง/เช่า/น้ำ/ไฟ/ราคาหมู) ดึงจากวันก่อนอัตโนมัติ",
  ].join("\n");
}

export function buildUnrecognizedFinancialHint(): string {
  return [
    "❓ ไม่เข้าใจข้อความนี้",
    "",
    "ลองพิมพ์แบบนี้:",
    "  ปรับค่าแรง 850",
    "  ค่า 850",
    "  โอน 3385 สด 1000",
    "",
    "💬 พิมพ์ \"ช่วย\" ดูคำสั่งทั้งหมด",
  ].join("\n");
}
