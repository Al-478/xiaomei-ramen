import {chromium} from '@playwright/test';
import {mkdir,writeFile,copyFile} from 'node:fs/promises';
import assert from 'node:assert/strict';
const out='previews/audit/after';await mkdir(out,{recursive:true});
const browser=await chromium.launch({executablePath:'C:/Program Files/Google/Chrome/Application/chrome.exe',headless:true});
const captures=[],errors=[];
try{
 const page=await browser.newPage({viewport:{width:1448,height:1086}});page.on('pageerror',e=>errors.push(e.message));
 await page.goto('http://127.0.0.1:4173/?benchmark=1');
 await page.waitForFunction(()=>window.__preview.textAt(815,443).includes('准备好了'));
 await page.mouse.click(1100,800);await page.waitForFunction(()=>window.__preview.textAt(875,330).includes('厨房课堂'));
 await page.mouse.click(1100,800);await page.waitForFunction(()=>window.__preview.textAt(1390,268)==='0');
 // 开发入口仅控制同一规则的时间和渲染，获得确定的视觉状态；正式包没有此入口。
 await page.evaluate(()=>__benchmarkGame.loop.stop());
 const step=async(kind)=>page.evaluate(kind=>{
   const g=__benchmarkGame,s=g.scenes.current,r=s.round;
   if(kind==='parallel'){
     for(let i=0;i<4;i++){r.add(i,'water');r.add(i,'noodles');if(i!==3)r.add(i,'seasoning');}
     s.update(2.4);for(let i=0;i<4;i++){if(i===0||i===3)r.add(i,'egg');if(i!==1)r.add(i,'scallion');}s.update(1.1);
   }else if(kind==='ready')s.update(2.3);
   else if(kind==='serve'){r.serve(0);s.update(.3);}
   else if(kind==='landing')s.update(.349);
   else if(kind==='feedback')s.update(.001);
   else if(kind==='burnt')s.update(4.2);
   else if(kind==='charred-serving'){r.serve(1);s.update(.3);}
   else if(kind==='reserve')s.update(.35);
   else if(kind==='unavailable'){
     for(const i of [2,3]){r.serve(i);s.update(.65);}
     r.add(0,'water');r.add(0,'noodles');s.update(10.6);r.serve(0);s.update(.65);
   }else if(kind==='lost')s.update(r.remaining);
   g.renderer.begin();g.scenes.render();
   return r?{money:r.money,reserve:r.reservePots,pots:r.pots.map(p=>p.state)}:null;
 },kind);
 for(const kind of ['parallel','ready','serve','landing','feedback','burnt','charred-serving','reserve','unavailable','lost']){
   const state=await step(kind);await page.screenshot({path:`${out}/${kind}.png`});captures.push({kind,state,path:`${out}/${kind}.png`});
   if(kind==='ready')assert.ok(state.pots.every(s=>s==='READY'));
   if(kind==='feedback')assert.equal(state.money,10000);
   if(kind==='unavailable'){assert.equal(state.reserve,0);assert.equal(state.pots[0],'UNAVAILABLE');}
 }
 await copyFile(`${out}/lost.png`,'previews/final/result-lose.png');
 await copyFile(`${out}/lost.png`,'comparison/recreated/result-lose.png');
 await page.mouse.click(572,966);
 await page.evaluate(()=>{const g=__benchmarkGame,s=g.scenes.current;g.loop.stop();
  for(let b=0;b<3;b++){const indices=b<2?[0,1,2,3]:[0,1];for(const i of indices){s.round.add(i,'water');s.round.add(i,'noodles');s.round.add(i,'seasoning');}
   s.update(2.4);for(const i of indices){s.round.add(i,'egg');s.round.add(i,'scallion');}s.update(3.4);
   for(const i of indices){s.round.serve(i);s.update(.65);}}
  g.renderer.begin();g.scenes.render();});
 assert.equal(await page.evaluate(()=>window.__preview.textAt(724,120)),'目标达成！');
 await page.screenshot({path:`${out}/won.png`});await copyFile(`${out}/won.png`,'previews/final/result-win.png');
 assert.deepEqual(errors,[]);
 await writeFile(`${out}/capture-record.json`,JSON.stringify({status:'CAPTURED',scope:'开发QA入口驱动同一真实规则并停止循环，只用于确定视觉状态；不能冒充真实操作或真实93秒。正常拖动另见phase4/browser-check.json。',captures,errors},null,2));
 console.log(`已取得${captures.length+1}种确定状态的视觉QA截图。`);
}finally{await browser.close();}
