import type { CorrectionAction } from "@/lib/services/financial-correction.service";

const PORK_LABELS: Record<"red" | "minced" | "fat", string> = {
  red: "หมูแดง",
  minced: "หมูสับ",
  fat: "มันหมู",
};

const FIELD_LABELS: Record<string, string> = {
  transfer: "โอน",
  cash: "สด",
  delivery: "Delivery",
  labor: "ค่าแรง",
  ice: "น้ำแข็ง",
  gas: "แก๊ส",
  materials: "วัตถุดิบ",
  supplies: "อุปกรณ์",
};

/**
 * Pre-process Thai shop shorthand before regex matching.
 * "ปรับหมูสับราคา 120" → "ปรับ หมูสับ ราคา 120"
 */
export function normalizeNaturalCommandLine(line: string): string {
  return line
    .replace(/^(ปรับ|แก้|เปลี่ยน|ตั้ง)(หมู|ค่า|แดง|สับ|มัน)/i, "$1 $2")
    .replace(/(หมู(?:แดง|สับ|มัน|เนื้อ)?)(ราคา)/gi, "$1 $2")
    .replace(/ราคา(\d)/g, "ราคา $1")
    .replace(/\s+/g, " ")
    .trim();
}

/** Human-readable summary of what the bot understood. */
export function buildCorrectionSummary(actions: CorrectionAction[]): string {
  if (!actions.length) return "❌ ไม่เข้าใจคำสั่ง — พิมพ์ \"ช่วย\" ดูวิธีใช้";

  const parts: string[] = [];
  for (const a of actions) {
    switch (a.op) {
      case "set":
        if (a.field === "porkPrice") {
          parts.push(`${PORK_LABELS[a.pork]} ฿${a.value}/กก.`);
        } else if (a.field === "porkQtyPrice") {
          parts.push(`${PORK_LABELS[a.pork]} ${a.qty}กก. × ฿${a.price}`);
        } else if (FIELD_LABELS[a.field]) {
          parts.push(`${FIELD_LABELS[a.field]} ฿${a.value.toLocaleString("th-TH")}`);
        }
        break;
      case "setExtraExpense":
        parts.push(`${a.name} ฿${a.amount.toLocaleString("th-TH")}`);
        break;
      case "clear":
        parts.push(`ลบ${FIELD_LABELS[a.field] ?? a.field}`);
        break;
      case "removeExtraExpense":
        parts.push(`ลบ ${a.name}`);
        break;
      case "removeExtraIncome":
        parts.push(`ลบรายรับ ${a.name}`);
        break;
    }
  }

  return `✏️ อัปเดตแล้ว: ${parts.join(" · ")}`;
}

/** Detect price-only pork updates (no qty yet). */
export function hasPorkPriceOnlyUpdate(actions: CorrectionAction[]): boolean {
  return actions.some(
    (a) => a.op === "set" && a.field === "porkPrice"
  );
}

export function buildPorkPriceSavedHint(): string {
  return "📌 บันทึกราคา/กก. แล้ว — พิมพ์ \"แดง4 สับ4\" ได้เลย (ไม่ต้องใส่ราคาซ้ำ)";
}
