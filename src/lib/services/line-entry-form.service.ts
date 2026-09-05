import { formatDateThai, getTodayDateString, shiftDateString } from "@/lib/utils/helpers";

export function buildDataEntryFlexCard(baseUrl: string = "") {
  const entryUrl = baseUrl ? `${baseUrl}/entry` : "/entry";

  return {
    type: "flex" as const,
    altText: "📝 ตารางบันทึกรายรับ - รายจ่าย",
    contents: {
      type: "bubble",
      size: "mega",
      header: {
        type: "box",
        layout: "vertical",
        backgroundColor: "#1DB446",
        paddingAll: "16px",
        contents: [
          {
            type: "text",
            text: "📝 ตารางบันทึกรายรับ - รายจ่าย",
            weight: "bold",
            color: "#FFFFFF",
            size: "lg",
          },
          {
            type: "text",
            text: "เลือกลงยอดรายวัน ร้านครูตอม",
            color: "#E2F9E8",
            size: "xs",
            margin: "xs",
          },
        ],
      },
      body: {
        type: "box",
        layout: "vertical",
        spacing: "md",
        paddingAll: "16px",
        contents: [
          {
            type: "box",
            layout: "vertical",
            backgroundColor: "#F0FFF4",
            cornerRadius: "lg",
            paddingAll: "16px",
            borderColor: "#A7F3D0",
            borderWidth: "1px",
            contents: [
              {
                type: "text",
                text: "✨ กรอกผ่านตารางบนมือถือ",
                weight: "bold",
                size: "sm",
                color: "#065F46",
              },
              {
                type: "text",
                text: "กรอกง่ายสำหรับสาขา ตลาดญี่ปุ่น และ สายหนองปิง คำนวณกำไรอัตโนมัติ บันทึกในคลิกเดียว",
                size: "xs",
                color: "#059669",
                margin: "xs",
                wrap: true,
              },
              {
                type: "box",
                layout: "vertical",
                backgroundColor: "#10B981",
                cornerRadius: "md",
                paddingAll: "12px",
                margin: "lg",
                alignItems: "center",
                justifyContent: "center",
                action: {
                  type: "uri",
                  label: "เปิดตารางกรอกยอด",
                  uri: entryUrl.startsWith("http") ? entryUrl : `https://${entryUrl}`,
                },
                contents: [
                  {
                    type: "text",
                    text: "📲 เปิดตารางกรอกยอดบนมือถือ",
                    weight: "bold",
                    size: "md",
                    color: "#FFFFFF",
                    align: "center",
                  },
                ],
              },
            ],
          },
          {
            type: "box",
            layout: "vertical",
            spacing: "xs",
            margin: "sm",
            contents: [
              {
                type: "text",
                text: "📋 รูปแบบข้อความที่รองรับ:",
                weight: "bold",
                size: "xxs",
                color: "#718096",
              },
              {
                type: "text",
                text: "• รายรับ: โอน 5000 สด 3000 delivery 800",
                size: "xxs",
                color: "#A0AEC0",
              },
              {
                type: "text",
                text: "• หมู: แดง4 สับ3 มัน2 (หรือกิโลกรัม)",
                size: "xxs",
                color: "#A0AEC0",
              },
              {
                type: "text",
                text: "• รายจ่าย: จ่ายแม็คโคร 1500 ค่าแรง 1200 แก๊ส 150",
                size: "xxs",
                color: "#A0AEC0",
              },
            ],
          },
        ],
      },
    },
  };
}

