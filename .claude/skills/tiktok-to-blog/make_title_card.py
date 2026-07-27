"""Branded title-card cover for the comparison post: dark site background,
amber accent, title, and a small comparison-chip row. 1440x810 -> 720x405 webp."""
from PIL import Image, ImageDraw, ImageFont

W, H = 1440, 810
img = Image.new("RGB", (W, H), "#09090b")
d = ImageDraw.Draw(img)

# subtle vertical glow from bottom-left, amber tinted
for y in range(H):
    t = y / H
    r = int(9 + 18 * t)
    g = int(9 + 11 * t)
    b = int(11 + 2 * t)
    d.line([(0, y), (W, y)], fill=(r, g, b))

# faint grid
grid = (255, 255, 255, 10)
overlay = Image.new("RGBA", (W, H), (0, 0, 0, 0))
od = ImageDraw.Draw(overlay)
for x in range(0, W, 96):
    od.line([(x, 0), (x, H)], fill=grid, width=1)
for y in range(0, H, 96):
    od.line([(0, y), (W, y)], fill=grid, width=1)
img = Image.alpha_composite(img.convert("RGBA"), overlay)
d = ImageDraw.Draw(img)

def font(path, size):
    return ImageFont.truetype(path, size)

FB = r"C:\Windows\Fonts\segoeuib.ttf"   # bold
FR = r"C:\Windows\Fonts\segoeui.ttf"    # regular
FSB = r"C:\Windows\Fonts\seguisb.ttf"   # semibold

# top-left brand
d.text((90, 78), "BITWAVE BLOG", font=font(FSB, 30), fill=(245, 158, 11))

# amber accent bar
d.rectangle([90, 140, 210, 152], fill=(245, 158, 11))

# title
d.text((86, 200), "Best ISP Billing System", font=font(FB, 96), fill=(255, 255, 255))
d.text((86, 316), "in Kenya (2026)", font=font(FB, 96), fill=(255, 255, 255))
d.text((90, 452), "An honest comparison — M-Pesa, MikroTik & real KES pricing",
       font=font(FR, 40), fill=(255, 255, 255, 168))

# comparison chips row
names = ["Bitwave", "Jasiyo", "Netily", "Ndovu", "Free options"]
x = 90
y0, y1 = 580, 660
for i, n in enumerate(names):
    f = font(FSB, 36)
    tw = d.textlength(n, font=f)
    pad = 34
    w = tw + pad * 2
    if i == 0:
        d.rounded_rectangle([x, y0, x + w, y1], radius=16, fill=(245, 158, 11))
        d.text((x + pad, y0 + 16), n, font=f, fill=(9, 9, 11))
    else:
        d.rounded_rectangle([x, y0, x + w, y1], radius=16,
                            outline=(255, 255, 255, 70), width=2)
        d.text((x + pad, y0 + 16), n, font=f, fill=(255, 255, 255, 190))
    x += w + 24
    if i < len(names) - 1:
        d.text((x, y0 + 14), "vs", font=font(FR, 34), fill=(245, 158, 11, 200))
        x += d.textlength("vs", font=font(FR, 34)) + 24

# footer domain
d.text((90, 726), "bitwavetechnologies.com/blog", font=font(FR, 30),
       fill=(255, 255, 255, 120))

out = img.convert("RGB").resize((720, 405), Image.LANCZOS)
import sys
out.save(sys.argv[1], "WEBP", quality=85)
print("saved", sys.argv[1])
