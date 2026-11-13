import test from 'node:test';
import assert from 'node:assert/strict';
import { readFile } from 'node:fs/promises';
import { Viewport, Renderer, InputManager, AssetManager, GameLoop, Game, GameScene, SceneManager } from '../.test-build/core.mjs';

test('横屏安全区背景只绘制一套柜台，缓存和降级路径保持相同坐标并覆盖外围',()=>{
  const image={width:2400,height:1086};
  for(const cached of [false,true]) {
    const draws=[],fills=[];
    const context={save(){},restore(){},setTransform(){},fillRect(...args){fills.push({color:this.fillStyle,args});},drawImage(...args){draws.push(args);}};
    const canvas={width:844,height:390};
    const platform={canvas,context};
    if(cached)platform.createLayer=()=>({width:0,height:0,getContext:()=>context});
    const v=new Viewport();v.resize({width:844,height:390,dpr:1,safeArea:{left:47,top:0,right:797,bottom:369}});
    const r=new Renderer(platform,v,{get:()=>image});r.background('menu-wide');
    const main=draws.filter(args=>args[0]===image);
    assert.equal(main.length,3,'中央厨房和两侧装饰各绘制一次');
    const center=main.find(args=>args[1]===476 && args[3]===1448);
    assert.ok(center);
    const [,sx,sy,sw,sh,x,y,w,h]=center;
    assert.deepEqual([sx,sy,sw,sh],[476,0,1448,1086]);
    assert.equal(y,0);assert.equal(h,390);
    assert.ok(Math.abs(x+w/2-422)<1e-9);
    assert.ok(Math.abs(w/h-1448/1086)<1e-9,'中央厨房保持比例，不能拉伸物件');
    assert.equal(main[0][5],0);assert.equal(main[1][5]+main[1][7],844);
    assert.equal(fills.length,0,'背景必须铺满，不能增加底部纯色条');
    const point=r.scenePoint({x:240,y:480});
    assert.ok(Math.abs((point.x*w/1448+x)-(240*v.scale+v.offsetX))<1e-9,'输入必须与实际绘制坐标一致');
    if(cached){const count=draws.filter(args=>args[0]===image).length;r.background('menu-wide');
      assert.equal(draws.filter(args=>args[0]===image).length,count,'缓存复用不重画背景');}
  }
});

test('背景接缝取整并交叠覆盖，避免真机小数像素采样出现两条黑线',()=>{
  for(const [width,height,dpr] of [[780,343,1],[915,412,1.25],[844,390,2],[932,431,2]]) {
    const draws=[],context={save(){},restore(){},setTransform(){},drawImage(...args){draws.push(args);}};
    const v=new Viewport();v.resize({width,height,dpr});
    const canvas={width:Math.floor(width*v.dpr),height:Math.floor(height*v.dpr)};
    const r=new Renderer({canvas,context},v,{get:()=>({width:2400,height:1086})});r.background('kitchen-wide');
    assert.equal(draws.length,3);
    for(const args of draws)for(const n of args.slice(5))assert.ok(Number.isInteger(n),'绘制边界必须落在实际画布整像素上');
    const [left,right,center]=draws;
    assert.equal(left[5]+left[7],center[5]+1);
    assert.equal(right[5],center[5]+center[7]-1);
    assert.equal(right[5]+right[7],canvas.width);
  }
});

test('全屏厨房的锅、水壶和托盘输入在不同安全区中与显示位置一致',()=>{
  for(const [width,height,insets] of [[844,390,[47,0,47,21]],[1200,540,[28,8,20,12]],[1600,540,[0,0,0,0]]]) {
    const v=new Viewport();v.resize({width,height,dpr:1,safeArea:{left:insets[0],top:insets[1],right:width-insets[2],bottom:height-insets[3]}});
    const r=new Renderer({canvas:{width,height},context:{}},v,{}),scene=new GameScene(r,()=>{});
    const scale=Math.min(width/1448,height/1086),ox=(width-1448*scale)/2,oy=(height-1086*scale)/2;
    const input=(x,y)=>({x:(ox+x*scale-v.offsetX)/v.scale,y:(oy+y*scale-v.offsetY)/v.scale});
    scene.gesture('start',input(880,750));scene.gesture('move',input(90,470));scene.gesture('end',input(90,470));
    assert.equal(scene.round.pots[0].waterCount,1);scene.update(1.2);
    scene.gesture('start',input(240,480));assert.equal(scene.active,0);scene.gesture('cancel',null);
    scene.round.add(0,'noodles');scene.round.add(0,'seasoning');scene.update(2.4);scene.round.add(0,'egg');scene.round.add(0,'scallion');scene.update(3.4);
    scene.gesture('start',input(240,480));scene.gesture('move',input(1170,670));scene.gesture('end',input(1170,670));
    assert.equal(scene.round.pots[0].state,'SERVING');
  }
});

