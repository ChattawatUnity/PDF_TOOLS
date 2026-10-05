# Doc Check — Brief สำหรับ Claude Code

Brief version: 1.0 (2026-10-05) · ชื่อโปรเจกต์ใช้ชั่วคราว: **Doc Check**
ผู้สั่งงาน: คุณ Mark (เจ้าของระบบ / product owner) — เรียกผู้ใช้ว่า "คุณ Mark" และสื่อสารเป็นภาษาไทย

---

## 0. วิธีใช้ brief นี้

1. อ่านทั้งไฟล์ก่อนเริ่มทำอะไร
2. ทำตามเฟสในหัวข้อ 10 ทีละเฟส ห้ามข้าม gate
3. หัวข้อ 11 คือคำถามที่ยังเปิด — ห้ามเขียนโค้ดส่วนที่ขึ้นกับข้อนั้นจนกว่าคุณ Mark จะตอบ
4. ถ้าเจออะไรกำกวม เลือกได้หลายทาง หรือไม่มีใน brief นี้ → **ห้ามเดา** ให้ถามเป็นข้อๆ (numbered) แล้วรอคำตอบ

---

## 1. เป้าหมาย

ทำให้งานเอกสาร (Doc) **เร็วขึ้นและแม่นขึ้น** — พนักงานไม่ต้องไล่อ่าน PDF ยาวๆ แล้วเทียบด้วยตาอีก ผู้ใช้คือพนักงานที่ไม่รู้โค้ด UI ต้องเข้าใจได้เองโดยไม่ต้องอบรม

เครื่องมือมี 3 โหมด:

| โหมด | Input | Output |
|---|---|---|
| **A. ดึงข้อมูล** | PDF 1 ไฟล์ (Draft BL หรือ BC) | ตารางฟิลด์สำคัญ อ่านง่าย มีปุ่มคัดลอกรายฟิลด์ + ตรวจ check digit เลขตู้ |
| **B. เทียบ PDF ชนิดเดียวกัน** | PDF 2 ไฟล์ชนิดเดียวกัน (Draft BL v1↔v2 หรือ BC↔BC) | ตารางเทียบรายฟิลด์ + full-text diff ไฮไลต์จุดต่าง |
| **C. เทียบ Draft BL กับ BC** | Draft BL PDF 1 ไฟล์ | ตารางเทียบ BL กับข้อมูล BC **ที่อ่านจากชีต BC/RevCost** ตาม booking no. |

ความสำเร็จวัดจาก: ทุกจุดที่ต่างกันจริงต้องถูกแสดง (ห้ามหลุด) และไม่มีจุดไหนถูกแสดงว่า "ตรงกัน" ทั้งที่ไม่ตรง

---

## 2. ขอบเขต — สิ่งที่ไม่ทำในเฟสนี้

- SI, Invoice / Debit Note (เฟสถัดไป)
- PDF แบบสแกน / OCR (PDF ที่ใช้จริงมี text layer — ยืนยันแล้ว)
- LLM หรือ API ภายนอกใดๆ
- แก้ไข PDF, เขียนข้อมูลลงชีต, ส่งอีเมล
- เก็บไฟล์ PDF บน server หรือ Google Drive
- ระบบสถิติ / log การใช้งาน

---

## 3. Decisions

### 3.1 ยืนยันแล้วโดยคุณ Mark

- C1 รันเป็น **GAS webapp** อ่าน PDF **ในเบราว์เซอร์ด้วย pdf.js**
- C2 PDF ที่ใช้จริงมี text layer
- C3 เอกสารเฟสแรก: **Draft BL** และ **Booking Confirmation (BC) ของ Unity เอง** ที่ออกจากระบบ BC/RevCost
- C4 โหมดเทียบต้องรองรับทั้งเอกสารชนิดเดียวกัน (B) และต่างชนิด BC ↔ Draft BL (C)

