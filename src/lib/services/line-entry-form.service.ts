/**
 * LINE Flex Message Templates for Data Entry Form & Main Navigation Menu.
 */

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
            backgroundColor: "#F7FAFC",
            cornerRadius: "md",
            paddingAll: "12px",
            contents: [
              {
                type: "text",
                text: "💡 วิธีที่ 1: แตะเพื่อใช้ข้อความตัวอย่าง",
                weight: "bold",
                size: "xs",
                color: "#4A5568",
              },
              {
                type: "separator",
                margin: "sm",
                color: "#E2E8F0",
              },
              {
                type: "box",
                layout: "horizontal",
                margin: "md",
                spacing: "md",
                contents: [
                  {
                    type: "box",
                    layout: "vertical",
                    backgroundColor: "#FFFFFF",
                    cornerRadius: "md",
                    borderWidth: "1px",
                    borderColor: "#CBD5E1",
                    paddingAll: "10px",
                    alignItems: "center",
                    justifyContent: "center",
                    action: {
                      type: "message",
                      label: "ตลาดญี่ปุ่น",
                      text: "ตลาดญี่ปุ่น\nโอน 5000 สด 3000\nแดง4 สับ3\nจ่ายแม็คโคร 1500",
                    },
                    contents: [
                      {
                        type: "text",
                        text: "🏪 ตลาดญี่ปุ่น",
                        weight: "bold",
                        size: "xs",
                        color: "#1E293B",
                        align: "center",
                      },
                      {
                        type: "text",
                        text: "แตะเพื่อลงยอด",
                        size: "xxs",
                        color: "#64748B",
                        align: "center",
                        margin: "xs",
                      },
                    ],
                  },
                  {
                    type: "box",
                    layout: "vertical",
                    backgroundColor: "#FFFFFF",
                    cornerRadius: "md",
                    borderWidth: "1px",
                    borderColor: "#CBD5E1",
                    paddingAll: "10px",
                    alignItems: "center",
                    justifyContent: "center",
                    action: {
                      type: "message",
                      label: "สายหนองปิง",
                      text: "สายหนองปิง\nโอน 4000 สด 2000\nแดง3 สับ2\nค่าแรง 1500",
                    },
                    contents: [
                      {
                        type: "text",
                        text: "🏪 สายหนองปิง",
                        weight: "bold",
                        size: "xs",
                        color: "#1E293B",
                        align: "center",
                      },
                      {
                        type: "text",
                        text: "แตะเพื่อลงยอด",
                        size: "xxs",
                        color: "#64748B",
                        align: "center",
                        margin: "xs",
                      },
                    ],
                  },
                ],
              },
            ],
          },
          {
            type: "box",
            layout: "vertical",
            backgroundColor: "#F0FFF4",
            cornerRadius: "md",
            paddingAll: "14px",
            borderColor: "#A7F3D0",
            borderWidth: "1px",
            contents: [
              {
                type: "text",
                text: "✨ วิธีที่ 2: กรอกผ่านตารางบนมือถือ (แนะนำ)",
                weight: "bold",
                size: "xs",
                color: "#065F46",
              },
              {
                type: "text",
                text: "กรอกง่าย คำนวณกำไรสดๆ บันทึกในคลิกเดียว",
                size: "xxs",
                color: "#059669",
                margin: "xs",
              },
              {
                type: "box",
                layout: "vertical",
                backgroundColor: "#10B981",
                cornerRadius: "md",
                paddingAll: "10px",
                margin: "md",
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
                    size: "sm",
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
