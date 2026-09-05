import os
from PIL import Image, ImageDraw, ImageFont

def generate_rich_menu_image(output_path='public/richmenu.png'):
    W, H = 2500, 1686
    img = Image.new('RGB', (W, H), '#0b0f19')
    draw = ImageDraw.Draw(img)

    # 6 tiles: 3 columns x 2 rows
    # Row 1: y=0..843, Row 2: y=843..1686
    # Col 1: x=0..833, Col 2: x=833..1667, Col 3: x=1667..2500
    tiles = [
        {
            'title': 'กรอกรายรับ-รายจ่าย',
            'sub': 'ตารางบันทึกยอดประจำวัน',
            'badge': 'ENTRY',
            'bg_grad': '#064e3b',
            'accent': '#10b981',
            'x1': 0, 'y1': 0, 'x2': 833, 'y2': 843
        },
        {
            'title': 'สรุปวันนี้',
            'sub': 'ดูยอดขายทุกสาขา',
            'badge': 'TODAY',
            'bg_grad': '#1e3a8a',
            'accent': '#3b82f6',
            'x1': 833, 'y1': 0, 'x2': 1667, 'y2': 843
        },
        {
            'title': 'เช็คยอดหมู',
            'sub': 'หมูแดง / หมูสับ / มันหมู',
            'badge': 'PORK',
            'bg_grad': '#7c2d12',
            'accent': '#ea580c',
            'x1': 1667, 'y1': 0, 'x2': 2500, 'y2': 843
        },
        {
            'title': 'สรุป ตลาดญี่ปุ่น',
            'sub': 'ยอดขาย & กำไร สาขา 1',
            'badge': 'SHOP 1',
            'bg_grad': '#0f766e',
            'accent': '#14b8a6',
            'x1': 0, 'y1': 843, 'x2': 833, 'y2': 1686
        },
        {
            'title': 'สรุป สายหนองปิง',
            'sub': 'ยอดขาย & กำไร สาขา 2',
            'badge': 'SHOP 2',
            'bg_grad': '#581c87',
            'accent': '#a855f7',
            'x1': 833, 'y1': 843, 'x2': 1667, 'y2': 1686
        },
        {
            'title': 'ช่วยเหลือ / คำสั่ง',
            'sub': 'ดูคำสั่งและคู่มือใช้งาน',
            'badge': 'HELP',
            'bg_grad': '#1f2937',
            'accent': '#64748b',
            'x1': 1667, 'y1': 843, 'x2': 2500, 'y2': 1686
        }
    ]

    # Use Leelawadee UI Bold for beautiful Thai typography, fallback to Tahoma Bold
    font_path_bold = 'C:/Windows/Fonts/LeelaUIb.ttf'
    if not os.path.exists(font_path_bold):
        font_path_bold = 'C:/Windows/Fonts/tahomabd.ttf'

    font_path_reg = 'C:/Windows/Fonts/LeelawUI.ttf'
    if not os.path.exists(font_path_reg):
        font_path_reg = 'C:/Windows/Fonts/tahoma.ttf'

    # Enlarged badge & subtitle fonts
    font_badge = ImageFont.truetype(font_path_bold, 52)
    font_sub = ImageFont.truetype(font_path_bold, 56)

    for t in tiles:
        tile_w = t['x2'] - t['x1']
        tile_h = t['y2'] - t['y1']
        cx = (t['x1'] + t['x2']) // 2
        cy = (t['y1'] + t['y2']) // 2

        # Tile background
        draw.rectangle([t['x1'], t['y1'], t['x2'], t['y2']], fill=t['bg_grad'], outline='#0f172a', width=6)
        
        # Accent top bar (thicker)
        draw.rectangle([t['x1'], t['y1'], t['x2'], t['y1'] + 20], fill=t['accent'])
        
        # 1. Badge (Larger and prominent)
        badge_text = t['badge']
        bbox_b = draw.textbbox((0, 0), badge_text, font=font_badge)
        bw = bbox_b[2] - bbox_b[0]
        bh = bbox_b[3] - bbox_b[1]
        bx1 = cx - bw // 2 - 28
        by1 = cy - 210
        bx2 = cx + bw // 2 + 28
        by2 = by1 + bh + 20
        draw.rounded_rectangle([bx1, by1, bx2, by2], radius=16, fill='#0b0f19', outline=t['accent'], width=4)
        draw.text((cx - bw // 2, by1 + 8), badge_text, fill=t['accent'], font=font_badge)

        # 2. Title (Dynamically maximized to be as big as possible)
        target_size = 96
        title_font = ImageFont.truetype(font_path_bold, target_size)
        bbox_t = draw.textbbox((0, 0), t['title'], font=title_font)
        tw = bbox_t[2] - bbox_t[0]

        # Auto shrink slightly if title is too wide for the tile margin
        while tw > (tile_w - 70) and target_size > 76:
            target_size -= 2
            title_font = ImageFont.truetype(font_path_bold, target_size)
            bbox_t = draw.textbbox((0, 0), t['title'], font=title_font)
            tw = bbox_t[2] - bbox_t[0]

        th = bbox_t[3] - bbox_t[1]
        title_y = cy - 35
        # Draw subtle drop-shadow for crisp readability
        draw.text((cx - tw // 2 + 2, title_y + 2), t['title'], fill='#000000', font=title_font)
        draw.text((cx - tw // 2, title_y), t['title'], fill='#FFFFFF', font=title_font)
        
        # 3. Subtitle (Larger, high-contrast off-white)
        bbox_s = draw.textbbox((0, 0), t['sub'], font=font_sub)
        sw = bbox_s[2] - bbox_s[0]
        sub_y = cy + 105
        draw.text((cx - sw // 2 + 1, sub_y + 1), t['sub'], fill='#000000', font=font_sub)
        draw.text((cx - sw // 2, sub_y), t['sub'], fill='#F8FAFC', font=font_sub)

    os.makedirs(os.path.dirname(output_path), exist_ok=True)
    img.save(output_path, 'PNG', optimize=True)
    print(f"Generated {output_path} ({os.path.getsize(output_path)} bytes)")

if __name__ == '__main__':
    generate_rich_menu_image()