### 3.2 ข้อเสนอทางเทคนิค (ให้ยืนยันกับคุณ Mark ในเอกสาร spec ของ Phase 1)

- T1 เป็น **standalone GAS project แยก** ไม่ฝังใน BC/RevCost — อ่านชีตแบบ read-only เท่านั้น (Sheet ID `1yMAUfUyrWUkNogNeAG6RQSyigFzYol16Y7sAMwXIBY0`)
- T2 ใช้ **pdf.js 3.11.174 (UMD build) จาก cdnjs** เพราะ 4.x เป็น ESM — ต้องพิสูจน์ใน Phase 0 ว่าโหลดได้จริงใน iframe ของ GAS
- T3 ไฟล์ PDF **ไม่ออกจากเบราว์เซอร์** — server รับแค่ booking no. (โหมด C)
- T4 ดึงข้อมูลแบบ **rule-based ต่อ carrier profile** (deterministic, ทดสอบได้ 100%)
- T5 โหมด B แสดง **full-text diff เสมอ** คู่กับตารางเทียบรายฟิลด์ — เป็น safety net กันจุดต่างที่อยู่นอกฟิลด์ที่ profile รู้จัก
- T6 โค้ด core เป็น pure JS ใช้ร่วมกันทั้ง browser และ Node test — build script ประกอบเป็นไฟล์ GAS
- T7 diff ใช้ **jsdiff** (cdnjs, pin version เดียวกับ npm ที่ใช้ test) แทนการเขียนเอง เพราะ battle-tested กว่า

---

## 4. โครงสร้างโปรเจกต์ (เสนอ)

```
doccheck/
  BRIEF.md              # ไฟล์นี้
  README.md             # วิธี build/deploy + รายการไฟล์ชั่วคราวที่ต้องลบ
  CHANGELOG.md          # ทุกการเปลี่ยนแปลง + โค้ดเก่าที่ถูกลบ (ไว้ rollback)
  src/
    core/               # pure JS: ห้ามใช้ DOM, ห้ามใช้ GAS API
      layout.js         # text items → lines (reading order)
      normalize.js
      iso6346.js
      detect.js         # ระบุชนิดเอกสาร + carrier
      profiles/         # 1 ไฟล์ต่อ 1 รูปแบบเอกสาร เช่น bl-<carrier>.js, bc-unity.js
      extract.js
      compare-fields.js
      compare-text.js
    ui/                 # index.html, app.js, styles.css
    gas/Code.gs         # doGet + getBcByBooking
  build/build.js        # src → dist/ (สำหรับ clasp push)
  dist/
  test/                 # runner + golden tests
  samples/              # PDF ตัวอย่างจริง — ต้องอยู่ใน .gitignore (ข้อมูลลูกค้า)
```

---

## 5. รายละเอียดการทำงาน

### 5.1 อ่าน PDF (browser)

- File input + drag & drop → `ArrayBuffer` → `pdfjsLib.getDocument` → ทุกหน้า `getTextContent()`
- แปลงเป็น item `{str, x, y, w, h, page}` จาก `transform[4]`, `transform[5]`
- worker: ลอง `workerSrc` จาก cdnjs ก่อน ถ้า iframe ของ GAS บล็อก ให้ใช้ fallback ที่พิสูจน์แล้วใน Phase 0 (เช่น โหลด worker script บน main thread) และรายงานผลต่อเวลาที่วัดได้
- กรณีต้องแจ้งผู้ใช้เป็นภาษาไทย (ห้ามเงียบ):
  - ไม่มี text layer
  - มีรหัสผ่าน
  - ไม่ใช่ PDF
  - ไฟล์เสีย
  - ระบุชนิดเอกสารไม่ได้

### 5.2 Layout → lines