function platform(mode = 'success') {
  const listeners = new Map();
  const frames = new Map();
  let sequence = 0, time = 0, created = 0;
  const context = new Proxy({}, { get: (target, key) => key === 'createRadialGradient' ?
    () => ({ addColorStop() {} }) : target[key] ?? (() => {}) });
  const p = {
    canvas: { width: 0, height: 0 }, context, frames, listeners,
    screen: () => ({ width: 960, height: 540, dpr: 3 }), now: () => time,
    setTime: value => { time = value; }, created: () => created,
    createImage() {
      created++;
      return { width: 1448, height: 1086, onload() {}, onerror() {},
        set src(value) { this.path = value; if (mode === 'success') queueMicrotask(() => this.onload());
          else if (mode === 'error') queueMicrotask(() => this.onerror()); } };
    },
    requestFrame(callback) { frames.set(++sequence, callback); return sequence; },
    cancelFrame(id) { frames.delete(id); },
    subscribe(name, callback) {
      const set = listeners.get(name) ?? new Set(); set.add(callback); listeners.set(name, set);
      return () => set.delete(callback);
    },
    emit(name, event) { for (const callback of listeners.get(name) ?? []) callback(event); },
    onTouch(phase, callback) { return this.subscribe(phase, callback); },
    onResize(callback) { return this.subscribe('resize', callback); },
    onHide(callback) { return this.subscribe('hide', callback); },
    onShow(callback) { return this.subscribe('show', callback); },
    count: () => [...listeners.values()].reduce((n, set) => n + set.size, 0),
  };
  return p;
}
const flush = () => new Promise(resolve => setTimeout(resolve, 5));
const layout = JSON.parse(await readFile('assets/scene-layout.json', 'utf8'));
const assetManifest = JSON.parse(await readFile('assets/manifest.json', 'utf8'));

test('多种比例、DPR及安全区下坐标往返一致，留边不可点击', () => {
  for (const [width, height] of [[960, 540], [1080, 540], [1170, 540], [1200, 540], [1024, 768]]) {
    for (const dpr of [1, 2, 3, 5]) {
      const v = new Viewport();
      v.resize({ width, height, dpr, safeArea: { left: 28, top: 8, right: width - 20, bottom: height - 12 } });
      assert.ok(v.dpr <= 2);
      for (const [x, y] of [[1, 1], [724, 543], [1447, 1085]]) {
        const p = v.toLogical(v.offsetX + x * v.scale, v.offsetY + y * v.scale);
        assert.ok(Math.abs(p.x - x) < 0.000001 && Math.abs(p.y - y) < 0.000001);
      }
      assert.equal(v.toLogical(0, height / 2), null);
    }
  }
});

test('竖屏安全区异常值不会污染横屏布局', () => {
  const v = new Viewport();
  v.resize({ width: 960, height: 540, dpr: 2, safeArea: { left: 0, top: 40, right: 540, bottom: 930 } });
  assert.equal(v.scale, 540 / 1086);
});
test('超高分辨率与DPR仍受四百万像素预算限制',()=>{
  const v=new Viewport();v.resize({width:3840,height:2160,dpr:5});
  assert.ok(v.width*v.height*v.dpr*v.dpr<=4000000.01);
});

