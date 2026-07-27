import type { QuickReplyItem } from "@/lib/types/line.types";

export function getDefaultQuickReplies(): QuickReplyItem[] {
  return [
    {
      type: "action",
      action: {
        type: "message",
        label: "📊 สรุปวันนี้",
        text: "สรุป",
      },
    },
    {
      type: "action",
      action: {
        type: "message",
        label: "🏪 ตลาดญี่ปุ่น",
        text: "สรุป ตลาดญี่ปุ่น",
      },
    },
    {
      type: "action",
      action: {
        type: "message",
        label: "🏪 สายหนองปิง",
        text: "สรุป สายหนองปิง",
      },
    },
    {
      type: "action",
      action: {
        type: "message",
        label: "🥩 เช็คหมู",
        text: "สรุปหมู",
      },
    },
    {
      type: "action",
      action: {
        type: "message",
        label: "📄 รายงาน PDF",
        text: "รายงานเดือนนี้",
      },
    },
    {
      type: "action",
      action: {
        type: "message",
        label: "❓ ช่วยเหลือ",
        text: "ช่วย",
      },
    },
  ];
}

export function buildQuickReplyPayload(items?: QuickReplyItem[]) {
  const replyItems = items && items.length > 0 ? items : getDefaultQuickReplies();
  return {
    items: replyItems.slice(0, 13), // LINE allows max 13 items
  };
}
