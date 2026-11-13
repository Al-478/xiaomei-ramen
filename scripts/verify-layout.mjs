import {chromium} from '@playwright/test';
import {build} from 'esbuild';
import {mkdir,writeFile,readFile} from 'node:fs/promises';
import assert from 'node:assert/strict';
const out='previews/layout-audit';await mkdir(out,{recursive:true});
const code=await build({stdin:{contents:`export {Renderer} from './src/core/Renderer';export {Viewport} from './src/core/Viewport';export {ASSETS,LAYOUT} from './src/config/assets';export {MenuScene} from './src/scenes/MenuScene';export {TutorialScene} from './src/scenes/TutorialScene';export {ResultScene} from './src/scenes/ResultScene';export {KitchenView} from './src/scenes/KitchenView';export {SettingsDialog} from './src/ui/SettingsDialog';export {RoundSystem} from './src/gameplay/RoundSystem';export {EffectManager} from './src/core/EffectManager';export {TIMING} from './src/config/timing';`,resolveDir:process.cwd()},bundle:true,write:false,format:'iife',globalName:'LayoutAudit',platform:'browser'});
const browser=await chromium.launch({executablePath:'C:/Program Files/Google/Chrome/Application/chrome.exe',headless:true});
const captures=[],errors=[],burntChecks=[];
const paths=JSON.parse(await readFile('release/resource-report.json','utf8')).files.map(f=>f.path);
try {
 for(const [width,height,insets] of [[844,390,[47,0,47,21]],[1024,768,[0,0,0,0]],[1600,540,[0,0,0,0]]]) {
  const page=await browser.newPage({viewport:{width,height}});page.on('pageerror',e=>errors.push(e.message));
  await page.goto(`http://127.0.0.1:4173/?safeInsets=${insets.join(',')}`);
  await page.waitForFunction(()=>window.__preview.textAt(815,443).includes('准备好了'));
  await page.evaluate(()=>window.__preview.emit('Hide'));await page.addScriptTag({content:code.outputFiles[0].text});
  await page.evaluate(async ({width,height,insets,paths})=>{
   const A=LayoutAudit,images=new Map();await Promise.all(A.ASSETS.filter(spec=>paths.includes(spec.path)).map(async spec=>{const im=new Image();im.src='/'+spec.path;await im.decode();images.set(spec.id,im);}));
   const canvas=document.createElement('canvas');canvas.style.cssText='position:fixed;inset:0;width:100%;height:100%';document.body.append(canvas);
   const platform={canvas,context:canvas.getContext('2d'),screen:()=>({width,height,dpr:1,safeArea:{left:insets[0],top:insets[1],right:width-insets[2],bottom:height-insets[3]}}),createLayer:()=>document.createElement('canvas')};
   const r=new A.Renderer(platform,new A.Viewport(),{get:id=>images.get(id)});r.resize();
   window.auditBurntCheck=()=>[false,true].map(cached=>{
    const canvas=document.createElement('canvas'),c=canvas.getContext('2d');
    const p={canvas,context:c,screen:()=>({width:372,height:260,dpr:1})};
    if(cached)p.createLayer=()=>document.createElement('canvas');
    const renderer=new A.Renderer(p,new A.Viewport(),{get:id=>images.get(id)});renderer.resize();
    const area={x:0,y:0,w:372,h:260};c.fillStyle='#f4c8d8';c.fillRect(0,0,372,260);
    renderer.image('pot-empty',area);renderer.potFront(area);
    const before=c.getImageData(0,0,372,260).data;c.clearRect(0,0,372,260);c.fillRect(0,0,372,260);
    renderer.scorchedPot(area);renderer.potFront(area);
    const after=c.getImageData(0,0,372,260).data;let metalPixels=0,metalDifferences=0,insideChanges=0;
    for(let y=0;y<260;y++)for(let x=0;x<372;x++){
     const i=(y*372+x)*4;if(before[i+3]!==255)continue;
     const changed=[0,1,2,3].some(channel=>before[i+channel]!==after[i+channel]);
     if(y>260*.72||x<372*.18||x>372*.82){metalPixels++;if(changed)metalDifferences++;}
     else if(changed)insideChanges++;
    }
    return {cached,metalPixels,metalDifferences,insideChanges};
   });
   const save={data:{bestScore:38000,musicEnabled:true,soundEnabled:true},writable:true},audio={pause(){},resume(){}};
   window.auditDraw=kind=>{
    r.begin();const round=new A.RoundSystem(),fx=new A.EffectManager();
    if(kind==='menu')new A.MenuScene(r,()=>{},()=>{},save,audio).render();
    else if(kind==='tutorial')new A.TutorialScene(r,()=>{},()=>{}).render();
    else if(kind==='settings'){new A.MenuScene(r,()=>{},()=>{},save,audio).render();const dialog=new A.SettingsDialog(save,audio);dialog.show();dialog.render(r);}
    else if(kind==='win'||kind==='lose'){round.state=kind==='win'?'WON':'LOST';round.money=kind==='win'?100000:30000;round.completedBowls=kind==='win'?10:3;new A.ResultScene(r,round,100000,()=>{},()=>{}).render();}
    else {
     if(kind==='ready'||kind==='serving'){
      for(let i=0;i<4;i++){round.add(i,'water');round.add(i,'noodles');round.add(i,'seasoning');}
      round.update(A.TIMING.boilSeconds);for(let i=0;i<4;i++){round.add(i,'egg');round.add(i,'scallion');}round.update(A.TIMING.readySeconds);
      if(kind==='serving'){round.serve(0);round.update(A.TIMING.serveSeconds*.95);}
     }
     if(kind==='pouring'){round.add(0,'water');fx.add('water',0,{x:250,y:480},1);fx.update(.5);}
     if(kind==='burnt'){round.add(0,'water');round.add(0,'noodles');round.add(0,'seasoning');round.update(A.TIMING.boilSeconds+A.TIMING.burntSeconds+.1);}
     new A.KitchenView(r,fx).render(round,null);
    }
   };
  },{width,height,insets,paths});
  for(const check of await page.evaluate(()=>window.auditBurntCheck())){
   assert.ok(check.metalPixels>1000);assert.equal(check.metalDifferences,0,'烧焦时锅身和把手的金属像素不能被整体染黑');
   assert.ok(check.insideChanges>500,'焦化效果必须作用于锅内');burntChecks.push({width,height,...check});
  }
  for(const kind of ['menu','tutorial','settings','kitchen','pouring','ready','burnt','serving','win','lose']) {
   await page.evaluate(kind=>window.auditDraw(kind),kind);
   const path=`${out}/${kind}-${width}x${height}.png`;await page.screenshot({path});captures.push({kind,width,height,path});
  }
  await page.close();
 }
 assert.deepEqual(errors,[]);await writeFile(`${out}/check.json`,JSON.stringify({version:JSON.parse(await readFile('package.json','utf8')).version,status:'PASS',scope:'当前源码固定帧检查及烧焦锅金属像素验证；正式包交互另由独立脚本验证，尚未微信真机验证',captures,burntChecks,errors},null,2));
 console.log(`布局审查截图生成：${captures.length}张，无绘制异常。`);
}finally{await browser.close();}