test('单指点击一次、多指不接管、取消与拖动不触发，重复绑定不增长', () => {
  const p = platform(), v = new Viewport(); v.resize(p.screen());
  let taps = 0;
  const input = new InputManager(p, v, () => taps++);
  input.bind(); input.bind(); assert.equal(p.count(), 4);
  const first = { identifier: 1, clientX: 400, clientY: 200 };
  const second = { identifier: 2, clientX: 500, clientY: 200 };
  p.emit('start', { touches: [first], changedTouches: [first] });
  p.emit('start', { touches: [first, second], changedTouches: [second] });
  p.emit('cancel', { touches: [first], changedTouches: [second] });
  p.emit('end', { touches: [first], changedTouches: [second] }); assert.equal(taps, 0);
  p.emit('end', { touches: [], changedTouches: [first] }); assert.equal(taps, 1);
  p.emit('end', { touches: [], changedTouches: [first] }); assert.equal(taps, 1);
  p.emit('start', { touches: [first], changedTouches: [first] }); p.emit('cancel');
  p.emit('end', { touches: [], changedTouches: [first] }); assert.equal(taps, 1);
  p.emit('start', { touches: [first], changedTouches: [first] });
  p.emit('move', { touches: [second], changedTouches: [{ ...first, clientX: 450 }] });
  p.emit('end', { touches: [], changedTouches: [first] }); assert.equal(taps, 1);
  input.dispose(); assert.equal(p.count(), 0);
});

test('资源真实进度、去重与并发复用，缓存不重复解码', async () => {
  const p = platform(), a = new AssetManager(p, 30, 3), updates = [];
  const [one, two] = await Promise.all([
    a.load(['menu', 'menu', 'logo'], progress => updates.push(progress)),
    a.load(['menu'], () => {}),
  ]);
  assert.equal(one.loaded, 2); assert.equal(two.loaded, 1); assert.equal(p.created(), 2);
  assert.equal(updates[0].loaded, 0); assert.equal(updates.at(-1).loaded, 2);
  await a.load(['logo'], () => {}); assert.equal(p.created(), 2); a.dispose();
});

test('资源错误与超时有限重试，不永久等待；新加载批次可以恢复', async () => {
  for (const mode of ['error', 'timeout']) {
    const p = platform(mode), a = new AssetManager(p, 8, 3);
    const result = await a.load(['menu'], () => {});
    assert.deepEqual(result.failed, ['menu']); assert.equal(result.loaded, 0); assert.equal(p.created(), 3);
    p.createImage = platform('success').createImage;
    const retry = await a.load(['menu'], () => {});
    assert.equal(retry.loaded, 1); assert.equal(retry.failed.length, 0); a.dispose();
  }
});

test('其他加载批次提前缓存队列中的资源时，真实进度仍达到完整数量', async () => {
  const p = platform();
  p.createImage = () => ({ width: 1448, height: 1086, onload() {}, onerror() {},
    set src(value) { setTimeout(() => this.onload(), value.includes('kitchen') ? 1 : 10); } });
  const a = new AssetManager(p, 100, 3), progress = [];
  const [result] = await Promise.all([
    a.load(['menu', 'logo', 'speech-panel', 'start-button', 'kitchen'], value => progress.push(value.loaded)),
    a.load(['kitchen'], () => {}),
  ]);
  assert.equal(result.loaded, 5); assert.deepEqual(result.failed, []);
  assert.equal(progress.at(-1), 5); a.dispose();
});

test('释放中的资源加载立即结束，并忽略迟到回调', async () => {
  const p = platform('timeout'), a = new AssetManager(p, 5000, 3);
  const task = a.load(['menu'], () => {}); a.dispose();
  const result = await task; assert.deepEqual(result.failed, ['menu']); assert.equal(p.created(), 1);
});

test('重复启动只有一个循环，暂停恢复不累计后台时间，低帧率不截断时间', () => {
  const p = platform(), deltas = [], loop = new GameLoop(p, dt => deltas.push(dt));
  const step = time => { const [id, callback] = p.frames.entries().next().value; p.frames.delete(id); callback(time); };
  loop.start(); loop.start(); assert.equal(p.frames.size, 1);
  step(1000); step(1100); assert.equal(deltas[1], 0.1);
  loop.stop(); assert.equal(p.frames.size, 0);
  loop.start(); step(50000); assert.equal(deltas.at(-1), 0); loop.stop();
});

test('场景切换释放旧场景，输入只进入最上层当前场景', () => {
  const manager = new SceneManager(), events = [];
  const scene = id => ({ render() {}, tap() { events.push(id); }, dispose() { events.push('释放' + id); } });
  manager.change(scene('菜单')); manager.change(scene('加载'));
  manager.tap({ x: 0, y: 0 }); manager.dispose();
  assert.deepEqual(events, ['释放菜单', '加载', '释放加载']);
});