export function buildMainMenuFlexCard(baseUrl: string = "") {
  const entryUrl = baseUrl ? `${baseUrl}/entry` : "/entry";

  return {
    type: "flex" as const,
    altText: "📌 เมนูหลัก ร้านครูตอม",
    contents: {
      type: "bubble",
      size: "mega",
      header: {
        type: "box",
        layout: "vertical",
        backgroundColor: "#1E293B",
        paddingAll: "16px",
        contents: [
          {
            type: "text",
            text: "📌 เมนูหลัก ร้านครูตอม",
            weight: "bold",
            color: "#FFFFFF",
            size: "lg",
          },
          {
            type: "text",
            text: "แตะปุ่มเพื่อสั่งงานบอทได้ทันที",
            color: "#94A3B8",
            size: "xs",
            margin: "xs",
          },
        ],
      },
      body: {
        type: "box",
        layout: "vertical",
        spacing: "md",
        paddingAll: "16px",
        contents: [
          // Row 1: กรอกยอด & สรุปวันนี้
          {
            type: "box",
            layout: "horizontal",
            spacing: "sm",
            contents: [
              {
                type: "box",
                layout: "vertical",
                backgroundColor: "#065F46",
                cornerRadius: "md",
                paddingAll: "10px",
                alignItems: "center",
                action: { type: "message", label: "กรอกข้อมูล", text: "กรอกข้อมูล" },
                contents: [
                  { type: "text", text: "📝 กรอกรายรับ-จ่าย", weight: "bold", size: "xs", color: "#FFFFFF", align: "center" },
                ],
              },
              {
                type: "box",
                layout: "vertical",
                backgroundColor: "#1E40AF",
                cornerRadius: "md",
                paddingAll: "10px",
                alignItems: "center",
                action: { type: "message", label: "สรุป", text: "สรุป" },
                contents: [
                  { type: "text", text: "📊 สรุปวันนี้", weight: "bold", size: "xs", color: "#FFFFFF", align: "center" },
                ],
              },
            ],
          },
          // Row 2: เช็คหมู & รายงาน PDF
          {
            type: "box",
            layout: "horizontal",
            spacing: "sm",
            contents: [
              {
                type: "box",
                layout: "vertical",
                backgroundColor: "#9A3412",
                cornerRadius: "md",
                paddingAll: "10px",
                alignItems: "center",
                action: { type: "message", label: "เช็คยอดหมู", text: "สรุปหมู" },
                contents: [
                  { type: "text", text: "🥩 เช็คยอดหมู", weight: "bold", size: "xs", color: "#FFFFFF", align: "center" },
                ],
              },
              {
                type: "box",
                layout: "vertical",
                backgroundColor: "#6B21A8",
                cornerRadius: "md",
                paddingAll: "10px",
                alignItems: "center",
                action: { type: "message", label: "รายงาน PDF", text: "รายงานเดือนนี้" },
                contents: [
                  { type: "text", text: "📄 รายงาน PDF", weight: "bold", size: "xs", color: "#FFFFFF", align: "center" },
                ],
              },
            ],
          },
          // Row 3: ตลาดญี่ปุ่น & สายหนองปิง
          {
            type: "box",
            layout: "horizontal",
            spacing: "sm",
            contents: [
              {
                type: "box",
                layout: "vertical",
                backgroundColor: "#0F766E",
                cornerRadius: "md",
                paddingAll: "10px",
                alignItems: "center",
                action: { type: "message", label: "ตลาดญี่ปุ่น", text: "สรุป ตลาดญี่ปุ่น" },
                contents: [
                  { type: "text", text: "🏪 ตลาดญี่ปุ่น", weight: "bold", size: "xs", color: "#FFFFFF", align: "center" },
                ],
              },
              {
                type: "box",
                layout: "vertical",
                backgroundColor: "#374151",
                cornerRadius: "md",
                paddingAll: "10px",
                alignItems: "center",
                action: { type: "message", label: "สายหนองปิง", text: "สรุป สายหนองปิง" },
                contents: [
                  { type: "text", text: "🏪 สายหนองปิง", weight: "bold", size: "xs", color: "#FFFFFF", align: "center" },
                ],
              },
            ],
          },
          // Row 4: Link to Mobile Entry Table
          {
            type: "box",
            layout: "vertical",
            backgroundColor: "#10B981",
            cornerRadius: "md",
            paddingAll: "10px",
            alignItems: "center",
            action: {
              type: "uri",
              label: "เปิดตารางกรอกยอด",
              uri: entryUrl.startsWith("http") ? entryUrl : `https://${entryUrl}`,
            },
            contents: [
              {
                type: "text",
                text: "📲 เปิดตารางกรอกยอดบนมือถือ",
                weight: "bold",
                size: "sm",
                color: "#FFFFFF",
                align: "center",
              },
            ],
          },
        ],
      },
    },
  };
}

/**
 * Interactive Flex Card to let user select a branch when requesting a summary.
 */
