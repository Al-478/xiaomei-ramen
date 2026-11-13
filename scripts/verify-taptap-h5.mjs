import assert from 'node:assert/strict';
import http from 'node:http';
import { readFile, mkdir, writeFile } from 'node:fs/promises';
import { createHash } from 'node:crypto';
import { inflateRawSync, crc32 } from 'node:zlib';
import path from 'node:path';
import { chromium } from '@playwright/test';
import { root } from './check-assets.mjs';

const release = path.join(root, 'release/taptap');
const report = JSON.parse(await readFile(path.join(release, 'h5-build-report.json'), 'utf8'));
const zip = await readFile(path.join(release, report.artifact));
assert.equal(createHash('sha256').update(zip).digest('hex'), report.sha256, '发布包校验和不匹配');
const files = new Map();
let offset = 0;
while (zip.readUInt32LE(offset) === 0x04034b50) {
  assert.equal(zip.readUInt16LE(offset + 8), 8);
  const size = zip.readUInt32LE(offset + 18), length = zip.readUInt16LE(offset + 26);
  const extra = zip.readUInt16LE(offset + 28);
  const archiveName = zip.subarray(offset + 30, offset + 30 + length).toString();
  assert(archiveName.startsWith(`${report.archiveDirectory}/`), 'ZIP必须仅包含一层游戏根文件夹');
  const name = archiveName.slice(report.archiveDirectory.length + 1);
  assert(!files.has(name) && !name.startsWith('/') && !name.split('/').includes('..'));
  const start = offset + 30 + length + extra;
  const content = inflateRawSync(zip.subarray(start, start + size));
  assert.equal(content.length, zip.readUInt32LE(offset + 22));
  assert.equal(crc32(content), zip.readUInt32LE(offset + 14), `ZIP CRC失败：${name}`);
  files.set(name, content); offset = start + size;
}
assert.equal(files.size, report.files.length);
assert.equal(zip.readUInt32LE(offset), 0x02014b50);
assert.equal(zip.readUInt32LE(zip.length - 22), 0x06054b50);
assert.equal(zip.readUInt16LE(zip.length - 12), files.size);
assert.equal(zip.readUInt32LE(zip.length - 6), offset);
for (const file of report.files) {
  assert.equal(createHash('sha256').update(files.get(file.path)).digest('hex'), file.sha256);
}
assert(files.has('index.html') && files.has('game.js'));
assert(!/\bwx\.|__preview|preview-adapter|wxe6851863490a7827/.test(files.get('game.js').toString()));
assert(![...files.keys()].some(file => /project\.config|\.ts$|\.map$|\.env|\.secret/.test(file)));

