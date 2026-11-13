import {build} from 'esbuild';
import{mkdir,writeFile}from'node:fs/promises';
import{chromium}from'@playwright/test';
import assert from 'node:assert/strict';
await mkdir('.preview',{recursive:true});
await build({entryPoints:['scripts/benchmark-entry.mjs'],outfile:'.preview/benchmark.js',bundle:true,platform:'browser',format:'iife',target:'es2020'});
const browser=await chromium.launch({executablePath:process.env.RAMEN_CHROME_PATH??'C:/Program Files/Google/Chrome/Application/chrome.exe',headless:true});
const metrics=[];
try{
  for(const [width,height,dpr] of [[960,540,1],[1170,540,1],[1200,540,2],[1024,768,2],[3840,2160,4]]){
    const context=await browser.newContext({viewport:{width,height},deviceScaleFactor:dpr});
    const page=await context.newPage();
    await page.goto(`http://127.0.0.1:${process.env.RAMEN_PREVIEW_PORT??4173}/?benchmark=1`);
    await page.waitForFunction(()=>window.__preview.textAt(815,443).includes('准备好了'));await page.waitForTimeout(2300);
    const data=await page.evaluate(()=>({width:wx.getWindowInfo().windowWidth,height:wx.getWindowInfo().windowHeight,
      canvasWidth:__benchmarkGame.renderer.viewport.width*__benchmarkGame.renderer.viewport.dpr,
      canvasHeight:__benchmarkGame.renderer.viewport.height*__benchmarkGame.renderer.viewport.dpr,
      layerCount:__benchmarkGame.renderer.layerCount,...__benchmarkGame.loop.metrics,...__benchmarkGame.statistics}));
    assert.ok(data.samples>10&&data.raf===1&&data.listeners===7&&data.layerCount===1);
    assert.ok(data.canvasWidth*data.canvasHeight<=4000000.01);
    metrics.push({width,height,dpr,...data});await context.close();
  }
  await writeFile('release/browser-performance.json',JSON.stringify({status:'PASS',scope:'同一核心GameLoop独有帧采样，排除测试轮询和截图开销；Chrome菜单基线，不代表真机FPS/内存/温度',metrics},null,2)+'\n');
  console.log('5种尺寸/DPR性能采样通过，仅统计游戏自身帧循环。');
}finally{await browser.close();}
