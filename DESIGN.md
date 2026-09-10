---
name: line-dashboard-bot
description: Adaptive POS, Daily Entry, and Analytics Design System
colors:
  primary: "#06c755"
  primary-hover: "#05b34c"
  primary-active: "#049f43"
  primary-tint: "#06c75518"
  dark-bg: "#12141c"
  dark-surface: "#181c28"
  dark-surface-raised: "#202536"
  dark-border: "#2b3248"
  dark-text: "#f0f2f8"
  dark-text-muted: "#8e99b0"
  light-bg: "#f8fafc"
  light-surface: "#ffffff"
  light-surface-raised: "#f1f5f9"
  light-border: "#e2e8f0"
  light-text: "#0f172a"
  light-text-muted: "#64748b"
  danger: "#ef4444"
  warning: "#f59e0b"
  success: "#10b981"
  delivery-lineman: "#06c755"
  delivery-grab: "#00b14f"
  delivery-robinhood: "#8c44db"
  delivery-shopee: "#ee4d2d"
typography:
  caption:
    fontSize: "0.75rem"
    fontWeight: 500
    lineHeight: 1.3
  caption-md:
    fontSize: "0.8rem"
    fontWeight: 600
    lineHeight: 1.3
  label:
    fontSize: "0.85rem"
    fontWeight: 600
    lineHeight: 1.3
  body-sm:
    fontSize: "0.9rem"
    fontWeight: 400
    lineHeight: 1.4
  body:
    fontSize: "0.95rem"
    fontWeight: 400
    lineHeight: 1.5
  tabular:
    fontSize: "1rem"
    fontWeight: 600
    lineHeight: 1.4
  subtitle:
    fontSize: "1.05rem"
    fontWeight: 700
    lineHeight: 1.3
  title-sm:
    fontSize: "1.1rem"
    fontWeight: 700
    lineHeight: 1.3
  title:
    fontSize: "1.25rem"
    fontWeight: 700
    lineHeight: 1.3
  title-lg:
    fontSize: "1.5rem"
    fontWeight: 800
    lineHeight: 1.2
  display:
    fontSize: "clamp(1.75rem, 4vw, 2.25rem)"
    fontWeight: 700
    lineHeight: 1.2
rounded:
  sm: "6px"
  md: "10px"
  lg: "16px"
  pill: "9999px"
spacing:
  xs: "4px"
  sm: "8px"
  md: "16px"
  lg: "24px"
  xl: "32px"
components:
  button-primary:
    backgroundColor: "{colors.primary}"
    textColor: "#ffffff"
    rounded: "{rounded.md}"
    padding: "12px 20px"
    height: "48px"
  button-primary-hover:
    backgroundColor: "{colors.primary-hover}"
---

# Design System

<!-- impeccable:design-schema 1 -->

## Overview

ระบบออกแบบสำหรับ **LINE Dashboard & POS Entry** พัฒนาขึ้นเพื่อตอบสนองการใช้งานของร้านค้าและร้านอาหาร (ทั้งหน้าร้านและหลังร้าน) รองรับสถาปัตยกรรม **Adaptive Theme** (Light / Dark Mode อัตโนมัติตามสภาพแวดล้อมและระบบ) 

หัวใจสำคัญของการออกแบบคือ:
1. **High Glanceability & Speed**: ตัวเลขยอดเงิน สถิติ และสถานะต้องกวาดตาเห็นได้ในแวบแรก
2. **Fat-finger Proofing**: ปุ่มกดและฟอร์มมี Touch Target ขั้นต่ำ 48px ลดข้อผิดพลาดในการแตะจอหน้าร้าน
3. **Tabular Precision**: จัดระเบียบตัวเลขการเงินและน้ำหนักด้วย `font-variant-numeric: tabular-nums`

---

## Colors

