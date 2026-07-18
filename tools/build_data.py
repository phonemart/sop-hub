#!/usr/bin/env python3
"""Rebuild data.js from tools/source/ — self-contained, run from anywhere.

    python3 tools/build_data.py            # keep the current PIN
    python3 tools/build_data.py 1234       # also set a new 4-digit PIN

What it does:
  - photo manuals come from source/content_main.json (+ marena) with short captions
    from source/content_short.json; each page is matched to an actual assets/<slug>/NN.webp.
    A page whose image is missing (removed for PII) becomes a "placeholder" card that
    still shows the instruction, so numbering stays 1..N with no gaps.
  - text manuals live in source/docs/*.json (doc:true). Each gets a generated gradient
    cover and, if it carries "category", its own menu-bar category.
  - covers = first surviving image >=800px wide per photo manual.

Editing tips:
  - change wording:      edit source/content_short.json (short captions) or the doc json
  - add a text manual:   drop a new json in source/docs/ (copy collections.json's shape)
  - add photos:          put assets/<slug>/NN.webp, add the topic to content_main.json
  - then run this script and `git push`.
"""
import json, hashlib, sys, os, glob, re
from PIL import Image

HERE = os.path.dirname(os.path.abspath(__file__))
ROOT = os.path.dirname(HERE)
SRC = f"{HERE}/source"
ASSETS = f"{ROOT}/assets"


def current_pin_hash():
    try:
        s = open(f"{ROOT}/data.js", encoding="utf-8").read()
        return json.loads(s[s.index("=") + 1:].rstrip().rstrip(";"))["pinHash"]
    except Exception:
        return hashlib.sha256(b"2551").hexdigest()


pin_hash = (hashlib.sha256(sys.argv[1].encode()).hexdigest()
            if len(sys.argv) > 1 and re.fullmatch(r"\d{4}", sys.argv[1]) else current_pin_hash())

main = json.load(open(f"{SRC}/content_main.json", encoding="utf-8"))
_short = json.load(open(f"{SRC}/content_short.json", encoding="utf-8"))
short = _short if isinstance(_short, dict) else {t["slug"]: t for t in _short}
topics = {t["slug"]: t for t in main["topics"]}
mar = json.load(open(f"{SRC}/content_marena.json", encoding="utf-8")); mar["slug"] = "marena-lock"
topics["marena-lock"] = mar

covers = {}
for slug, t in topics.items():
    live = {int(os.path.basename(p)[:2]) for p in glob.glob(f"{ASSETS}/{slug}/[0-9][0-9].webp")}
    assert live, f"{slug} has no images in assets/"
    by_n = {p["n"]: p["short"] for p in short.get(slug, {}).get("pages", [])}
    if slug in short:
        t["title"], t["subtitle"] = short[slug]["title"], short[slug]["subtitle"]
    pages = []
    for p in sorted(t["pages"], key=lambda x: x["n"]):
        q = {"n": p["n"], "short": by_n.get(p["n"], p["caption"])}
        if p["caption"] != q["short"]:
            q["caption"] = p["caption"]
        if p["n"] not in live:
            q["placeholder"] = True
        pages.append(q)
    t["pages"] = pages
    if t.get("chapters"):
        t["chapters"] = [c for c in t["chapters"] if any(c["from"] <= p["n"] <= c["to"] for p in pages)]
    t["files"] = [{"name": f"{short.get(slug, {}).get('title', slug)}.pdf",
                   "path": f"{slug}/{slug}.pdf",
                   "size": round(os.path.getsize(f"{ASSETS}/{slug}/{slug}.pdf") / 1e6, 1)}] \
        if os.path.exists(f"{ASSETS}/{slug}/{slug}.pdf") else []
    for n in sorted(live):
        if Image.open(f"{ASSETS}/{slug}/{n:02d}.webp").width >= 800:
            covers[slug] = n; break
    else:
        covers[slug] = min(live)

topics["line-payment"]["copyText"] = open(f"{SRC}/line-payment-welcome.txt", encoding="utf-8").read().strip()

# text-only manuals + generated gradient covers
os.makedirs(f"{ASSETS}/covers", exist_ok=True)
for docfile in sorted(glob.glob(f"{SRC}/docs/*.json")):
    doc = json.load(open(docfile, encoding="utf-8"))
    slug = doc["slug"]; topics[slug] = doc
    c0, c1 = (20, 28, 58), (51, 82, 160)
    cov = Image.new("RGB", (480, 360)); px = cov.load()
    for y in range(360):
        for x in range(480):
            f = (x + y) / 840
            px[x, y] = tuple(round(c0[i] + (c1[i] - c0[i]) * f) for i in range(3))
    cov.save(f"{ASSETS}/covers/{slug}.webp", "WEBP", quality=80, method=6)
    if doc.get("category"):
        main["tax"]["categories"].append({"id": slug, "name": doc["category"], "slugs": [slug]})
    if slug not in main["tax"]["order"]:
        main["tax"]["order"].append(slug)

order = main["tax"]["order"]
ordered = [topics[s] for s in order if s in topics] + [t for s, t in topics.items() if s not in order]

cat_slugs = [s for c in main["tax"]["categories"] for s in c["slugs"]]
assert len(cat_slugs) == len(set(cat_slugs)), "a slug is in two categories"
orphans = {t["slug"] for t in ordered} - set(cat_slugs)
assert not orphans, f"slug in no category: {orphans}"

data = {"pinHash": pin_hash, "tax": main["tax"], "topics": ordered}
open(f"{ROOT}/data.js", "w", encoding="utf-8").write(
    "window.SOP=" + json.dumps(data, ensure_ascii=False, separators=(",", ":")) + ";\n")

print(f"data.js rebuilt · {len(ordered)} topics · "
      f"{sum(len(t['pages']) for t in ordered)} pages")
for t in ordered:
    kind = "doc" if t.get("doc") else f"{len(t['pages'])}p"
    print(f"  {t['slug']:14s} {t['icon']} {kind:>4}  {t['title']}")
