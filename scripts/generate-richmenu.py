import os
from PIL import Image, ImageDraw, ImageFont

def generate_rich_menu_image(output_path='public/richmenu.png'):
    # Compact 4-tile Rich Menu (2 columns x 2 rows, 2500 x 843 px)
    W, H = 2500, 843
    img = Image.new('RGB', (W, H), '#0b0f19')
    draw = ImageDraw.Draw(img)

    tiles = [
        {
            'title': 'กรอกรายรับ-รายจ่าย',
            'sub': 'เปิดตารางบันทึกยอดบนมือถือ',
            'badge': 'ENTRY',
            'bg': '#064e3b',
            'accent': '#10b981',
            'col': 0, 'row': 0
        },
        {
            'title': 'สรุปวันนี้ (เลือกสาขา)',
            'sub': 'รวมทุกสาขา / ตลาดญี่ปุ่น / สายหนองปิง',
            'badge': 'SUMMARY',
            'bg': '#1e3a8a',
            'accent': '#3b82f6',
            'col': 1, 'row': 0
        },
        {
            'title': 'เช็คยอดหมูประจำวัน',
            'sub': 'หมูแดง / หมูสับ / มันหมู ทุกสาขา',
            'badge': 'PORK',
            'bg': '#7c2d12',
            'accent': '#ea580c',
            'col': 0, 'row': 1
        },
        {
            'title': 'ช่วยเหลือ / คู่มือคำสั่ง',
            'sub': 'ดูคำสั่งและวิธีใช้งานบอท',
            'badge': 'HELP',
            'bg': '#1f2937',
            'accent': '#64748b',
            'col': 1, 'row': 1
        }
    ]

    col_x = [0, 1250, 2500]
    row_y = [0, 421, 843]

    font_path_bold = 'C:/Windows/Fonts/LeelaUIb.ttf'
    if not os.path.exists(font_path_bold):
        font_path_bold = 'C:/Windows/Fonts/tahomabd.ttf'

    font_path_reg = 'C:/Windows/Fonts/LeelawUI.ttf'
    if not os.path.exists(font_path_reg):
        font_path_reg = 'C:/Windows/Fonts/tahoma.ttf'

    f_badge = ImageFont.truetype(font_path_bold, 36)
    f_title = ImageFont.truetype(font_path_bold, 70)
    f_sub = ImageFont.truetype(font_path_reg, 38)

    for t in tiles:
        x1 = col_x[t['col']]
        x2 = col_x[t['col'] + 1]
        y1 = row_y[t['row']]
        y2 = row_y[t['row'] + 1]
        cx = (x1 + x2) // 2

        # Tile background
        draw.rectangle([x1, y1, x2, y2], fill=t['bg'], outline='#0f172a', width=6)
        
        # Accent top bar
        draw.rectangle([x1, y1, x2, y1 + 10], fill=t['accent'])

        # 1. Badge
        b_text = t['badge']
        bbox_b = draw.textbbox((0, 0), b_text, font=f_badge)
        bw = bbox_b[2] - bbox_b[0]
        bh = bbox_b[3] - bbox_b[1]
        by1 = y1 + 42
        bx1 = cx - bw // 2 - 24
        bx2 = cx + bw // 2 + 24
        by2 = by1 + bh + 14
        draw.rounded_rectangle([bx1, by1, bx2, by2], radius=10, fill='#0b0f19', outline=t['accent'], width=3)
        draw.text((cx - bw // 2, by1 + 6), b_text, fill=t['accent'], font=f_badge)

        # 2. Title
        bbox_t = draw.textbbox((0, 0), t['title'], font=f_title)
        tw = bbox_t[2] - bbox_t[0]
        title_y = y1 + 165
        draw.text((cx - tw // 2 + 2, title_y + 2), t['title'], fill='#000000', font=f_title)
        draw.text((cx - tw // 2, title_y), t['title'], fill='#FFFFFF', font=f_title)

        # 3. Subtitle
        bbox_s = draw.textbbox((0, 0), t['sub'], font=f_sub)
        sw = bbox_s[2] - bbox_s[0]
        sub_y = y1 + 280
        draw.text((cx - sw // 2 + 1, sub_y + 1), t['sub'], fill='#000000', font=f_sub)
        draw.text((cx - sw // 2, sub_y), t['sub'], fill='#E2E8F0', font=f_sub)

    os.makedirs(os.path.dirname(output_path), exist_ok=True)
    img.save(output_path, 'PNG', optimize=True)
    print(f"Generated 4-tile compact {output_path}: {img.size} ({os.path.getsize(output_path)} bytes)")

if __name__ == '__main__':
    generate_rich_menu_image()
