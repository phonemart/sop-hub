# คู่มือหน้าร้าน Thunder

เว็บรวมคู่มือ SOP หน้าร้าน เปิดจากมือถือ ค้นหาภาษาไทยได้ กดรูปเพื่อซูม

**เว็บ:** https://phonemart.github.io/sop-hub/ · **รหัสเข้า:** 4 หลัก

## ⚠️ เรื่องความปลอดภัยที่ต้องรู้

repo นี้เป็น **สาธารณะ** (GitHub Pages ฟรีบังคับ) — ใครที่เจอ repo นี้บน GitHub
โหลดรูปคู่มือทั้งหมดไปดูได้เลย **โดยไม่ต้องใส่ PIN**

PIN กันได้แค่คนที่เข้าทางหน้าเว็บ (เช่น ลิงก์หลุดในกลุ่มไลน์) ไม่ใช่ระบบความปลอดภัยจริง
ถ้าต้องการกันจริงจัง ต้องย้ายไป Netlify/Cloudflare Pages หรืออัพเกรด GitHub Pro
แล้วเปลี่ยน repo เป็น private

### ข้อมูลส่วนบุคคลในรูป (สำคัญ)

รูปต้นฉบับมีข้อมูลลูกค้าจริงติดมาเยอะ (บัตร ปชช, ใบหน้า, ลายเซ็น, เบอร์, เลขบัญชี,
Serial/IMEI, QR จ่ายเงินที่สแกนได้, บาร์โค้ด). รูปที่อยู่ในเว็บนี้ **ถอด/เบลอออกหมดแล้ว**
ตรวจซ้ำหลายรอบ + สแกน QR/บาร์โค้ดด้วยเครื่องยืนยันว่าถอดไม่ได้

**ถ้าจะเพิ่มรูปใหม่เข้าเว็บ ต้องตรวจ PII ก่อนทุกครั้ง** โดยเฉพาะภาพถ่าย/สกรีนช็อตจากงานจริง:
- เบลอ: เลขบัตร/ชื่อ/ที่อยู่/ใบหน้า/ลายเซ็น/เบอร์/บัญชี/Serial/IMEI + **QR และบาร์โค้ด** (สแกนถอดได้)
- ต้นฉบับที่เบลอมาแล้วมักวางกล่องพลาดเป้า/จางเกิน — เช็คขอบกล่องว่ามีตัวอักษรโผล่ไหม
- **สร้าง PDF และรูปปกใหม่จากรูปที่เบลอแล้ว** ไม่งั้นยังมี PII เวอร์ชันเก่าฝังใน PDF/ปก
- เครื่องมือช่วยเบลอ: `scratchpad` ของ session (pii_tool.py) — ถ้าไม่มี ใช้ PIL crop+GaussianBlur เอง

## เปลี่ยน PIN

```bash
python3 tools/set-pin.py 1234
git commit -am "เปลี่ยน PIN" && git push
```

พนักงานที่เคยใส่ PIN เก่าไว้จะโดนถามใหม่อัตโนมัติ

## โครงสร้าง

| ไฟล์ | คืออะไร |
|---|---|
| `index.html` `style.css` `app.js` | ตัวเว็บ |
| `data.js` | เนื้อหาคู่มือทั้งหมด (สร้างจาก `tools/build_data.py` — อย่าแก้มือถ้าไม่จำเป็น) + hash ของ PIN |
| `assets/<slug>/NN.webp` | รูปคู่มือ ย่อ+บีบอัด+เบลอ PII แล้ว |
| `assets/<slug>/<slug>.pdf` | PDF ให้โหลด (สร้างจากรูปที่เบลอแล้ว) |
| `assets/covers/<slug>.webp` | รูปปกหน้าแรก |
| `sw.js` | คู่มือที่เคยเปิดแล้ว เปิดซ้ำได้ตอนไม่มีเน็ต |
| `tools/source/` | **ต้นทางเนื้อหา** — แก้ที่นี่แล้ว build ใหม่ |
| `tools/*.py` | สคริปต์ดูแลเว็บ (ดูด้านล่าง) |

