import { LAYOUT } from '../config/assets';
import { TIMING } from '../config/timing';
import { BALANCE } from '../config/gameBalance';
import { SELECTION_FEEDBACK } from '../config/interaction';
import type { Renderer } from '../core/Renderer';
import { oval, mouth, fillProgress, waterSurface } from './PotGeometry';
import type { Point, Rect } from '../core/types';
import type { PotSnapshot } from '../gameplay/Pot';
import type { RoundSystem } from '../gameplay/RoundSystem';
import { EffectManager } from '../core/EffectManager';
import { ActionView } from './ActionView';
import { ServingFeedback } from './ServingFeedback';
import {servingLanding,trayFloor} from './ServingGeometry';
import {IngredientView,ingredientOpacity,dryNoodleArea,eggArea,drawScallions,mixColor} from './IngredientView';
import {PORTIONS} from '../config/portions';
import type {Ingredient} from '../gameplay/Pot';

export type Selection = 'seasoning' | 'scallion' | 'noodles' | 'egg' | 'kettle';
export interface DragState { item: Selection | number; start: Point; point: Point; moved: boolean }
export type ActiveSelection = Selection | number | 'tray' | null;
const MATERIAL_IMAGES: Record<Selection, string> = {
  seasoning: 'seasoning-single', scallion: 'scallion-bunch', noodles: 'noodle-block', egg: 'egg-single', kettle: 'kettle',
};
export const RETRY = { x: 440, y: 660, w: 265, h: 82 };
export const END_MENU = { x: 740, y: 660, w: 265, h: 82 };
export const lifted = (area: Rect): Rect => ({ ...area, y: area.y - SELECTION_FEEDBACK.potLift });

