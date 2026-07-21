#!/usr/bin/env python3
"""Crop a photo/frame into a 16:9 blog cover WebP.

Made for 9:16 TikTok stills (photo library or extract_frames.py output): a 16:9
band cropped around the subject, which conveniently cuts off the burned-in
captions that sit at ~72-78% of frame height on Biwavte videos.

Usage:
  python make_cover.py <src-image> <out.webp> [--focus 0.5] [--width 720] [--quality 80]

  --focus   vertical center of the crop as a fraction of image height
            (0.0 = top, 0.5 = middle, 1.0 = bottom). Pick it so the subject
            (face, router, phone screen) is centered AND any caption band is
            outside the crop. Typical values: faces 0.40, desk gear 0.60,
            devices held in hands 0.62.
  --width   output width in px (height = width * 9/16). Don't upscale past the
            source width; 720 is the max most TikTok frames support.
  --quality WebP quality (default 80; keep output under ~100 KB).
"""

import argparse
import sys


def ensure_pillow():
    try:
        import PIL  # noqa: F401
    except ImportError:
        import subprocess

        subprocess.check_call([sys.executable, "-m", "pip", "install", "pillow"])


def main() -> int:
    parser = argparse.ArgumentParser(description=__doc__)
    parser.add_argument("src")
    parser.add_argument("out")
    parser.add_argument("--focus", type=float, default=0.5)
    parser.add_argument("--width", type=int, default=720)
    parser.add_argument("--quality", type=int, default=80)
    parser.add_argument("--aspect", type=float, default=16 / 9,
                        help="width/height of the crop (default 16:9)")
    parser.add_argument("--zoom", type=float, default=1.0,
                        help="crop in on the horizontal center by this factor "
                             "(e.g. 1.35 to cut blurred side-bars off screen recordings)")
    args = parser.parse_args()

    ensure_pillow()
    from PIL import Image

    img = Image.open(args.src).convert("RGB")
    w, h = img.size

    crop_w = round(w / max(1.0, args.zoom))
    crop_h = round(crop_w / args.aspect)
    if crop_h > h:
        crop_h = h
        crop_w = round(crop_h * args.aspect)

    cy = round(args.focus * h)
    y = max(0, min(h - crop_h, cy - crop_h // 2))
    x = (w - crop_w) // 2
    band = img.crop((x, y, x + crop_w, y + crop_h))

    out_w = min(args.width, crop_w)  # never upscale
    out_h = round(out_w / args.aspect)
    band = band.resize((out_w, out_h), Image.LANCZOS)
    band.save(args.out, "WEBP", quality=args.quality, method=6)

    import os

    kb = os.path.getsize(args.out) / 1024
    print(f"{args.out}  {out_w}x{out_h}  {kb:.0f} KB")
    if kb > 150:
        print("WARNING: over the 150 KB budget - lower --quality or --width", file=sys.stderr)
    return 0


if __name__ == "__main__":
    raise SystemExit(main())
