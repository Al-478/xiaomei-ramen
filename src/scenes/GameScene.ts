import { LAYOUT } from '../config/assets';
import { KETTLE_AREAS, waterDropTarget } from '../config/interaction';
import { contains, rect, type Point, type Scene, type TouchPhase } from '../core/types';
import type { Renderer } from '../core/Renderer';
import { RoundSystem } from '../gameplay/RoundSystem';
import { KitchenView, RETRY, END_MENU, type ActiveSelection, type Selection, type DragState } from './KitchenView';
import { EffectManager } from '../core/EffectManager';
import type { AudioManager } from '../core/AudioManager';
import type { SaveManager } from '../core/SaveManager';
import { SettingsDialog } from '../ui/SettingsDialog';
import type { PotState } from '../gameplay/Pot';
import {heldIngredientArea,stockSlots} from '../config/portions';
export interface GameServices { audio:AudioManager; save:SaveManager; finish:(round:RoundSystem)=>void }

const RETURN = { x: 30, y: 936, w: 250, h: 90 };
const MATERIALS: readonly Selection[] = ['seasoning', 'scallion', 'noodles', 'egg', 'kettle'];

export class GameScene implements Scene {
  get diagnostics():readonly string[] {
    return [`局时 ${this.round.time.toFixed(2)} / ${this.round.state}`,`正在拖动 ${this.drag?.item ?? '无'}`,
      ...this.round.pots.map(p=>`锅 ${p.index+1} ${p.state} 水温 ${p.heatSeconds.toFixed(2)} 熟度 ${p.cookingSeconds.toFixed(2)}`)];
  }
  private drag: DragState | null = null;
  private active: ActiveSelection = null;
  private view: KitchenView;
  private effects = new EffectManager();
  private settings: SettingsDialog | null;
  private finished = false;
  get effectCount(): number { return this.effects.count; }
  round = new RoundSystem();
  constructor(private renderer: Renderer, private menu: () => void, private services?: GameServices) {
    this.view = new KitchenView(renderer,this.effects);
    this.settings = services ? new SettingsDialog(services.save,services.audio) : null;
  }
  update(dt: number): void {
    if (this.settings?.open) return;
    const states: PotState[] = this.round.pots.map(pot => pot.state), money = this.round.money;
    this.round.update(dt);
    this.effects.update(dt);
    if (this.round.money > money) { this.effects.award(); this.services?.audio.play('coin'); }
    this.round.pots.forEach((pot,index) => {
      if (pot.state === states[index]) return;
      const sound = pot.state === 'READY' ? 'cooking_done' : pot.state === 'OVERCOOKED' ? 'warning' : pot.state === 'BURNT' ? 'burnt' : null;
      if (sound) this.services?.audio.play(sound);
    });
    this.services?.audio.setBoiling(this.round.state === 'RUNNING' && this.round.pots.some(pot => pot.boiling && pot.state !== 'BURNT' && pot.state !== 'SERVING'));
    if (this.round.state !== 'RUNNING') this.active = null;
    if (this.round.state !== 'RUNNING' && this.services && !this.finished) {
      this.finished = true; this.services.finish(this.round); return;
    }
  }
  render(): void { this.view.render(this.round, this.active, this.drag); this.settings?.render(this.renderer,'游戏已暂停'); }
  tap(point: Point): void {
    if (this.settings?.open) { this.settings.tap(point); return; }
    point=this.renderer.scenePoint?.(point)??point;
    if (this.services && contains({x:260,y:950,w:125,h:64},point)) { this.active = null; this.settings?.show(); return; }
    // 局末面板独占输入，不能点击穿透到食材或锅。
    if (this.round.state !== 'RUNNING') {
      if (contains(RETRY, point)) { this.round = new RoundSystem(); this.active = null; this.effects.clear(); }
      else if (contains(END_MENU, point)) this.menu();
      return;
    }
    if (contains(RETURN, point)) { this.menu(); return; }
  }
  gesture(phase: TouchPhase, point: Point | null): void {
    if (phase === 'cancel' || !point || this.settings?.open || this.round.state !== 'RUNNING') {
      this.drag = null; this.active = null; return;
    }
    point=this.renderer.scenePoint?.(point)??point;
    if (phase === 'start') {
      for (const material of [...MATERIALS].reverse()) {
        const stock=rect(LAYOUT.input[material]);
        const hit = material === 'kettle' ? KETTLE_AREAS.some(area => contains(area,point)) : contains(stock,point);
        if (!hit) continue;
        if (material === 'kettle' && this.effects.actions.some(effect => effect.kind === 'water')) return;
        this.drag = {item:material,start:point,point,moved:false}; this.active = material; return;
      }
      for (let i=3;i>=0;i--) {
        if (!contains(rect(LAYOUT.input.potBowls[i]!),point) && !contains(rect(LAYOUT.input.potHandles[i]!),point)) continue;
        if (this.round.pots[i]?.available && !this.effects.actions.some(effect=>effect.pot===i)) {
          this.drag = {item:i,start:point,point,moved:false}; this.active = i;
        }
        return;
      }
    }
    const drag = this.drag;
    if (!drag) return;
    drag.point = point;
    drag.moved ||= Math.hypot(point.x-drag.start.x,point.y-drag.start.y)>18;
    if (phase !== 'end') return;
    this.drag = null; this.active = null;
    if (!drag.moved) return;
    if (typeof drag.item === 'number') {
      if (contains(rect(LAYOUT.input.tray),point)) {
        const result = this.round.serve(drag.item);
        if (result.ok) {
          this.effects.clearPot(drag.item);
          const source=LAYOUT.game.find(item=>item.pot===drag.item);
          if(source && this.round.serving) this.round.serving.origin={...source,x:source.x+point.x-drag.start.x,y:source.y+point.y-drag.start.y-22};
        }
      }
      return;
    }
    const waterTarget=drag.item==='kettle'?waterDropTarget(point):null;
    for (let i=3;i>=0;i--) {
      if (drag.item==='kettle' ? i!==waterTarget : !contains(rect(LAYOUT.input.potBowls[i]!),point)) continue;
      const ingredient = drag.item === 'kettle' ? 'water' : drag.item;
      const result = this.round.add(i,ingredient);
      if (result.ok) {
        const kettle=LAYOUT.game.find(item=>item.id==='kettle');
        const origin=ingredient==='water' && kettle ? {x:kettle.x+kettle.w/2+point.x-drag.start.x,y:kettle.y+kettle.h/2+point.y-drag.start.y-18} : point;
        this.effects.add(ingredient,i,origin,this.round.pots[i]!.waterCount,ingredient==='water'?undefined:heldIngredientArea(ingredient,point,drag.start,stockSlots(ingredient)));
        this.services?.audio.play(ingredient === 'water' ? 'pour_water' : ingredient === 'egg' ? 'egg_crack' : 'ingredient_drop');
      } else this.services?.audio.play('warning');
      return;
    }
  }

  dispose(): void { this.drag = null; this.active = null; this.effects.clear(); this.settings?.dispose(); this.services?.audio.stopEffects(); }
}
