import {build} from 'esbuild';
import {chromium} from '@playwright/test';
import assert from 'node:assert/strict';
import {mkdir} from 'node:fs/promises';
const settings={entryPoints:['scripts/benchmark-entry.mjs'],outfile:'.preview/benchmark.js',bundle:true,platform:'browser',target:'es2020'};
const browser=await chromium.launch({executablePath:'C:/Program Files/Google/Chrome/Application/chrome.exe',headless:true});
try{
 await mkdir('previews/audit',{recursive:true});
 // 在开发bundle内替换开关，保留正式源配置DEV=false。
 await build({...settings,plugins:[{name:'开发统计开关',setup(b){b.onLoad({filter:/config[\\/]version\.ts$/},()=>({loader:'ts',contents:"export const DEV=true;export const GAME_VERSION='1.2.0';"}));}}]});
 const page=await browser.newPage({viewport:{width:1448,height:1086}});
 await page.goto('http://127.0.0.1:4173/?benchmark=1');await page.waitForFunction(()=>window.__preview.textAt(1110,50)==='开发统计');
 await page.mouse.click(1100,800);await page.waitForFunction(()=>window.__preview.textAt(875,330).includes('厨房课堂'));
 await page.mouse.click(1100,800);await page.waitForFunction(()=>window.__preview.textAt(1390,268)==='0');
 await page.screenshot({path:'previews/audit/development.png'});
 await page.goto('http://127.0.0.1:4173');await page.waitForFunction(()=>window.__preview.textAt(815,443).includes('准备好了'));
 assert.equal(await page.evaluate(()=>window.__preview.textAt(1110,50)),'');
 console.log('开发统计包含帧率、场景、锅状态、计时和触摸；正式入口不显示。');
}finally{await build(settings);await browser.close();}
