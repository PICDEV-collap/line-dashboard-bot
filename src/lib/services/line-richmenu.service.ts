/**
 * LINE Rich Menu Definition for ร้านครูตอม Dashboard Bot.
 * Provides a 6-grid action menu layout for fast user interaction.
 */
export function getRichMenuDefinition() {
  return {
    size: { width: 2500, height: 1686 },
    selected: true,
    name: "ร้านครูตอม Main Menu",
    chatBarText: "📌 เมนูร้านครูตอม",
    areas: [
      // Tile 1: 🏪 เลือกสาขา (Top Left)
      {
        bounds: { x: 0, y: 0, width: 833, height: 843 },
        action: { type: "message", label: "เลือกสาขา", text: "สรุป" },
      },
      // Tile 2: 📊 สรุปวันนี้ (Top Middle)
      {
        bounds: { x: 833, y: 0, width: 834, height: 843 },
        action: { type: "message", label: "สรุปวันนี้", text: "สรุป" },
      },
      // Tile 3: 🥩 เช็คหมู (Top Right)
      {
        bounds: { x: 1667, y: 0, width: 833, height: 843 },
        action: { type: "message", label: "เช็คหมู", text: "สรุปหมู" },
      },
      // Tile 4: 💸 รายจ่ายด่วน (Bottom Left)
      {
        bounds: { x: 0, y: 843, width: 833, height: 843 },
        action: { type: "message", label: "รายจ่ายด่วน", text: "ลงรายจ่าย" },
      },
      // Tile 5: 📄 รายงาน PDF (Bottom Middle)
      {
        bounds: { x: 833, y: 843, width: 834, height: 843 },
        action: { type: "message", label: "รายงาน PDF", text: "รายงานเดือนนี้" },
      },
      // Tile 6: ❓ ช่วยเหลือ (Bottom Right)
      {
        bounds: { x: 1667, y: 843, width: 833, height: 843 },
        action: { type: "message", label: "ช่วยเหลือ", text: "ช่วย" },
      },
    ],
  };
}
