import test from 'node:test';
import assert from 'node:assert/strict';
import {fillProgress,waterSurface,mouth,GameScene,TIMING,servingLanding,trayFloor,PORTIONS,stockSlots,heldIngredientArea,dryNoodleArea,KitchenView,EffectManager,RoundSystem,IngredientView} from '../.test-build/core.mjs';
import {readFile} from 'node:fs/promises';
test('水壶在锅口侧边、锅身和锅间松手会选择最近的锅，远处不加水',()=>{
 for(const [point,target] of [[{x:90,y:470},0],[{x:410,y:480},0],[{x:580,y:570},3],[{x:230,y:770},2],[{x:715,y:650},3],[{x:1100,y:400},null]]){
  const s=new GameScene({},()=>{});
  s.gesture('start',{x:880,y:750});s.gesture('move',point);s.gesture('end',point);
  assert.deepEqual(s.round.pots.map(p=>p.waterCount),[0,1,2,3].map(i=>i===target?1:0));
 }
});
test('裂开的蛋壳留在锅口上方，蛋液独立进入锅口遮罩',()=>{
 const images=[],c=new Proxy({globalAlpha:1},{get:(o,k)=>o[k]??(()=>{})});
 const view=new IngredientView({ctx:c,imageFill(id,a){images.push({id,a});}});
 const round=new RoundSystem();round.add(0,'water');const area={x:70,y:375,w:372,h:260};
 view.drop({kind:'egg',pot:0,elapsed:.35,duration:.65,waterCount:1,originArea:{x:215,y:430,w:70,h:94}},area,round.pots[0],1);
 const shell=images.find(i=>i.id==='egg-shells'),liquid=images.find(i=>i.id==='egg-falling');
 assert.ok(shell && liquid);assert.ok(shell.a.y+shell.a.h<mouth(area).y-mouth(area).ry);
 assert.ok(liquid.a.y>shell.a.y);
});
test('四种材料独立份量，面饼落锅保持拿起时的尺寸，不再缩成小图标',async()=>{
 const layout=JSON.parse(await readFile('assets/scene-layout.json','utf8'));
 assert.equal(PORTIONS.egg.id,'egg-single');assert.equal(PORTIONS.seasoning.id,'seasoning-single');
 assert.equal(stockSlots('egg').length,6);assert.equal(stockSlots('seasoning').length,3);
 for(const pot of layout.game.filter(p=>p.pot!==undefined)){
  const held=heldIngredientArea('noodles',{x:pot.x+pot.w/2,y:pot.y+100},{x:180,y:275});
  const placed=dryNoodleArea(pot,0);
  assert.ok(placed.w/held.w>.85 && placed.w/held.w<1.1);
  assert.ok(placed.w/(mouth(pot).rx*2)>.75);
 }
});
test('落料先在本锅绘制，再补本锅前沿，不能全局压在其他锅顶上',()=>{
 const calls=[],c=new Proxy({globalAlpha:1},{get:(o,k)=>k==='createRadialGradient'?()=>({addColorStop(){}}):o[k]??(()=>{})});
 const r={ctx:c,image(id,a){calls.push({kind:'image',id,a});},imageFill(id,a){calls.push({kind:'fill',id,a});},
  potFront(a){calls.push({kind:'front',a});},rotatedImage(){},rotatedImageFill(){},background(){},text(){},pill(){},panel(){},contactShadow(){}};
 const fx=new EffectManager(),round=new RoundSystem();round.add(0,'noodles');fx.add('noodles',0,{x:240,y:480},0,{x:145,y:420,w:190,h:94});fx.update(.22);
 new KitchenView(r,fx).render(round,null);
 const front=calls.findIndex(x=>x.kind==='front'&&x.a.pot===0);
 const moving=calls.findIndex(x=>x.kind==='fill'&&x.id==='noodle-block'&&x.a.y>350&&x.a.x<400);
 const nextPot=calls.findIndex(x=>x.kind==='image'&&x.id==='pot-empty'&&x.a.pot===1);
 assert.ok(moving>=0 && moving<front && front<nextPot);
});
test('出餐锅底落在托盘内侧台面，处于前沿之后，不能浮空或穿过盘前壁',async()=>{
 const layout=JSON.parse(await readFile('assets/scene-layout.json','utf8'));
 const manifest=JSON.parse(await readFile('assets/manifest.json','utf8'));
 const area=servingLanding(),floor=trayFloor(),pot=manifest.assets.find(a=>a.id==='pot-empty');
 const scale=Math.min(area.w/pot.width,area.h/pot.height);
 const footY=area.y+(area.h-pot.height*scale)/2+layout.mounts.potSourceFoot[1]*scale;
 assert.ok(Math.abs(footY-floor.y)<1);
 const tray=layout.game.find(a=>a.id==='tray'),sprite=manifest.assets.find(a=>a.id==='tray');
 const ts=Math.min(tray.w/sprite.width,tray.h/sprite.height);
 const frontY=tray.y+(tray.h-sprite.height*ts)/2+layout.mounts.trayFrontSourceY*ts;
 assert.ok(footY<frontY && frontY-footY<8);
 assert.ok(area.x>tray.x && area.x+area.w<tray.x+tray.w);
});
test('倒水时水位连续上升，补水不退回空锅，汤面始终位于锅口内',()=>{
 const area={x:70,y:375,w:372,h:260},m=mouth(area);
 for(const count of [1,2,3]) {
  let previous=Infinity;
  for(let frame=0;frame<=90;frame++) {
   const units=count-1+fillProgress(frame/90*1.15),s=waterSurface(area,units);
   assert.ok(s.y<=previous+1e-9);previous=s.y;
   assert.ok(s.rx<m.rx && s.y-s.ry>=m.y-m.ry-1 && s.y+s.ry<=m.y+m.ry+1);
  }
 }
 assert.equal(fillProgress(0),0);assert.equal(fillProgress(1.15),1);
});
test('倒水期间不能再次拖动同一水壶或提走目标锅，结束后恢复',()=>{
 const s=new GameScene({},()=>{}),k={x:880,y:750},p={x:240,y:480};
 const drag=(from,to)=>{s.gesture('start',from);s.gesture('move',to);s.gesture('end',to);};
 drag(k,p);drag(k,{x:580,y:480});
 assert.equal(s.round.pots[0].waterCount,1);assert.equal(s.round.pots[1].waterCount,0);
 s.gesture('start',p);assert.equal(s.active,null);s.update(1.2);
 s.gesture('start',p);assert.equal(s.active,0);s.gesture('cancel',null);
 drag(k,p);assert.equal(s.round.pots[0].waterCount,2);
});
test('新节奏保留短熟成窗口，四口锅能按事务顺序全部出餐',()=>{
 const s=new GameScene({},()=>{});
 for(let i=0;i<4;i++){s.round.add(i,'water');s.round.add(i,'noodles');s.round.add(i,'seasoning');}
 s.update(TIMING.boilSeconds);
 for(let i=0;i<4;i++){s.round.add(i,'egg');s.round.add(i,'scallion');}
 s.update(TIMING.readySeconds);
 for(let i=0;i<4;i++){assert.ok(s.round.serve(i).ok);s.update(TIMING.serveSeconds);}
 assert.equal(s.round.money,40000);assert.ok(TIMING.overcookSeconds-TIMING.readySeconds<2.3);
});
test('评价在真实出餐结算时出现，金额和冻结售价一致，暂停不提前过期',()=>{
 const s=new GameScene({},()=>{}),r=s.round;
 r.add(0,'water');r.add(0,'noodles');r.add(0,'seasoning');r.update(TIMING.boilSeconds);
 r.add(0,'egg');r.add(0,'scallion');r.update(TIMING.readySeconds);
 r.serve(0);assert.equal(r.lastJudgment,null);r.update(TIMING.serveSeconds);
 assert.equal(r.lastJudgment.price,r.money);assert.equal(r.lastJudgmentAt,r.time);
 const stamp=r.lastJudgmentAt;for(let i=0;i<50;i++)r.update(0);
 assert.equal(r.lastJudgmentAt,stamp);assert.equal(r.time-stamp,0);
 r.update(TIMING.feedbackSeconds);assert.ok(r.time-r.lastJudgmentAt>=TIMING.feedbackSeconds-1e-8);
});
