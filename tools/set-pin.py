#!/usr/bin/env python3
"""เปลี่ยน PIN เข้าเว็บ:  python3 tools/set-pin.py 1234"""
import hashlib, pathlib, re, sys

if len(sys.argv) != 2 or not re.fullmatch(r"\d{4}", sys.argv[1]):
    sys.exit("ใช้: python3 tools/set-pin.py <ตัวเลข 4 หลัก>")

pin = sys.argv[1]
f = pathlib.Path(__file__).resolve().parent.parent / "data.js"
src = f.read_text(encoding="utf-8")
new, n = re.subn(r'"pinHash":"[0-9a-f]{64}"',
                 '"pinHash":"%s"' % hashlib.sha256(pin.encode()).hexdigest(), src, count=1)
if n != 1:
    sys.exit("หา pinHash ใน data.js ไม่เจอ")
f.write_text(new, encoding="utf-8")
print(f"เปลี่ยน PIN เป็น {pin} แล้ว — git commit -am 'เปลี่ยน PIN' && git push")
