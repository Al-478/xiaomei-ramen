import {chromium} from '@playwright/test';
import {build} from 'esbuild';
import {mkdir,writeFile,readFile} from 'node:fs/promises';
import assert from 'node:assert/strict';
const out='previews/background-revision';await mkdir(out,{recursive:true});
const code=await build({stdin:{contents:"export {Renderer} from './src/core/Renderer'; export {Viewport} from './src/core/Viewport';",resolveDir:process.cwd()},bundle:true,write:false,format:'iife',globalName:'RamenVisualCheck',platform:'browser'});
const browser=await chromium.launch({executablePath:process.env.RAMEN_CHROME_PATH??'C:/Program Files/Google/Chrome/Application/chrome.exe',headless:true});
const checks=[],errors=[],captures=[];
try {
  for(const [width,height,dpr,insets] of [[780,343,1,[32,0,32,16]],[915,412,1.25,[32,0,32,16]],[844,390,1,[47,0,47,21]],[844,390,3,[47,0,47,21]],[1200,540,2,[28,8,20,12]],[1024,768,2,[0,0,0,0]],[1600,540,1,[0,0,0,0]]]) {
    const context=await browser.newContext({viewport:{width,height},deviceScaleFactor:dpr});
    const page=await context.newPage();page.on('pageerror',e=>errors.push(e.message));
    await page.goto(`http://127.0.0.1:4173/?safeInsets=${insets.join(',')}`);
    await page.waitForFunction(()=>window.__preview.textAt(815,443).includes('准备好了'));
    const name=`${width}x${height}-dpr${dpr}`;
    await page.screenshot({path:`${out}/menu-${name}.png`});
    const scale=Math.min((width-insets[0]-insets[2])/1448,(height-insets[1]-insets[3])/1086);
    const offsetX=insets[0]+(width-insets[0]-insets[2]-1448*scale)/2;
    const offsetY=insets[1]+(height-insets[1]-insets[3]-1086*scale)/2;
    await page.mouse.click(offsetX+1100*scale,offsetY+800*scale);
    await page.waitForFunction(()=>window.__preview.textAt(875,330).includes('厨房课堂'));
    await page.mouse.click(offsetX+1100*scale,offsetY+800*scale);
    await page.waitForFunction(()=>window.__preview.textAt(1390,268)==='0');
    await page.evaluate(()=>window.__preview.emit('Hide'));
    await page.screenshot({path:`${out}/game-${name}.png`});
    captures.push({width,height,dpr,insets,menu:`${out}/menu-${name}.png`,game:`${out}/game-${name}.png`});
    await page.addScriptTag({content:code.outputFiles[0].text});
    for(const id of ['menu-wide','kitchen-wide']) {
      const result=await page.evaluate(async ({id,width,height,dpr,insets})=>{
        const image=new Image();image.src=`/assets/images/background/${id}.jpg`;await image.decode();
        const screen={width,height,dpr,safeArea:{left:insets[0],top:insets[1],right:width-insets[2],bottom:height-insets[3]}};
        const render=cached=>{
          const canvas=document.createElement('canvas'),context=canvas.getContext('2d');
          const p={canvas,context,screen:()=>screen};
          if(cached)p.createLayer=()=>document.createElement('canvas');
          const v=new RamenVisualCheck.Viewport(),r=new RamenVisualCheck.Renderer(p,v,{get:()=>image});
          r.resize();r.begin();r.background(id);
          return {canvas,pixels:context.getImageData(0,0,canvas.width,canvas.height).data};
        };
        const a=render(true),b=render(false);let difference=0,maxDifference=0,transparent=0;
        for(let i=0;i<a.pixels.length;i++){if(a.pixels[i]!==b.pixels[i])difference++;maxDifference=Math.max(maxDifference,Math.abs(a.pixels[i]-b.pixels[i]));if(i%4===3&&a.pixels[i]!==255)transparent++;}
        // 中央厨房保持完整，两侧装饰独立填满宽屏。
        const expected=document.createElement('canvas');expected.width=a.canvas.width;expected.height=a.canvas.height;
        const c=expected.getContext('2d'),sceneScale=Math.min(width/1448,height/1086);
        const v=new RamenVisualCheck.Viewport();v.resize(screen);
        const centerX=Math.round((width-1448*sceneScale)/2*v.dpr),rightX=Math.round((width+1448*sceneScale)/2*v.dpr),side=(image.width-1448)/2;
        if(centerX>0)c.drawImage(image,0,0,side,image.height,0,0,centerX+1,expected.height);
        if(expected.width>rightX)c.drawImage(image,side+1448,0,side,image.height,rightX-1,0,expected.width-rightX+1,expected.height);
        c.drawImage(image,side,0,1448,image.height,centerX,0,rightX-centerX,expected.height);
        const pixels=c.getImageData(0,0,expected.width,expected.height).data;
        let coverageDifference=0;
        for(let i=0;i<pixels.length;i++)coverageDifference=Math.max(coverageDifference,Math.abs(pixels[i]-a.pixels[i]));
        return {difference,maxDifference,channelCount:a.pixels.length,transparent,coverageDifference};
      },{id,width,height,dpr,insets});
      // GPU回读允许极少数通道有一级舍入误差，仍必须排除任何结构性错位。
      assert.ok(result.maxDifference<=1&&result.difference/result.channelCount<.00001,'缓存与降级背景不能产生位置或颜色差异');
      assert.equal(result.transparent,0,'整个屏幕必须铺满');
      console.log(JSON.stringify({id,width,height,dpr,...result}));
      assert.ok(result.coverageDifference<=1,'中央厨房保持比例、两侧铺满，允许GPU一级颜色舍入');
      checks.push({id,width,height,dpr,...result});
    }
    await context.close();
  }
  assert.deepEqual(errors,[]);
  await writeFile(`${out}/check.json`,JSON.stringify({version:JSON.parse(await readFile('package.json','utf8')).version,status:'PASS',scope:'正式bundle菜单/游戏截图；独立背景渲染逐像素比较缓存和降级路径，含横屏安全区、非整数接缝及DPR。截图仍需人工视觉查看。',checks,captures,errors},null,2)+'\n');
  console.log(`背景检查通过：${checks.length}组，菜单/游戏${captures.length*2}张截图。`);
} finally {await browser.close();}