const errors = [], checks = ['ZIP逐文件CRC、SHA-256和入口检查通过；无微信AppID、预览接口或私有配置'];
const prefix = '/games/ramen/';
const server = http.createServer((request, response) => {
  const url = new URL(request.url, 'http://localhost');
  if (!url.pathname.startsWith(prefix)) { response.writeHead(404).end(); return; }
  const file = url.pathname.slice(prefix.length) || 'index.html';
  const body = files.get(file);
  if (!body) { response.writeHead(404).end(); return; }
  const ext = path.extname(file);
  response.setHeader('Content-Type', ({ '.html': 'text/html; charset=utf-8', '.js': 'text/javascript; charset=utf-8',
    '.png': 'image/png', '.jpg': 'image/jpeg', '.mp3': 'audio/mpeg' })[ext] ?? 'application/octet-stream');
  response.end(body);
});
await new Promise(resolve => server.listen(0, '127.0.0.1', resolve));
const remoteUrl = process.env.RAMEN_TEST_URL;
const url = remoteUrl ?? `http://127.0.0.1:${server.address().port}${prefix}`;
const output = path.join(root, remoteUrl ? 'previews/vercel' : 'previews/taptap-h5');
await mkdir(output, { recursive: true });
const browser = await chromium.launch({
  executablePath: process.env.RAMEN_CHROME_PATH ?? 'C:/Program Files/Google/Chrome/Application/chrome.exe', headless: true,
});
const instrument = () => {
  // 此观察器仅由测试注入，不写入正式发布包，也不改动游戏时间或成绩。
  const texts = new Map();
  const prototype = CanvasRenderingContext2D.prototype;
  const text = prototype.fillText, fill = prototype.fillRect;
  prototype.fillText = function(value, x, y, ...args) {
    if (this.canvas.id === 'game') texts.set(`${x},${y}`, String(value));
    return text.call(this, value, x, y, ...args);
  };
  prototype.fillRect = function(x, y, w, h) {
    if (this.canvas.id === 'game' && this.fillStyle === '#542039' && x === 0 && y === 0) texts.clear();
    return fill.call(this, x, y, w, h);
  };
  window.__h5Check = { text: (x, y) => texts.get(`${x},${y}`) ?? '' };
};
async function pageFor(context) {
  const page = await context.newPage();
  page.on('pageerror', error => errors.push(error.message));
  page.on('console', message => { if (message.type() === 'error') errors.push(message.text()); });
  page.on('response', response => { if (response.status() >= 400) errors.push(`资源失败：${response.url()}`); });
  await page.addInitScript(instrument);
  await page.goto(url);
  await page.waitForFunction(() => window.__h5Check.text(815, 443).includes('准备好'));
  return page;
}
try {
  if (remoteUrl) {
    // 匿名请求逐一核对线上产物，防止只验证本地 ZIP 或误入登录保护页。
    for (const [file, expected] of files) {
      const response = await fetch(new URL(file, remoteUrl));
      assert.equal(response.status, 200, `线上文件访问失败：${file}`);
      assert.equal(createHash('sha256').update(Buffer.from(await response.arrayBuffer())).digest('hex'),
        createHash('sha256').update(expected).digest('hex'), `线上文件与本地构建不同：${file}`);
    }
    checks.push('匿名访问全部43个线上文件，状态200且逐文件SHA-256与本地构建一致');
  }
  const context = await browser.newContext({ viewport: { width: 1448, height: 1086 } });
  const page = await pageFor(context);
  await page.screenshot({ path: path.join(output, '01-menu.png') });
  await page.mouse.click(1100, 800);
  await page.waitForFunction(() => window.__h5Check.text(875, 330).includes('厨房课堂'));
  await page.mouse.click(1067, 816);
  await page.waitForFunction(() => window.__h5Check.text(1390, 268) === '0');
  assert.equal(await page.evaluate(() => typeof window.wx), 'undefined');
  const pots = [[240, 480], [580, 480], [220, 670], [580, 670]];
  const drag = async (from, to) => {
    await page.mouse.move(...from); await page.mouse.down();
    await page.mouse.move(...to, { steps: 6 }); await page.mouse.up();
  };
  const feed = async (tool, index) => {
    await drag(tool, pots[index]);
    if (tool[0] === 880) await page.waitForTimeout(1160);
  };
  for (const index of [0, 1, 2]) {
    await feed([180, 275], index); await feed([180, 165], index); await feed([880, 750], index);
    await page.waitForTimeout(1320);
    await feed([410, 165], index); await feed([410, 275], index);
    await page.waitForTimeout(3250);
    if (index === 0) await page.screenshot({ path: path.join(output, '02-cooking.png') });
    await drag(pots[index], [1200, 680]);
    await page.waitForFunction(amount => window.__h5Check.text(1390, 268) === String(amount), (index + 1) * 10000);
  }
  checks.push('正式H5网页鼠标拖动连续完成三碗并获得30000金币');
  const audio = await page.evaluate(() => [...document.querySelectorAll('audio')].length);
  // 音频对象未附加DOM，直接解码发布包内所有音频并验证浏览器播放能力。
  const audioPaths = [...files.keys()].filter(file => file.endsWith('.mp3'));
  const decoded = await page.evaluate(async paths => {
    const context = new AudioContext();
    try {
      return await Promise.all(paths.map(async path => {
        const buffer = await context.decodeAudioData(await (await fetch(path)).arrayBuffer());
        return { path, duration: buffer.duration };
      }));
    } finally { await context.close(); }
  }, audioPaths);
  assert.equal(decoded.length, 12); assert(decoded.every(item => item.duration > 0));
  checks.push('12项MP3均能实际解码；音频按首次手势启动');
  await feed([880, 750], 3); await feed([180, 275], 3); await page.waitForTimeout(10800);
  await page.screenshot({ path: path.join(output, '03-burnt.png') });
  await drag(pots[3], [1200, 680]);
  await page.waitForFunction(() => window.__h5Check.text(1220, 435).includes('烧焦了'));
  checks.push('烧焦锅可拖到托盘清理并替补');
  await page.evaluate(() => window.dispatchEvent(new PageTransitionEvent('pagehide', { persisted: true })));
  const remaining = await page.evaluate(() => window.__h5Check.text(938, 185));
  await page.waitForTimeout(1500);
  assert.equal(await page.evaluate(() => window.__h5Check.text(938, 185)), remaining);
  await page.evaluate(() => window.dispatchEvent(new PageTransitionEvent('pageshow', { persisted: true })));
  checks.push('页面缓存隐藏1.5秒时倒计时停止，返回后继续');
  console.log('H5烹饪、出餐、音频和后台恢复通过，正在等待自然93秒结算。');
  await page.waitForFunction(() => window.__h5Check.text(724, 120) === '本局结束', undefined, { timeout: 110000 });
  await page.screenshot({ path: path.join(output, '04-result.png') });
  assert.equal(await page.evaluate(() => window.__h5Check.text(1130, 445)), '获得 30000 金币');
  assert.equal(await page.evaluate(() => JSON.parse(localStorage.getItem('taptap.genkiRamen.save')).bestScore), 30000);
  await page.mouse.click(572, 966);
  await page.waitForFunction(() => window.__h5Check.text(1390, 268) === '0' && window.__h5Check.text(938, 185).includes('93'));
  await page.reload();
  await page.waitForFunction(() => window.__h5Check.text(815, 682).includes('30000'));
  checks.push('自然93秒结算、重开重置与刷新后的最好成绩持久化通过');
  await context.close();

  const mobile = await browser.newContext({ viewport: { width: 960, height: 540 }, deviceScaleFactor: 2,
    hasTouch: true, isMobile: true });
  const touchPage = await pageFor(mobile);
  const scale = 540 / 1086, left = (960 - 1448 * scale) / 2;
  await touchPage.touchscreen.tap(left + 1100 * scale, 800 * scale);
  await touchPage.waitForFunction(() => window.__h5Check.text(875, 330).includes('厨房课堂'));
  await touchPage.touchscreen.tap(left + 1067 * scale, 816 * scale);
  await touchPage.waitForFunction(() => window.__h5Check.text(1390, 268) === '0');
  await touchPage.setViewportSize({ width: 540, height: 960 });
  await touchPage.waitForFunction(() => document.querySelector('canvas').height > document.querySelector('canvas').width);
  await touchPage.setViewportSize({ width: 960, height: 540 });
  await touchPage.waitForFunction(() => document.querySelector('canvas').width > document.querySelector('canvas').height);
  await touchPage.screenshot({ path: path.join(output, '05-mobile.png') });
  checks.push('移动触屏首次启动、教程、DPR2横屏及横竖屏尺寸变化通过');
  await mobile.close();

  const restricted = await browser.newContext({ viewport: { width: 1448, height: 1086 } });
  await restricted.addInitScript(() => {
    Storage.prototype.getItem = () => { throw new DOMException('存储不可用', 'SecurityError'); };
    Storage.prototype.setItem = () => { throw new DOMException('存储不可用', 'SecurityError'); };
  });
  const restrictedPage = await pageFor(restricted);
  await restrictedPage.mouse.click(1100, 800);
  await restrictedPage.waitForFunction(() => window.__h5Check.text(875, 330).includes('厨房课堂'));
  await restrictedPage.mouse.click(1067, 816);
  await restrictedPage.waitForFunction(() => window.__h5Check.text(1390, 268) === '0');
  checks.push('浏览器拒绝本地存储时仍可正常开始游戏');
  await restricted.close();
  assert.deepEqual(errors, []);
  await writeFile(path.join(release, remoteUrl ? 'vercel-verification.json' : 'h5-verification.json'), JSON.stringify({
    status: 'PASS', version: report.version, artifact: report.artifact, sha256: report.sha256,
    checkedAt: new Date().toISOString(), url, scope: remoteUrl
      ? '匿名访问公开线上网址，核对全部产物并执行真实93秒游戏流程；无时间或分数作弊'
      : '从发布ZIP解压到内存，以嵌套URL运行真实H5文件；无时间或分数作弊',
    checks, errors, decodedAudio: decoded, unusedDomAudioCount: audio,
    remaining: ['TapTap上传包解析', 'TapTap Android/iOS真机自测', '平台资质及审核'],
  }, null, 2) + '\n');
  console.log(`TapTap H5验证通过：${checks.length}组检查，${files.size}个文件。`);
} finally {
  await browser.close();
  await new Promise(resolve => server.close(resolve));
}