test('水壶提手和壶身都能开始拖动，取消后归位；锅面仍独立',()=>{
  const scene=new GameScene({},()=>{});
  for(const point of [{x:790,y:520},{x:880,y:750}]) {
    scene.gesture('start',point);assert.equal(scene.active,'kettle');
    scene.gesture('cancel',null);assert.equal(scene.active,null);
  }
  for(const [x,y,index] of [[200,480,0],[550,480,1],[200,680,2],[550,680,3]]) {
    scene.gesture('start',{x,y});assert.equal(scene.active,index);scene.gesture('cancel',null);
  }
});

test('完整工程连续十次场景往返，循环与监听稳定，前后台和释放正常', async () => {
  const p = platform(), game = new Game(p);
  game.start(); game.start(); await flush();
  assert.equal(game.scenes.current.constructor.name, 'MenuScene');
  assert.equal(p.count(), 7); assert.equal(p.frames.size, 1);
  for (let i = 0; i < 10; i++) {
    game.scenes.tap({ x: 1000, y: 800 }); await flush();
    if (game.scenes.current.constructor.name === 'TutorialScene') game.scenes.tap({x:1100,y:800});
    assert.equal(game.scenes.current.constructor.name, 'GameScene');
    game.scenes.tap({ x: 155, y: 981 }); await flush();
    assert.equal(game.scenes.current.constructor.name, 'MenuScene');
    assert.equal(p.count(), 7); assert.equal(p.frames.size, 1);
  }
  p.emit('hide'); assert.equal(p.frames.size, 0);
  p.emit('show'); p.emit('show'); assert.equal(p.frames.size, 1);
  p.emit('resize'); assert.ok(p.canvas.width <= 1920);
  game.dispose(); game.dispose(); assert.equal(p.count(), 0); assert.equal(p.frames.size, 0);
});

test('点击不投料；无效拖动、越界取消和重复结束不加水',()=>{
  const scene=new GameScene({},()=>{}),start={x:880,y:750},pot={x:240,y:480};
  scene.tap(start);scene.tap(pot);assert.equal(scene.round.pots[0].waterCount,0);
  scene.gesture('start',start);scene.gesture('end',start);assert.equal(scene.active,null);
  scene.gesture('start',start);scene.gesture('move',{x:1130,y:400});scene.gesture('end',{x:1130,y:400});
  assert.equal(scene.round.pots[0].waterCount,0);
  scene.gesture('start',start);scene.gesture('move',pot);scene.gesture('cancel',null);scene.gesture('end',pot);
  assert.equal(scene.round.pots[0].waterCount,0);
  scene.gesture('start',start);scene.gesture('move',pot);scene.gesture('end',pot);scene.gesture('end',pot);
  assert.equal(scene.round.pots[0].waterCount,1);assert.equal(scene.effectCount,1);assert.equal(scene.active,null);
});

test('四个黑色炉架分别承托对应锅底，备用锅位于柜格层板内', () => {
  const anchor = (item, source) => {
    const asset = assetManifest.assets.find(asset => asset.id === item.id);
    const scale = Math.min(item.w / asset.width, item.h / asset.height);
    return { x: item.x + (item.w - asset.width * scale) / 2 + source[0] * scale,
      y: item.y + (item.h - asset.height * scale) / 2 + source[1] * scale };
  };
  const burners = layout.game.filter(item => item.forPot !== undefined);
  assert.equal(burners.length, 4);
  for (const pot of layout.game.filter(item => item.pot !== undefined)) {
    const burner = burners.find(item => item.forPot === pot.pot);
    assert.ok(burner);
    const base = anchor(pot, layout.mounts.potSourceFoot);
    const seat = anchor(burner, layout.mounts.burnerSourceSeat);
    assert.ok(Math.abs(base.x - seat.x) < 1 && Math.abs(base.y - seat.y) < 1,
      `第${pot.pot + 1}口锅底必须与黑色炉架承托点一致`);
  }
  for (const pot of layout.game.filter(item => item.reserve !== undefined)) {
    const base = anchor(pot, layout.mounts.potSourceFoot);
    assert.ok(Math.abs(base.y - layout.mounts.shelfTop) < 2);
    assert.ok(pot.x >= 720 && pot.x + pot.w <= 1200 && pot.y >= 240);
  }
});
