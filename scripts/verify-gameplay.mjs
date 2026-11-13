import { chromium } from '@playwright/test';
import assert from 'node:assert/strict';
import { mkdir, readFile, writeFile } from 'node:fs/promises';

await mkdir('previews/phase4', { recursive: true });
const report = JSON.parse(await readFile('release/resource-report.json', 'utf8'));
const browser = await chromium.launch({ executablePath: process.env.RAMEN_CHROME_PATH ?? 'C:/Program Files/Google/Chrome/Application/chrome.exe', headless: true });
const baseUrl = `http://127.0.0.1:${process.env.RAMEN_PREVIEW_PORT ?? 4173}`;
const checks = [], errors = [];
try {
  const page = await browser.newPage({ viewport: { width: 1448, height: 1086 } });
  page.on('pageerror', error => errors.push(error.message));
  await page.goto(baseUrl);
  await page.waitForFunction(() => window.__preview.textAt(815, 443).includes('准备好了'));
  assert.equal(await page.evaluate(() => window.__preview.imagePaths.length), 5);
  await page.mouse.click(1100, 800);
  await page.waitForFunction(count => window.__preview.imagePaths.length === count, report.imageCount);
  await page.waitForFunction(()=>window.__preview.textAt(875,330).includes('厨房课堂')||window.__preview.textAt(1390,268)==='0');
  if (await page.evaluate(()=>window.__preview.textAt(875,330).includes('厨房课堂'))) await page.mouse.click(1100,800);
  await page.waitForFunction(()=>window.__preview.textAt(1390,268)==='0');
  await page.screenshot({ path: 'previews/phase4/initial.png' });
  const pots = [[240, 480], [580, 480], [220, 670], [580, 670]];
  const drag=async(from,to)=>{await page.mouse.move(...from);await page.mouse.down();await page.mouse.move(...to,{steps:6});await page.mouse.up();};
  const feed=async(tool,index)=>{await drag(tool,pots[index]);if(tool[0]===880)await page.waitForTimeout(1160);};
  // 按自然时间完成三碗，避免依靠旧的五秒宽松窗口。
  for(const index of [0,1,2]) {
    await feed([180,275],index);await feed([180,165],index);await feed([880,750],index);
    await page.waitForTimeout(1320);
    await feed([410,165],index);await feed([410,275],index);
    await page.waitForTimeout(3250);
    if(index===0)await page.screenshot({path:'previews/phase4/ready.png'});
    await drag(pots[index],[1200,680]);
    await page.waitForFunction(amount=>window.__preview.textAt(1390,268)===String(amount),(index+1)*10000);
  }
  await page.screenshot({path:'previews/phase4/score.png'});
  checks.push('自然计时连续完成三碗，全部操作为拖动，实际金额30000');
  await feed([880,750],3);await feed([180,275],3);await page.waitForTimeout(10800);
  await page.screenshot({path:'previews/phase4/burnt.png'});
  await drag(pots[3],[1200,680]);
  await page.waitForFunction(()=>window.__preview.textAt(1220,435).includes('烧焦了'));
  assert.equal(await page.evaluate(()=>window.__preview.textAt(1390,268)),'30000');
  checks.push('烧焦拖至托盘清理、备用锅替补，金币不减少');
  const remaining = await page.evaluate(() => window.__preview.textAt(938, 185));
  await page.evaluate(() => window.__preview.emit('Hide'));
  await page.waitForTimeout(1500);
  assert.equal(await page.evaluate(() => window.__preview.frames()), 0);
  assert.equal(await page.evaluate(() => window.__preview.textAt(938, 185)), remaining);
  await page.evaluate(() => window.__preview.emit('Show'));
  checks.push('模拟后台1.5秒，倒计时不减少，前台恢复单一循环');
  console.log('烹饪、出餐、烧焦与后台检查通过，正在等待本局真实倒计时结束。');
  await page.waitForFunction(() => window.__preview.textAt(724, 120) === '本局结束', undefined, { timeout: 100000 });
  await page.screenshot({ path: 'previews/phase4/result.png' });
  await page.mouse.click(880, 750); await page.mouse.click(...pots[0]);
  assert.equal(await page.evaluate(() => window.__preview.textAt(1130, 445)), '获得 30000 金币');
  await page.mouse.click(572, 966);
  await page.waitForFunction(() => window.__preview.textAt(1390, 268) === '0' && window.__preview.textAt(938, 185).includes('93'));
  checks.push('真实93秒回合结束，局末挡住下层操作，再来一局恢复金额/时间/锅');
  assert.equal(await page.evaluate(() => window.__preview.listeners()), 7);
  assert.equal(await page.evaluate(() => window.__preview.frames()), 1);
  assert.equal(await page.evaluate(() => window.__preview.imagePaths.length), report.imageCount);
  checks.push('资源不重复解码，监听7个、帧请求1个，重开数量稳定');
  assert.deepEqual(errors, []);
  await writeFile('previews/phase4/browser-check.json', JSON.stringify({ date: new Date().toLocaleDateString('en-CA',{timeZone:'Asia/Shanghai'}), version:report.version, status: 'PASS',
    scope: 'Chrome通过开发适配器运行同一微信bundle，采用真实时间和正常拖动，无游戏作弊入口', checks, errors }, null, 2) + '\n');
  console.log(`阶段四实际画布检查通过：${checks.length}项。`);
} finally { await browser.close(); }
