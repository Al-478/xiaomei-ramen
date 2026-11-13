import { BALANCE } from '../config/gameBalance';
import { TIMING } from '../config/timing';
import { Pot, type Ingredient, type ActionResult, type PotSnapshot } from './Pot';
import { judge, type Judgment } from './ScoreSystem';
import type { Rect } from '../core/types';

export type RoundState = 'RUNNING' | 'WON' | 'LOST';
export interface Serving {
  index: number; generation: number; remaining: number; snapshot: PotSnapshot; judgment: Judgment;
  origin?: Rect;
}
export class RoundSystem {
  readonly pots = Array.from({ length: 4 }, (_, index) => new Pot(index));
  state: RoundState = 'RUNNING';
  time = 0;
  money = 0;
  reservePots: number = BALANCE.reservePots;
  serving: Serving | null = null;
  lastJudgment: Judgment | null = null;
  lastJudgmentAt = -Infinity;
  completedBowls = 0;
  message = '拖动水壶和食材到锅内；水开后放葱蛋';
  messageAt = 0;
  get remaining(): number { return Math.max(0, TIMING.roundSeconds - this.time); }

  add(index: number, ingredient: Ingredient | 'water'): ActionResult {
    if (this.state !== 'RUNNING') return { ok: false, message: '本局已经结束' };
    const pot = this.pots[index];
    if (!pot) return { ok: false, message: '没有这口锅' };
    const result = ingredient === 'water' ? pot.addWater() : pot.add(ingredient, this.time);
    this.message = result.message;
    this.messageAt = this.time;
    return result;
  }
  serve(index: number): ActionResult {
    if (this.state !== 'RUNNING') return { ok: false, message: '本局已经结束' };
    if (this.serving) return this.feedback(false, '托盘正在结算，请稍等');
    const pot = this.pots[index];
    if (!pot || !pot.available) return this.feedback(false, '这口锅暂时不能上菜');
    const snapshot = pot.snapshot(), judgment = judge(snapshot);
    if (!judgment) return this.feedback(false, pot.waterCount ? '面还没煮熟，再等一会儿' : '空锅不能上菜');
    pot.state = 'SERVING';
    this.serving = { index, generation: pot.generation, remaining: TIMING.serveSeconds, snapshot, judgment };
    return this.feedback(true, judgment.burnt ? '正在清理烧焦的锅' : '正在上菜');
  }
  update(dt: number): void {
    if (this.state !== 'RUNNING' || !Number.isFinite(dt) || dt <= 0) return;
    let left = Math.min(dt, this.remaining);
    // 在出餐和局末边界分段推进，低帧率也不会多煮或漏结算。
    while (left > 1e-8 && this.state === 'RUNNING') {
      const elapsed = Math.min(left, this.remaining, this.serving?.remaining ?? left);
      this.time = Math.min(TIMING.roundSeconds, this.time + elapsed);
      for (const pot of this.pots) pot.update(elapsed);
      if (this.serving) {
        this.serving.remaining -= elapsed;
        if (this.serving.remaining <= 1e-8) this.finishServing();
      }
      left -= elapsed;
      if (this.remaining <= 1e-8) {
        // 截止前已接受的出餐仍只结算一次；截止后的新操作全部阻止。
        this.finishServing(); this.time = TIMING.roundSeconds;
        this.state = this.money >= BALANCE.targetAmount ? 'WON' : 'LOST';
      } else if (this.money >= BALANCE.targetAmount) this.state = 'WON';
      else if (this.pots.every(pot => pot.state === 'UNAVAILABLE')) this.state = 'LOST';
    }
  }
  private finishServing(): void {
    const transaction = this.serving;
    if (!transaction) return;
    this.serving = null;
    const pot = this.pots[transaction.index];
    if (!pot || pot.generation !== transaction.generation || pot.state !== 'SERVING') {
      throw new Error('出餐事务与锅状态不一致');
    }
    const judgment = transaction.judgment;
    this.lastJudgment = judgment;
    this.lastJudgmentAt = this.time;
    this.money += judgment.price;
    if (!judgment.burnt) this.completedBowls++;
    let replace = true;
    if (judgment.burnt) {
      replace = this.reservePots > 0;
      if (replace) this.reservePots--;
    }
    pot.restore(replace);
    this.message = `${judgment.label}${judgment.price ? `，获得 ${judgment.price} 金币` : '，本碗没有收入'}`;
    this.messageAt = this.time;
  }
  private feedback(ok: boolean, message: string): ActionResult { this.message = message; this.messageAt=this.time; return { ok, message }; }
}
