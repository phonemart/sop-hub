#!/usr/bin/env python3
"""Rebuild every PDF and cover thumbnail from the CURRENT assets/<slug>/NN.webp images.

    python3 tools/rebuild_media.py

Run this after you change any manual image (e.g. blur more PII, add/replace a photo).
PDFs and covers are always derived from the redacted webp on disk, so they can never
lag behind and leak an old un-blurred version. Also machine-scans every image + PDF
for a still-decodable QR or barcode and fails loudly if one is found.
"""
import glob, os, json
from PIL import Image

HERE = os.path.dirname(os.path.abspath(__file__))
ROOT = os.path.dirname(HERE)
ASSETS = f"{ROOT}/assets"

titles = {}
try:
    s = open(f"{ROOT}/data.js", encoding="utf-8").read()
    for t in json.loads(s[s.index("=") + 1:].rstrip().rstrip(";"))["topics"]:
        titles[t["slug"]] = t["title"]
except Exception:
    pass

# ── rebuild PDFs (photo manuals only; skip doc topics with no page images) ──
for d in sorted(glob.glob(f"{ASSETS}/*/")):
    slug = d.rstrip("/").split("/")[-1]
    if slug == "covers":
        continue
    pages = sorted(glob.glob(f"{d}[0-9][0-9].webp"))
    for old in glob.glob(f"{d}*.pdf"):
        os.remove(old)
    if not pages:
        continue
    ims = []
    for p in pages:
        im = Image.open(p).convert("RGB")
        if im.width > 1240:
            im = im.resize((1240, round(im.height / im.width * 1240)), Image.LANCZOS)
        ims.append(im)
    ims[0].save(f"{d}{slug}.pdf", "PDF", save_all=True, append_images=ims[1:],
                resolution=150, title=titles.get(slug, slug))
    print(f"  pdf  {slug:14s} {len(ims):2d} pages")

# ── rebuild covers (first page >=800px, or 01) ──
W, H = 480, 360
for d in sorted(glob.glob(f"{ASSETS}/*/")):
    slug = d.rstrip("/").split("/")[-1]
    if slug == "covers":
        continue
    pages = sorted(glob.glob(f"{d}[0-9][0-9].webp"))
    if not pages:
        continue                      # doc topics keep their generated gradient cover
    src = next((p for p in pages if Image.open(p).width >= 800), pages[0])
    im = Image.open(src).convert("RGB")
    s = max(W / im.width, H / im.height)
    im = im.resize((round(im.width * s), round(im.height * s)), Image.LANCZOS)
    x = (im.width - W) // 2
    im.crop((x, 0, x + W, H)).save(f"{ASSETS}/covers/{slug}.webp", "WEBP", quality=76, method=6)

# ── safety scan: no decodable QR / barcode anywhere ──
try:
    import cv2, numpy as np, fitz
    qr = cv2.QRCodeDetector()
    try:
        bd = cv2.barcode.BarcodeDetector()
    except Exception:
        bd = None

    def has_code(img):
        for sc in (1, 2, 3):
            im = cv2.resize(img, None, fx=sc, fy=sc) if sc > 1 else img
            ok, info, _, _ = qr.detectAndDecodeMulti(im)
            if ok and any(info):
                return "QR"
            if bd:
                bok, binfo, *_ = bd.detectAndDecode(im)
                if bok and any(x for x in binfo):
                    return "barcode"
        return None

    bad = []
    for p in sorted(glob.glob(f"{ASSETS}/*/*.webp")):
        if has_code(cv2.cvtColor(np.array(Image.open(p).convert("RGB")), cv2.COLOR_RGB2BGR)):
            bad.append("/".join(p.split("/")[-2:]))
    for p in sorted(glob.glob(f"{ASSETS}/*/*.pdf")):
        for pg in fitz.open(p):
            pm = pg.get_pixmap(dpi=200)
            arr = np.frombuffer(pm.samples, np.uint8).reshape(pm.height, pm.width, pm.n)[:, :, :3]
            if has_code(cv2.cvtColor(arr, cv2.COLOR_RGB2BGR)):
                bad.append(p.split("/")[-1]); break
    print("\nQR/barcode scan:", "⚠️ FOUND " + ", ".join(bad) if bad else "clean ✓")
except ImportError:
    print("\n(opencv/pymupdf not installed — skipped QR/barcode scan)")
