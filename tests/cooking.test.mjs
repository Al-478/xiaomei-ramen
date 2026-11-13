import test from 'node:test';
import assert from 'node:assert/strict';
import { Pot, RoundSystem, judge, TIMING, BALANCE, GameScene } from '../.test-build/core.mjs';

function prepare(round, indices = [0]) {
  for (const index of indices) {
    round.add(index, 'noodles'); round.add(index, 'seasoning'); round.add(index, 'water');
  }
  round.update(TIMING.boilSeconds);
  for (const index of indices) { round.add(index, 'scallion'); round.add(index, 'egg'); }
  round.update(TIMING.readySeconds);
}
const renderer = () => ({ image() {}, background() {}, text() {}, panel() {}, pill() {}, contactShadow() {}, ctx: { fillRect() {} } });

test('面和调料可预先放入空锅，水温与煮面计时独立', () => {
  const p = new Pot(0);
  assert.ok(p.add('noodles', 0).ok); assert.ok(p.add('seasoning', 0).ok);
  p.update(20); assert.equal(p.state, 'EMPTY'); assert.equal(p.cookingSeconds, 0);
  p.addWater(); p.update(TIMING.boilSeconds-1); assert.equal(p.state, 'HEATING'); assert.equal(p.cookingSeconds, 0);
  p.update(2); assert.equal(p.state, 'COOKING'); assert.equal(p.cookingSeconds, 1);
});

test('空水锅沸腾、后放面开始煮面，不能把沸腾时间当熟度', () => {
  const p = new Pot(0); p.addWater(); p.update(8);
  assert.equal(p.state, 'BOILING'); assert.equal(p.cookingSeconds, 0);
  p.add('noodles', 8); assert.equal(p.state, 'COOKING'); assert.equal(p.cookingSeconds, 0);
  p.update(TIMING.readySeconds); assert.equal(p.state, 'READY');
});

test('熟成、过熟、烧焦边界精确，烧焦后不可继续投料', () => {
  const p = new Pot(0); p.addWater(); p.add('noodles', 0);
  p.update(TIMING.boilSeconds + TIMING.readySeconds - 0.001); assert.equal(p.state, 'COOKING');
  p.update(0.001); assert.equal(p.state, 'READY');
  p.update(TIMING.overcookSeconds - TIMING.readySeconds); assert.equal(p.state, 'OVERCOOKED');
  p.update(TIMING.burntSeconds - TIMING.overcookSeconds); assert.equal(p.state, 'BURNT');
  assert.equal(p.add('egg', 22).ok, false); assert.equal(p.addWater().ok, false);
});

test('四锅独立推进，不互相复制水、配料或熟度', () => {
  const r = new RoundSystem(); r.add(0, 'water'); r.add(0, 'noodles'); r.update(TIMING.boilSeconds-1);
  r.add(1, 'water'); r.add(2, 'noodles'); r.update(1.5);
  assert.equal(r.pots[0].state, 'COOKING'); assert.equal(r.pots[1].state, 'HEATING');
  assert.equal(r.pots[2].state, 'EMPTY'); assert.equal(r.pots[3].ingredients.noodles.count, 0);
});

test('水开前后投葱蛋保留真实时机，材料快照不会随原锅变动', () => {
  const r = new RoundSystem(); r.add(0, 'egg'); r.add(0, 'water'); r.update(4); r.add(0, 'scallion');
  assert.equal(r.pots[0].ingredients.egg.early, true); assert.equal(r.pots[0].ingredients.scallion.early, false);
  assert.equal(r.pots[0].ingredients.scallion.firstAddedAt, 4);
  const snapshot = r.pots[0].snapshot(); r.add(0, 'egg');
  assert.equal(snapshot.ingredients.egg.count, 1);
});

test('完整配方正确时机售价10000，缺料/早放/重复/过熟降低评价', () => {
  const r = new RoundSystem(); prepare(r); const good = r.pots[0].snapshot();
  assert.equal(judge(good).price, 10000);
  const change = fn => { const p = structuredClone(good); fn(p); return judge(p); };
  assert.equal(change(p => p.ingredients.egg.count = 0).price, 6000);
  assert.equal(change(p => p.ingredients.egg.early = true).price, 8000);
  assert.equal(change(p => p.ingredients.seasoning.count = 2).price, 5000);
  assert.equal(change(p => p.state = 'OVERCOOKED').price, 8000);
  assert.equal(change(p => p.state = 'BURNT').price, 0);
});

test('未熟或空锅不能出餐，不增加金额或消耗备用锅', () => {
  const r = new RoundSystem(); assert.equal(r.serve(0).ok, false);
  r.add(0, 'water'); r.add(0, 'noodles'); r.update(5); assert.equal(r.serve(0).ok, false);
  assert.equal(r.money, 0); assert.equal(r.reservePots, 3); assert.equal(r.serving, null);
});

test('连续点击同一锅、不同锅和托盘只能锁定一笔出餐并结算一次', () => {
  const r = new RoundSystem(); prepare(r, [0, 1]);
  assert.ok(r.serve(0).ok);
  for (let i = 0; i < 50; i++) { assert.equal(r.serve(i % 2).ok, false); }
  assert.equal(r.add(0, 'seasoning').ok, false); assert.equal(r.money, 0);
  r.update(TIMING.serveSeconds); assert.equal(r.money, 10000); assert.equal(r.completedBowls, 1);
  assert.equal(r.pots[0].state, 'EMPTY'); assert.equal(r.reservePots, 3);
  assert.equal(r.serve(0).ok, false); assert.equal(r.money, 10000);
  assert.ok(r.serve(1).ok); r.update(1); assert.equal(r.money, 20000);
});

