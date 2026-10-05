/**
 * Doc Check — Phase 0 POC (server)
 * v0.1.0 · 2026-10-05
 *
 * ไฟล์ชั่วคราว: ใช้วัดผล Phase 0 เท่านั้น — ต้องลบหลังผ่าน gate (ดู README "ไฟล์ชั่วคราวที่ต้องลบ")
 * ไม่ใช้ service ใดของ Google จึงไม่ต้องขอสิทธิ์ และไม่อ่านชีต
 */

function doGet() {
  return HtmlService.createHtmlOutputFromFile('Index')
    .setTitle('Doc Check — Phase 0 POC')
    .addMetaTag('viewport', 'width=device-width, initial-scale=1');
}

/** ใช้วัดเวลา round-trip ของ google.script.run (ไม่มีงานฝั่ง server) */
function ping() {
  return Date.now();
}
