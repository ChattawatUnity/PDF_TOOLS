/**
 * Doc Check — Phase 0: วัดเวลา parse ด้วย pdfjs-dist 3.11.174 ใน Node (ไฟล์เดียวกับ cdnjs build/pdf.js)
 * v0.1.0 · 2026-10-05
 *
 * ไฟล์ชั่วคราว — ลบพร้อมโฟลเดอร์ tmp/ หลังผ่าน Phase 0
 * ใช้: node node-parse.js [ไฟล์.pdf ...]   (ไม่ระบุ = ทุกไฟล์ใน out/fixtures/)
 */
'use strict';

const fs = require('fs');
const path = require('path');
const pdfjsLib = require('pdfjs-dist/build/pdf.js');

const FIXTURE_DIR = path.join(__dirname, 'out', 'fixtures');

/* ตัวเลือกเดียวกับหน้า POC (Index.html) */
const DOCUMENT_OPTIONS = {
  isEvalSupported: false,
  disableFontFace: true,
  verbosity: pdfjsLib.VerbosityLevel.ERRORS
};

function toItems(rawItems, page) {
  const items = [];
  for (const it of rawItems) {
    if (typeof it.str !== 'string') continue;
    items.push({ str: it.str, x: it.transform[4], y: it.transform[5], w: it.width, h: it.height, page });
  }
  return items;
}

async function parseBytes(bytes) {
  const tStart = performance.now();
  const task = pdfjsLib.getDocument({ data: bytes.slice(), ...DOCUMENT_OPTIONS });
  try {
    const doc = await task.promise;
    const openMs = performance.now() - tStart;
    const pages = [];
    for (let p = 1; p <= doc.numPages; p++) {
      const t = performance.now();
      const page = await doc.getPage(p);
      const content = await page.getTextContent();
      pages.push({ page: p, parseMs: performance.now() - t, items: toItems(content.items, p) });
    }
    return { openMs, pages, totalMs: performance.now() - tStart };
  } catch (err) {
    return { error: { name: err.name, code: err.code ?? null, message: err.message }, totalMs: performance.now() - tStart };
  } finally {
    await task.destroy();
  }
}

async function main() {
  const files = process.argv.length > 2
    ? process.argv.slice(2)
    : fs.readdirSync(FIXTURE_DIR).sort().map((name) => path.join(FIXTURE_DIR, name));
  console.log('pdfjs-dist', pdfjsLib.version, '· Node', process.version, '· (Node ใช้ main thread เสมอ)');
  for (const file of files) {
    const result = await parseBytes(new Uint8Array(fs.readFileSync(file)));
    const name = path.basename(file).padEnd(22);
    if (result.error) {
      console.log(name, 'ERROR', result.error.name, result.error.code ?? '', '-', result.error.message);
      continue;
    }
    const parseSum = result.pages.reduce((a, p) => a + p.parseMs, 0);
    const items = result.pages.reduce((a, p) => a + p.items.length, 0);
    const chars = result.pages.reduce((a, p) => a + p.items.reduce((s, it) => s + it.str.replace(/\s/g, '').length, 0), 0);
    console.log(name, result.pages.length + ' หน้า',
      '· เปิด ' + result.openMs.toFixed(1) + ' ms',
      '· parse รวม ' + parseSum.toFixed(1) + ' ms (เฉลี่ย ' + (parseSum / result.pages.length).toFixed(1) + ' ms/หน้า)',
      '· items ' + items, '· ตัวอักษร ' + chars);
  }
}

module.exports = { parseBytes };

if (require.main === module) {
  main().catch((err) => {
    console.error(err);
    process.exitCode = 1;
  });
}
