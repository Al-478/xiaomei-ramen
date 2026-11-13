import { chromium } from '@playwright/test';
import { mkdir,readFile,copyFile,writeFile } from 'node:fs/promises';
import sharp from 'sharp';
import assert from 'node:assert/strict';
await mkdir('previews/final',{recursive:true});await mkdir('comparison/recreated',{recursive:true});
const browser=await chromium.launch({executablePath:process.env.RAMEN_CHROME_PATH??'C:/Program Files/Google/Chrome/Application/chrome.exe',headless:true});
const base=`http://127.0.0.1:${process.env.RAMEN_PREVIEW_PORT??4173}`;
const captures=[],errors=[],metrics=[];
try{
  const page=await browser.newPage({viewport:{width:1448,height:1086}});page.on('pageerror',error=>errors.push(error.message));
  const shot=async(name,reference,description)=>{const file=`previews/final/${name}.png`;
    await page.evaluate(()=>window.__preview.emit('Hide'));await page.screenshot({path:file});await page.evaluate(()=>window.__preview.emit('Show'));
    const target=`comparison/recreated/${name}.png`;await copyFile(file,target);captures.push({name,reference,description,path:target});};
  await page.goto(base);await page.waitForFunction(()=>window.__preview.textAt(815,443).includes('准备好了'));
  await shot('menu',null,'开头角色、标题、开始按钮与宽屏背景');await page.mouse.click(1100,800);
  await page.waitForFunction(()=>window.__preview.textAt(875,330).includes('厨房课堂'));
  await shot('tutorial',null,'重新表述操作规则，菜单原品牌不进入正式素材');await page.mouse.click(1100,800);
  await page.waitForFunction(()=>window.__preview.textAt(1390,268)==='0');await shot('empty','frame_0038.00.jpg','初始四口独立锅与三个备用锅');
  const pot=[240,480],feed=async(x,y)=>{await page.mouse.move(x,y);await page.mouse.down();await page.mouse.move(...pot,{steps:6});await page.mouse.up();};
  await feed(180,275);await page.waitForTimeout(760);await shot('noodles-before-water','frame_0038.00.jpg','允许先面后水');
  await feed(180,165);await page.waitForTimeout(740);await shot('seasoning-before-water','frame_0042.00.jpg','允许提前调料');
  await feed(880,750);await page.waitForTimeout(180);await shot('pour-water','frame_0042.00.jpg','壶提起、倾斜与蓝色水流');
  await page.waitForTimeout(900);await shot('heating','frame_0045.00.jpg','独立加热，既有面料保留');
  await page.waitForFunction(()=>window.__preview.drawn().some(d=>d.path.endsWith('/steam.png')&&d.x<350&&d.y<600));
  await shot('boiling','frame_0050.00.jpg','根据实际水开气泡与蒸汽采集，后放葱蛋');
  await feed(410,275);await page.waitForTimeout(150);await shot('egg-cracking','frame_0050.00.jpg','用户要求整蛋敲开入汤，替换参考切蛋表现');
  await page.waitForTimeout(350);await shot('egg-falling','frame_0050.00.jpg','蛋液落下');
  await feed(410,165);await page.waitForTimeout(500);await shot('scallion-falling','frame_0050.00.jpg','细碎葱花落入锅');
  await page.waitForFunction(()=>window.__preview.drawn().some(d=>d.path.endsWith('/ready-badge.png')&&d.x<350&&d.y<600));
  await shot('ready','frame_0051.00.jpg','根据实际熟成提示采集完整食物层');
  await page.mouse.move(...pot);await page.mouse.down();await page.mouse.move(1200,680,{steps:8});await page.mouse.up();await page.waitForTimeout(180);
  await shot('serving','frame_0055.00.jpg','拖锅到托盘，锅移动到上菜区域');
  await page.waitForFunction(()=>window.__preview.textAt(1390,268)==='10000');await shot('score','frame_0069.00.jpg','评价与HUD使用同一金额，新标准10000');
  await page.mouse.click(322,982);await shot('pause',null,'统一暂停和音乐/音效开关');await page.mouse.click(725,731);
  await feed(880,750);await page.waitForTimeout(760);await feed(180,275);await page.waitForTimeout(11000);
  await shot('burnt','frame_0104.00.jpg','锅变黑、烟雾提示，不继续加料');await page.mouse.move(...pot);await page.mouse.down();await page.mouse.move(1200,680,{steps:8});await page.mouse.up();
  await page.waitForFunction(()=>window.__preview.textAt(1220,435).includes('烧焦了'));await shot('reserve-used','frame_0125.00.jpg','清理烧焦消耗一个备用锅，正常出餐不消耗');
  for(const [width,height,dpr] of [[960,540,1],[1170,540,1],[1200,540,2],[1024,768,2],[3840,2160,4]]){
    const context=await browser.newContext({viewport:{width,height},deviceScaleFactor:dpr});const p=await context.newPage();
    await p.goto(base);await p.waitForFunction(()=>window.__preview.textAt(815,443).includes('准备好了'));await p.waitForTimeout(900);
    // 高DPR只用于验证真实画布预算；截图按CSS尺寸导出，避免生成上亿像素的浏览器截图。
    await p.screenshot({path:`previews/final/menu-${width}x${height}-dpr${dpr}.png`,scale:'css'});
    const data=await p.evaluate(()=>window.__preview.performance());const times=data.frameTimes.filter(value=>value>0);const mean=times.reduce((a,b)=>a+b,0)/times.length;
    assert.ok(data.canvasWidth*data.canvasHeight<=4000000);metrics.push({width,height,dpr,canvasWidth:data.canvasWidth,canvasHeight:data.canvasHeight,averageFps:Math.round(1000/mean),p95FrameMs:[...times].sort((a,b)=>a-b)[Math.floor(times.length*0.95)]});
    await context.close();
  }
  assert.deepEqual(errors,[]);
  await writeFile('comparison/visual-review.json',JSON.stringify({date:'2026-10-07',status:'CAPTURED',scope:'正常拖动，等待实际水开/熟成状态；截图耗时通过标准Hide/Show暂停，不用于局长测量。只记录采集，不自动判定需求符合；对照见requirements-review.md',captures},null,2)+'\n');
  const montage=[];for(let i=0;i<captures.length;i++){
    const image=await sharp(captures[i].path).resize(362,272,{fit:'contain',background:'#fff0f5'}).png().toBuffer();
    montage.push({input:image,left:(i%4)*362,top:Math.floor(i/4)*272});
  }
  await sharp({create:{width:1448,height:Math.ceil(captures.length/4)*272,channels:4,background:'#fff0f5'}}).composite(montage).png().toFile('comparison/final-contact-sheet.png');
  await writeFile('release/canvas-size-check.json',JSON.stringify({status:'PASS',scope:'只检查画布尺寸和四百万像素预算；独有GameLoop帧率另由measure-performance采样，当前记录不代表真机',metrics:metrics.map(({averageFps,p95FrameMs,...size})=>size),errors},null,2)+'\n');
  console.log(`已采集${captures.length}个实际关键画面和${metrics.length}种尺寸/DPR性能基线。`);
}finally{await browser.close();}
