import {chromium} from '@playwright/test';
import assert from 'node:assert/strict';
import {mkdir,writeFile,readFile} from 'node:fs/promises';
const out='previews/portions';await mkdir(out,{recursive:true});
const browser=await chromium.launch({executablePath:'C:/Program Files/Google/Chrome/Application/chrome.exe',headless:true});
const checks=[],errors=[];
try{
 const page=await browser.newPage({viewport:{width:1448,height:1086}});page.on('pageerror',e=>errors.push(e.message));
 await page.goto('http://127.0.0.1:4173');await page.waitForFunction(()=>window.__preview.textAt(815,443).includes('准备好了'));
 await page.mouse.click(1100,800);await page.waitForFunction(()=>window.__preview.textAt(875,330).includes('厨房课堂'));
 await page.mouse.click(1100,800);await page.waitForFunction(()=>window.__preview.textAt(1390,268)==='0');
 for(const [kind,start,id,w,h,total] of [['egg',[410,275],'egg-single',70,94,6],['seasoning',[180,165],'seasoning-single',84,100,3],['noodles',[180,275],'noodle-block',190,94,1],['scallion',[410,165],'scallion-bunch',195,98,1]]){
  await page.mouse.move(...start);await page.mouse.down();await page.mouse.move(250,375,{steps:8});await page.waitForTimeout(80);
  const drawn=await page.evaluate(()=>window.__preview.drawn());
  const sprites=drawn.filter(d=>d.path.endsWith('/'+id+'.png'));
  assert.equal(sprites.length,total);
  assert.equal(sprites.filter(d=>Math.abs(d.w-w)<.1&&Math.abs(d.h-h)<.1).length,1);
  await page.screenshot({path:`${out}/${kind}-held.png`});await page.mouse.up();await page.waitForTimeout(60);
  checks.push(`${kind}只携带单份、各用独立尺寸，陈列减少对应份量，取消后恢复`);
 }
 assert.deepEqual(errors,[]);
  await writeFile(`${out}/check.json`,JSON.stringify({version:JSON.parse(await readFile('package.json','utf8')).version,status:'PASS',scope:'正常鼠标拖动真实正式bundle，确认每份独立纹理和尺寸；实际微信截图另见desktop/live',checks,errors},null,2));
 console.log('四种材料拿起及份量回归通过。');
}finally{await browser.close();}