- จัดกลุ่ม item เป็นบรรทัดตาม page → y (บนลงล่าง) → x (ซ้ายไปขวา)
- ค่า tolerance (y-merge, ช่องว่างระหว่างคำ) **ต้องได้มาจากการวัดไฟล์ตัวอย่าง** และเก็บเป็นค่าคงที่ใน profile ห้ามใส่ตัวเลขลอยๆ
- เก็บตำแหน่งของ item ไว้ทุกตัว เพื่อใช้ดึงฟิลด์แบบ region

### 5.3 ระบุชนิดเอกสารและ carrier

- แต่ละ profile มี signature (คำ/รูปแบบที่เจอเฉพาะเอกสารนั้น)
- ถ้า match **ไม่ใช่ 1 profile พอดี** (0 หรือมากกว่า 1) → ให้ผู้ใช้เลือกจาก dropdown ห้ามเลือกเอง
- ถ้าเลือก "ไม่มีในรายการ" → แสดงข้อความดิบ + โหมด B ใช้ได้เฉพาะ full-text diff

### 5.4 ฟิลด์ที่ดึง

**Draft BL**

- bl_no, booking_no, shipper, consignee, notify
- vessel, voyage, pol, pod, place_of_receipt, place_of_delivery
- containers[] `{no, seal, type, packages, gross_kg, cbm}`
- total_packages + package_unit, total_gross_kg, total_cbm
- description, marks, freight_term (PREPAID/COLLECT), originals_count, reefer_temp, hs_code

**BC (Unity)**

- รายการฟิลด์และ layout ให้สรุปจาก PDF ตัวอย่าง + คอลัมน์ในชีต แล้วเสนอใน spec (ดูหัวข้อ 11)

**กฎสถานะของฟิลด์**

แต่ละ profile ต้องประกาศว่ารองรับฟิลด์ไหน เพื่อแยก 2 สถานะนี้ให้ชัด:
- "ไม่มีในรูปแบบเอกสารนี้" (profile ไม่รองรับ)
- "หาไม่เจอ" (profile รองรับแต่ดึงไม่ได้ → ถือเป็นปัญหา ต้องเตือน)

**ข้อมูลที่ต่อเนื่องหลายหน้า**

ต้องรองรับ rider / attached sheet ("AS PER ATTACHED SHEET") ที่รายการตู้หรือ description ต่อไปหน้าถัดไป

### 5.5 Normalization (ใช้ร่วมกันทุกโหมด)

| ชนิด | กฎ |
|---|---|
| ข้อความ | Unicode NFKC → trim → ยุบ whitespace/newline เป็นช่องว่างเดียว → ตัวพิมพ์ใหญ่ |
| ตัวเลข | parse โดยระบุรูปแบบชัดเจน (thousands `,` decimal `.`) ตัดหน่วย (KGS/KG/CBM/M3) — ถ้าตีความได้มากกว่า 1 แบบหรือ parse ไม่ได้ → สถานะ "อ่านค่าไม่ได้" ห้ามเดา |
| เลขตู้ | ตัดช่องว่าง/ขีด → ตัวพิมพ์ใหญ่ → ต้องตรง `^[A-Z]{4}\d{7}$` → ตรวจ ISO 6346 |
| voyage | ตัวพิมพ์ใหญ่ ตัดช่องว่าง (ต่างกันแค่ leading zero = "ต่างแค่รูปแบบ" ไม่ใช่ "ตรงกัน") |

### 5.6 ISO 6346 check digit

- ค่าตัวอักษร: A10 B12 C13 D14 E15 F16 G17 H18 I19 J20 K21 L23 M24 N25 O26 P27 Q28 R29 S30 T31 U32 V34 W35 X36 Y37 Z38 (ข้าม 11, 22, 33)
- ตัวเลข 0–9 ใช้ค่าตัวเอง
- คูณแต่ละตำแหน่ง i (0–9) ด้วย 2^i แล้วรวม
- check digit = (ผลรวม mod 11) mod 10
- เทียบกับหลักที่ 11

### 5.7 สถานะผลเทียบ (ใช้ชุดเดียวทุกโหมด)

