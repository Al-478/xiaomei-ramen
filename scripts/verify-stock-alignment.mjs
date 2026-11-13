import {chromium} from '@playwright/test';
import assert from 'node:assert/strict';
import {mkdir,writeFile} from 'node:fs/promises';
const out='previews/stock-alignment';await mkdir(out,{recursive:true});
const browser=await chromium.launch({executablePath:'C:/Program Files/Google/Chrome/Application/chrome.exe',headless:true});
const checks=[],errors=[];
try {
 for(const [width,height,insets] of [[844,390,[47,0,47,21]],[1200,540,[28,8,20,12]],[1024,768,[0,0,0,0]]]) {
  const page=await browser.newPage({viewport:{width,height}});page.on('pageerror',e=>errors.push(e.message));
  const scale=Math.min((width-insets[0]-insets[2])/1448,(height-insets[1]-insets[3])/1086);
  const ox=insets[0]+(width-insets[0]-insets[2]-1448*scale)/2,oy=insets[1]+(height-insets[1]-insets[3]-1086*scale)/2;
  const screen=(x,y)=>[ox+x*scale,oy+y*scale];
  const worldScale=Math.min(width/1448,height/1086),world=(x,y)=>[(width-1448*worldScale)/2+x*worldScale,(height-1086*worldScale)/2+y*worldScale];
  await page.goto(`http://127.0.0.1:4173/?safeInsets=${insets.join(',')}`);
  await page.waitForFunction(()=>window.__preview.textAt(815,443).includes('准备好了'));
  await page.mouse.click(...world(1100,800));await page.waitForFunction(()=>window.__preview.textAt(875,330).includes('厨房课堂'));
  await page.mouse.click(...screen(1100,800));await page.waitForFunction(()=>window.__preview.textAt(1390,268)==='0');
  await page.screenshot({path:`${out}/${width}x${height}.png`});
  for(const [id,w,h] of [['seasoning-single',84,100],['scallion-bunch',195,98],['noodle-block',190,94],['egg-single',70,94]]) {
   const stock=await page.evaluate(id=>window.__preview.drawn().filter(d=>d.path.endsWith('/'+id+'.png')),id);
   assert.ok(stock.length>0);
   const item=stock.at(-1);await page.mouse.move(...world(item.x+item.w/2,item.y+item.h/2));await page.mouse.down();
   await page.mouse.move(...world(950,440),{steps:8});await page.waitForTimeout(60);
   const held=await page.evaluate(id=>window.__preview.drawn().filter(d=>d.path.endsWith('/'+id+'.png')),id);
   assert.equal(held.length,stock.length,'拿起的份量必须从柜格消失');
   assert.ok(held.some(d=>Math.abs(d.w-w)<.01&&Math.abs(d.h-h)<.01&&d.x>800),'点击实际显示位置必须能拖出单份食材');
   await page.mouse.up();await page.waitForTimeout(60);
   checks.push({width,height,id,status:'PASS'});
  }
  await page.close();
 }
 assert.deepEqual(errors,[]);await writeFile(`${out}/check.json`,JSON.stringify({status:'PASS',scope:'正式微信包在浏览器适配器中的三种尺寸和实际鼠标拖动；微信真机尚未验证',checks,errors},null,2));
 console.log(`柜格对齐和拖动检查通过：${checks.length}组。`);
} finally {await browser.close();}
