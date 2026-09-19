import os
from PIL import Image, ImageDraw, ImageFont

def hex_to_rgb(hex_str):
    hex_str = hex_str.lstrip('#')
    return tuple(int(hex_str[i:i+2], 16) for i in (0, 2, 4))

def draw_rounded_gradient(x1, y1, x2, y2, color_start, color_end, radius=0):
    w = x2 - x1
    h = y2 - y1
    mask = Image.new('L', (w, h), 0)
    mask_draw = ImageDraw.Draw(mask)
    mask_draw.rounded_rectangle([0, 0, w, h], radius=radius, fill=255)
    
    grad_img = Image.new('RGBA', (w, h))
    grad_draw = ImageDraw.Draw(grad_img)
    r1, g1, b1 = color_start
    r2, g2, b2 = color_end
    
    for y in range(h):
        t = y / max(1, h - 1)
        r = int(r1 + (r2 - r1) * t)
        g = int(g1 + (g2 - g1) * t)
        b = int(b1 + (b2 - b1) * t)
        grad_draw.line([(0, y), (w, y)], fill=(r, g, b, 255))
    
    grad_img.putalpha(mask)
    return grad_img

def generate_modern_richmenu(output_path='public/richmenu.png'):
    W, H = 2500, 843
    base_img = Image.new('RGBA', (W, H), '#070a10')
    
    col_x = [0, 1250, 2500]
    row_y = [0, 421, 843]

    font_bold = 'C:/Windows/Fonts/LeelaUIb.ttf'
    if not os.path.exists(font_bold):
        font_bold = 'C:/Windows/Fonts/tahomabd.ttf'

    font_regular = 'C:/Windows/Fonts/LeelawUI.ttf'
    if not os.path.exists(font_regular):
        font_regular = font_bold

    font_emoji = 'C:/Windows/Fonts/seguiemj.ttf'

    f_title = ImageFont.truetype(font_bold, 82)
    f_sub = ImageFont.truetype(font_bold, 38)
    f_tag = ImageFont.truetype(font_bold, 27)
    f_arrow = ImageFont.truetype(font_bold, 52)
    f_icon = ImageFont.truetype(font_emoji, 110)

    tiles = [
        {
            'col': 0, 'row': 0,
            'tag': 'บันทึกข้อมูล  |  QUICK ENTRY',
            'title': 'กรอกรายรับ-รายจ่าย',
            'sub': 'ตารางบันทึกยอดสด โอน เดลิเวอรี บนมือถือ',
            'icon': '📝',
            'bg_start': hex_to_rgb('#0e3a2f'),
            'bg_end': hex_to_rgb('#051b14'),
            'glow': hex_to_rgb('#10b981'),
            'border': hex_to_rgb('#10b981'),
            'border_top': hex_to_rgb('#34d399'),
            'accent': hex_to_rgb('#34d399'),
            'tag_bg': (16, 185, 129, 45),
            'tag_border': (52, 211, 153, 140),
            'icon_bg_start': hex_to_rgb('#135444'),
            'icon_bg_end': hex_to_rgb('#06382b')
        },
        {
            'col': 1, 'row': 0,
            'tag': 'สรุปยอดขาย  |  ANALYTICS',
            'title': 'สรุปวันนี้ (เลือกสาขา)',
            'sub': 'รวมทุกสาขา  •  ตลาดญี่ปุ่น  •  สายหนองปิง',
            'icon': '📊',
            'bg_start': hex_to_rgb('#123872'),
            'bg_end': hex_to_rgb('#081d3d'),
            'glow': hex_to_rgb('#3b82f6'),
            'border': hex_to_rgb('#3b82f6'),
            'border_top': hex_to_rgb('#60a5fa'),
            'accent': hex_to_rgb('#60a5fa'),
            'tag_bg': (59, 130, 246, 45),
            'tag_border': (96, 165, 250, 140),
            'icon_bg_start': hex_to_rgb('#204ecf'),
            'icon_bg_end': hex_to_rgb('#132f7a')
        },
        {
            'col': 0, 'row': 1,
            'tag': 'เช็คสต็อกหมู  |  INVENTORY',
            'title': 'เช็คยอดหมู (เลือกวัน)',
            'sub': 'ยอดหมูวันนี้  •  พรุ่งนี้  •  เมื่อวาน',
            'icon': '🥩',
            'bg_start': hex_to_rgb('#4a220e'),
            'bg_end': hex_to_rgb('#240e04'),
            'glow': hex_to_rgb('#f97316'),
            'border': hex_to_rgb('#f97316'),
            'border_top': hex_to_rgb('#fb923c'),
            'accent': hex_to_rgb('#fb923c'),
            'tag_bg': (249, 115, 22, 45),
            'tag_border': (251, 146, 60, 140),
            'icon_bg_start': hex_to_rgb('#b43f10'),
            'icon_bg_end': hex_to_rgb('#5a1a05')
        },
        {
            'col': 1, 'row': 1,
            'tag': 'สรุปผลประกอบการ  |  PDF REPORT',
            'title': 'Summary Report',
            'sub': 'เลือกดูตามเดือน  •  ปี  •  สาขา  •  โหลด PDF',
            'icon': '📈',
            'bg_start': hex_to_rgb('#341870'),
            'bg_end': hex_to_rgb('#180a38'),
            'glow': hex_to_rgb('#8b5cf6'),
            'border': hex_to_rgb('#8b5cf6'),
            'border_top': hex_to_rgb('#a78bfa'),
            'accent': hex_to_rgb('#a78bfa'),
            'tag_bg': (139, 92, 246, 45),
            'tag_border': (167, 139, 250, 140),
            'icon_bg_start': hex_to_rgb('#7c3aed'),
            'icon_bg_end': hex_to_rgb('#3b1285')
        }
    ]

    card_radius = 32
    icon_radius = 28
    pad_x = 14
    pad_y = 12

    for t in tiles:
        x1 = col_x[t['col']]
        x2 = col_x[t['col'] + 1]
        y1 = row_y[t['row']]
        y2 = row_y[t['row'] + 1]

        bx1 = x1 + pad_x
        bx2 = x2 - pad_x
        by1 = y1 + pad_y
        by2 = y2 - pad_y
        card_w = bx2 - bx1
        card_h = by2 - by1

        # 1. Ambient Glow behind card
        glow_layer = Image.new('RGBA', (W, H), (0, 0, 0, 0))
        glow_draw = ImageDraw.Draw(glow_layer)
        glow_color = (*t['glow'], 32)
        glow_draw.ellipse([bx1 - 30, by1 - 30, bx1 + 360, by1 + 360], fill=glow_color)
        base_img = Image.alpha_composite(base_img, glow_layer)

        # 2. Draw Card Background Gradient
        card_grad = draw_rounded_gradient(bx1, by1, bx2, by2, t['bg_start'], t['bg_end'], radius=card_radius)
        base_img.paste(card_grad, (bx1, by1), card_grad)

        # 3. Draw Card Border & Top Glass Accent
        overlay = Image.new('RGBA', (W, H), (0, 0, 0, 0))
        overlay_draw = ImageDraw.Draw(overlay)

        # Card glowing outline
        border_rgba = (*t['border'], 235)
        overlay_draw.rounded_rectangle([bx1, by1, bx2, by2], radius=card_radius, outline=border_rgba, width=3)

        # Top glass reflection highlight bar
        top_bar_rgba = (*t['border_top'], 250)
        overlay_draw.rounded_rectangle([bx1 + 36, by1 + 3, bx2 - 36, by1 + 7], radius=2, fill=top_bar_rgba)

        # 4. Icon Container (Left side)
        icon_box_w = 176
        icon_box_h = 176
        icon_x1 = bx1 + 40
        icon_y1 = by1 + (card_h - icon_box_h) // 2
        icon_x2 = icon_x1 + icon_box_w
        icon_y2 = icon_y1 + icon_box_h

        icon_grad = draw_rounded_gradient(icon_x1, icon_y1, icon_x2, icon_y2, t['icon_bg_start'], t['icon_bg_end'], radius=icon_radius)
        base_img.paste(icon_grad, (icon_x1, icon_y1), icon_grad)

        # Icon box glowing outline
        overlay_draw.rounded_rectangle([icon_x1, icon_y1, icon_x2, icon_y2], radius=icon_radius, outline=(*t['border_top'], 210), width=2)
        # Inner glossy top light
        overlay_draw.rounded_rectangle([icon_x1 + 14, icon_y1 + 4, icon_x2 - 14, icon_y1 + 8], radius=2, fill=(255, 255, 255, 150))

        # Center Icon Emoji
        try:
            bbox_i = overlay_draw.textbbox((0, 0), t['icon'], font=f_icon, embedded_color=True)
            iw = bbox_i[2] - bbox_i[0]
            ih = bbox_i[3] - bbox_i[1]
            icx = (icon_x1 + icon_x2) // 2 - iw // 2
            icy = (icon_y1 + icon_y2) // 2 - ih // 2 - 12
            overlay_draw.text((icx, icy), t['icon'], font=f_icon, embedded_color=True)
        except Exception:
            overlay_draw.text((icon_x1 + 35, icon_y1 + 30), t['icon'], fill='#FFFFFF', font=f_title)

        # 5. Content Block (Right of icon, vertically centered)
        content_x = icon_x2 + 38
        
        # Calculate heights for vertical centering
        tag_h = 36
        bbox_t = overlay_draw.textbbox((0, 0), t['title'], font=f_title)
        th = bbox_t[3] - bbox_t[1]
        bbox_s = overlay_draw.textbbox((0, 0), t['sub'], font=f_sub)
        sh = bbox_s[3] - bbox_s[1]
        
        gap_tag_title = 12
        gap_title_sub = 14
        total_text_h = tag_h + gap_tag_title + th + gap_title_sub + sh
        
        # Start Y perfectly centers the text group inside the card
        tag_y1 = by1 + (card_h - total_text_h) // 2 - 4
        tag_y2 = tag_y1 + tag_h

        # 5.1 Tag Badge Pill with colored glowing dot
        tag_text = t['tag']
        bbox_tag = overlay_draw.textbbox((0, 0), tag_text, font=f_tag)
        tag_w = bbox_tag[2] - bbox_tag[0] + 46
        tag_x1 = content_x
        tag_x2 = tag_x1 + tag_w

        overlay_draw.rounded_rectangle([tag_x1, tag_y1, tag_x2, tag_y2], radius=11, fill=t['tag_bg'], outline=t['tag_border'], width=1)
        # Glowing dot inside tag
        dot_cx = tag_x1 + 16
        dot_cy = tag_y1 + tag_h // 2
        overlay_draw.ellipse([dot_cx - 5, dot_cy - 5, dot_cx + 5, dot_cy + 5], fill=(*t['border_top'], 255))
        overlay_draw.text((tag_x1 + 28, tag_y1 + 4), tag_text, fill=(*t['border_top'], 255), font=f_tag)

        # 5.2 Title Text (Large, crisp, drop-shadowed)
        title_y = tag_y2 + gap_tag_title
        overlay_draw.text((content_x + 3, title_y + 3), t['title'], fill=(0, 0, 0, 220), font=f_title)
        overlay_draw.text((content_x, title_y), t['title'], fill='#FFFFFF', font=f_title)

        # 5.3 Subtitle Text
        sub_y = title_y + th + gap_title_sub
        overlay_draw.text((content_x + 2, sub_y + 2), t['sub'], fill=(0, 0, 0, 200), font=f_sub)
        overlay_draw.text((content_x, sub_y), t['sub'], fill='#E2E8F0', font=f_sub)

        # 6. Right Action Chevron Button
        action_btn_d = 72
        action_cx = bx2 - 70
        action_cy = by1 + card_h // 2
        ax1 = action_cx - action_btn_d // 2
        ay1 = action_cy - action_btn_d // 2
        ax2 = ax1 + action_btn_d
        ay2 = ay1 + action_btn_d

        overlay_draw.ellipse([ax1, ay1, ax2, ay2], fill=(255, 255, 255, 22), outline=(*t['border_top'], 160), width=2)
        bbox_arr = overlay_draw.textbbox((0, 0), '›', font=f_arrow)
        aw = bbox_arr[2] - bbox_arr[0]
        ah = bbox_arr[3] - bbox_arr[1]
        overlay_draw.text((action_cx - aw // 2 + 2, action_cy - ah // 2 - 10), '›', fill='#FFFFFF', font=f_arrow)

        base_img = Image.alpha_composite(base_img, overlay)

    # Convert to RGB and save
    final_rgb = base_img.convert('RGB')
    os.makedirs(os.path.dirname(output_path), exist_ok=True)
    final_rgb.save(output_path, 'PNG', optimize=True)
    print(f"Generated modern richmenu at {output_path} ({final_rgb.size[0]}x{final_rgb.size[1]}, {os.path.getsize(output_path)} bytes)")

if __name__ == '__main__':
    generate_modern_richmenu()
