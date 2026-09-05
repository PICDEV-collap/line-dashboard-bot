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
            'bg': '#064e3b',
            'border': '#10b981',
            'accent': '#34d399',
            'col': 0, 'row': 0
        },
        {
            'title': 'สรุปวันนี้ (เลือกสาขา)',
            'sub': 'รวมทุกสาขา • ตลาดญี่ปุ่น • สายหนองปิง',
            'bg': '#1e3a8a',
            'border': '#3b82f6',
            'accent': '#60a5fa',
            'col': 1, 'row': 0
        },
        {
            'title': 'เช็คยอดหมูประจำวัน',
            'sub': 'หมูแดง • หมูสับ • มันหมู ทุกสาขา',
            'bg': '#7c2d12',
            'border': '#ea580c',
            'accent': '#fb923c',
            'col': 0, 'row': 1
        },
        {
            'title': 'ช่วยเหลือ / คู่มือคำสั่ง',
            'sub': 'ดูคำแนะนำและวิธีใช้งานบอท',
            'bg': '#1e293b',
            'border': '#64748b',
            'accent': '#94a3b8',
            'col': 1, 'row': 1
        }
    ]

    col_x = [0, 1250, 2500]
    row_y = [0, 421, 843]

    font_path_bold = 'C:/Windows/Fonts/LeelaUIb.ttf'
    if not os.path.exists(font_path_bold):
        font_path_bold = 'C:/Windows/Fonts/tahomabd.ttf'

    # Prominent headline typography fitting button frames
    f_title = ImageFont.truetype(font_path_bold, 122)
    f_sub = ImageFont.truetype(font_path_bold, 58)

    for t in tiles:
        x1 = col_x[t['col']]
        x2 = col_x[t['col'] + 1]
        y1 = row_y[t['row']]
        y2 = row_y[t['row'] + 1]

        # Inset padding to give clean button frames
        pad_x = 12
        pad_y = 10
        bx1 = x1 + pad_x
        bx2 = x2 - pad_x
        by1 = y1 + pad_y
        by2 = y2 - pad_y
        cx = (bx1 + bx2) // 2

        # Draw button card with rounded corners and border
        draw.rounded_rectangle([bx1, by1, bx2, by2], radius=24, fill=t['bg'], outline=t['border'], width=6)

        # Top accent highlight bar inside button card
        draw.rounded_rectangle([bx1 + 20, by1 + 4, bx2 - 20, by1 + 10], radius=3, fill=t['accent'])

        # Calculate bounding boxes
        bbox_t = draw.textbbox((0, 0), t['title'], font=f_title)
        tw = bbox_t[2] - bbox_t[0]
        th = bbox_t[3] - bbox_t[1]

        bbox_s = draw.textbbox((0, 0), t['sub'], font=f_sub)
        sw = bbox_s[2] - bbox_s[0]
        sh = bbox_s[3] - bbox_s[1]

        gap = 26
        total_text_h = th + gap + sh

        # Vertically center text in the button frame
        start_y = by1 + (by2 - by1 - total_text_h) // 2 - 14
        title_y = start_y
        sub_y = title_y + th + gap

        # Title with subtle shadow for contrast
        draw.text((cx - tw // 2 + 3, title_y + 3), t['title'], fill='#000000', font=f_title)
        draw.text((cx - tw // 2, title_y), t['title'], fill='#FFFFFF', font=f_title)

        # Subtitle with subtle shadow for contrast
        draw.text((cx - sw // 2 + 2, sub_y + 2), t['sub'], fill='#000000', font=f_sub)
        draw.text((cx - sw // 2, sub_y), t['sub'], fill='#F1F5F9', font=f_sub)

    os.makedirs(os.path.dirname(output_path), exist_ok=True)
    img.save(output_path, 'PNG', optimize=True)
    print(f"Generated large-font 4-tile {output_path}: {img.size} ({os.path.getsize(output_path)} bytes)")

if __name__ == '__main__':
    generate_rich_menu_image()