export class KitchenView {
  private ingredientsView: IngredientView;
  private actionView: ActionView;
  private servingFeedback: ServingFeedback;
  private roundTime = 0;
  constructor(private r: Renderer, private effects = new EffectManager()) { this.ingredientsView=new IngredientView(r);this.actionView = new ActionView(r,effects); this.servingFeedback=new ServingFeedback(r); }
  render(round: RoundSystem, active: ActiveSelection, drag: DragState | null = null): void {
    this.roundTime = round.time;
    const r = this.r;
    r.background('kitchen-wide');
    r.beginScene?.();
    const material = typeof active === 'string' && active !== 'tray' ? active : null;
    const selectedImage = material ? MATERIAL_IMAGES[material] : null;
    for (const item of LAYOUT.game) {
      if (item.id === selectedImage && material === 'kettle') continue;
      if (item.id === 'kettle' && this.effects.actions.some(effect => effect.kind === 'water')) continue;
      const ingredient=(['noodles','seasoning','scallion','egg'] as Ingredient[]).find(kind=>PORTIONS[kind].id===item.id);
      if(ingredient){this.ingredientsView.stock(ingredient,drag);continue;}
      if (item.reserve !== undefined && item.reserve >= round.reservePots) continue;
      if (item.pot !== undefined) {
        const pot = round.pots[item.pot];
        if (!pot || pot.state === 'UNAVAILABLE' || pot.state === 'SERVING' || item.pot === active) continue;
        const contact = LAYOUT.potContacts[item.pot];
        if (contact) r.contactShadow(contact.x, contact.y, 108, 22);
        this.pot(pot, item);
        continue;
      }
      if (item.reserve !== undefined) {
        const contact = LAYOUT.reserveContacts[item.reserve];
        if (contact) r.contactShadow(contact.x, contact.y, 34, 5);
      }
      if (item.id === 'tray') r.contactShadow(item.x + item.w / 2, item.y + item.h - 16, 148, 20);
      if (item.id === 'kettle') r.contactShadow(868, 797, 105, 20);
      r.image(item.id, item);
    }
    if (drag && typeof drag.item === 'number') {
      const item = LAYOUT.game.find(layer=>layer.pot===drag.item), pot=round.pots[drag.item];
      if (item && pot) {
        const area={...item,x:item.x+drag.point.x-drag.start.x,y:item.y+drag.point.y-drag.start.y-22};
        r.mitts(area);this.pot(pot,area);
      }
    } else if (drag?.item === 'kettle') {
      const item=LAYOUT.game.find(layer=>layer.id==='kettle');
      if(item)r.image('kettle',{...item,x:item.x+drag.point.x-drag.start.x,y:item.y+drag.point.y-drag.start.y-18});
    }
    if (round.serving) {
      const source = LAYOUT.game.find(item => item.pot === round.serving?.index);
      const from = round.serving.origin ?? (source ? lifted(source) : null);
      const t = Math.min(1,1-round.serving.remaining/TIMING.serveSeconds);
      if (from) {
        const to=servingLanding(),floor=trayFloor();
        const area={x:from.x+(to.x-from.x)*t,y:from.y+(to.y-from.y)*t-Math.sin(Math.PI*t)*35,w:from.w+(to.w-from.w)*t,h:from.h+(to.h-from.h)*t};
        if(t>.8){r.ctx.save();r.ctx.globalAlpha=(t-.8)*5;r.contactShadow(floor.x,floor.y,72,8);r.ctx.restore();}
        r.mitts(area);this.pot(round.serving.snapshot,area,false);
        if(t>.9)r.trayFront(LAYOUT.game.find(item=>item.id==='tray')!,LAYOUT.mounts.trayFrontSourceY);
      }
    }
    this.actionView.render();
    this.hud(round);
    this.servingFeedback.render(round);
    if(drag && typeof drag.item==='string' && drag.item!=='kettle')this.ingredientsView.held(drag.item,drag);
    if (round.state !== 'RUNNING') this.end(round);
    r.endScene?.();
  }
  private pot(pot: PotSnapshot, area: Rect, effects = true): void {
    const r = this.r, ingredients = pot.ingredients;
    const noodles = ingredients.noodles.count > 0, seasoning = ingredients.seasoning.count > 0;
    const opacity=(kind:Ingredient)=>ingredientOpacity(kind,this.effects.actions,pot.index);
    const burnt = pot.state === 'BURNT';
    const spiceEffect=this.effects.actions.find(e=>e.pot===pot.index&&e.kind==='seasoning');
    const spice=seasoning?(ingredients.seasoning.count>1||!spiceEffect?1:Math.max(0,Math.min(1,(spiceEffect.elapsed/spiceEffect.duration-.2)/.55))):0;
    // 锅体始终使用同一张图，避免水、面与辣汤导致轮廓和透视跳变。
    if(burnt) r.scorchedPot(area); else r.image('pot-empty',area);
    const c=r.ctx, m=mouth(area);
    const pouring=this.effects.actions.find(effect=>effect.pot===pot.index && effect.kind==='water');
    const units=pot.waterCount-(pouring ? 1-fillProgress(pouring.elapsed) : 0);
    const surface=waterSurface(area,units),cy=surface.y,rx=surface.rx,ry=surface.ry;
    c.save(); oval(c,m.x,m.y,m.rx,m.ry); c.clip();
    if (units>0) {
      const broth=c.createRadialGradient(m.x-rx*.2,cy-ry*.3,0,m.x,cy,rx);
      broth.addColorStop(0,burnt?'#79502a':mixColor('#fff0a0','#f9a133',spice));
      broth.addColorStop(1,burnt?'#382316':mixColor('#d99e2b','#ca4410',spice));
      oval(c,m.x,cy,rx,ry); c.fillStyle=broth; c.fill();
      if(!burnt){c.strokeStyle=seasoning?'#ffb349':'#fff1a0';c.lineWidth=area.w*.005;c.stroke();}
      c.save(); oval(c,m.x,cy,rx*.97,ry*.95); c.clip();
      if (noodles) {
        const softness=burnt?1:Math.min(1,pot.cookingSeconds/TIMING.noodleSoftenSeconds);
        c.globalAlpha=(burnt?.78:softness)*opacity('noodles');
        r.imageFill('noodle-strands',{x:m.x-rx*.95,y:cy-ry*.9,w:rx*1.9,h:ry*1.8}); c.globalAlpha=1;
        if(burnt || seasoning) {
          c.save();c.globalAlpha=burnt?1:spice;
          if(burnt){
            // 焦化集中在食物中部，边缘保留纹理，避免盖成一块纯黑平面。
            const char=c.createRadialGradient(m.x-rx*.1,cy,rx*.1,m.x,cy,rx);
            char.addColorStop(0,'#23160fc4');char.addColorStop(.65,'#492b1877');char.addColorStop(1,'#79452322');c.fillStyle=char;
          }else c.fillStyle='#e45b172e';
          c.fillRect(m.x-rx,cy-ry,rx*2,ry*2);c.restore();
        }
        if (softness<1) { c.globalAlpha=(1-softness)*opacity('noodles'); r.imageFill('noodle-block',dryNoodleArea(area,units)); c.globalAlpha=1; }
      }
      if (seasoning || burnt) {
        c.save();c.globalAlpha=burnt?1:spice;
        for(let i=0;i<22;i++) { const x=m.x+Math.sin(i*5.7)*rx*.83,y=cy+Math.cos(i*3.9)*ry*.7;
          oval(c,x,y,area.w*.005,area.h*.004); c.fillStyle=burnt?'#100d0b':i%3?'#ad2911':'#f48921'; c.fill(); }
        c.restore();
      }
      if (ingredients.scallion.count && !burnt)drawScallions(r,area,units,opacity('scallion'));
      if (ingredients.egg.count && !burnt) {
        const age=Math.max(0,this.roundTime-(ingredients.egg.firstAddedAt ?? this.roundTime)-TIMING.eggDropSeconds*.45);
        const cooked=Math.min(1,Math.min(age,pot.boilingSeconds)/TIMING.eggSetSeconds),placed=eggArea(area,units);
        c.globalAlpha=opacity('egg')*(1-cooked);r.imageFill('egg-falling',placed);
        c.globalAlpha=opacity('egg')*cooked;r.imageFill('egg-poached',placed);c.globalAlpha=1;
      }
      if (pouring && fillProgress(pouring.elapsed)>0 && fillProgress(pouring.elapsed)<1) {
        const pulse=(pouring.elapsed*5)%1;
        oval(c,m.x-rx*.35,cy,rx*(.08+pulse*.22),ry*(.08+pulse*.22));
        c.strokeStyle='#fff9cbbb'; c.lineWidth=2; c.stroke();
      }
      c.restore();
    } else {
      if(noodles){c.globalAlpha=opacity('noodles');r.imageFill('noodle-block',dryNoodleArea(area,0));c.globalAlpha=1;}
      if(seasoning){c.globalAlpha=opacity('seasoning');for(let i=0;i<22;i++){
        oval(c,m.x+Math.sin(i*5.7)*rx*.68,cy+Math.cos(i*3.9)*ry*.55,2.5,1.4);c.fillStyle=i%3?'#bc3615':'#e97121';c.fill();}c.globalAlpha=1;}
      if(ingredients.scallion.count)drawScallions(r,area,0,opacity('scallion'));
      if(ingredients.egg.count){c.globalAlpha=opacity('egg');r.imageFill('egg-falling',eggArea(area,0));c.globalAlpha=1;}
    }
    c.restore();
    if(effects)for(const effect of this.effects.actions)if(effect.pot===pot.index && effect.kind!=='water')this.ingredientsView.drop(effect,area,pot,units);
    // 食材动画属于本锅；最后补回锅前沿，不能在全场景顶层压过所有锅。
    r.potFront(area);
    if (!effects) return;
    // 标记贴在本锅左前侧，前排锅的提示不能悬在后排锅身上。
    if (pot.state === 'READY') r.image('ready-badge', this.inside(area, 0.08, 0.48, 0.36, 0.23));
    if (pot.state === 'OVERCOOKED') r.image('warning-badge', this.inside(area, 0.1, 0.48, 0.3, 0.23));
    if (burnt) {
      c.save();c.globalAlpha=.55;
      r.image('smoke',{x:m.x-area.w*.11,y:cy-ry*.25-area.h*.32-Math.sin(this.effects.clock*3+pot.index)*area.h*.015,w:area.w*.22,h:area.h*.36});
      c.restore();
    }
    else if (pot.heatSeconds >= TIMING.boilSeconds && pot.waterCount) {
      c.save();oval(c,m.x,cy,rx*.95,ry*.94);c.clip();
      for(let i=0;i<9;i++) {
        const phase=(this.effects.clock*1.8+i*.37)%1;
        const x=m.x+Math.sin(i*5.2)*rx*.8,y=cy+Math.cos(i*4.1)*ry*.72;
        oval(c,x,y,area.w*(.006+phase*.008),area.h*(.005+phase*.006));
        c.globalAlpha=(1-phase)*.7;c.strokeStyle='#fff4c4';c.lineWidth=1.5;c.stroke();
      }
      c.restore();c.save();c.globalAlpha=.4;
      r.image('steam', this.inside(area, 0.18, -.05-Math.sin(this.effects.clock*3)*0.02, 0.16, 0.25));c.restore();
    }
  }
  private inside(area: Rect, x: number, y: number, w: number, h: number): Rect {
    return { x: area.x + area.w * x, y: area.y + area.h * y, w: area.w * w, h: area.h * h };
  }
  private hud(round: RoundSystem): void {
    const r = this.r, plain = { strokeWidth: 0 };
    r.ctx.fillStyle = '#ffe329'; r.ctx.fillRect(716, 173, 444 * round.remaining / TIMING.roundSeconds, 25);
    r.text('金额', 1390, 165, 30, '#fff7e3', 108, plain);
    r.text(String(round.money), 1390, 268, 48, '#ffffff', 112, plain);
    r.text(`目标 ${BALANCE.targetAmount}`, 1350, 329, 27, '#fff4c9', 185, plain);
    r.text(`时间 ${Math.ceil(round.remaining)} 秒`, 938, 185, 27, '#fff5ce', 350,{strokeWidth:4,strokeColor:'#971049'});
    r.text('备用锅', 660, 310, 27, '#fff0d6', 110, plain);
    r.text('招牌鸡蛋拉面', 1300, 905, 28, '#9f2449', 280, plain);
    r.image('coin', { x: 1290, y: 951, w: 28, h: 28 });
    r.text(String(BALANCE.standardBowlPrice), 1365, 967, 28, '#9f2449', 100, plain);
    r.text('每碗', 1365, 1006, 22, '#9f2449', 100, plain);
    r.pill({ x: 58, y: 950, w: 194, h: 64 }); r.text('返回菜单', 155, 982, 28, '#963653', 172, plain);
    r.pill({x:260,y:950,w:125,h:64}); r.text('暂停',322,982,27,'#963653',110,plain);
    const evaluating=round.lastJudgment && round.time-round.lastJudgmentAt<TIMING.feedbackSeconds;
    if(round.time-round.messageAt<TIMING.feedbackSeconds && (!evaluating || round.messageAt>round.lastJudgmentAt)) {
      r.pill({x:410,y:956,w:590,h:54});
      r.text(round.message, 703, 984, 24, '#822744', 555,{strokeWidth:0});
    }
  }
  private end(round: RoundSystem): void {
    const r = this.r;
    r.dim();
    r.panel({ x: 294, y: 300, w: 860, h: 510 });
    r.text(round.state === 'WON' ? '目标达成！' : '本局结束', 724, 398, 50);
    r.text(`获得 ${round.money} 金币`, 724, 495, 40);
    r.text(`完成 ${round.completedBowls} 碗拉面`, 724, 566, 30);
    r.pill(RETRY); r.text('再来一局', 572, 701, 32);
    r.pill(END_MENU); r.text('返回菜单', 872, 701, 32);
  }
}
