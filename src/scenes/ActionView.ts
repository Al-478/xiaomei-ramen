import { LAYOUT } from '../config/assets';
import type { Renderer } from '../core/Renderer';
import type { EffectManager } from '../core/EffectManager';
import { mouth, fillProgress, waterSurface } from './PotGeometry';
import {TIMING} from '../config/timing';
export class ActionView {
  private disabled = false;
  constructor(private r: Renderer, private effects: EffectManager) {}
  render(): void {
    if (this.disabled) return;
    try { this.draw(); } catch (error) { this.disabled = true; console.warn('操作特效暂时不可用，烹饪继续运行',error); }
  }
  private draw(): void {
    const r = this.r;
    const lastWater = [...this.effects.actions].reverse().find(item => item.kind === 'water');
    for (const effect of this.effects.actions) {
      if(effect.kind!=='water')continue;
      const pot = LAYOUT.game.find(item => item.pot === effect.pot);
      if (!pot) continue;
      const m=mouth(pot), target = {x:m.x,y:pot.y+pot.h*.45};
      if (effect.kind === 'water') {
        const home=LAYOUT.game.find(item=>item.id==='kettle')!;
        const flowEnd=TIMING.pourLiftSeconds+TIMING.pourFlowSeconds;
        const enter=Math.min(1,effect.elapsed/TIMING.pourLiftSeconds), leave=Math.max(0,(effect.elapsed-flowEnd)/TIMING.pourReturnSeconds);
        const ease=(v:number)=>v*v*(3-2*v);
        const origin=effect.origin ?? target;
        const angle=-.38*ease(enter)*(1-ease(leave));
        const cx=(origin.x+(target.x+112-origin.x)*ease(enter))*(1-ease(leave))+(home.x+home.w/2)*ease(leave);
        const cy=(origin.y+(target.y-145-origin.y)*ease(enter))*(1-ease(leave))+(home.y+home.h/2)*ease(leave);
        const w=home.w,h=w*329/306;
        // 壶嘴局部坐标随壶体一起旋转，水流不会脱离壶嘴。
        const sx=-w*.386,sy=-h*.105;
        const spout={x:cx+sx*Math.cos(angle)-sy*Math.sin(angle),y:cy+sx*Math.sin(angle)+sy*Math.cos(angle)};
        if(effect.elapsed>TIMING.pourLiftSeconds && effect.elapsed<flowEnd) {
          const c=r.ctx,surface=waterSurface(pot,effect.waterCount-1+fillProgress(effect.elapsed));
          const end={x:target.x-m.rx*.3,y:surface.y};
          c.save(); c.beginPath(); c.moveTo(spout.x,spout.y);
          c.quadraticCurveTo(spout.x-12,spout.y+35,end.x,end.y);
          c.strokeStyle='#53bcebd9';c.lineWidth=8;c.stroke();
          c.strokeStyle='#e7fcffdd';c.lineWidth=3;c.stroke();c.restore();
        }
        if (effect === lastWater) {
          r.rotatedImage('kettle',{x:cx-w/2,y:cy-h/2,w,h},angle);
          r.rotatedImage('oven-mitt',{x:cx-36,y:cy-h/2-5,w:75,h:72},angle);
        }
      }
    }
    for (const coin of this.effects.coins) {
      const t = coin.elapsed/coin.duration;
      r.rotatedImage('coin',{x:1210+(1390-1210)*t+Math.sin(t*Math.PI)*(coin.index-2.5)*24,
        y:635+(220-635)*t-Math.sin(Math.PI*t)*90,w:32,h:32},t*3);
    }
  }
}
