# Doc Check

README v0.1.0 · 2026-10-05

เครื่องมือดึงและเทียบข้อมูล Draft BL / BC จาก PDF — รันเป็น Google Apps Script webapp อ่าน PDF ในเบราว์เซอร์ด้วย pdf.js
รายละเอียดงานทั้งหมดอยู่ใน [BRIEF.md](BRIEF.md) · ประวัติการเปลี่ยนแปลงอยู่ใน [CHANGELOG.md](CHANGELOG.md)

## สถานะ

| เฟส | สถานะ |
|---|---|
| 0 POC | **รอผลทดสอบบน GAS จริงจากคุณ Mark** (ทดสอบในเครื่องจำลองผ่านแล้ว) |
| 1 Spec | ยังไม่เริ่ม (รอผ่าน gate Phase 0) |
| 2–5 | ยังไม่เริ่ม |

## ⚠️ ไฟล์ชั่วคราวที่ต้องลบ

| สิ่งที่ต้องลบ | ใช้ทำอะไร | ลบเมื่อไร |
|---|---|---|
| `tmp/phase0-poc/` | หน้า POC สำหรับวัดผลบน GAS | หลังผ่าน gate Phase 0 |
| `tmp/phase0-local/` | สคริปต์สร้าง PDF จำลอง + วัดเวลาใน Node + จำลอง iframe แบบ GAS | หลังผ่าน gate Phase 0 |
| โปรเจกต์ "Doc Check POC" บน script.google.com | deployment ของ POC | หลังส่งรายงาน Phase 0 แล้ว (Deploy → Manage deployments → Archive) |

## โครงสร้างไฟล์ (ปัจจุบัน)

```
doccheck/
  BRIEF.md          # brief จากคุณ Mark (v1.0)
  README.md         # ไฟล์นี้
  CHANGELOG.md
  package.json      # dev dependency: pdfjs-dist 3.11.174 (ตัวเดียวกับ cdnjs ใช้ใน Node test)
  .npmrc            # ไม่ติดตั้ง optional deps (canvas) และ pin version เป๊ะ
  .gitignore        # samples/ (ข้อมูลลูกค้า), node_modules/, *.zip, tmp/**/out/
  tmp/              # ชั่วคราวทั้งหมด — ดูตาราง "ไฟล์ชั่วคราวที่ต้องลบ"
    phase0-poc/     # Code.gs, Index.html, appsscript.json
    phase0-local/   # make-fixtures.js, node-parse.js, gas-sim.js
```

โครงสร้างเป้าหมาย (`src/`, `build/`, `dist/`, `test/`, `samples/`) จะสร้างตาม BRIEF §4 ตั้งแต่ Phase 2

## Phase 0 — ติดตั้ง POC บน GAS (สำหรับคุณ Mark)

POC ไม่อ่านชีตและไม่ใช้ service ใดของ Google จึง**ไม่ควรมีหน้าขอสิทธิ์** — ถ้ามีหน้าขอสิทธิ์ขึ้นมา ให้หยุดและส่งภาพหน้าจอมาก่อน

1. เปิด <https://script.google.com> → **New project** → ตั้งชื่อ `Doc Check POC`
2. เปิดไฟล์ `Code.gs` ในโปรเจกต์ ลบของเดิมทั้งหมด แล้ววางเนื้อหาจาก `tmp/phase0-poc/Code.gs`
3. กด **+** (Files) → **HTML** → ตั้งชื่อ `Index` (ไม่ต้องพิมพ์ .html) → ลบของเดิม แล้ววางเนื้อหาจาก `tmp/phase0-poc/Index.html`
4. กด **Save**
5. **Deploy → New deployment** → รูปเฟือง → **Web app**
   - Execute as: **Me**
   - Who has access: **Only myself**
   - กด **Deploy** แล้วเปิด URL ที่ได้ (ลงท้ายด้วย `/exec`)

## Phase 0 — Checklist ทดสอบบน GAS

ใช้เบราว์เซอร์ที่พนักงานใช้งานจริง และ PDF จริง (แนะนำ Draft BL ที่มีหลายหน้าหรือมี attached sheet)

- [ ] 1. เปิด URL แล้ว กล่อง "1. โหลดไลบรารี pdf.js" เป็น**สีเขียว** ทั้ง pdf.js และ worker
- [ ] 2. เลือกไฟล์ → กด **เริ่มทดสอบ** → รอจนขึ้น "เสร็จแล้ว"
- [ ] 3. ดูตาราง "ตัวอย่าง text items" — ข้อความ**อ่านออกและตรงกับในไฟล์** หรือเป็นตัวอักษรเพี้ยน
- [ ] 4. กด **คัดลอกรายงาน** → วางส่งให้ Claude (รอบที่ 1) พร้อมแจ้งข้อความที่ขึ้นข้างปุ่ม
- [ ] 5. กด **F5** โหลดหน้าใหม่ → ทำข้อ 2–4 ซ้ำกับไฟล์เดิม (รอบที่ 2 = วัดกรณีโหลดจาก cache)
- [ ] 6. (ถ้าสะดวก) ทำซ้ำกับ BC ของ Unity 1 ไฟล์

รายงานที่คัดลอก**ไม่มีชื่อไฟล์และไม่มีข้อความในเอกสาร** มีแค่เวลา จำนวนหน้า/ตัวอักษร และข้อมูลเบราว์เซอร์ — ตารางตัวอย่างแสดงบนจออย่างเดียว

สิ่งที่หน้า POC วัด:

| หัวข้อในรายงาน | ความหมาย |
|---|---|
| โหลดหน้า | เวลาโหลด iframe ของหน้า POC |
| pdf.js | โหลด `pdf.min.js` (ตรวจ integrity) และดาวน์โหลด `pdf.worker.min.js` (ตรวจ integrity) จาก cdnjs |
| วิธีอ่าน PDF | ทดสอบ 3 วิธีกับไฟล์เดียวกัน: **blob** = Worker จาก blob ที่ตรวจ integrity แล้ว · **cdn** = ตั้ง workerSrc เป็น URL cdnjs ตาม brief · **main** = ไม่ใช้ Worker (fallback) — แต่ละวิธีมีเวลาสร้าง worker, เปิดไฟล์, parse ต่อหน้า |
| server ping | round-trip ของ `google.script.run` 3 ครั้ง (ใช้ประเมินโหมด C) |
| clipboard | Clipboard API ใช้ใน iframe ของ GAS ได้ไหม (มีผลกับปุ่มคัดลอกรายฟิลด์) |

## สำหรับนักพัฒนา — ทดสอบ Phase 0 ในเครื่อง

ต้องมี Node ≥ 22 และ Chromium ที่ Playwright 1.56.1 ใช้ได้

```bash
npm install                      # ที่ doccheck/
cd tmp/phase0-local
npm install
node make-fixtures.js            # สร้าง PDF จำลอง (ข้อมูลปลอม) → out/fixtures/
node node-parse.js               # วัดเวลา parse ใน Node + ตรวจ error แต่ละแบบ
node gas-sim.js                  # รันหน้า POC ใน iframe ซ้อนแบบ GAS + เทียบ items กับ Node
```

`gas-sim.js` จำลองได้เฉพาะโครง iframe และ sandbox attribute ของ GAS — CSP/นโยบายจริงของ Google และ latency ของ server ต้องยืนยันบน GAS จริงตาม checklist ด้านบน