export function buildSummaryBranchSelectorCard(date: string = "") {
  return {
    type: "flex" as const,
    altText: "📊 เลือกดูสรุปยอดขายตามสาขา",
    contents: {
      type: "bubble",
      size: "mega",
      header: {
        type: "box",
        layout: "vertical",
        backgroundColor: "#1E3A8A",
        paddingAll: "16px",
        contents: [
          {
            type: "text",
            text: "📊 สรุปยอดขาย ร้านครูตอม",
            weight: "bold",
            color: "#FFFFFF",
            size: "lg",
          },
          {
            type: "text",
            text: date ? `ประจำวันที่ ${date} • เลือกสาขาที่ต้องการดู` : "เลือกสาขาที่ต้องการดูสรุปยอดขาย",
            color: "#BFDBFE",
            size: "xs",
            margin: "xs",
          },
        ],
      },
      body: {
        type: "box",
        layout: "vertical",
        spacing: "md",
        paddingAll: "16px",
        contents: [
          // Option 1: รวมทุกสาขา
          {
            type: "box",
            layout: "vertical",
            backgroundColor: "#EFF6FF",
            cornerRadius: "md",
            paddingAll: "12px",
            borderWidth: "1px",
            borderColor: "#BFDBFE",
            action: {
              type: "message",
              label: "รวมทุกสาขา",
              text: date ? `สรุป ทั้งหมด ${date}` : "สรุป ทั้งหมด",
            },
            contents: [
              {
                type: "text",
                text: "🌐 สรุป รวมทุกสาขา",
                weight: "bold",
                size: "sm",
                color: "#1E40AF",
              },
              {
                type: "text",
                text: "ดูภาพรวมยอดขาย กำไร และต้นทุนทุกสาขารวมกัน",
                size: "xxs",
                color: "#64748B",
                margin: "xs",
              },
            ],
          },
          // Option 2: สาขา ตลาดญี่ปุ่น
          {
            type: "box",
            layout: "vertical",
            backgroundColor: "#F0FDFA",
            cornerRadius: "md",
            paddingAll: "12px",
            borderWidth: "1px",
            borderColor: "#99F6E4",
            action: {
              type: "message",
              label: "ตลาดญี่ปุ่น",
              text: date ? `สรุป ตลาดญี่ปุ่น ${date}` : "สรุป ตลาดญี่ปุ่น",
            },
            contents: [
              {
                type: "text",
                text: "🏪 สาขา ตลาดญี่ปุ่น",
                weight: "bold",
                size: "sm",
                color: "#0F766E",
              },
              {
                type: "text",
                text: "ดูยอดโอน เงินสด ยอดหมู และกำไรสาขาตลาดญี่ปุ่น",
                size: "xxs",
                color: "#64748B",
                margin: "xs",
              },
            ],
          },
          // Option 3: สาขา สายหนองปิง
          {
            type: "box",
            layout: "vertical",
            backgroundColor: "#FAF5FF",
            cornerRadius: "md",
            paddingAll: "12px",
            borderWidth: "1px",
            borderColor: "#E9D5FF",
            action: {
              type: "message",
              label: "สายหนองปิง",
              text: date ? `สรุป สายหนองปิง ${date}` : "สรุป สายหนองปิง",
            },
            contents: [
              {
                type: "text",
                text: "🏪 สาขา สายหนองปิง",
                weight: "bold",
                size: "sm",
                color: "#6B21A8",
              },
              {
                type: "text",
                text: "ดูยอดโอน เงินสด ยอดหมู และกำไรสาขาสายหนองปิง",
                size: "xxs",
                color: "#64748B",
                margin: "xs",
              },
            ],
          },
        ],
      },
    },
  };
}

/**
 * Interactive Flex Card to let user select a date when querying pork summary.
 */