## สคริปต์ดูแลเว็บ (`tools/`)

รันจากโฟลเดอร์ repo นี้ ต้องมี Python 3 + `pip install pillow` (สแกน QR ต้องมี `opencv-python pymupdf numpy`)

| คำสั่ง | ทำอะไร |
|---|---|
| `python3 tools/build_data.py` | สร้าง `data.js` ใหม่จาก `tools/source/` (คง PIN เดิม) |
| `python3 tools/build_data.py 1234` | สร้างใหม่ + เปลี่ยน PIN เป็น 1234 |
| `python3 tools/rebuild_media.py` | สร้าง PDF + รูปปกใหม่จากรูปปัจจุบัน + สแกน QR/บาร์โค้ด |
| `python3 tools/redact.py preview <slug> <n> --grid` | ดูรูป (มีเส้นพิกัด) เพื่อหาจุดเบลอ |
| `python3 tools/redact.py blur <slug> <n> x0,y0,x1,y1` | เบลอ (พิกัดเป็นสัดส่วน 0–1) |

## แก้ข้อความในคู่มือ

1. แก้ไฟล์ใน `tools/source/`:
   - **คำบรรยายใต้รูป / ชื่อ / คำโปรย** → `content_short.json`
   - **คู่มือแบบเอกสาร** (เช่น ติดตามหนี้) → `tools/source/docs/<ชื่อ>.json` แก้ได้ตรงๆ
2. `python3 tools/build_data.py`
3. `git commit -am "แก้ข้อความ" && git push`

## เพิ่มคู่มือใหม่

**แบบมีรูป:**
1. ใส่รูป `assets/<slug>/01.webp` … (กว้างไม่เกิน 1500px, **ตรวจ PII ก่อน** — ดูด้านล่าง)
2. เพิ่ม topic ใน `tools/source/content_main.json` (`slug` `title` `subtitle` `icon` `summary` `keywords` `pages`)
   และเพิ่ม slug ใน `tax.categories[].slugs` + `tax.order`
3. เพิ่มคำบรรยายสั้นใน `content_short.json`
4. `python3 tools/rebuild_media.py && python3 tools/build_data.py && git push`

**แบบเอกสาร (ไม่มีรูป เช่น คู่มือติดตามหนี้):**
1. ก็อป `tools/source/docs/collections.json` เป็นไฟล์ใหม่ แก้เนื้อหา
   (`doc:true`, มี `steps` / `templates` / `table` / `warnings` / `category` ได้)
2. `python3 tools/build_data.py && git push` — หมวดใหม่ขึ้นเมนูอัตโนมัติ

## ⚠️ ตรวจ PII ก่อนเพิ่มรูปทุกครั้ง

repo เป็นสาธารณะ รูปที่มีข้อมูลลูกค้า (บัตร ปชช, หน้า, เบอร์, บัญชี, ลายเซ็น, Serial/IMEI,
**QR/บาร์โค้ดที่สแกนได้**) ห้ามขึ้นดิบ ต้อง:
1. `python3 tools/redact.py preview <slug> <n> --grid` แล้วดูรูป หา PII
2. `python3 tools/redact.py blur <slug> <n> ...` เบลอทุกจุด (เผื่อขอบเกินตัวอักษร)
3. `python3 tools/rebuild_media.py` → ต้องขึ้น `QR/barcode scan: clean ✓`

## ที่มาของเนื้อหา

จากโฟลเดอร์ `Desktop/รวม sop` (10 คู่มือ) + สไลด์ ATOME TEACH 59 ใบ
ที่ `Desktop/Screenshot/mdm atom` — ต้นฉบับยังอยู่ครบ ไม่ได้ลบ
คู่มือติดตามหนี้เขียนเพิ่มเอง (`tools/source/docs/collections.json`)
