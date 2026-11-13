import type { Ingredient } from '../gameplay/Pot';
import type { Point,Rect } from './types';
import {TIMING} from '../config/timing';
export interface ActionEffect { kind: Ingredient | 'water'; pot: number; elapsed: number; duration: number; origin?: Point; waterCount:number; originArea?:Rect }
export interface CoinEffect { elapsed: number; duration: number; index: number }
export class EffectManager {
  actions: ActionEffect[] = [];
  coins: CoinEffect[] = [];
  clock = 0;
  get count(): number { return this.actions.length + this.coins.length; }
  add(kind: Ingredient | 'water', pot: number, origin?: Point, waterCount=1,originArea?:Rect): void {
    this.actions = this.actions.filter(item => item.pot !== pot || item.kind !== kind);
    this.actions.push({kind,pot,elapsed:0,waterCount,duration:kind === 'water' ? TIMING.pourLiftSeconds+TIMING.pourFlowSeconds+TIMING.pourReturnSeconds : kind === 'egg' ? TIMING.eggDropSeconds : TIMING.ingredientDropSeconds, ...(origin ? {origin} : {}),...(originArea?{originArea}:{})});
  }
  award(): void {
    for (let index = 0; index < 6; index++) this.coins.push({elapsed:0,duration:0.85,index});
    if (this.coins.length > 12) this.coins.splice(0, this.coins.length - 12);
  }
  update(dt: number): void {
    this.clock += dt;
    for (const item of this.actions) item.elapsed += dt;
    for (const item of this.coins) item.elapsed += dt;
    this.actions = this.actions.filter(item => item.elapsed < item.duration);
    this.coins = this.coins.filter(item => item.elapsed < item.duration);
  }
  clear(): void { this.actions = []; this.coins = []; this.clock = 0; }
  clearPot(pot: number): void { this.actions = this.actions.filter(item=>item.pot!==pot); }
}