export function buildPorkDateSelectorCard(today: string = getTodayDateString()) {
  const yesterday = shiftDateString(today, -1);
  const twoDaysAgo = shiftDateString(today, -2);

  const todayLabel = formatDateThai(today);
  const yesterdayLabel = formatDateThai(yesterday);
  const twoDaysAgoLabel = formatDateThai(twoDaysAgo);

  return {
    type: "flex" as const,
    altText: "🥩 เลือกดูยอดหมูตามวันที่",
    contents: {
      type: "bubble",
      size: "mega",
      header: {
        type: "box",
        layout: "vertical",
        backgroundColor: "#7C2D12",
        paddingAll: "16px",
        contents: [
          {
            type: "text",
            text: "🥩 เช็คยอดหมู ร้านครูตอม",
            weight: "bold",
            color: "#FFFFFF",
            size: "lg",
          },
          {
            type: "text",
            text: "เลือกวันที่ต้องการดูยอดหมู (หมูแดง • หมูสับ • มันหมู)",
            color: "#FED7AA",
            size: "xs",
            margin: "xs",
          },
        ],
      },
      body: {
        type: "box",
        layout: "vertical",
        spacing: "md",
        paddingAll: "16px",
        contents: [
          // Option 1: วันนี้
          {
            type: "box",
            layout: "vertical",
            backgroundColor: "#FFF7ED",
            cornerRadius: "md",
            paddingAll: "12px",
            borderWidth: "1px",
            borderColor: "#FDBA74",
            action: {
              type: "message",
              label: "ยอดหมูวันนี้",
              text: "สรุปหมู วันนี้",
            },
            contents: [
              {
                type: "text",
                text: `📅 ยอดหมูวันนี้ (${todayLabel})`,
                weight: "bold",
                size: "sm",
                color: "#9A3412",
              },
              {
                type: "text",
                text: "ดูยอดหมู กก. และราคาล่าสุดวันนี้ (รวมทุกสาขา)",
                size: "xxs",
                color: "#64748B",
                margin: "xs",
              },
            ],
          },
          // Option 2: เมื่อวาน
          {
            type: "box",
            layout: "vertical",
            backgroundColor: "#F8FAFC",
            cornerRadius: "md",
            paddingAll: "12px",
            borderWidth: "1px",
            borderColor: "#CBD5E1",
            action: {
              type: "message",
              label: "ยอดหมูเมื่อวาน",
              text: "สรุปหมู เมื่อวาน",
            },
            contents: [
              {
                type: "text",
                text: `📅 ยอดหมูเมื่อวาน (${yesterdayLabel})`,
                weight: "bold",
                size: "sm",
                color: "#334155",
              },
              {
                type: "text",
                text: "ตรวจสอบข้อมูลการใช้หมูและต้นทุนเมื่อวาน",
                size: "xxs",
                color: "#64748B",
                margin: "xs",
              },
            ],
          },
          // Option 3: ย้อนหลัง 2 วัน
          {
            type: "box",
            layout: "vertical",
            backgroundColor: "#F8FAFC",
            cornerRadius: "md",
            paddingAll: "12px",
            borderWidth: "1px",
            borderColor: "#CBD5E1",
            action: {
              type: "message",
              label: "ยอดหมู 2 วันก่อน",
              text: `สรุปหมู ${twoDaysAgo}`,
            },
            contents: [
              {
                type: "text",
                text: `📅 ย้อนหลัง 2 วัน (${twoDaysAgoLabel})`,
                weight: "bold",
                size: "sm",
                color: "#475569",
              },
              {
                type: "text",
                text: "ดูข้อมูลย้อนหลัง 2 วัน",
                size: "xxs",
                color: "#64748B",
                margin: "xs",
              },
            ],
          },
          // Option 4: Quick Branch Buttons
          {
            type: "box",
            layout: "horizontal",
            spacing: "sm",
            margin: "sm",
            contents: [
              {
                type: "box",
                layout: "vertical",
                backgroundColor: "#0F766E",
                cornerRadius: "md",
                paddingAll: "10px",
                alignItems: "center",
                action: {
                  type: "message",
                  label: "หมู ตลาดญี่ปุ่น",
                  text: "สรุปหมู ตลาดญี่ปุ่น วันนี้",
                },
                contents: [
                  {
                    type: "text",
                    text: "🏪 ตลาดญี่ปุ่น",
                    weight: "bold",
                    size: "xs",
                    color: "#FFFFFF",
                    align: "center",
                  },
                ],
              },
              {
                type: "box",
                layout: "vertical",
                backgroundColor: "#6B21A8",
                cornerRadius: "md",
                paddingAll: "10px",
                alignItems: "center",
                action: {
                  type: "message",
                  label: "หมู สายหนองปิง",
                  text: "สรุปหมู สายหนองปิง วันนี้",
                },
                contents: [
                  {
                    type: "text",
                    text: "🏪 สายหนองปิง",
                    weight: "bold",
                    size: "xs",
                    color: "#FFFFFF",
                    align: "center",
                  },
                ],
              },
            ],
          },
        ],
      },
    },
  };
}

