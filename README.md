# LINE Dashboard Bot — ร้านครูตอม

> Serverless LINE Bot · Next.js 15 · TypeScript · Vercel · **Supabase** · Gemini OCR

---

## สารบัญ

1. [ภาพรวมระบบ](#1-ภาพรวมระบบ)
2. [สิ่งที่ต้องเตรียมก่อน](#2-สิ่งที่ต้องเตรียมก่อน)
3. [ตั้งค่า Supabase (DB + Storage)](#3-ตั้งค่า-supabase-db--storage)
4. [ตั้งค่า Gemini API](#4-ตั้งค่า-gemini-api)
5. [ตั้งค่า LINE Developers](#5-ตั้งค่า-line-developers)
6. [ตั้งค่า GitHub Repository](#6-ตั้งค่า-github-repository)
7. [Deploy บน Vercel](#7-deploy-บน-vercel)
8. [Environment Variables อธิบายทุก Key](#8-environment-variables-อธิบายทุก-key)
9. [ตั้งค่า LINE Webhook URL](#9-ตั้งค่า-line-webhook-url)
10. [ตั้งค่า GitHub Actions (CI/CD)](#10-ตั้งค่า-github-actions-cicd)
11. [เปิดใช้งาน Dashboard HTML](#11-เปิดใช้งาน-dashboard-html)
12. [Import ข้อมูลเริ่มต้น (Seed)](#12-import-ข้อมูลเริ่มต้น-seed)
13. [ทดสอบระบบ](#13-ทดสอบระบบ)
14. [พัฒนาบนเครื่องตัวเอง (Local Dev)](#14-พัฒนาบนเครื่องตัวเอง-local-dev)
15. [โครงสร้างฐานข้อมูล (Supabase Schema)](#15-โครงสร้างฐานข้อมูล-supabase-schema)
16. [API Reference](#16-api-reference)
17. [แก้ปัญหาที่พบบ่อย (Troubleshooting)](#17-แก้ปัญหาที่พบบ่อย-troubleshooting)
18. [ประมาณการค่าใช้จ่าย](#18-ประมาณการค่าใช้จ่าย)

---

## 1. ภาพรวมระบบ

```
┌──────────────────────────────────────────────────────────────────┐
│                        ผู้ใช้ (LINE App)                         │
│     ส่งข้อความ / รูปภาพ / PDF / พิกัด / ข้อความรายรับ-ค่าใช้จ่าย  │
└───────────────────────────────┬──────────────────────────────────┘
                                │
                                ▼
┌──────────────────────────────────────────────────────────────────┐
│                    LINE Messaging API                            │
│              (ส่ง Webhook มาที่ Vercel ทันที)                    │
└───────────────────────────────┬──────────────────────────────────┘
                                │  POST /api/webhook/line
                                │  Header: X-Line-Signature (HMAC-SHA256)
                                ▼
┌──────────────────────────────────────────────────────────────────┐
│                   VERCEL — Next.js 15 App Router                 │
│  ┌──────────────────────────────────────────────────────────┐   │
│  │  Rate Limiter → Signature Validator → Logger             │   │
│  └──────────────────────┬───────────────────────────────────┘   │
│                         │                                        │
│  ┌──────────────────────▼───────────────────────────────────┐   │
│  │            Webhook Processor                             │   │
│  │                                                          │   │
│  │  ข้อความปกติ ────────────────────────► Supabase DB      │   │
│  │                                                          │   │
│  │  ข้อความการเงิน ──► Gemini Parse ──► financial_records  │   │
│  │                                                          │   │
│  │  รูปภาพ ──► LINE Download ──► Supabase Storage          │   │
│  │                          └──► Gemini OCR ──► DB         │   │
│  │                                                          │   │
│  │  PDF ────► LINE Download ──► Supabase Storage ──► DB    │   │
│  │                                                          │   │
│  │  พิกัด ──────────────────────────────► Supabase DB      │   │
│  └──────────────────────────────────────────────────────────┘   │
│                                                                  │
│  API Routes (Bearer Auth):                                       │
│  POST /api/webhook/line    — รับ events จาก LINE                │
│  GET  /api/records         — CRUD ข้อมูลการเงิน                 │
│  GET  /api/records/[id]    — รายการเดี่ยว (GET/PUT/DELETE)      │
│  GET  /api/dashboard       — ข้อความ (paginated)               │
│  GET  /api/dashboard/stats — สถิติรวม                           │
│  POST /api/seed            — Import 31 records มี.ค.2569        │
│  GET  /api/health          — ตรวจสอบสถานะ services              │
└──────────────┬───────────────────────────┬───────────────────────┘
               │                           │
               ▼                           ▼
     Supabase PostgreSQL           Supabase Storage
   (4 tables: messages,           (bucket: line-files)
    financial_records,             images/, documents/
    ocr_results, daily_stats)
               │
               ▼
         Dashboard HTML
         /dashboard.html
```

### ตาราง Supabase ทั้ง 4 ตาราง

| Table | ข้อมูล |
|-------|--------|
| `messages` | ข้อความทั้งหมดจาก LINE |
| `financial_records` | รายรับ/ค่าใช้จ่ายรายวัน ร้านครูตอม |
| `ocr_results` | ผลลัพธ์ OCR จากรูปภาพ |
| `daily_stats` | สถิติรายวัน (message counts) |

---

## 2. สิ่งที่ต้องเตรียมก่อน

| สิ่งที่ต้องมี | ใช้ทำอะไร | หมายเหตุ |
|---|---|---|
| บัญชี **Supabase** | Database + File Storage | **ฟรี — ใช้ GitHub login ไม่ต้องบัตรเครดิต** |
| บัญชี **Google** | Gemini API เท่านั้น | ใช้ AI Studio ฟรี ไม่ต้อง Google Cloud |
| บัญชี **LINE** | LINE Developers Console | ฟรี |
| บัญชี **GitHub** | เก็บโค้ด + CI/CD | ฟรี |
| บัญชี **Vercel** | Deploy Next.js | ฟรี |
| **Node.js 20+** | รัน Next.js บนเครื่อง | [nodejs.org](https://nodejs.org) |

---

## 3. ตั้งค่า Supabase (DB + Storage)

Supabase แทนที่ Google Sheets และ Google Drive ทั้งหมด — ฟรี ไม่ต้องบัตรเครดิต

### 3.1 สมัครและสร้าง Project

1. ไปที่ **[supabase.com](https://supabase.com)** → คลิก **Start your project**
2. Login ด้วย **GitHub** (ง่ายที่สุด)
3. คลิก **New project**
4. กรอก:
   - **Organization**: (ชื่อ GitHub account)
   - **Project name**: `line-dashboard-bot`
   - **Database Password**: ตั้งรหัสผ่านแข็งแรง (บันทึกเก็บไว้)
   - **Region**: `Southeast Asia (Singapore)` — ใกล้ที่สุด
5. คลิก **Create new project** — รอประมาณ 1–2 นาที

### 3.2 คัดลอก API Keys

ไปที่ **Project Settings → API**:

| ค่า | ที่อยู่ | ใช้เป็น |
|-----|--------|---------|
| **Project URL** | ส่วน "Project URL" | `SUPABASE_URL` |
| **service_role** key | ส่วน "Project API keys" → `service_role` | `SUPABASE_SERVICE_KEY` |

> ⚠️ ใช้ `service_role` key (ไม่ใช่ `anon` key) — service_role ข้าม RLS ได้ เหมาะสำหรับ server-side

```
SUPABASE_URL=https://xxxxxxxxxxx.supabase.co
SUPABASE_SERVICE_KEY=eyJhbGciOiJIUzI1NiIsInR5cCI6IkpXVCJ9...
```

### 3.3 สร้าง Tables ด้วย SQL

ไปที่ **SQL Editor** (เมนูซ้าย) → คลิก **New query** → วาง SQL ด้านล่าง → คลิก **Run**:

```sql
-- messages
create table if not exists messages (
  id text primary key,
  timestamp timestamptz not null,
  user_id text not null,
  display_name text,
  type text not null,
  content text,
  image_url text,
  file_url text,
  location_lat numeric,
  location_lng numeric,
  location_address text,
  reply_token text,
  status text not null default 'pending',
  error_message text,
  created_at timestamptz default now()
);
create index if not exists idx_messages_timestamp on messages (timestamp desc);
create index if not exists idx_messages_status on messages (status);

-- ocr_results
create table if not exists ocr_results (
  id text primary key,
  message_id text,
  timestamp timestamptz not null,
  image_url text,
  raw_text text,
  structured_json text,
  confidence numeric,
  processing_time_ms integer
);

-- daily_stats
create table if not exists daily_stats (
  date text primary key,
  total_messages integer default 0,
  text_count integer default 0,
  image_count integer default 0,
  pdf_count integer default 0,
  location_count integer default 0,
  ocr_count integer default 0,
  error_count integer default 0,
  updated_at timestamptz default now()
);

-- financial_records
create table if not exists financial_records (
  id text primary key,
  date text not null,
  shop_id text not null,
  shop_name text,
  revenue numeric not null default 0,
  transfer numeric not null default 0,
  cash numeric not null default 0,
  delivery numeric not null default 0,
  expense numeric not null default 0,
  pork numeric not null default 0,
  pork_breakdown jsonb,
  materials numeric not null default 0,
  supplies numeric not null default 0,
  gas numeric not null default 150,
  labor numeric not null default 1500,
  ice numeric not null default 35,
  extra_expenses jsonb not null default '[]',
  profit numeric not null default 0,
  margin_pct numeric not null default 0,
  note text,
  status text not null default 'complete',
  created_at timestamptz default now(),
  updated_at timestamptz default now()
);
create unique index if not exists idx_financial_records_shop_date
  on financial_records (shop_id, date);
create index if not exists idx_financial_records_date
  on financial_records (date desc);
```

ถ้าขึ้น "Success. No rows returned" แสดงว่าสำเร็จ

> ไฟล์ SQL เดียวกันอยู่ที่ `supabase/schema.sql` ในโปรเจกต์

### 3.4 สร้าง Storage Bucket

ไปที่ **Storage** (เมนูซ้าย) → คลิก **New bucket**:

- **Name**: `line-files`
- **Public bucket**: เปิด ✅ (จำเป็นสำหรับ public URL)
- คลิก **Save**

> ระบบจะ upload ไฟล์ใน path `images/` และ `documents/` ภายใน bucket นี้

---

## 4. ตั้งค่า Gemini API

### 4.1 สร้าง API Key

1. ไปที่ **[aistudio.google.com](https://aistudio.google.com)** (ไม่ต้อง Google Cloud)
2. คลิก **Get API key** (มุมบนขวา)
3. **Create API key** → คัดลอก → ใช้เป็น `GEMINI_API_KEY`

### 4.2 Quota ฟรี

| รุ่น | Free tier |
|------|-----------|
| Gemini 1.5 Flash | 15 req/min, 1 ล้าน tokens/วัน |
| Gemini 2.0 Flash | 15 req/min, ใหม่กว่า เร็วกว่า |

> ระบบใช้ `gemini-1.5-flash` เป็น default

---

## 5. ตั้งค่า LINE Developers

### 5.1 สร้าง Provider และ Channel

1. ไปที่ **[developers.line.biz](https://developers.line.biz)** → Login ด้วย LINE
2. คลิก **Create a new provider** → ตั้งชื่อ `ร้านครูตอม` → **Create**
3. คลิก **Create a new channel** → เลือก **Messaging API**
4. กรอก Channel name, description, category → **Create**

### 5.2 ตั้งค่า Channel

ไปที่ Tab **Messaging API**:

| Setting | ค่าที่ต้องตั้ง |
|---------|--------------|
| **Auto-reply messages** | Disabled |
| **Greeting messages** | Disabled |
| **Use webhooks** | Enabled ✅ |

### 5.3 คัดลอก Credentials

| ค่า | ที่อยู่ |
|-----|--------|
| `LINE_CHANNEL_SECRET` | Tab **Basic settings** → Channel secret |
| `LINE_CHANNEL_ACCESS_TOKEN` | Tab **Messaging API** → คลิก **Issue** |

---

## 6. ตั้งค่า GitHub Repository

### 6.1 สร้าง Repository

1. ไปที่ **[github.com](https://github.com)** → **New repository**
2. ชื่อ: `line-dashboard-bot` | Visibility: **Private**
3. **อย่า** เลือก Initialize with README → **Create**

### 6.2 Push โค้ด

```bash
cd d:\line-dashboard-bot

git init
git add .
git commit -m "feat: initial LINE Dashboard Bot — Supabase edition"
git remote add origin https://github.com/<your-username>/line-dashboard-bot.git
git branch -M main
git push -u origin main
```

---

## 7. Deploy บน Vercel

### 7.1 สร้าง Vercel Project

1. ไปที่ **[vercel.com](https://vercel.com)** → Login ด้วย GitHub
2. **Add New → Project** → เลือก `line-dashboard-bot` → **Import**
3. Framework: **Next.js** (ตรวจจับอัตโนมัติ)
4. **ยังไม่ต้อง Deploy** — ตั้งค่า Environment Variables ก่อน

### 7.2 ตั้งค่า Environment Variables

คลิก **Environment Variables** แล้วเพิ่มทีละตัว:

| Key | Value | หมายเหตุ |
|-----|-------|---------|
| `LINE_CHANNEL_ACCESS_TOKEN` | (จาก LINE Console) | |
| `LINE_CHANNEL_SECRET` | (จาก LINE Console) | |
| `SUPABASE_URL` | `https://xxx.supabase.co` | จาก Project Settings → API |
| `SUPABASE_SERVICE_KEY` | `eyJ...` (service_role) | จาก Project Settings → API |
| `GEMINI_API_KEY` | (จาก AI Studio) | |
| `GEMINI_MODEL` | `gemini-1.5-flash` | |
| `DASHBOARD_API_KEY` | (สร้างเอง — ดูด้านล่าง) | |
| `NEXT_PUBLIC_APP_URL` | `https://your-app.vercel.app` | อัปเดตหลัง deploy |
| `DEFAULT_SHOP_ID` | `shop1` | |
| `DEFAULT_SHOP_NAME` | `ร้านครูตอม` | |
| `LOG_LEVEL` | `info` | |
| `RATE_LIMIT_MAX_REQUESTS` | `100` | |
| `RATE_LIMIT_WINDOW_MS` | `60000` | |

**สร้าง DASHBOARD_API_KEY:**

```bash
# macOS / Linux
openssl rand -base64 32

# Windows PowerShell
[Convert]::ToBase64String([System.Text.Encoding]::UTF8.GetBytes(
  [System.Guid]::NewGuid().ToString() + [System.Guid]::NewGuid().ToString()
))
```

### 7.3 Deploy

คลิก **Deploy** — รอ 2–3 นาที → ได้ URL เช่น `https://line-dashboard-bot-xxxx.vercel.app`

> อัปเดต `NEXT_PUBLIC_APP_URL` ให้เป็น URL จริงหลัง deploy:
> Vercel → Settings → Environment Variables → แก้ค่า → Redeploy

---

## 8. Environment Variables อธิบายทุก Key

```bash
# ─── LINE Bot ───────────────────────────────────────────────────
LINE_CHANNEL_ACCESS_TOKEN=eyJhbGciO...
# Token สำหรับเรียก LINE API (ส่งข้อความ, ดึงโปรไฟล์, ดาวน์โหลดรูป)
# ได้จาก LINE Developers Console → Messaging API tab → Issue token

LINE_CHANNEL_SECRET=a1b2c3d4e5f6...
# ใช้ verify ว่า Webhook มาจาก LINE จริง (HMAC-SHA256)
# ได้จาก LINE Developers Console → Basic settings tab

# ─── Supabase ────────────────────────────────────────────────────
SUPABASE_URL=https://xxxxxxxxxxx.supabase.co
# Project URL จาก Supabase Dashboard → Project Settings → API

SUPABASE_SERVICE_KEY=eyJhbGciOiJIUzI1NiIsInR5cCI6IkpXVCJ9...
# service_role key — ใช้ server-side เท่านั้น ห้าม expose ฝั่ง client
# ได้จาก Supabase Dashboard → Project Settings → API → service_role

# ─── Gemini AI ──────────────────────────────────────────────────
GEMINI_API_KEY=AIzaSyA...
# API Key สำหรับ Gemini Vision OCR และ Financial Message Parsing
# ได้จาก Google AI Studio (aistudio.google.com) — ไม่ต้อง Google Cloud

GEMINI_MODEL=gemini-1.5-flash
# รุ่น Gemini: gemini-1.5-flash | gemini-1.5-pro | gemini-2.0-flash-exp

# ─── Dashboard ──────────────────────────────────────────────────
DASHBOARD_API_KEY=K7mP2xQnR9vL4wYjA1sD8eF3gH6tU0cN
# Bearer token สำหรับ protect API routes (/api/records, /api/dashboard, /api/seed)
# สร้างค่า random แข็งแรง ≥ 32 ตัวอักษร

# ─── App ────────────────────────────────────────────────────────
NEXT_PUBLIC_APP_URL=https://line-dashboard-bot-xxxx.vercel.app
# URL ของ app บน Vercel — แสดงใน Webhook URL บนหน้าแรก

DEFAULT_SHOP_ID=shop1
# ID ร้านค้าเริ่มต้น — ใช้เป็น key ใน financial_records

DEFAULT_SHOP_NAME=ร้านครูตอม
# ชื่อร้านค้า — แสดงใน records และ LINE reply

# ─── Performance ────────────────────────────────────────────────
RATE_LIMIT_MAX_REQUESTS=100
# requests สูงสุดต่อ 1 window ต่อ 1 IP

RATE_LIMIT_WINDOW_MS=60000
# ขนาด window (ms) — 60000 = 1 นาที

LOG_LEVEL=info
# debug | info | warn | error
```

---

## 9. ตั้งค่า LINE Webhook URL

1. ไปที่ **LINE Developers Console** → เลือก Channel → Tab **Messaging API**
2. ส่วน **Webhook settings**:
   - **Webhook URL**: `https://your-app.vercel.app/api/webhook/line`
   - คลิก **Update**
   - คลิก **Verify** — ต้องขึ้น "Success"
3. เปิด **Use webhook**: ON

### ตรวจสอบ Log

ส่งข้อความใดๆ หา Bot แล้วดู: Vercel Dashboard → Project → **Logs** (Functions tab)
ควรเห็น: `Processing message event`

---

## 10. ตั้งค่า GitHub Actions (CI/CD)

### 10.1 เชื่อมต่อ Vercel CLI

```bash
npm install -g vercel
vercel login
vercel link   # เลือก project ที่สร้างไว้
```

ไฟล์ `.vercel/project.json` จะถูกสร้าง:
```json
{ "orgId": "team_xxx", "projectId": "prj_xxx" }
```

### 10.2 สร้าง Vercel API Token

1. **[vercel.com/account/tokens](https://vercel.com/account/tokens)** → **Create**
2. ชื่อ: `github-actions` | Scope: **Full Account** | No expiration
3. คัดลอก token

### 10.3 เพิ่ม GitHub Secrets

**GitHub → Repository → Settings → Secrets and variables → Actions → New repository secret:**

| Secret Name | ค่า |
|-------------|-----|
| `VERCEL_TOKEN` | (Vercel API token) |
| `VERCEL_ORG_ID` | (ค่า `orgId` จาก `.vercel/project.json`) |
| `VERCEL_PROJECT_ID` | (ค่า `projectId` จาก `.vercel/project.json`) |

### 10.4 Workflows

| Workflow | ทำงานเมื่อ | หน้าที่ |
|----------|-----------|--------|
| `ci.yml` | ทุก push/PR | type-check → lint → build |
| `deploy.yml` | push to `main` | deploy to Vercel → health check |

---

## 11. เปิดใช้งาน Dashboard HTML

Dashboard อยู่ที่: `https://your-app.vercel.app/dashboard.html`

### 11.1 ตั้งค่าครั้งแรก

1. เปิด `https://your-app.vercel.app/dashboard.html`
2. แถบ Sync Bar ด้านบน:
   - ช่อง **Vercel URL**: `https://your-app.vercel.app`
   - ช่อง **API Key**: ค่า `DASHBOARD_API_KEY`
   - คลิก **🔗 เชื่อมต่อ**
3. ถ้าสำเร็จ: `เชื่อมต่อแล้ว · X รายการ`

### 11.2 บันทึกการตั้งค่าถาวร

ไปที่ Tab **⚙️ ตั้งค่า** → ใส่ URL + Key → **💾 บันทึกและเชื่อมต่อ**

ค่าจะถูกบันทึกใน localStorage — ไม่ต้องใส่ซ้ำครั้งหน้า

---

## 12. Import ข้อมูลเริ่มต้น (Seed)

### วิธีที่ 1 — ผ่าน Dashboard HTML

Tab **⚙️ ตั้งค่า** → คลิก **🌱 Seed ข้อมูลเริ่มต้น (31 records)** → รอ 5–10 วินาที

### วิธีที่ 2 — ผ่าน curl

```bash
curl -X POST https://your-app.vercel.app/api/seed \
  -H "Authorization: Bearer YOUR_DASHBOARD_API_KEY"
```

ผลลัพธ์:
```json
{
  "success": true,
  "data": {
    "message": "✅ นำเข้า 31 รายการ (ข้าม 0 รายการที่มีอยู่แล้ว)",
    "imported": 31,
    "skipped": 0
  }
}
```

> **Idempotent**: รัน seed ซ้ำได้อย่างปลอดภัย — ข้าม records ที่มีแล้วโดยอัตโนมัติ (unique index `shop_id + date`)

---

## 13. ทดสอบระบบ

### 13.1 ตรวจสอบ Health

```bash
curl https://your-app.vercel.app/api/health
```

ผลลัพธ์ที่ถูกต้อง:
```json
{
  "status": "healthy",
  "services": {
    "supabase": { "status": "ok", "latencyMs": 45 },
    "supabaseStorage": { "status": "ok", "latencyMs": 38 },
    "gemini": { "status": "ok", "latencyMs": 920 },
    "line": { "status": "ok", "latencyMs": 210 }
  }
}
```

### 13.2 ส่งข้อความปกติ

ส่ง: `สวัสดีครับ`
Bot ตอบ: `✅ รับข้อความแล้ว บันทึกลงฐานข้อมูลเรียบร้อย`

### 13.3 ส่งข้อมูลการเงิน

```
วันนี้ขายได้
โอน 4500 สด 2000 delivery 800
หมูแดง 8kg ×130 หมูบด 3kg ×100
ค่าแรง 1500 แก๊ส 150 น้ำแข็ง 35
```

Bot ตอบ:
```
🍖 บันทึกข้อมูลวันนี้แล้ว

💰 รายรับ: ฿7,300
  └ โอน: ฿4,500
  └ สด: ฿2,000
  └ Delivery: ฿800

🧾 ค่าใช้จ่าย: ฿3,125

📈 กำไรสุทธิ: ฿4,175 (57.2%)
```

### 13.4 ทดสอบ Records API

```bash
# ดูรายการ
curl -H "Authorization: Bearer YOUR_KEY" \
  "https://your-app.vercel.app/api/records?limit=5"

# กรองเดือน
curl -H "Authorization: Bearer YOUR_KEY" \
  "https://your-app.vercel.app/api/records?month=2026-03"

# ดูสถิติ
curl -H "Authorization: Bearer YOUR_KEY" \
  "https://your-app.vercel.app/api/records?view=stats"
```

### 13.5 ส่งรูปภาพ

ส่งรูปใบเสร็จ → Bot จะ OCR และตอบสรุป → รูปอยู่ใน Supabase Storage bucket `line-files/images/`

---

## 14. พัฒนาบนเครื่องตัวเอง (Local Dev)

### 14.1 ติดตั้ง Dependencies

```bash
npm install
```

### 14.2 ตั้งค่า Environment

สร้างไฟล์ `.env.local`:

```bash
LINE_CHANNEL_ACCESS_TOKEN=xxx
LINE_CHANNEL_SECRET=xxx
SUPABASE_URL=https://xxx.supabase.co
SUPABASE_SERVICE_KEY=eyJ...
GEMINI_API_KEY=AIzaSy...
GEMINI_MODEL=gemini-1.5-flash
DASHBOARD_API_KEY=my-local-api-key
DEFAULT_SHOP_ID=shop1
DEFAULT_SHOP_NAME=ร้านครูตอม
```

### 14.3 รัน Dev Server

```bash
npm run dev
# เปิด http://localhost:3000
```

### 14.4 ทดสอบ Webhook ด้วย ngrok

```bash
# ติดตั้ง ngrok
npm install -g ngrok

# เปิด tunnel
ngrok http 3000
# ได้ URL: https://abc123.ngrok.io
```

ตั้ง Webhook URL ใน LINE Console: `https://abc123.ngrok.io/api/webhook/line`

### 14.5 Tests

```bash
npm test          # unit tests
npm run type-check  # TypeScript
npm run lint        # ESLint
```

---

## 15. โครงสร้างฐานข้อมูล (Supabase Schema)

### Table: `messages`

| Column | Type | คำอธิบาย |
|--------|------|----------|
| `id` | text PK | UUID auto-generated |
| `timestamp` | timestamptz | เวลาที่รับจาก LINE |
| `user_id` | text | LINE User ID |
| `display_name` | text | ชื่อ LINE |
| `type` | text | text / image / file / location |
| `content` | text | เนื้อหาหรือคำอธิบาย |
| `image_url` | text | Public URL จาก Supabase Storage |
| `file_url` | text | Public URL จาก Supabase Storage |
| `location_lat` | numeric | ละติจูด |
| `location_lng` | numeric | ลองจิจูด |
| `location_address` | text | ที่อยู่ |
| `status` | text | pending / completed / failed |
| `error_message` | text | รายละเอียด error |

### Table: `financial_records`

| Column | Type | คำอธิบาย |
|--------|------|----------|
| `id` | text PK | UUID |
| `date` | text | YYYY-MM-DD |
| `shop_id` | text | รหัสร้าน |
| `shop_name` | text | ชื่อร้าน |
| `revenue` | numeric | รายรับรวม (฿) |
| `transfer` | numeric | โอนเงิน (฿) |
| `cash` | numeric | เงินสด (฿) |
| `delivery` | numeric | Delivery (฿) |
| `expense` | numeric | ค่าใช้จ่ายรวม (฿) |
| `pork` | numeric | ค่าหมูรวม (฿) |
| `pork_breakdown` | jsonb | `{redQty, redPrice, mincedQty, ...}` |
| `materials` | numeric | ค่าวัตถุดิบ (฿) |
| `supplies` | numeric | ค่าอุปกรณ์ (฿) |
| `gas` | numeric | ค่าแก๊ส (฿) default 150 |
| `labor` | numeric | ค่าแรง (฿) default 1500 |
| `ice` | numeric | ค่าน้ำแข็ง (฿) default 35 |
| `extra_expenses` | jsonb | array ของ `{label, amount}` |
| `profit` | numeric | กำไรสุทธิ (฿) |
| `margin_pct` | numeric | อัตรากำไร (%) |
| `status` | text | complete / pending / draft |

**Unique index**: `(shop_id, date)` — ป้องกันข้อมูลซ้ำ + รองรับ seed idempotency

### Table: `ocr_results`

| Column | Type | คำอธิบาย |
|--------|------|----------|
| `id` | text PK | UUID |
| `message_id` | text | อ้างอิง messages.id |
| `timestamp` | timestamptz | เวลาประมวลผล |
| `image_url` | text | URL รูปต้นฉบับ |
| `raw_text` | text | ข้อความที่ extract ได้ |
| `structured_json` | text | ข้อมูล parse แล้ว (JSON string) |
| `confidence` | numeric | ความแม่นยำ 0.0–1.0 |
| `processing_time_ms` | integer | เวลาประมวลผล (ms) |

### Table: `daily_stats`

| Column | Type | คำอธิบาย |
|--------|------|----------|
| `date` | text PK | YYYY-MM-DD |
| `total_messages` | integer | ข้อความทั้งหมด |
| `text_count` | integer | ข้อความ text |
| `image_count` | integer | รูปภาพ |
| `pdf_count` | integer | ไฟล์ PDF |
| `location_count` | integer | พิกัด |
| `ocr_count` | integer | รูปที่ผ่าน OCR |
| `error_count` | integer | error |

---

## 16. API Reference

ทุก endpoint ยกเว้น `/api/health` ต้องใส่ Header:
```
Authorization: Bearer <DASHBOARD_API_KEY>
```

### Financial Records

#### `GET /api/records`

| Parameter | ตัวอย่าง | คำอธิบาย |
|-----------|---------|----------|
| `shopId` | `shop1` | กรองตามร้าน |
| `month` | `2026-03` | กรองเดือน (YYYY-MM) |
| `startDate` | `2026-03-01` | วันเริ่มต้น |
| `endDate` | `2026-03-31` | วันสิ้นสุด |
| `view` | `stats` | คืน FinancialStats แทนรายการ |
| `page` | `1` | หน้า |
| `limit` | `50` | จำนวนต่อหน้า (max 366) |

```json
{
  "success": true,
  "data": {
    "records": [{ "id": "...", "date": "2026-03-31", "revenue": 7005, ... }],
    "pagination": { "page": 1, "limit": 100, "total": 31, "hasMore": false }
  }
}
```

#### `POST /api/records` — สร้างรายการใหม่

```json
{
  "date": "2026-06-14",
  "revenue": 8500,
  "transfer": 5000, "cash": 3000, "delivery": 500,
  "expense": 4200,
  "pork": 1500, "materials": 900, "supplies": 200,
  "gas": 150, "labor": 1500, "ice": 35,
  "extraExpenses": [],
  "note": "วันนี้ขายดีมาก",
  "status": "complete"
}
```

#### `PUT /api/records/[id]` — แก้ไข (ส่งแค่ field ที่ต้องการแก้)

#### `DELETE /api/records/[id]` — ลบรายการ

### Seed

#### `POST /api/seed` — Import 31 records มี.ค. 2569 (idempotent)

### Dashboard (LINE Messages)

#### `GET /api/dashboard?page=1&limit=50`
#### `GET /api/dashboard/stats`

### Health

#### `GET /api/health` — ไม่ต้อง Authorization

---

## 17. แก้ปัญหาที่พบบ่อย (Troubleshooting)

### ❌ Webhook Verify ใน LINE Console ไม่ผ่าน

**วิธีแก้:**
1. ตรวจสอบ URL: `https://your-app.vercel.app/api/webhook/line`
2. เปิด URL ใน browser — ถ้าขึ้น `{"error":"Method Not Allowed"}` แสดงว่า route ถูกต้อง
3. ดู Vercel Logs หา error

### ❌ API ตอบ 401 Unauthorized

**วิธีแก้:**
1. ตรวจสอบ `DASHBOARD_API_KEY` ใน Vercel Environment Variables
2. Header ต้องเป็น: `Authorization: Bearer <key>` (มีช่องว่างหลัง Bearer)

### ❌ Supabase Error: relation "financial_records" does not exist

**สาเหตุ:** ยังไม่ได้รัน SQL schema

**วิธีแก้:** ไป Supabase → SQL Editor → วาง SQL จากข้อ 3.3 → Run

### ❌ Supabase Storage Error: Bucket not found

**สาเหตุ:** ยังไม่ได้สร้าง bucket

**วิธีแก้:** Supabase → Storage → New bucket → Name: `line-files` → Public: ON → Save

### ❌ SUPABASE_SERVICE_KEY invalid / JWT expired

**สาเหตุ:** ใช้ `anon` key แทน `service_role` key

**วิธีแก้:**
1. Supabase → Project Settings → API
2. ใช้ key ใน **"service_role"** section (ไม่ใช่ anon)

### ❌ Gemini ไม่ parse ข้อความการเงิน

**สาเหตุ:** ข้อความไม่ผ่าน heuristic filter

**วิธีแก้:** ข้อความต้องมีคำเหล่านี้: `โอน`, `สด`, `delivery`, `หมู`, `กำไร`, `ขาย`, `รายรับ`, `รายได้`, `เงิน`

### ❌ Dashboard HTML โหลดไม่ได้ (Network Error)

**สาเหตุ:** เปิดจาก `file://` หรือ API URL ผิด

**วิธีแก้:** เปิดจาก Vercel URL เสมอ: `https://your-app.vercel.app/dashboard.html`

### ❌ Vercel Function Timeout

**วิธีแก้:**
- Webhook: `maxDuration = 60` ควรพอ
- Supabase query ช้า: ตรวจสอบ index และ Region (ควรเป็น Singapore)

---

## 18. ประมาณการค่าใช้จ่าย

### รายเดือน (ข้อความ ~5,000 รายการ/เดือน)

| Service | Free Tier | ใช้ต่อเดือน | ค่าใช้จ่าย |
|---------|-----------|------------|-----------|
| **Vercel** | 100K function invocations | ~6K invocations | **ฟรี** |
| **Supabase DB** | 500 MB, 2 projects | ~5 MB | **ฟรี** |
| **Supabase Storage** | 1 GB | ~200 MB | **ฟรี** |
| **Supabase Bandwidth** | 2 GB/เดือน | ~500 MB | **ฟรี** |
| **Gemini 1.5 Flash** | 1M tokens/วัน | ~500K tokens | **ฟรี** |
| **LINE Messaging API** | 500 replies/เดือน | ~500 replies | **ฟรี** |

> **ประมาณการรายเดือน: ฟรีทั้งหมด** สำหรับร้านค้าขนาดเล็ก

### เมื่อขยายขนาด

| ระดับ | ข้อความ/เดือน | ค่าใช้จ่าย |
|-------|--------------|-----------|
| Small | < 5,000 | ฟรีทั้งหมด |
| Medium | 5,000–50,000 | ~$25/เดือน (Vercel Pro) |
| Large | 50,000+ | ~$25–75/เดือน (Vercel Pro + Supabase Pro) |

### LINE Pricing

| Plan | ข้อความฟรี | เกินนี้ |
|------|-----------|--------|
| Free | 500/เดือน | ส่งไม่ได้ |
| Light | 5,000/เดือน | ¥5/ข้อความ |
| Standard | 30,000/เดือน | ¥3/ข้อความ |

---

## โครงสร้างโฟลเดอร์โปรเจกต์

```
line-dashboard-bot/
├── .github/workflows/
│   ├── ci.yml              # Type check + Lint + Build
│   └── deploy.yml          # Auto-deploy to Vercel
├── public/
│   └── dashboard.html      # Dashboard PWA (เชื่อมต่อ /api/records)
├── supabase/
│   └── schema.sql          # SQL สำหรับสร้าง tables ทั้งหมด
├── src/
│   ├── app/
│   │   ├── api/
│   │   │   ├── webhook/line/route.ts    # LINE webhook (HMAC-SHA256)
│   │   │   ├── records/route.ts         # Financial CRUD (GET/POST)
│   │   │   ├── records/[id]/route.ts    # Single record (GET/PUT/DELETE)
│   │   │   ├── dashboard/route.ts       # Messages paginated
│   │   │   ├── dashboard/stats/route.ts # Stats
│   │   │   ├── seed/route.ts            # Import 31 records
│   │   │   └── health/route.ts          # Health check (Supabase + Gemini + LINE)
│   │   └── page.tsx                     # Status page
│   ├── config/
│   │   └── constants.ts               # ENV, RETRY_CONFIG
│   └── lib/
│       ├── middleware/
│       │   ├── logger.ts              # Structured logging
│       │   ├── rate-limiter.ts        # Sliding window (per IP)
│       │   └── signature-validator.ts # LINE HMAC + Bearer auth
│       ├── services/
│       │   ├── supabase.service.ts          # Singleton Supabase client
│       │   ├── line.service.ts              # LINE API client
│       │   ├── google-sheets.service.ts     # Messages/Stats → Supabase DB
│       │   ├── google-drive.service.ts      # File upload → Supabase Storage
│       │   ├── gemini.service.ts            # Vision OCR
│       │   ├── financial-parser.service.ts  # Thai financial message parse
│       │   ├── financial-sheets.service.ts  # Financial_Records → Supabase DB
│       │   └── webhook-processor.service.ts # Orchestration
│       ├── types/
│       │   ├── common.types.ts
│       │   ├── line.types.ts
│       │   ├── sheets.types.ts
│       │   └── financial.types.ts
│       └── utils/
│           ├── retry.ts               # Exponential backoff
│           ├── error-handler.ts       # Typed AppError classes
│           └── helpers.ts             # UUID, sanitize, etc.
├── src/__tests__/          # Unit tests
├── .env.local              # Local environment variables (ไม่ commit)
├── .gitignore
├── next.config.ts
├── vercel.json
├── tsconfig.json
└── package.json
```

---

*Built with Next.js 15 · Deployed on Vercel · Powered by Supabase + Gemini AI*