| สถานะ | สี | ความหมาย |
|---|---|---|
| ตรงกัน | เขียว | ค่าที่ normalize แล้วเท่ากัน **และ** raw เท่ากัน |
| ต่างแค่รูปแบบ | เหลือง | เท่ากันหลังตัดเครื่องหมายวรรคตอน/ช่องว่าง แต่ raw ต่าง |
| ไม่ตรง | แดง | ต่างกันจริง |
| ขาดฝั่งใดฝั่งหนึ่ง | แดง | มีค่าแค่ฝั่งเดียว — **ห้ามนับเป็นตรงกัน** |
| ไม่เทียบ | เทา | ฟิลด์แสดงอย่างเดียว หรือไม่มีในรูปแบบเอกสาร |

ทุกแถวต้องแสดง raw ทั้งสองฝั่งเสมอ ห้ามซ่อนฟิลด์ใดโดยไม่มีสถานะ

### 5.8 โหมด B — เทียบชนิดเดียวกัน

1. **ตารางรายฟิลด์** (ถ้า profile ระบุได้)
   - เลขตู้เทียบเป็นเซต (ไม่สนลำดับ) → แสดงตู้ที่เพิ่ม / หาย
   - ตู้ที่ตรงกันเทียบ seal/type/packages/gross_kg/cbm รายตู้
2. **Full-text diff** (แสดงเสมอ)
   - เทียบรายบรรทัดหลัง normalize whitespace มี page marker
   - บรรทัดที่เปลี่ยนให้ไฮไลต์ระดับคำ
   - มีตัวเลือก "ซ่อนบรรทัดที่เหมือน" (แสดง context รอบจุดต่าง)
3. **สรุปด้านบน** จำนวน แดง / เหลือง และปุ่ม "คัดลอกรายการจุดต่าง" เป็น plain text สำหรับวางในอีเมลขอแก้

### 5.9 โหมด C — Draft BL ↔ BC (จากชีต)

- ดึง booking_no จาก BL ถ้าไม่เจอให้ผู้ใช้พิมพ์เอง
- เรียก server `getBcByBooking(bookingNo)`:
  - validate input (trim, uppercase, ความยาว ≤ 30, อักขระ `[A-Z0-9-]`)
  - ค้นด้วย `TextFinder` (`matchEntireCell`) ในคอลัมน์ booking no. → อ่านเฉพาะแถวที่เจอ ครั้งเดียว
  - คืนเฉพาะฟิลด์ที่ใช้เทียบ
  - ไม่เจอ → `{status:'not_found'}`
  - เจอมากกว่า 1 แถว → คืนทั้งหมดให้ผู้ใช้เลือก (**ห้ามหยิบแถวแรกเอง**)
- ตาราง mapping (ร่าง — สรุปให้ครบใน spec):

| BL | BC (ชีต) | วิธีเทียบ |
|---|---|---|
| booking_no | booking no. | exact |
| vessel | vessel | normalized |
| voyage | voyage | normalized (ต่าง leading zero = เหลือง) |
| pol / pod | POL / POD | ตามตารางเทียบชื่อท่า (ดูหัวข้อ 11) |
| จำนวนตู้แยก type | qty × type | นับจาก containers[] เทียบตามตารางเทียบรหัส type (ดูหัวข้อ 11) |
| shipper | shipper | normalized |
| reefer_temp | temp | ตัวเลข exact |
| description | commodity | ไม่เทียบ (แสดงคู่กันเท่านั้น) |

---

## 6. UI (ภาษาไทย)

