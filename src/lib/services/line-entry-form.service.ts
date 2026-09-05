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
                spacing: "sm",
                contents: [
                  {
                    type: "button",
                    style: "secondary",
                    height: "sm",
                    color: "#EDF2F7",
                    action: {
                      type: "message",
                      label: "🏪 ตลาดญี่ปุ่น",
                      text: "ตลาดญี่ปุ่น\nโอน 5000 สด 3000\nแดง4 สับ3\nจ่ายแม็คโคร 1500",
                    },
                  },
                  {
                    type: "button",
                    style: "secondary",
                    height: "sm",
                    color: "#EDF2F7",
                    action: {
                      type: "message",
                      label: "🏪 สายหนองปิง",
                      text: "สายหนองปิง\nโอน 4000 สด 2000\nแดง3 สับ2\nค่าแรง 1500",
                    },
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
            paddingAll: "12px",
            borderColor: "#C6F6D5",
            borderWidth: "1px",
            contents: [
              {
                type: "text",
                text: "✨ วิธีที่ 2: กรอกผ่านตารางบนมือถือ (แนะนำ)",
                weight: "bold",
                size: "xs",
                color: "#22543D",
              },
              {
                type: "text",
                text: "กรอกเป็นตาราง คำนวณกำไรสดๆ บันทึกในคลิกเดียว",
                size: "xxs",
                color: "#48BB78",
                margin: "xs",
              },
              {
                type: "button",
                style: "primary",
                height: "sm",
                margin: "sm",
                color: "#1DB446",
                action: {
                  type: "uri",
                  label: "📲 เปิดตารางกรอกยอดบนมือถือ",
                  uri: entryUrl.startsWith("http") ? entryUrl : `https://${entryUrl}`,
                },
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
        backgroundColor: "#2B6CB0",
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
            text: "เลือกระบบที่ต้องการใช้งาน",
            color: "#BEE3F8",
            size: "xs",
            margin: "xs",
          },
        ],
      },
      body: {
        type: "box",
        layout: "vertical",
        spacing: "sm",
        paddingAll: "16px",
        contents: [
          // Row 1: กรอกยอด & สรุปวันนี้
          {
            type: "box",
            layout: "horizontal",
            spacing: "sm",
            contents: [
              {
                type: "button",
                style: "primary",
                color: "#1DB446",
                height: "sm",
                action: {
                  type: "message",
                  label: "📝 กรอกยอด",
                  text: "กรอกข้อมูล",
                },
              },
              {
                type: "button",
                style: "primary",
                color: "#3182CE",
                height: "sm",
                action: {
                  type: "message",
                  label: "📊 สรุปวันนี้",
                  text: "สรุป",
                },
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
                type: "button",
                style: "primary",
                color: "#DD6B20",
                height: "sm",
                action: {
                  type: "message",
                  label: "🥩 เช็คยอดหมู",
                  text: "สรุปหมู",
                },
              },
              {
                type: "button",
                style: "primary",
                color: "#805AD5",
                height: "sm",
                action: {
                  type: "message",
                  label: "📄 รายงาน PDF",
                  text: "รายงานเดือนนี้",
                },
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
                type: "button",
                style: "secondary",
                color: "#EDF2F7",
                height: "sm",
                action: {
                  type: "message",
                  label: "🏪 ตลาดญี่ปุ่น",
                  text: "สรุป ตลาดญี่ปุ่น",
                },
              },
              {
                type: "button",
                style: "secondary",
                color: "#EDF2F7",
                height: "sm",
                action: {
                  type: "message",
                  label: "🏪 สายหนองปิง",
                  text: "สรุป สายหนองปิง",
                },
              },
            ],
          },
          // Row 4: Link to Web App
          {
            type: "button",
            style: "link",
            height: "sm",
            action: {
              type: "uri",
              label: "📲 เปิดตารางกรอกยอดบนมือถือ",
              uri: entryUrl.startsWith("http") ? entryUrl : `https://${entryUrl}`,
            },
          },
        ],
      },
    },
  };
}