test('出餐评价冻结，抬起后不会因晚一帧变成过熟或烧焦', () => {
  const r = new RoundSystem(); prepare(r); r.update(TIMING.overcookSeconds - TIMING.readySeconds - 0.01);
  r.serve(0); r.update(1); assert.equal(r.lastJudgment.price, 10000);
  assert.equal(r.message.includes('10000'), true);
});

test('烧焦清理逐次消耗三个备用锅，之后炉位不可用；不会扣已有金币', () => {
  const r = new RoundSystem();
  for (let i = 0; i < 4; i++) {
    r.add(0, 'water'); r.add(0, 'noodles'); r.update(TIMING.boilSeconds + TIMING.burntSeconds);
    assert.ok(r.serve(0).ok); r.update(TIMING.serveSeconds);
    assert.equal(r.reservePots, Math.max(0, 2 - i)); assert.equal(r.money, 0);
  }
  assert.equal(r.pots[0].state, 'UNAVAILABLE'); assert.equal(r.add(0, 'water').ok, false);
});

test('重复材料和补水有数量上限，不能无限增加记录或无限延迟烧焦', () => {
  const r = new RoundSystem();
  for (let i = 0; i < 3; i++) { r.add(0, 'water'); r.add(0, 'seasoning'); }
  assert.equal(r.add(0, 'water').ok, false); assert.equal(r.add(0, 'seasoning').ok, false);
  r.update(TIMING.boilSeconds + TIMING.drySeconds); assert.equal(r.pots[0].state, 'BURNT');
});

test('补水短暂降温，不会清除已经记录的熟度或早放错误', () => {
  const r = new RoundSystem(); r.add(0, 'egg'); r.add(0, 'noodles'); r.add(0, 'water'); r.update(TIMING.boilSeconds+1);
  const before = r.pots[0].cookingSeconds; r.add(0, 'water');
  assert.equal(r.pots[0].state, 'HEATING'); r.update(0.5); assert.equal(r.pots[0].cookingSeconds, before);
  assert.equal(r.pots[0].ingredients.egg.early, true); r.update(1); assert.ok(r.pots[0].cookingSeconds > before);
});

test('60/30/20/10 FPS与一次大步长给出相同回合时间和锅状态', () => {
  for (const fps of [60, 30, 20, 10]) {
    const fine = new RoundSystem(), coarse = new RoundSystem();
    for (const r of [fine, coarse]) { r.add(0, 'water'); r.add(0, 'noodles'); }
    for (let i = 0; i < 12 * fps; i++) fine.update(1 / fps);
    coarse.update(12);
    assert.equal(fine.pots[0].state, coarse.pots[0].state);
    assert.ok(Math.abs(fine.pots[0].cookingSeconds - coarse.pots[0].cookingSeconds) < 1e-6);
    assert.ok(Math.abs(fine.remaining - coarse.remaining) < 1e-6);
  }
});

test('截止前已接受的出餐只结算一次，局末后任何操作均被拒绝', () => {
  const r = new RoundSystem(); r.update(TIMING.roundSeconds-TIMING.boilSeconds-TIMING.readySeconds-.2); prepare(r); assert.ok(r.serve(0).ok);
  r.update(10); assert.equal(r.remaining, 0); assert.equal(r.state, 'LOST'); assert.equal(r.money, 10000);
  for (let i = 0; i < 20; i++) { r.update(1); r.add(0, 'water'); r.serve(0); }
  assert.equal(r.money, 10000); assert.equal(r.completedBowls, 1);
});

test('十碗标准拉面达成十万，重复更新不会多结算，获胜时间不多走', () => {
  const r = new RoundSystem();
  for (let batch = 0; batch < 3; batch++) {
    const indices = batch < 2 ? [0, 1, 2, 3] : [0, 1]; prepare(r, indices);
    for (const index of indices) { assert.ok(r.serve(index).ok); r.update(TIMING.serveSeconds); }
  }
  assert.equal(r.state, 'WON'); assert.equal(r.money, BALANCE.targetAmount); assert.equal(r.completedBowls, 10);
  const time = r.time; r.update(999); assert.equal(r.time, time); assert.equal(r.money, 100000);
});

test('完整触摸流程：拖动投料、锅熟成、拖锅到托盘结算、局末遮罩和重开', () => {
  const s = new GameScene(renderer(), () => {});
  const pot = { x: 240, y: 480 };
  for (const point of [{ x: 880, y: 750 }, { x: 180, y: 275 }, { x: 180, y: 165 }]) { s.gesture('start',point); s.gesture('move',pot); s.gesture('end',pot); }
  s.update(TIMING.boilSeconds);
  for (const point of [{ x: 410, y: 165 }, { x: 410, y: 275 }]) { s.gesture('start',point); s.gesture('move',pot); s.gesture('end',pot); }
  s.update(TIMING.readySeconds); assert.equal(s.round.pots[0].state, 'READY');
  s.gesture('start',pot); s.gesture('move',{x:1200,y:680}); s.gesture('end',{x:1200,y:680}); s.update(1);
  assert.equal(s.round.money, 10000); assert.equal(s.round.pots[0].state, 'EMPTY');
  s.update(100); const oldRound = s.round;
  s.tap({ x: 880, y: 750 }); s.tap(pot); assert.equal(oldRound.pots[0].waterCount, 0);
  s.tap({ x: 570, y: 700 }); assert.notEqual(s.round, oldRound); assert.equal(s.round.remaining, 93);
});

test('非法时间不会产生NaN、负时间或金额；长步长截止精确', () => {
  const r = new RoundSystem(); for (const dt of [-1, NaN, Infinity]) r.update(dt);
  assert.equal(r.remaining, 93); r.update(10000); assert.equal(r.remaining, 0); assert.equal(r.money, 0);
});