- 3 แท็บ: **ดึงข้อมูล · เทียบ 2 ไฟล์ · เทียบกับ BC**
- ลากไฟล์วางได้ แสดงชื่อไฟล์ ชนิดเอกสาร carrier จำนวนหน้า
- มี loading state ทุกขั้นตอน
- ข้อความ error บอกว่า **ผู้ใช้ต้องทำอะไรต่อ**
- สีสถานะตาม 5.7 + มีคำกำกับเสมอ (ห้ามใช้สีอย่างเดียว)
- ใช้งานได้บนจอโน้ตบุ๊ก 1366px โดยไม่ต้องเลื่อนแนวนอน (ตารางยาวให้ scroll ในกรอบตัวเอง)
- ข้อความ UI ทั้งหมดต้องเสนอใน spec ให้คุณ Mark อนุมัติก่อนเขียนโค้ด
- โค้ดสวย สม่ำเสมอ: ใช้ design token (สี/ระยะ/ฟอนต์) ที่ `:root` ชุดเดียว ห้าม hard-code สีซ้ำในหลายที่

---

## 7. ความเร็ว

- parse ทั้งหมดในเบราว์เซอร์ — ไม่มี round-trip ไป server ยกเว้นโหมด C (1 call)
- โหลด lib ครั้งเดียวตอนเปิดหน้า
- ประมวลผลไฟล์เดิมซ้ำไม่ได้ ให้ cache ผล parse ต่อไฟล์ใน memory ระหว่าง session
- Phase 0 ต้องรายงานเวลาแยกขั้น (โหลดหน้า, โหลด pdf.js, parse ต่อหน้า, extract, compare, server call) จากไฟล์จริง
- ห้ามมีโค้ดหรือ lib ที่ไม่จำเป็น

---

## 8. คุณภาพและการทดสอบ (gate ก่อนส่งงานทุกครั้ง)

**Golden tests**

- ทุกไฟล์ใน `samples/` มี `*.expected.json`
- Claude Code ร่างค่า expected ได้ แต่ต้องติดสถานะ `"verified": false` จนกว่าคุณ Mark ตรวจและยืนยัน
- ผล extract ต้องตรงทุกฟิลด์

**Unit tests**

- iso6346 (ทั้งเลขถูกและผิด)
- normalize (ทุกกฎใน 5.5 รวม edge case)
- สถานะเทียบทั้ง 5 แบบ
- เซตตู้ (เพิ่ม/หาย/สลับลำดับ)
- กรณีหลายหน้า / rider

**Test runtime**

- Node test ใช้ `pdfjs-dist` version เดียวกับ browser และโค้ด `src/core/` ชุดเดียวกัน

**Static checks**

- `node --check` ทุกไฟล์
- ตรวจไม่มีฟังก์ชันซ้ำ / ไม่ได้ใช้ / reference ที่ไม่มีอยู่

**Smoke test บน GAS จริง**

- ทำตาม checklist ใน README ทั้ง 3 โหมด + กรณี error ทุกแบบใน 5.1

ทุกชุดต้องผ่าน 100% ก่อนส่ง ถ้ามีข้อไหนไม่ผ่าน ให้รายงานตรงๆ ห้ามส่งแบบมี bug ที่รู้อยู่

---

## 9. กฎการทำงาน (มาตรฐานของคุณ Mark — ใช้ทุกครั้ง)

1. **ความถูกต้องมาก่อน** — import/การคำนวณ/การเทียบต้องไม่มี bug แม้แต่ตัวเดียว
2. **ความเร็ว** — เลือกวิธีที่เร็วที่สุด ไม่มีโค้ดซ้ำซ้อน มีเฉพาะโค้ดที่จำเป็น
3. **โค้ดชั่วคราว** (debug, สคริปต์วัดผล) อยู่ไฟล์แยกใน `tmp/` และลงรายการ "ต้องลบ" ใน README พร้อมเตือนคุณ Mark ทุกครั้งที่ส่งงาน
4. **โค้ดที่เลิกใช้ต้องลบออก** ห้ามคอมเมนต์ทิ้งไว้ — บันทึกโค้ดเดิมและเหตุผลใน `CHANGELOG.md` เพื่อย้อนคืนได้
5. **โค้ด clean และ consistent** — naming, โครงสร้าง, สไตล์ UI เป็นแบบเดียวกันทั้งโปรเจกต์
6. **ส่งงานทุกครั้ง** = ไฟล์ที่แก้แต่ละไฟล์ + `.zip` รวมทุกไฟล์ของโปรเจกต์ (bump version เฉพาะไฟล์ที่แก้)
7. **Spec-first** — เสนอ spec + ข้อความ UI ภาษาไทยให้อนุมัติก่อนเขียนโค้ด
8. **ห้ามเดา** — ถามเป็นข้อๆ แล้วรอคำตอบ (คำตอบสั้นอย่าง "ตามนั้น" / "จัดไป" = ทำต่อได้ทันที)

