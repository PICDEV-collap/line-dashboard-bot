-- ============================================================
-- LINE Dashboard Bot — Supabase Schema
-- รัน SQL นี้ใน: Supabase Dashboard → SQL Editor → Run
-- ============================================================

-- ─────────────────────────────────────────
-- 1. messages
-- ─────────────────────────────────────────
create table if not exists messages (
  id                text        primary key,
  timestamp         timestamptz not null,
  user_id           text        not null,
  display_name      text,
  type              text        not null,
  content           text,
  image_url         text,
  file_url          text,
  location_lat      numeric,
  location_lng      numeric,
  location_address  text,
  reply_token       text,
  status            text        not null default 'pending',
  error_message     text,
  created_at        timestamptz default now()
);

create index if not exists idx_messages_user_id   on messages (user_id);
create index if not exists idx_messages_timestamp on messages (timestamp desc);
create index if not exists idx_messages_status    on messages (status);

-- ─────────────────────────────────────────
-- 2. ocr_results
-- ─────────────────────────────────────────
create table if not exists ocr_results (
  id                  text    primary key,
  message_id          text,
  timestamp           timestamptz not null,
  image_url           text,
  raw_text            text,
  structured_json     text,
  confidence          numeric,
  processing_time_ms  integer
);

-- ─────────────────────────────────────────
-- 3. daily_stats
-- ─────────────────────────────────────────
create table if not exists daily_stats (
  date            text    primary key,
  total_messages  integer default 0,
  text_count      integer default 0,
  image_count     integer default 0,
  pdf_count       integer default 0,
  location_count  integer default 0,
  ocr_count       integer default 0,
  error_count     integer default 0,
  updated_at      timestamptz default now()
);

-- ─────────────────────────────────────────
-- 4. financial_records
-- ─────────────────────────────────────────
create table if not exists financial_records (
  id              text    primary key,
  date            text    not null,
  shop_id         text    not null,
  shop_name       text,
  revenue         numeric not null default 0,
  transfer        numeric not null default 0,
  cash            numeric not null default 0,
  delivery        numeric not null default 0,
  expense         numeric not null default 0,
  pork            numeric not null default 0,
  pork_breakdown  jsonb,
  materials       numeric not null default 0,
  supplies        numeric not null default 0,
  gas             numeric not null default 150,
  labor           numeric not null default 1500,
  ice             numeric not null default 35,
  extra_expenses  jsonb   not null default '[]',
  profit          numeric not null default 0,
  margin_pct      numeric not null default 0,
  note            text,
  status          text    not null default 'complete',
  created_at      timestamptz default now(),
  updated_at      timestamptz default now()
);

-- unique constraint สำหรับ bulk import idempotency
create unique index if not exists idx_financial_records_shop_date
  on financial_records (shop_id, date);

create index if not exists idx_financial_records_date
  on financial_records (date desc);

-- ─────────────────────────────────────────
-- 5. Storage bucket
-- ─────────────────────────────────────────
-- รันใน SQL Editor หรือสร้าง bucket ผ่าน UI:
-- Storage → New bucket → Name: "line-files" → Public: ON

insert into storage.buckets (id, name, public)
values ('line-files', 'line-files', true)
on conflict (id) do nothing;