### Adaptive Surface Architecture
เราหลีกเลี่ยงสีดำหรือเทาล้วน (#000000 / #888888) เพื่อไม่ให้หน้าจอดูทึบตันและไร้มิติ โดยใช้โทน Deep Tinted Slate:
- **Dark Palette**:
  - Background: `#12141c` (Deep Indigo-tinted Night)
  - Card / Surface: `#181c28`
  - Surface Raised / Modal: `#202536`
  - Border: `#2b3248`
  - Text Primary: `#f0f2f8`
  - Text Muted: `#8e99b0`
- **Light Palette**:
  - Background: `#f8fafc` (Cool Slate Mist)
  - Card / Surface: `#ffffff`
  - Surface Raised: `#f1f5f9`
  - Border: `#e2e8f0`
  - Text Primary: `#0f172a`
  - Text Muted: `#64748b`

### Accent & Delivery Channels
- **LINE Core**: `#06C755` (Hover: `#05B34C`)
- **Delivery Presets**:
  - LINE MAN: `#06C755`
  - Grab: `#00B14F`
  - Robinhood: `#8C44DB`
  - ShopeeFood: `#EE4D2D`

---

## Typography

- **Font Family**: รองรับภาษาไทยและละตินอย่างกลมกลืน:
  `-apple-system, BlinkMacSystemFont, "Segoe UI", Roboto, "Noto Sans Thai", sans-serif`
- **Tabular Numerics**: ทุกจุดที่แสดงยอดเงิน (บาท), กิโลกรัม, เปอร์เซ็นต์กำไร และยอดรวม ต้องกำหนด:
  `font-variant-numeric: tabular-nums;`
  เพื่อให้หลักตัวเลขตรงกันเสมอเมื่อตัวเลขเปลี่ยนแปลง

---

## Layout

- **Mobile First Responsive**:
  - Mobile (<640px): ฟอร์มจัดเรียงแบบ Single-column ไหลลื่น สะดวกต่อการเลื่อนด้วยนิ้วเดียว
  - Tablet (640px - 1024px): Split-view แยกกลุ่มรายรับ (Revenue) และค่าใช้จ่าย (Expenses) ซ้าย-ขวา
  - Desktop (>1024px): Multi-column พร้อม Sidebar / Sticky Summary Bar ด้านล่างหรือด้านข้าง
- **Touch Target Floor**: 
  - ส่วน interactive ทุกชิ้น (ปุ่ม, input, dropdown, icon button) มีความสูงหรือพื้นที่สัมผัสอย่างน้อย `48px`

---

## Elevation & Depth

- หลีกเลี่ยง Card ซ้อน Card หลายชั้น
- ใช้ Subtle Borders (`1px solid var(--border)`) ร่วมกับ Soft Ambient Shadows
- เมื่อเปิด Modal / Drawer ใช้ Backdrop Blur เล็กน้อย (`backdrop-filter: blur(8px)`) เพื่อคงความลึกของมิติ

---

## Shapes

- **Corner Radius**:
  - Small Elements (Badges, Tags, Input Chips): `6px` (`--rounded-sm`)
  - Inputs & Buttons: `10px` (`--rounded-md`)
  - Cards & Containers: `16px` (`--rounded-lg`)
  - Status Pills / Filter Tabs: `9999px` (`--rounded-pill`)

---

## Components

### 1. Form Inputs & Steppers
- ฟิลด์จำนวนเงินและน้ำหนักมี Label ภาษาไทยชัดเจน พร้อมหน่วยกำกับ (บาท / กก.)
- รองรับ Quick Preset Buttons (เช่น ปุ่มแตะเพิ่มทีละ +10, +50 หรือ Preset ยี่ห้อ Delivery)
- มี Feedback ชัดเจนเมื่อถูก Focus ด้วย Ring สีแบรนด์ (`box-shadow: 0 0 0 2px var(--primary-tint)`)

### 2. KPI Cards
- แสดง Metric หลักตัวใหญ่ ชัดเจน พร้อม Percentage badge (เขียวสำหรับยอดบวก, แดงสำหรับยอดติดลบ)
- ตัวเลขขนาด `clamp(1.5rem, 3vw, 2rem)` แบบ Tabular

### 3. Record Modal & Tables
- ตารางบันทึกมี Sticky Table Header อ่านง่ายบนแท็บเล็ตและเดสก์ท็อป
- แถวของตารางสลับสีนวลตา (Zebra Striping นุ่มนวล) สำหรับข้อมูลยาว

---

## Do's and Don'ts

### Do's
- ✅ ใช้ `tabular-nums` สำหรับตัวเลขและการเงินทุกครั้ง
- ✅ จัดกลุ่มข้อมูลที่เกี่ยวข้องกัน เช่น หมวดหมู่รายรับเดลิเวอรี่, ค่าแรง, วัตถุดิบ
- ✅ กำหนดปุ่ม Action หลัก (Primary CTA) ชัดเจนเพียง 1 ปุ่มต่อมุมมอง
- ✅ รองรับสถานะ Empty State และ Error State พร้อมปุ่มแนะนำวิธีแก้ไข

### Don'ts
- ❌ อย่าใช้พื้นหลังสีดำทึบ `#000000` แบบไม่ Tint
- ❌ อย่าซ้อน Card ใน Card เกิน 2 ชั้น (ให้ใช้ Divider เส้นบาง หรือ Spacing แทน)
- ❌ อย่าใช้ตัวหนังสือสีเทาเข้มบนพื้นหลังสีคล้ำจน Contrast ไม่ผ่านเกณฑ์ WCAG AA (อย่างน้อย 4.5:1)
- ❌ อย่าทำปุ่มกดเล็กกว่า 44px-48px บนหน้าจอสัมผัส
