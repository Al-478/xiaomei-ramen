import { TIMING } from '../config/timing';
import { BALANCE } from '../config/gameBalance';

export type Ingredient = 'noodles' | 'seasoning' | 'scallion' | 'egg';
export type PotState = 'EMPTY' | 'HEATING' | 'BOILING' | 'COOKING' | 'READY' | 'OVERCOOKED' | 'BURNT' | 'SERVING' | 'UNAVAILABLE';
export interface IngredientRecord { count: number; firstAddedAt: number | null; early: boolean }
export interface PotSnapshot {
  index: number; generation: number; state: PotState; waterCount: number;
  heatSeconds: number; boilingSeconds: number; cookingSeconds: number;
  ingredients: Record<Ingredient, IngredientRecord>;
}
export interface ActionResult { ok: boolean; message: string }
export const INGREDIENTS: readonly Ingredient[] = ['noodles', 'seasoning', 'scallion', 'egg'];
const emptyIngredients = (): Record<Ingredient, IngredientRecord> => ({
  noodles: { count: 0, firstAddedAt: null, early: false }, seasoning: { count: 0, firstAddedAt: null, early: false },
  scallion: { count: 0, firstAddedAt: null, early: false }, egg: { count: 0, firstAddedAt: null, early: false },
});
const NAMES: Record<Ingredient, string> = { noodles: '面', seasoning: '辣椒粉', scallion: '葱', egg: '鸡蛋' };
const EPSILON = 1e-8;

export class Pot {
  state: PotState = 'EMPTY';
  generation = 0;
  waterCount = 0;
  heatSeconds = 0;
  boilingSeconds = 0;
  cookingSeconds = 0;
  ingredients = emptyIngredients();
  constructor(readonly index: number) {}

  get boiling(): boolean { return this.waterCount > 0 && this.heatSeconds + EPSILON >= TIMING.boilSeconds; }
  get available(): boolean { return this.state !== 'SERVING' && this.state !== 'UNAVAILABLE'; }

  addWater(): ActionResult {
    const blocked = this.blocked();
    if (blocked) return blocked;
    if (this.waterCount >= BALANCE.maxWaterCount) return { ok: false, message: '这口锅的水已经够了' };
    if (this.waterCount > 0) this.heatSeconds = Math.max(0, this.heatSeconds - BALANCE.reheatLossSeconds);
    this.waterCount++;
    this.boilingSeconds = 0;
    this.refreshState();
    return { ok: true, message: this.waterCount === 1 ? '加水了，等水开再放葱和蛋' : '已补水，水温稍微降低' };
  }

  add(ingredient: Ingredient, time: number): ActionResult {
    const blocked = this.blocked();
    if (blocked) return blocked;
    const record = this.ingredients[ingredient];
    if (record.count >= BALANCE.maxIngredientCount) return { ok: false, message: `${NAMES[ingredient]}已经放得够多了` };
    if (record.count === 0) {
      record.firstAddedAt = time;
      record.early = (ingredient === 'egg' || ingredient === 'scallion') && !this.boiling;
    }
    record.count++;
    this.refreshState();
    return { ok: true, message: record.early ? `${NAMES[ingredient]}放早了，下次等水开再放` :
      record.count > 1 ? `${NAMES[ingredient]}重复放了，会影响评价` : `已加入${NAMES[ingredient]}` };
  }

  update(dt: number): void {
    if (!this.available || this.state === 'BURNT' || this.waterCount === 0 || dt <= 0) return;
    const before = this.heatSeconds;
    this.heatSeconds = Math.min(TIMING.boilSeconds, this.heatSeconds + dt);
    const boilingDt = Math.min(Math.max(0, dt - Math.max(0, TIMING.boilSeconds - before)),
      Math.max(0,TIMING.drySeconds-this.boilingSeconds),
      this.ingredients.noodles.count ? Math.max(0,TIMING.burntSeconds-this.cookingSeconds) : Infinity);
    this.boilingSeconds += boilingDt;
    if (this.ingredients.noodles.count > 0) this.cookingSeconds += boilingDt;
    this.refreshState();
  }

  snapshot(): PotSnapshot {
    const ingredients = emptyIngredients();
    for (const ingredient of INGREDIENTS) ingredients[ingredient] = { ...this.ingredients[ingredient] };
    return { index: this.index, generation: this.generation, state: this.state, waterCount: this.waterCount,
      heatSeconds: this.heatSeconds, boilingSeconds: this.boilingSeconds, cookingSeconds: this.cookingSeconds, ingredients };
  }
  restore(available: boolean): void {
    this.generation++; this.waterCount = 0; this.heatSeconds = 0;
    this.boilingSeconds = 0; this.cookingSeconds = 0; this.ingredients = emptyIngredients();
    this.state = available ? 'EMPTY' : 'UNAVAILABLE';
  }
  private blocked(): ActionResult | null {
    if (this.state === 'UNAVAILABLE') return { ok: false, message: '备用锅用完了，这个炉位没有锅' };
    if (this.state === 'SERVING') return { ok: false, message: '这口锅正在出餐，请稍等' };
    if (this.state === 'BURNT') return { ok: false, message: '锅烧焦了，把它拖到托盘清理' };
    return null;
  }
  private refreshState(): void {
    if (this.state === 'SERVING' || this.state === 'UNAVAILABLE' || this.state === 'BURNT') return;
    if (!this.waterCount) this.state = 'EMPTY';
    else if (this.boilingSeconds + EPSILON >= TIMING.drySeconds || this.cookingSeconds + EPSILON >= TIMING.burntSeconds) this.state = 'BURNT';
    else if (this.cookingSeconds + EPSILON >= TIMING.overcookSeconds) this.state = 'OVERCOOKED';
    else if (this.cookingSeconds + EPSILON >= TIMING.readySeconds) this.state = 'READY';
    else if (!this.boiling) this.state = 'HEATING';
    else this.state = this.ingredients.noodles.count > 0 ? 'COOKING' : 'BOILING';
  }
}
