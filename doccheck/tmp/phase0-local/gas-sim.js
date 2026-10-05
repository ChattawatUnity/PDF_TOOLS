/**
 * Doc Check — Phase 0: จำลอง iframe ซ้อน 2 ชั้นแบบ GAS แล้วรันหน้า POC (tmp/phase0-poc/Index.html) ใน Chromium
 * v0.1.0 · 2026-10-05
 *
 * ไฟล์ชั่วคราว — ลบพร้อมโฟลเดอร์ tmp/ หลังผ่าน Phase 0
 * ใช้: node make-fixtures.js && node gas-sim.js
 *
 * สิ่งที่จำลอง: หน้าแม่ (origin A) → iframe sandbox (origin B, sandbox attribute ชุดเดียวกับ GAS)
 *               → iframe userHtmlFrame (origin B) ที่โหลด Index.html + google.script.run จำลอง
 * cdnjs ถูกตอบด้วยไฟล์จาก node_modules/pdfjs-dist (ไฟล์เดียวกับที่ cdnjs ให้บริการ)
 * สิ่งที่จำลองไม่ได้: CSP / นโยบายจริงของ Google, latency ของ server GAS → ต้องยืนยันบน GAS จริง
 */
'use strict';

const fs = require('fs');
const http = require('http');
const path = require('path');
const { chromium } = require('playwright-core');
const { parseBytes } = require('./node-parse.js');

const POC_HTML = path.join(__dirname, '..', 'phase0-poc', 'Index.html');
const PDFJS_BUILD = path.dirname(require.resolve('pdfjs-dist/build/pdf.js'));
const FIXTURE_DIR = path.join(__dirname, 'out', 'fixtures');
const SCREENSHOT = path.join(__dirname, 'out', 'poc-bl-synthetic-3p.png');
const OUTER_PORT = 8701;
const SANDBOX_PORT = 8702;
const OUTER_ORIGIN = 'http://localhost:' + OUTER_PORT;
const SANDBOX_ORIGIN = 'http://127.0.0.1:' + SANDBOX_PORT;
const CDN_PATTERN = 'https://cdnjs.cloudflare.com/ajax/libs/pdf.js/3.11.174/**';
const GAS_SANDBOX_FLAGS = 'allow-downloads allow-forms allow-modals allow-popups allow-popups-to-escape-sandbox ' +
  'allow-same-origin allow-scripts allow-top-navigation-by-user-activation';
const RUN_TIMEOUT_MS = 120000;
const FRAME_POLL_MS = 50;
const PREVIEW_COMPARE_DECIMALS = 1;
/* POC ทดสอบ Clipboard API โดยตั้งใจ — iframe จำลองไม่ได้เปิด clipboard-write จึงต้องเจอข้อความนี้ */
const EXPECTED_CONSOLE_ERRORS = [/^Permissions policy violation: The Clipboard API has been blocked/];

const GOOGLE_SCRIPT_RUN_STUB = `<script>
window.google = { script: { run: (function make(onOk, onFail) {
  return {
    withSuccessHandler: (fn) => make(fn, onFail),
    withFailureHandler: (fn) => make(onOk, fn),
    ping: () => setTimeout(() => onOk && onOk(Date.now()), 0)
  };
})() } };
</script>`;

function serve(port, routes) {
  const server = http.createServer((req, res) => {
    const body = routes[req.url.split('?')[0]];
    if (body == null) {
      res.writeHead(404);
      res.end();
      return;
    }
    res.writeHead(200, { 'content-type': 'text/html; charset=utf-8' });
    res.end(body);
  });
  return new Promise((resolve) => server.listen(port, '127.0.0.1', () => resolve(server)));
}

async function startServers() {
  const pocHtml = fs.readFileSync(POC_HTML, 'utf8').replace('<meta charset="utf-8">', '<meta charset="utf-8">' + GOOGLE_SCRIPT_RUN_STUB);
  const outer = await serve(OUTER_PORT, {
    '/': `<!DOCTYPE html><html><body style="margin:0">
<iframe id="sandboxFrame" sandbox="${GAS_SANDBOX_FLAGS}" src="${SANDBOX_ORIGIN}/sandbox" style="border:0;width:100%;height:100vh"></iframe>
</body></html>`
  });
  const sandbox = await serve(SANDBOX_PORT, {
    '/sandbox': `<!DOCTYPE html><html><body style="margin:0">
<iframe id="userHtmlFrame" name="userHtmlFrame" src="/userHtml" style="border:0;width:100%;height:100vh"></iframe>
</body></html>`,
    '/userHtml': pocHtml
  });
  return [outer, sandbox];
}

