import{chromium}from'@playwright/test';
import{copyFile}from'node:fs/promises';
const browser=await chromium.launch({executablePath:process.env.RAMEN_CHROME_PATH??'C:/Program Files/Google/Chrome/Application/chrome.exe',headless:true});
try{
  const page=await browser.newPage({viewport:{width:1170,height:540}});
  await page.goto(`http://127.0.0.1:${process.env.RAMEN_PREVIEW_PORT??4173}/?benchmark=1`);
  await page.waitForFunction(()=>window.__preview.textAt(815,443).includes('准备好了'));
  const scale=540/1086,offset=(1170-1448*scale)/2;
  await page.mouse.click(offset+1100*scale,800*scale);
  await page.waitForFunction(()=>window.__preview.textAt(875,330).includes('厨房课堂'));
  await page.mouse.click(offset+1100*scale,800*scale);await page.waitForFunction(()=>window.__preview.textAt(1390,268)==='0');
  // 仅开发入口驱动同一真实规则完成十碗，用于成功画面QA；微信包没有此入口。
  await page.evaluate(()=>{
    const scene=__benchmarkGame.scenes.current;
    for(let batch=0;batch<3;batch++){
      const indices=batch<2?[0,1,2,3]:[0,1];
      for(const index of indices){scene.round.add(index,'water');scene.round.add(index,'noodles');scene.round.add(index,'seasoning');}
      scene.update(2.4);for(const index of indices){scene.round.add(index,'egg');scene.round.add(index,'scallion');}scene.update(3.4);
      for(const index of indices){scene.round.serve(index);scene.update(0.65);}
    }
  });
  await page.waitForFunction(()=>window.__preview.textAt(724,120)==='目标达成！');
  await page.screenshot({path:'previews/final/result-win.png'});
  await copyFile('previews/final/result-win.png','comparison/recreated/result-win.png');
  await copyFile('previews/phase4/result.png','previews/final/result-lose.png');
  console.log('成功与失败结算画面已保存，成功截图使用开发QA入口，失败来自真实93秒回合。');
}finally{await browser.close();}
