import type { FinancialRecord, PorkBreakdown } from "@/lib/types/financial.types";

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
  | { op: "removeExtraExpense"; name: string }
  | { op: "removeExtraIncome"; name: string }
  | { op: "clear"; field: "transfer" | "cash" | "delivery" };

const SET_FIELD = /^(?:แก้|เปลี่ยน|ตั้ง)\s+(โอน|สด|delivery|เดลิเวอรี่|วัตถุดิบ|อุปกรณ์|แก๊ส|ค่าแรง|น้ำแข็ง)\s+([\d,]+)\s*$/i;
const CLEAR_FIELD = /^ลบ\s+(โอน|สด|delivery|เดลิเวอรี่)\s*$/i;
const REMOVE_EXTRA = /^ลบ\s+(.+?)\s*$/i;
const PORK_QTY_PRICE = /^(?:แก้|เปลี่ยน|ตั้ง)\s+(หมูแดง|หมูเนื้อ|แดง|หมูสับ|สับ|มันหมู|หมูมัน|มัน)\s+([\d,]+)\s+([\d,]+)\s*$/i;
const PORK_PRICE = /^(?:แก้|เปลี่ยน|ตั้ง|ราคา)\s*(หมูแดง|หมูเนื้อ|แดง|หมูสับ|สับ|มันหมู|หมูมัน|มัน)\s*(?:ราคา\s*)?([\d,]+)\s*(?:บาท|\/กก)?\s*$/i;

const FIELD_MAP: Record<string, NumericRecordField> = {
  โอน: "transfer",
  สด: "cash",
  delivery: "delivery",
  เดลิเวอรี่: "delivery",
  วัตถุดิบ: "materials",
  อุปกรณ์: "supplies",
  แก๊ส: "gas",
  ค่าแรง: "labor",
  น้ำแข็ง: "ice",
};

function num(s: string): number {
  return parseInt(s.replace(/,/g, ""), 10) || 0;
}

function porkKind(kw: string): "red" | "minced" | "fat" | null {
  if (/แดง|หมูแดง|หมูเนื้อ/.test(kw)) return "red";
  if (/สับ|หมูสับ/.test(kw)) return "minced";
  if (/มัน|มันหมู|หมูมัน/.test(kw)) return "fat";
  return null;
}

export function looksLikeCorrectionHelp(text: string): boolean {
  const t = text.trim();
  return /^(?:ช่วย|วิธีแก้|help|คำสั่ง)(?:\s|$)/i.test(t);
}

export function looksLikeCorrection(text: string): boolean {
  return text.split(/\n/).some((raw) => {
    const line = raw.trim();
    if (!line) return false;
    return (
      /^(?:แก้|เปลี่ยน|ตั้ง|ลบ)\s+\S/.test(line) ||
      /^ราคา\s*(?:หมู|แดง|สับ|มัน)/i.test(line)
    );
  });
}

export function parseCorrectionMessage(text: string): CorrectionAction[] {
  const actions: CorrectionAction[] = [];
  for (const raw of text.split(/\n/)) {
    const line = raw.trim();
    if (!line) continue;

    let m = line.match(PORK_QTY_PRICE);
    if (m) {
      const pork = porkKind(m[1]);
      if (pork) actions.push({ op: "set", field: "porkQtyPrice", pork, qty: num(m[2]), price: num(m[3]) });
      continue;
    }

    m = line.match(PORK_PRICE);
    if (m) {
      const pork = porkKind(m[1]);
      const price = num(m[2]);
      if (pork && price > 0) actions.push({ op: "set", field: "porkPrice", pork, value: price });
      continue;
    }

    m = line.match(SET_FIELD);
    if (m) {
      const field = FIELD_MAP[m[1].toLowerCase()] ?? FIELD_MAP[m[1]];
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
      case "clear":
        out[action.field] = 0;
        break;
      case "removeExtraExpense":
        out.extraExpenses = out.extraExpenses.filter((e) => !fuzzyMatchName(e.name, action.name));
        break;
      case "removeExtraIncome":
        out.extraIncome = out.extraIncome.filter((e) => !fuzzyMatchName(e.name, action.name));
        break;
    }
  }
  return out;
}

export function buildCorrectionHelpMessage(): string {
  return [
    "📖 วิธีแก้ไขข้อมูลผ่าน LINE",
    "",
    "🔧 แก้ค่า:",
    "  แก้ โอน 3000",
    "  แก้ สด 1500",
    "  แก้ แดง 130        (ราคา/กก.)",
    "  แก้ แดง 4 130      (จำนวน + ราคา)",
    "",
    "🗑️ ลบรายการ:",
    "  ลบ แม็คโคร",
    "  ลบ คนละครึ่ง",
    "  ลบ โอน",
    "",
    "💡 ถ้าไม่ใส่ราคาหมู bot จะใช้ราคา/กก. จากวันก่อนหน้าในระบบอัตโนมัติ",
    "   จนกว่าจะระบุราคาใหม่ (แก้ แดง 130)",
  ].join("\n");
}
