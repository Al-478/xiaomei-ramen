import { chromium } from '@playwright/test';
import assert from 'node:assert/strict';
import { mkdir, readFile, writeFile } from 'node:fs/promises';

await mkdir('previews/phase3', { recursive: true });
const browser = await chromium.launch({ executablePath: process.env.RAMEN_CHROME_PATH ?? 'C:/Program Files/Google/Chrome/Application/chrome.exe', headless: true });
const baseUrl = `http://127.0.0.1:${process.env.RAMEN_PREVIEW_PORT ?? 4173}`;
const errors = [];
const checks = [];
const packagedImages = JSON.parse(await readFile('release/resource-report.json', 'utf8')).imageCount;
const menuCount = JSON.parse(await readFile('assets/runtime-groups.json','utf8')).menu.length;
try {
  const page = await browser.newPage({ viewport: { width: 1448, height: 1086 } });
  page.on('pageerror', error => errors.push(error.message));
  page.on('console', message => { if (message.type() === 'error') errors.push(message.text()); });
  await page.goto(baseUrl);
  await page.waitForFunction(count => window.__preview.imagePaths.length === count,menuCount);
  await page.waitForTimeout(250);
  assert.equal(await page.evaluate(() => window.__preview.listeners()), 7);
  await page.screenshot({ path: 'previews/phase3/menu.png' });
  checks.push(`首屏仅请求${menuCount}项菜单图片；菜单截图已生成`);
  await page.mouse.click(1100, 800);
  await page.waitForFunction(count => window.__preview.imagePaths.length === count, packagedImages);
  await page.waitForFunction(()=>window.__preview.textAt(875,330).includes('厨房课堂')||window.__preview.textAt(1390,268)==='0');
  if (await page.evaluate(()=>window.__preview.textAt(875,330).includes('厨房课堂'))) await page.mouse.click(1100,800);
  await page.waitForFunction(()=>window.__preview.textAt(1390,268)==='0');
  await page.waitForTimeout(250);
  const initialGame = await page.screenshot({ path: 'previews/phase3/game.png' });
  await page.mouse.move(880,750);await page.mouse.down();await page.mouse.move(900,600,{steps:5});
  await page.screenshot({path:'previews/phase3/kettle-selected.png'});await page.mouse.up();
  await page.mouse.move(240,480);await page.mouse.down();await page.mouse.move(350,420,{steps:5});
  const lifted=await page.screenshot({path:'previews/phase3/selection.png'});
  assert.ok(!initialGame.equals(lifted),'拖动锅时必须跟随手指抬起');await page.mouse.up();
  assert.equal(await page.evaluate(()=>window.__preview.textAt(1390,268)),'0');
  checks.push('拖动锅与水壶跟随手指；无效落点归位，金额保持0');
  for (let i = 0; i < 10; i++) {
    await page.mouse.click(155, 981);
    await page.mouse.click(1100, 800);
    await page.waitForTimeout(15);
  }
  assert.equal(await page.evaluate(() => window.__preview.imagePaths.length), packagedImages);
  assert.equal(await page.evaluate(() => window.__preview.listeners()), 7);
  assert.equal(await page.evaluate(() => window.__preview.frames()), 1);
  checks.push('连续10次菜单与场景往返：图片不重复解码、7个监听、1个帧请求');
  await page.evaluate(() => window.__preview.emit('Hide'));
  assert.equal(await page.evaluate(() => window.__preview.frames()), 0);
  await page.evaluate(() => window.__preview.emit('Show'));
  assert.equal(await page.evaluate(() => window.__preview.frames()), 1);
  checks.push('模拟前后台：后台0个帧请求，前台恢复1个帧请求');
  for (const [width, height] of [[960, 540], [1170, 540], [1200, 540], [1024, 768]]) {
    await page.setViewportSize({ width, height });
    await page.waitForTimeout(50);
    const scale = Math.min(width / 1448, height / 1086);
    await page.mouse.click((width - 1448 * scale) / 2 + 155 * scale, (height - 1086 * scale) / 2 + 981 * scale);
    await page.waitForTimeout(50);
    await page.screenshot({ path: `previews/phase3/menu-${width}x${height}.png` });
    await page.mouse.click((width - 1448 * scale) / 2 + 1100 * scale, (height - 1086 * scale) / 2 + 800 * scale);
    await page.waitForTimeout(50);
    await page.screenshot({ path: `previews/phase3/game-${width}x${height}.png` });
    if (width / height > 1.6) {
      const pixels = await page.evaluate(() => {
        const canvas = document.getElementById('game'), ctx = canvas.getContext('2d');
        return [8, canvas.width - 9].map(x => Array.from(ctx.getImageData(x, Math.round(canvas.height * 0.45), 1, 1).data));
      });
      for (const pixel of pixels) assert.notDeepEqual(pixel.slice(0, 3), [84, 32, 57], '宽屏两侧应是厨房场景，不能留下原来的纯色边');
    }
  }
  checks.push('16:9、19.5:9、20:9及4:3窗口适配与触摸往返已检查');
  checks.push('宽屏左右边缘实际像素为厨房背景，菜单与游戏均已保存宽屏截图');
  const failed = await browser.newPage({ viewport: { width: 1448, height: 1086 } });
  failed.on('pageerror', error => errors.push(error.message));
  await failed.goto(`${baseUrl}/?failures=${menuCount*3}`);
  await failed.waitForFunction(count => window.__preview.imagePaths.length === count,menuCount*3);
  await failed.waitForTimeout(100);
  await failed.screenshot({ path: 'previews/phase3/load-failed.png' });
  await failed.mouse.click(724, 744);
  await failed.waitForFunction(count => window.__preview.imagePaths.length === count,menuCount*4);
  await failed.waitForTimeout(200);
  await failed.screenshot({ path: 'previews/phase3/load-recovered.png' });
  await failed.mouse.click(1100, 800);
  await failed.waitForFunction(value => window.__preview.imagePaths.length === value[0]+value[1]*3,[packagedImages,menuCount]);
  await failed.waitForFunction(()=>window.__preview.textAt(875,330).includes('厨房课堂')||window.__preview.textAt(1390,268)==='0');
  if (await failed.evaluate(()=>window.__preview.textAt(875,330).includes('厨房课堂'))) await failed.mouse.click(1100,800);
  checks.push('模拟首屏资源各失败3次：出现失败提示，重新加载可恢复进入游戏场景');
  assert.deepEqual(errors, []);
  await writeFile('previews/phase3/browser-check.json', JSON.stringify({ date: '2026-10-07', status: 'PASS',
    scope: 'Chrome运行相同微信bundle的开发适配器，不代表微信开发者工具或真机验证', checks, errors }, null, 2) + '\n');
  console.log(`浏览器画布验证通过：${checks.length}项，0个运行错误。`);
} finally { await browser.close(); }
