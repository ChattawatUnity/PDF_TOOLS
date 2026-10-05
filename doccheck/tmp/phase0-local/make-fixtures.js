/**
 * Doc Check — Phase 0: สร้าง PDF จำลอง (ข้อมูลปลอมทั้งหมด) สำหรับทดสอบ POC
 * v0.1.0 · 2026-10-05
 *
 * ไฟล์ชั่วคราว — ลบพร้อมโฟลเดอร์ tmp/ หลังผ่าน Phase 0
 * ใช้: node make-fixtures.js   → เขียนไฟล์ลง out/fixtures/
 */
'use strict';

const fs = require('fs');
const path = require('path');
const PDFDocument = require('pdfkit');

const OUT_DIR = path.join(__dirname, 'out', 'fixtures');
const EMBED_FONT = '/usr/share/fonts/truetype/dejavu/DejaVuSans.ttf';
const CONTAINERS_ON_FIRST_PAGE = 3;
const RIDER_ROWS_PER_PAGE = 40;
const ROW_HEIGHT = 16;

function writePdf(name, options, draw) {
  return new Promise((resolve, reject) => {
    const doc = new PDFDocument({ size: 'A4', margin: 36, ...options });
    const file = path.join(OUT_DIR, name);
    const stream = fs.createWriteStream(file);
    stream.on('finish', () => resolve(file));
    stream.on('error', reject);
    doc.pipe(stream);
    draw(doc);
    doc.end();
  });
}

function fakeContainers(count) {
  const rows = [];
  for (let i = 0; i < count; i++) {
    const serial = String(1000000 + i * 7).padStart(7, '0');
    rows.push({
      no: 'TSTU' + serial,
      seal: 'SL' + String(500000 + i),
      type: i % 2 ? '40RH' : '20GP',
      packages: 1000 + i,
      grossKg: (12345.5 + i * 10).toFixed(3),
      cbm: (28.123 + i).toFixed(3)
    });
  }
  return rows;
}

function drawContainerRow(doc, row, y) {
  doc.font('Body').fontSize(9);
  doc.text(row.no, 36, y);
  doc.text(row.seal, 130, y);
  doc.text(row.type, 210, y);
  doc.text(row.packages + ' CARTONS', 260, y);
  doc.text(row.grossKg + ' KGS', 360, y);
  doc.text(row.cbm + ' CBM', 460, y);
}

function drawBl(doc, containerCount) {
  doc.registerFont('Body', EMBED_FONT);
  const containers = fakeContainers(containerCount);

  doc.font('Helvetica-Bold').fontSize(14).text('DRAFT BILL OF LADING (SYNTHETIC TEST DATA)', 36, 36);
  const fields = [
    ['B/L NO.', 'TEST0000000001'], ['BOOKING NO.', 'BKG-TEST-0001'],
    ['SHIPPER', 'SAMPLE SHIPPER CO., LTD.  123 TEST ROAD, BANGKOK 10110'],
    ['CONSIGNEE', 'SAMPLE CONSIGNEE INC.  1 EXAMPLE STREET, TOKYO'],
    ['NOTIFY PARTY', 'SAME AS CONSIGNEE'],
    ['VESSEL / VOYAGE', 'TEST VESSEL  0123E'],
    ['PORT OF LOADING', 'LAEM CHABANG, THAILAND'], ['PORT OF DISCHARGE', 'TOKYO, JAPAN'],
    ['FREIGHT', 'PREPAID'], ['NO. OF ORIGINAL B/L', 'THREE (3)']
  ];
  let y = 70;
  for (const [label, value] of fields) {
    doc.font('Helvetica-Bold').fontSize(8).text(label, 36, y);
    doc.font('Body').fontSize(10).text(value, 160, y - 1);
    y += 20;
  }
  y += 10;
  doc.font('Helvetica-Bold').fontSize(8).text('CONTAINER / SEAL / TYPE / PACKAGES / GROSS WEIGHT / MEASUREMENT', 36, y);
  y += 14;
  for (const row of containers.slice(0, CONTAINERS_ON_FIRST_PAGE)) {
    drawContainerRow(doc, row, y);
    y += ROW_HEIGHT;
  }
  doc.font('Helvetica-Bold').fontSize(10).text('*** AS PER ATTACHED SHEET ***', 36, y + 6);

  const rider = containers.slice(CONTAINERS_ON_FIRST_PAGE);
  for (let i = 0; i < rider.length; i += RIDER_ROWS_PER_PAGE) {
    doc.addPage();
    doc.font('Helvetica-Bold').fontSize(12).text('ATTACHED SHEET - B/L NO. TEST0000000001', 36, 36);
    let ry = 64;
    for (const row of rider.slice(i, i + RIDER_ROWS_PER_PAGE)) {
      drawContainerRow(doc, row, ry);
      ry += ROW_HEIGHT;
    }
  }
}

async function main() {
  fs.mkdirSync(OUT_DIR, { recursive: true });
  const bl = await writePdf('bl-synthetic-3p.pdf', {}, (doc) => drawBl(doc, CONTAINERS_ON_FIRST_PAGE + RIDER_ROWS_PER_PAGE * 2));
  await writePdf('bl-synthetic-20p.pdf', {}, (doc) => drawBl(doc, CONTAINERS_ON_FIRST_PAGE + RIDER_ROWS_PER_PAGE * 19));
  await writePdf('password.pdf', { userPassword: 'test', pdfVersion: '1.7' }, (doc) => doc.text('SECRET'));
  await writePdf('no-text.pdf', {}, (doc) => doc.rect(100, 100, 300, 200).fill('#888888'));

  const blBytes = fs.readFileSync(bl);
  fs.writeFileSync(path.join(OUT_DIR, 'corrupt.pdf'), blBytes.subarray(0, Math.floor(blBytes.length / 2)));
  fs.writeFileSync(path.join(OUT_DIR, 'not-pdf.pdf'), 'This is a plain text file renamed to .pdf\n');
  fs.writeFileSync(path.join(OUT_DIR, 'empty.pdf'), '');

  for (const name of fs.readdirSync(OUT_DIR).sort()) {
    console.log(name.padEnd(22), fs.statSync(path.join(OUT_DIR, name)).size, 'bytes');
  }
}

main().catch((err) => {
  console.error(err);
  process.exitCode = 1;
});
