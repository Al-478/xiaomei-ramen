import test from 'node:test';
import assert from 'node:assert/strict';
import { AudioManager, SaveManager, migrateSave, EffectManager, Game, TIMING } from '../.test-build/core.mjs';

function audioPlatform(fail = false) {
  const instances = [];
  return {instances,createAudio() {
    if (fail) throw new Error('音频设备不可用');
    const ended = new Set(), errors = new Set();
    const audio = {src:'',loop:false,volume:0,playing:false,plays:0,destroyed:false,
      play(){this.plays++;this.playing=true;},pause(){this.playing=false;},stop(){this.playing=false;},
      destroy(){this.destroyed=true;this.playing=false;},onEnded(fn){ended.add(fn);},offEnded(fn){ended.delete(fn);},
      onError(fn){errors.add(fn);},offError(fn){errors.delete(fn);},
      error(){errors.forEach(fn=>fn());},end(){this.playing=false;ended.forEach(fn=>fn());},
      listenerCount:()=>ended.size+errors.size,
    }; instances.push(audio);return audio;
  }};
}
test('损坏、缺字段、旧版本与错误类型存档均恢复，合法设置可迁移', () => {
  for (const raw of [null,[],42,'坏的JSON',{version:99},{bestScore:NaN},{bestScore:-1}]) {
    const data = migrateSave(raw);assert.equal(data.version,1);assert.equal(data.bestScore,0);
  }
  assert.equal(migrateSave({version:0,bestScore:1234,musicEnabled:false}).musicEnabled,false);
  assert.equal(migrateSave({version:1,bestScore:123.8,soundEnabled:'错误'}).bestScore,123);
  assert.equal(migrateSave({version:1,bestScore:123.8,soundEnabled:'错误'}).soundEnabled,true);
});
test('读写存档异常不影响流程，最好成绩单调保存，不接受坏数值', () => {
  const s = new SaveManager({read(){throw Error();},write(){throw Error();}});
  s.update({musicEnabled:false});assert.equal(s.data.musicEnabled,false);assert.equal(s.writable,false);
  s.recordScore(30000);s.recordScore(5000);s.recordScore(NaN);assert.equal(s.data.bestScore,30000);
});
test('音乐只有一条、音效池总计最多8实例，快速点击不无限创建', () => {
  const p=audioPlatform(),a=new AudioManager(p);a.unlock();a.init();a.unlock();
  assert.equal(a.instanceCount,8);assert.equal(p.instances[0].plays,1);
  for(let i=0;i<100;i++)a.play('click');assert.equal(p.instances.length,8);
  assert.equal(p.instances.filter(x=>x.playing).length,7);
  a.update(2);assert.equal(p.instances.filter(x=>x.playing).length,1);
  a.dispose();a.dispose();assert.equal(a.instanceCount,0);assert.ok(p.instances.every(x=>x.destroyed&&x.listenerCount()===0));
});
test('音乐/音效独立开关，暂停原因叠加后仅解除全部原因才恢复', () => {
  const p=audioPlatform(),a=new AudioManager(p);a.unlock();a.configure(false,true);
  assert.equal(p.instances[0].playing,false);a.play('coin');assert.ok(p.instances.slice(2).some(x=>x.playing));
  a.configure(true,false);assert.equal(p.instances[0].playing,true);assert.ok(p.instances.slice(2).every(x=>!x.playing));
  a.pause('dialog');a.pause('background');a.resume('background');assert.equal(p.instances[0].playing,false);
  a.resume('dialog');assert.equal(p.instances[0].playing,true);a.dispose();
});
test('音频创建和播放失败不阻塞，失败资源不会被无限重试', () => {
  const unavailable=new AudioManager(audioPlatform(true));unavailable.unlock();unavailable.play('coin');assert.equal(unavailable.instanceCount,0);
  const p=audioPlatform(),a=new AudioManager(p);a.unlock();p.instances[0].error();
  const plays=p.instances[0].plays;for(let i=0;i<10;i++)a.unlock();assert.equal(p.instances[0].plays,plays);a.dispose();
});
test('投料和金币特效有上限并能释放，大步长正确清空', () => {
  const fx=new EffectManager();for(let i=0;i<100;i++){fx.add('egg',i%4);fx.award();}
  assert.ok(fx.actions.length<=4&&fx.coins.length<=12);fx.update(10);assert.equal(fx.count,0);
  fx.add('water',0);fx.clear();assert.equal(fx.clock,0);assert.equal(fx.count,0);
});
function platform() {
  const p=audioPlatform(),listeners=new Map(),frames=new Map(),storage=new Map();let images=0;
  const context=new Proxy({},{get:(o,key)=>key==='createRadialGradient'?()=>({addColorStop(){}}):o[key]??(()=>{})});
  const subscribe=(name,fn)=>{const set=listeners.get(name)??new Set();set.add(fn);listeners.set(name,set);return()=>set.delete(fn);};
  return {...p,canvas:{width:0,height:0},context,frames,
    screen:()=>({width:1170,height:540,dpr:3}),now:()=>0,
    read:key=>storage.get(key),write:(key,value)=>storage.set(key,{...value}),
    requestFrame(fn){frames.set(1,fn);return 1;},cancelFrame(id){frames.delete(id);},
    createImage(){images++;return{width:1448,height:1086,onload(){},onerror(){},set src(value){this.path=value;queueMicrotask(()=>this.onload());}};},
    onTouch:(name,fn)=>subscribe(name,fn),onHide:fn=>subscribe('hide',fn),onShow:fn=>subscribe('show',fn),onResize:fn=>subscribe('resize',fn),
    emit:(name)=>[...(listeners.get(name)??[])].forEach(fn=>fn()),
    count:()=>[...listeners.values()].reduce((n,s)=>n+s.size,0),images:()=>images,
  };
}
const flush=()=>new Promise(resolve=>setTimeout(resolve,5));
test('首次教程阻止下层误触，暂停冻结时间，存档记录教程和设置',async()=>{
  const p=platform(),g=new Game(p);g.start();await flush();g.scenes.tap({x:1100,y:800});await flush();
  assert.equal(g.scenes.current.constructor.name,'TutorialScene');g.scenes.tap({x:240,y:480});
  assert.equal(g.scenes.current.constructor.name,'TutorialScene');g.scenes.tap({x:1100,y:800});
  assert.equal(g.save.data.tutorialCompleted,true);const scene=g.scenes.current;
  scene.tap({x:320,y:982});scene.update(30);assert.equal(scene.round.remaining,93);
  scene.tap({x:725,y:439});assert.equal(g.save.data.musicEnabled,false);
  scene.tap({x:725,y:731});scene.update(1);assert.equal(scene.round.remaining,92);g.dispose();assert.equal(p.count(),0);
});
test('连续十局完整获胜并重开：对象、音频、帧请求和监听保持稳定',async()=>{
  const p=platform(),g=new Game(p);g.start();g.audio.unlock();await flush();g.scenes.tap({x:1100,y:800});await flush();
  g.scenes.tap({x:1100,y:800});const imageCount=p.images();
  for(let cycle=0;cycle<10;cycle++){
    const scene=g.scenes.current;
    for(let batch=0;batch<3;batch++){
      const indices=batch<2?[0,1,2,3]:[0,1];
      for(const index of indices){scene.round.add(index,'water');scene.round.add(index,'noodles');scene.round.add(index,'seasoning');}
      scene.update(TIMING.boilSeconds);
      for(const index of indices){scene.round.add(index,'egg');scene.round.add(index,'scallion');}scene.update(TIMING.readySeconds);
      for(const index of indices){scene.round.serve(index);scene.update(TIMING.serveSeconds);}
    }
    assert.equal(g.scenes.current.constructor.name,'ResultScene');assert.equal(g.save.data.bestScore,100000);
    assert.deepEqual(g.statistics,{raf:1,listeners:7,audio:8,effects:0,scenes:1,images:imageCount});
    g.scenes.tap({x:572,y:966});assert.equal(g.scenes.current.round.money,0);
    assert.equal(g.scenes.current.round.pots.length,4);assert.equal(p.images(),imageCount);assert.equal(p.instances.length,8);
  }
  g.dispose();assert.equal(p.frames.size,0);assert.equal(p.count(),0);assert.ok(p.instances.every(x=>x.destroyed));
});
