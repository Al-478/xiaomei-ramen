import { chromium } from '@playwright/test';
import { mkdir, readFile, writeFile } from 'node:fs/promises';
import assert from 'node:assert/strict';
await mkdir('previews/final',{recursive:true});
const resource=JSON.parse(await readFile('release/resource-report.json','utf8'));
const audio=JSON.parse(await readFile('assets/audio-manifest.json','utf8'));
const browser=await chromium.launch({executablePath:process.env.RAMEN_CHROME_PATH??'C:/Program Files/Google/Chrome/Application/chrome.exe',headless:true});
const base=`http://127.0.0.1:${process.env.RAMEN_PREVIEW_PORT??4173}`, errors=[],checks=[];
try {
  const page=await browser.newPage({viewport:{width:1170,height:540}});
  page.on('pageerror',error=>errors.push(error.message));
  const scale=540/1086, offset=(1170-1448*scale)/2;
  const click=async(x,y)=>page.mouse.click(offset+x*scale,y*scale);
  await page.goto(base);await page.waitForFunction(()=>window.__preview.textAt(815,443).includes('准备好了'));
  await page.screenshot({path:'previews/final/menu.png'});await click(1100,800);
  await page.waitForFunction(()=>window.__preview.textAt(875,330).includes('厨房课堂'));
  await page.screenshot({path:'previews/final/tutorial.png'});await click(240,480);
  assert.ok(await page.evaluate(()=>window.__preview.textAt(875,330).includes('厨房课堂')));
  await click(835,816);await page.waitForFunction(()=>window.__preview.textAt(875,410).includes('2 / 3'));
  await click(835,816);await click(1100,800);
  await page.waitForFunction(()=>window.__preview.textAt(1390,268)==='0');
  await page.waitForFunction(()=>window.__preview.audioDecoded().some(item=>item.ready>=2&&item.duration>0));
  assert.equal(await page.evaluate(()=>window.__preview.audioCount()),8);
  checks.push('首次三页教程、下层误触阻止、正常开始及8实例音频池可播放');
  const time=await page.evaluate(()=>window.__preview.textAt(938,185));await click(322,982);
  await page.waitForFunction(()=>window.__preview.textAt(724,335)==='游戏已暂停');
  await page.waitForTimeout(1300);assert.equal(await page.evaluate(()=>window.__preview.textAt(938,185)),time);
  assert.equal(await page.evaluate(()=>window.__preview.audioStats().playing),0);
  await page.screenshot({path:'previews/final/pause.png'});await click(725,439);await click(725,539);
  const saved=await page.evaluate(()=>JSON.parse(localStorage.getItem('genkiRamen.save')));
  assert.equal(saved.musicEnabled,false);assert.equal(saved.soundEnabled,false);assert.equal(saved.tutorialCompleted,true);
  await click(725,731);await page.reload();await page.waitForFunction(()=>window.__preview.textAt(815,443).includes('准备好了'));
  await click(1100,800);await page.waitForFunction(()=>window.__preview.textAt(1390,268)==='0');
  assert.equal(await page.evaluate(()=>window.__preview.textAt(875,330)),'');
  assert.equal(await page.evaluate(()=>window.__preview.audioStats().playing),0);
  checks.push('暂停冻结真实时间与声音，独立开关保存；重新启动恢复设置并跳过已读教程');
  const decoded=await page.evaluate(async assets=>{
    const context=new OfflineAudioContext(1,44100,44100),result=[];
    for(const item of assets){const response=await fetch('/'+item.path);const buffer=await context.decodeAudioData(await response.arrayBuffer());
      const data=buffer.getChannelData(0);let peak=0,sum=0;for(const value of data){peak=Math.max(peak,Math.abs(value));sum+=value*value;}
      result.push({id:item.id,duration:buffer.duration,channels:buffer.numberOfChannels,peak,rms:Math.sqrt(sum/data.length)});
    }return result;
  },audio.assets);
  assert.equal(decoded.length,12);for(const item of decoded){assert.ok(item.duration>0.05&&item.rms>0.001&&item.peak<0.99);assert.equal(item.channels,1);}
  checks.push('12项原创MP3经浏览器实际解码，非静音、无数字削波，全部单声道');
  const failed=await browser.newPage({viewport:{width:1448,height:1086}});
  failed.on('pageerror',error=>errors.push(error.message));await failed.route('**/*.mp3',route=>route.abort());
  await failed.goto(base);await failed.waitForFunction(()=>window.__preview.textAt(815,443).includes('准备好了'));
  await failed.mouse.click(1100,800);await failed.waitForFunction(()=>window.__preview.textAt(875,330).includes('厨房课堂'));
  await failed.mouse.click(1100,800);await failed.waitForFunction(()=>window.__preview.textAt(1390,268)==='0');
  await failed.mouse.move(880,750);await failed.mouse.down();await failed.mouse.move(240,480,{steps:6});await failed.mouse.up();await failed.waitForTimeout(700);
  assert.ok(await failed.evaluate(()=>window.__preview.textAt(703,984).includes('加水了')));
  assert.equal(await failed.evaluate(()=>window.__preview.frames()),1);
  assert.equal(await failed.evaluate(()=>window.__preview.imagePaths.length),resource.imageCount);
  checks.push('模拟全部音频失败，仍可进入游戏、加水和继续单一循环');
  assert.deepEqual(errors,[]);
  await writeFile('previews/final/experience-check.json',JSON.stringify({date:new Date().toLocaleDateString('en-CA',{timeZone:'Asia/Shanghai'}),version:resource.version,status:'PASS',checks,decoded,errors,scope:'真实浏览器播放/解码与流程，不能代替手机听感和微信真机'},null,2)+'\n');
  console.log(`完整体验验证通过：${checks.length}项，12项音频解码成功。`);
}finally{await browser.close();}
