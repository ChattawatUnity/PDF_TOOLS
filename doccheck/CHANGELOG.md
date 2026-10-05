# CHANGELOG — Doc Check

CHANGELOG v0.1.0 · 2026-10-05

บันทึกทุกการเปลี่ยนแปลง และโค้ดเดิมที่ถูกลบ (พร้อมเหตุผล) เพื่อย้อนคืนได้

## 0.1.0 — 2026-10-05 · Phase 0 (POC)

### เพิ่ม

| ไฟล์ | version | รายละเอียด |
|---|---|---|
| `BRIEF.md` | 1.0 | brief จากคุณ Mark |
| `README.md` | 0.1.0 | สถานะ, ไฟล์ชั่วคราวที่ต้องลบ, วิธีติดตั้ง/ทดสอบ POC บน GAS |
| `CHANGELOG.md` | 0.1.0 | ไฟล์นี้ |
| `package.json`, `package-lock.json` | 0.1.0 | dev dependency `pdfjs-dist` 3.11.174 (pin เป๊ะ) |
| `.npmrc` | — | `omit=optional` (ไม่ลง canvas ที่ไม่จำเป็น), `save-exact=true` |
| `.gitignore` | — | กัน `samples/` (ข้อมูลลูกค้า), `node_modules/`, `*.zip`, `tmp/**/out/` |
| `tmp/phase0-poc/Code.gs` | 0.1.0 | ชั่วคราว — `doGet` + `ping` |
| `tmp/phase0-poc/Index.html` | 0.1.0 | ชั่วคราว — หน้า POC วัดเวลา 3 วิธี (blob / cdn / main) + server ping + clipboard |
| `tmp/phase0-poc/appsscript.json` | — | ชั่วคราว — manifest (V8, Asia/Bangkok, web app เฉพาะเจ้าของ) |
| `tmp/phase0-local/package.json`, `package-lock.json` | 0.1.0 | ชั่วคราว — `pdfkit` 0.17.2, `playwright-core` 1.56.1 |
| `tmp/phase0-local/.npmrc` | — | ชั่วคราว — ค่าเดียวกับ `.npmrc` หลัก |
| `tmp/phase0-local/make-fixtures.js` | 0.1.0 | ชั่วคราว — สร้าง PDF จำลอง 7 แบบ (ปกติ 3/20 หน้า, รหัสผ่าน, ไม่มี text, เสีย, ไม่ใช่ PDF, ว่าง) |
| `tmp/phase0-local/node-parse.js` | 0.1.0 | ชั่วคราว — วัดเวลา parse ใน Node ด้วย pdfjs-dist ตัวเดียวกับ browser |
| `tmp/phase0-local/gas-sim.js` | 0.1.0 | ชั่วคราว — จำลอง iframe ซ้อนแบบ GAS ใน Chromium + เทียบ items browser ↔ Node |

### ลบ

- ไม่มี
