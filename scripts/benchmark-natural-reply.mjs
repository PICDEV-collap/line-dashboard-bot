/**
 * Measure Gemini natural-reply latency (short + full summary templates).
 * Usage: GEMINI_API_KEY=xxx node scripts/benchmark-natural-reply.mjs
 */
import { readFileSync } from "fs";
import { join, dirname } from "path";
import { fileURLToPath } from "url";

const __dirname = dirname(fileURLToPath(import.meta.url));
const root = join(__dirname, "..");

function loadEnvFile(name) {
  try {
    const text = readFileSync(join(root, name), "utf8");
    for (const line of text.split("\n")) {
      const m = line.match(/^([A-Z_]+)=(.*)$/);
      if (m && !process.env[m[1]]) process.env[m[1]] = m[2].replace(/^["']|["']$/g, "");
    }
  } catch {
    /* optional */
  }
}

loadEnvFile(".env.local");
loadEnvFile(".env");

const API_KEY = process.env.GEMINI_API_KEY;
const MODEL = process.env.GEMINI_MODEL ?? "gemini-2.0-flash";

if (!API_KEY) {
  console.error("Set GEMINI_API_KEY (or create .env.local)");
  process.exit(1);
}

const SHORT_TEMPLATE = `✅ บันทึกแล้ว · 🏪 สายหนองปิง
📅 พรุ่งนี้ (2026-06-16)

➕ เพิ่ม: วัตถุดิบ ฿1,120

📊 ยอดวันนั้น: รายรับ ฿0 · ค่าใช้จ่าย ฿1,970 · กำไร -฿1,970`;

const FULL_TEMPLATE = `✅ บันทึกข้อมูลรายวันแล้ว
🏪 สาขา: ตลาดญี่ปุ่น

💰 รายรับ:
  📱 โอน: ฿505
  💵 สด: ฿460
  💚 คนละครึ่ง: ฿320
  รวม: ฿1,285

🧾 ค่าใช้จ่าย:
  🔴 หมูแดง: ฿130/กก. (⏳ รอยอดจำนวน)
  🟠 หมูสับ: 1กก × ฿120 = ฿120
  🔥 แก๊ส: ฿150
  👷 ค่าแรง: ฿850
  รวม: ฿1,275

📈 กำไร: +฿10`;

const PROMPT = `คุณเป็นผู้ช่วยบัญชีร้านก๋วยเตี๋ยว "ครูตอม" ตอบใน LINE ภาษาไทยแบบเป็นกันเอง กระชับ
ห้ามเปลี่ยนตัวเลขจาก template — เขียนใหม่ให้ฟังเป็นธรรมชาติ ไม่มี markdown`;

async function callGemini(label, template, userMessage) {
  const body = {
    contents: [
      {
        parts: [
          {
            text: `${PROMPT}\n\nประเภท: ${label}\nข้อความลูกค้า: "${userMessage}"\n\ntemplate:\n${template}\n\nเขียนข้อความตอบกลับ:`,
          },
        ],
      },
    ],
  };

  const start = Date.now();
  const res = await fetch(
    `https://generativelanguage.googleapis.com/v1beta/models/${MODEL}:generateContent?key=${API_KEY}`,
    {
      method: "POST",
      headers: { "Content-Type": "application/json" },
      body: JSON.stringify(body),
    }
  );
  const elapsed = Date.now() - start;
  if (!res.ok) {
    const err = await res.text();
    throw new Error(`${label} HTTP ${res.status}: ${err.slice(0, 200)}`);
  }
  const json = await res.json();
  const text = json.candidates?.[0]?.content?.parts?.[0]?.text ?? "";
  return { elapsed, chars: text.length };
}

function percentile(sorted, p) {
  const i = Math.ceil((p / 100) * sorted.length) - 1;
  return sorted[Math.max(0, i)];
}

async function bench(label, template, userMessage, runs = 3) {
  const times = [];
  for (let i = 0; i < runs; i++) {
    const { elapsed, chars } = await callGemini(label, template, userMessage);
    times.push(elapsed);
    console.log(`  run ${i + 1}: ${elapsed}ms (${chars} chars)`);
  }
  times.sort((a, b) => a - b);
  return {
    label,
    min: times[0],
    p50: percentile(times, 50),
    p95: percentile(times, 95),
    max: times[times.length - 1],
    samples: times.length,
  };
}

console.log(`Model: ${MODEL}\n`);

const pingStart = Date.now();
await fetch(
  `https://generativelanguage.googleapis.com/v1beta/models/${MODEL}:generateContent?key=${API_KEY}`,
  {
    method: "POST",
    headers: { "Content-Type": "application/json" },
    body: JSON.stringify({ contents: [{ parts: [{ text: "ตอบว่า ok" }] }] }),
  }
);
const pingMs = Date.now() - pingStart;
console.log(`Ping (minimal): ${pingMs}ms\n`);

console.log("Short reply:");
const short = await bench("short", SHORT_TEMPLATE, "พรุ่งนี้\nวัตถุดิบ 1120");

console.log("\nFull summary:");
const full = await bench("full", FULL_TEMPLATE, "สรุป");

const p95 = Math.max(short.p95, full.p95);
const timeout = Math.min(30000, Math.ceil(p95 * 1.5 / 500) * 500);

console.log("\n--- Results ---");
console.log(JSON.stringify({ pingMs, short, full, recommendedTimeoutMs: timeout }, null, 2));
console.log(`\nRecommended GEMINI_NATURAL_REPLY_TIMEOUT_MS=${timeout}`);