---

## 10. เฟสและ gate

| เฟส | งาน | Gate (ต้องผ่านก่อนไปต่อ) |
|---|---|---|
| **0 POC** | GAS webapp เปล่า + pdf.js ใน iframe, worker หรือ fallback, ดึง text items จาก sample 1 ไฟล์, วัดเวลา | รายงานผลให้คุณ Mark: ใช้วิธีไหนได้ เวลาเท่าไร |
| **1 Spec** | วิเคราะห์ samples ทุกไฟล์ → ฟิลด์ต่อ profile, mapping โหมด C, ข้อความ UI ไทย, ตอบคำถามหัวข้อ 11 | คุณ Mark อนุมัติ spec |
| **2 Extract** | layout, detect, profiles, normalize, iso6346 + golden/unit tests | tests ผ่านทั้งหมด, expected ทุกไฟล์ verified |
| **3 Compare** | compare-fields, compare-text, server `getBcByBooking` + tests | tests ผ่านทั้งหมด |
| **4 UI** | 3 แท็บตามข้อ 6 | smoke test บน GAS ผ่านทุกข้อ |
| **5 ส่งมอบ** | README (deploy, checklist, ไฟล์ต้องลบ), CHANGELOG, zip | คุณ Mark ทดลองใช้กับงานจริง |

---

## 11. คำถามที่ยังเปิด (ต้องได้คำตอบก่อนเขียนโค้ดส่วนที่เกี่ยวข้อง)

1. **สายเรือ** ที่ต้องรองรับใน Draft BL เฟสแรกมีเจ้าไหนบ้าง (แต่ละเจ้าใช้ไฟล์ตัวอย่าง 3–5 ไฟล์ใน `samples/bl/<carrier>/`)
2. **ชีตและคอลัมน์ BC** ใน BC/RevCost ที่ใช้เป็นแหล่งข้อมูลโหมด C — Claude Code ตรวจชีตแล้วเสนอ mapping ให้ยืนยัน (booking no., vessel, voyage, POL, POD, qty/type, shipper, temp)
3. **1 booking มีหลาย BL** หรือ **1 BL รวมหลาย booking** ได้ไหม — ถ้าได้ ตารางเทียบโหมด C ต้องนับตู้อย่างไร
4. **ตารางเทียบชื่อท่า** (เช่น "LAEM CHABANG" vs "LAEM CHABANG, THAILAND" vs UN/LOCODE) — ใช้ข้อมูลจาก MasterData ที่มีอยู่ หรือทำตารางใหม่
5. **ตารางเทียบรหัสชนิดตู้** (เช่น 40RH / 40'RF / 40' REEFER HC) — ใช้ข้อมูลที่มีอยู่ หรือสร้างจาก samples
6. **ความคลาดเคลื่อนของน้ำหนัก/CBM** — ต้องเท่ากันเป๊ะ หรือยอมให้ต่างได้เท่าไร
7. **สิทธิ์ webapp** — Execute as "Me" (พนักงานไม่ต้องมีสิทธิ์เข้าชีต) หรือ "User accessing" และเปิดให้ใครเข้าได้ (ทั้งโดเมน / เฉพาะรายชื่อ)
8. **House BL** ที่ Unity ออกเองต้องรองรับในเฟสนี้ด้วยหรือไม่ หรือเฉพาะ draft จากสายเรือ