async function routeCdn(context) {
  await context.route(CDN_PATTERN, (route) => {
    const file = path.join(PDFJS_BUILD, path.basename(new URL(route.request().url()).pathname));
    route.fulfill({
      status: 200,
      body: fs.readFileSync(file),
      headers: {
        'content-type': 'application/javascript; charset=utf-8',
        'access-control-allow-origin': '*',
        'timing-allow-origin': '*'
      }
    });
  });
}

async function runFixture(browser, fixture, problems) {
  const context = await browser.newContext({ viewport: { width: 1366, height: 900 } });
  await routeCdn(context);
  const page = await context.newPage();
  page.on('pageerror', (err) => problems.push(fixture + ': pageerror ' + err.message));
  page.on('console', (msg) => {
    if (msg.type() !== 'error' || EXPECTED_CONSOLE_ERRORS.some((re) => re.test(msg.text()))) return;
    problems.push(fixture + ': console.error ' + msg.text());
  });
  await page.goto(OUTER_ORIGIN + '/');
  const frame = await waitForFrame(page, 'userHtmlFrame');
  await frame.waitForFunction(() => document.getElementById('lib-status').className !== '');
  await frame.setInputFiles('#file', path.join(FIXTURE_DIR, fixture));
  await frame.waitForSelector('#run:not([disabled])');
  await frame.click('#run');
  await frame.waitForSelector('#status[data-state="done"], #status[data-state="error"]', { timeout: RUN_TIMEOUT_MS });
  if ((await frame.getAttribute('#status', 'data-state')) === 'error') {
    problems.push(fixture + ': ' + (await frame.textContent('#status')));
  }
  const report = await frame.textContent('#report');
  const preview = await frame.$$eval('#items tr', (rows) => rows.map((tr) => [...tr.children].map((td) => td.textContent)));
  await frame.click('#copy');
  const copyStatus = await frame.textContent('#copy-status');
  if (fixture === 'bl-synthetic-3p.pdf') await page.screenshot({ path: SCREENSHOT, fullPage: true });
  await context.close();
  return { report, preview, copyStatus };
}

async function waitForFrame(page, name) {
  for (;;) {
    const frame = page.frames().find((f) => f.name() === name);
    if (frame) {
      await frame.waitForLoadState('load');
      return frame;
    }
    await page.waitForTimeout(FRAME_POLL_MS);
  }
}

/* ตารางตัวอย่างในหน้า POC ต้องตรงกับผล parse ใน Node (ไฟล์ pdf.js เดียวกัน) */
async function checkParity(fixture, preview, problems) {
  const result = await parseBytes(new Uint8Array(fs.readFileSync(path.join(FIXTURE_DIR, fixture))));
  const expected = result.pages[0].items.slice(0, preview.length).map((it) => [
    String(it.page), it.x.toFixed(PREVIEW_COMPARE_DECIMALS), it.y.toFixed(PREVIEW_COMPARE_DECIMALS),
    it.w.toFixed(PREVIEW_COMPARE_DECIMALS), it.h.toFixed(PREVIEW_COMPARE_DECIMALS), it.str
  ]);
  const same = preview.length > 0 && JSON.stringify(expected) === JSON.stringify(preview);
  if (!same) problems.push(fixture + ': items ใน browser ไม่ตรงกับ Node');
  return same;
}

async function main() {
  const servers = await startServers();
  const browser = await chromium.launch();
  const problems = [];
  try {
    console.log('Chromium', browser.version());
    for (const fixture of fs.readdirSync(FIXTURE_DIR).sort()) {
      const { report, preview, copyStatus } = await runFixture(browser, fixture, problems);
      console.log('\n==================== ' + fixture + ' ====================');
      console.log(report);
      console.log('[ปุ่มคัดลอก] ' + copyStatus);
      if (preview.length) console.log('[browser ↔ Node] items ตรงกัน: ' + (await checkParity(fixture, preview, problems) ? 'ใช่' : 'ไม่'));
    }
  } finally {
    await browser.close();
    servers.forEach((s) => s.close());
  }
  console.log('\nปัญหาที่พบ: ' + (problems.length ? '\n  ' + problems.join('\n  ') : 'ไม่มี'));
  if (problems.length) process.exitCode = 1;
}

main().catch((err) => {
  console.error(err);
  process.exitCode = 1;
});
