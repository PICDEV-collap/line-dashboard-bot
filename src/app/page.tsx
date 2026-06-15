export default function HomePage() {
  const webhookUrl = process.env.NEXT_PUBLIC_APP_URL
    ? `${process.env.NEXT_PUBLIC_APP_URL}/api/webhook/line`
    : "/api/webhook/line";

  return (
    <main style={{ maxWidth: 900, margin: "0 auto", padding: "3rem 1.5rem" }}>
      {/* Header */}
      <div style={{ textAlign: "center", marginBottom: "3rem" }}>
        <div style={{ fontSize: "3.5rem", marginBottom: "0.5rem" }}>🤖</div>
        <h1 style={{ fontSize: "2rem", fontWeight: 700, color: "#06c755" }}>
          LINE Dashboard Bot
        </h1>
        <p style={{ color: "#888", marginTop: "0.5rem" }}>
          Serverless · Next.js 15 · Vercel · Supabase · Gemini OCR
        </p>
      </div>

      {/* Status badges */}
      <div
        style={{
          display: "flex",
          gap: "0.75rem",
          justifyContent: "center",
          flexWrap: "wrap",
          marginBottom: "2.5rem",
        }}
      >
        {["LINE API", "Supabase DB", "Supabase Storage", "Gemini Vision"].map(
          (label) => (
            <span
              key={label}
              style={{
                background: "#06c75520",
                border: "1px solid #06c755",
                color: "#06c755",
                padding: "4px 12px",
                borderRadius: 999,
                fontSize: "0.8rem",
                fontWeight: 600,
              }}
            >
              ✓ {label}
            </span>
          )
        )}
      </div>

      {/* Cards grid */}
      <div
        style={{
          display: "grid",
          gridTemplateColumns: "repeat(auto-fit, minmax(260px, 1fr))",
          gap: "1.25rem",
          marginBottom: "2.5rem",
        }}
      >
        <Card
          title="Webhook Endpoint"
          icon="🔗"
          description="ตั้งค่า LINE Messaging API ให้ชี้มาที่ URL นี้"
          value={<code style={{ wordBreak: "break-all", fontSize: "0.75rem" }}>{webhookUrl}</code>}
        />
        <Card
          title="Health Check"
          icon="💚"
          description="ตรวจสอบสถานะ services ทั้งหมด"
          value={<a href="/api/health">/api/health</a>}
        />
        <Card
          title="Dashboard API"
          icon="📊"
          description="ข้อมูลสถิติสำหรับ Looker Studio"
          value={<a href="/api/dashboard/stats">/api/dashboard/stats</a>}
        />
        <Card
          title="Messages API"
          icon="💬"
          description="รายการข้อความทั้งหมด (ต้องการ API Key)"
          value={<code>/api/dashboard?page=1&limit=50</code>}
        />
        <Card
          title="Financial Dashboard"
          icon="🍖"
          description="Dashboard ร้านครูตอม — เชื่อมต่อ Supabase"
          value={<a href="/dashboard.html" target="_blank" rel="noopener noreferrer">/dashboard.html</a>}
        />
        <Card
          title="Financial Records API"
          icon="📒"
          description="CRUD รายการรายได้/ค่าใช้จ่าย (ต้องการ API Key)"
          value={<code>/api/records?month=2026-03</code>}
        />
      </div>

      {/* Supported message types */}
      <section
        style={{
          background: "#16213e",
          border: "1px solid #2a2a4a",
          borderRadius: 12,
          padding: "1.5rem",
          marginBottom: "1.5rem",
        }}
      >
        <h2 style={{ marginBottom: "1rem", fontSize: "1.1rem" }}>
          📨 ประเภทข้อความที่รองรับ
        </h2>
        <div style={{ display: "grid", gridTemplateColumns: "repeat(auto-fit, minmax(180px, 1fr))", gap: "0.75rem" }}>
          {[
            { icon: "💬", type: "Text", desc: "บันทึกลง Supabase DB" },
            { icon: "🖼️", type: "Image", desc: "อัปโหลด Storage + OCR Gemini" },
            { icon: "📄", type: "PDF/File", desc: "อัปโหลด Supabase Storage" },
            { icon: "📍", type: "Location", desc: "บันทึก Lat/Lng + Address" },
          ].map((item) => (
            <div
              key={item.type}
              style={{
                background: "#0f3460",
                borderRadius: 8,
                padding: "0.75rem",
              }}
            >
              <div style={{ fontSize: "1.5rem", marginBottom: "0.25rem" }}>
                {item.icon}
              </div>
              <div style={{ fontWeight: 600, fontSize: "0.9rem" }}>
                {item.type}
              </div>
              <div style={{ color: "#888", fontSize: "0.8rem" }}>{item.desc}</div>
            </div>
          ))}
        </div>
      </section>

      {/* Quick Setup */}
      <section
        style={{
          background: "#16213e",
          border: "1px solid #2a2a4a",
          borderRadius: 12,
          padding: "1.5rem",
        }}
      >
        <h2 style={{ marginBottom: "1rem", fontSize: "1.1rem" }}>
          ⚡ Quick Setup
        </h2>
        <ol style={{ lineHeight: 2, paddingLeft: "1.25rem", color: "#ccc" }}>
          <li>ตั้งค่า Environment Variables ใน Vercel Dashboard</li>
          <li>
            ตั้งค่า LINE Webhook URL:{" "}
            <code>{webhookUrl}</code>
          </li>
          <li>เปิด LINE Messaging API &gt; Use webhooks: ON</li>
          <li>รัน SQL Schema ใน Supabase SQL Editor สร้าง Tables</li>
          <li>เชื่อม Looker Studio กับ Dashboard API</li>
          <li>เปิด <code>/dashboard.html</code> → ตั้งค่า URL + API Key → กด เชื่อมต่อ</li>
          <li>กด &quot;Seed ข้อมูลเริ่มต้น&quot; เพื่อ import 31 records (มี.ค. 2569)</li>
        </ol>
      </section>

      <footer
        style={{
          textAlign: "center",
          marginTop: "3rem",
          color: "#555",
          fontSize: "0.8rem",
        }}
      >
        Built with Next.js 16 · Deployed on Vercel · Powered by Gemini AI
      </footer>
    </main>
  );
}

function Card({
  title,
  icon,
  description,
  value,
}: {
  title: string;
  icon: string;
  description: string;
  value: React.ReactNode;
}) {
  return (
    <div
      style={{
        background: "#16213e",
        border: "1px solid #2a2a4a",
        borderRadius: 12,
        padding: "1.25rem",
      }}
    >
      <div style={{ fontSize: "1.5rem", marginBottom: "0.5rem" }}>{icon}</div>
      <h3 style={{ fontSize: "0.95rem", fontWeight: 600, marginBottom: "0.25rem" }}>
        {title}
      </h3>
      <p style={{ color: "#888", fontSize: "0.8rem", marginBottom: "0.75rem" }}>
        {description}
      </p>
      <div style={{ fontSize: "0.85rem" }}>{value}</div>
    </div>
  );
}
