#!/usr/bin/env python3
"""Blur/remove PII in a manual image. Coordinates are fractions of width/height (0..1).

    python3 tools/redact.py preview <slug> <n> [--grid]   # look at it (grid = coord ruler)
    python3 tools/redact.py blur    <slug> <n> x0,y0,x1,y1 [more boxes...]
    python3 tools/redact.py reset   <slug> <n>            # undo blurs (from .pristine backup)
    python3 tools/redact.py drop    <slug> <n>            # delete the image entirely

The FIRST time an image is touched, an untouched copy is saved to tools/.pristine/
(git-ignored) so `reset` can restore it. Blur is destructive to the live file.
After editing images, run `tools/rebuild_media.py` then `tools/build_data.py`, then push.

⚠️ Never commit tools/.pristine/ — it holds the un-blurred originals.
"""
import os, shutil, sys, re
from PIL import Image, ImageFilter, ImageDraw

HERE = os.path.dirname(os.path.abspath(__file__))
ROOT = os.path.dirname(HERE)
ASSETS = f"{ROOT}/assets"
PRISTINE = f"{HERE}/.pristine"
PREVIEW = f"{HERE}/.preview"


def live(slug, n): return f"{ASSETS}/{slug}/{int(n):02d}.webp"
def prist(slug, n): return f"{PRISTINE}/{slug}/{int(n):02d}.webp"


def keep(slug, n):
    o = prist(slug, n)
    if not os.path.exists(o):
        os.makedirs(os.path.dirname(o), exist_ok=True)
        shutil.copy(live(slug, n), o)


def render(slug, n, grid):
    im = Image.open(live(slug, n)).convert("RGB")
    if grid:
        d = ImageDraw.Draw(im); W, H = im.size
        for i in range(1, 10):
            x, y = round(W * i / 10), round(H * i / 10)
            d.line([(x, 0), (x, H)], fill=(255, 0, 0), width=2)
            d.line([(0, y), (W, y)], fill=(255, 0, 0), width=2)
            d.text((x + 2, 2), f"{i/10:.1f}", fill=(255, 0, 0))
            d.text((2, y + 2), f"{i/10:.1f}", fill=(255, 0, 0))
    os.makedirs(PREVIEW, exist_ok=True)
    out = f"{PREVIEW}/{slug}-{int(n):02d}.jpg"
    im.save(out, quality=88)
    print("preview:", out, im.size)


cmd, slug, n = sys.argv[1], sys.argv[2], sys.argv[3]

if cmd == "drop":
    keep(slug, n); os.remove(live(slug, n)); print("dropped", slug, n)
elif cmd == "reset":
    shutil.copy(prist(slug, n), live(slug, n)); print("reset", slug, n); render(slug, n, False)
elif cmd == "preview":
    render(slug, n, "--grid" in sys.argv)
elif cmd == "blur":
    keep(slug, n)
    im = Image.open(live(slug, n)).convert("RGB"); W, H = im.size
    for a in sys.argv[4:]:
        if a.startswith("--"):
            continue
        v = [float(x) for x in a.split(",")]
        assert len(v) == 4, f"box needs x0,y0,x1,y1 — got {a!r}"
        x0, y0, x1, y1 = (max(0, round(v[0] * W)), max(0, round(v[1] * H)),
                          min(W, round(v[2] * W)), min(H, round(v[3] * H)))
        reg = im.crop((x0, y0, x1, y1)); w, h = reg.size
        reg = reg.resize((max(1, w // 26), max(1, h // 26)), Image.BILINEAR)
        reg = reg.resize((w, h), Image.NEAREST).filter(ImageFilter.GaussianBlur(11))
        im.paste(reg, (x0, y0))
    im.save(live(slug, n), "WEBP", quality=80, method=6)
    print("blurred", slug, n); render(slug, n, False)
else:
    sys.exit(__doc__)
