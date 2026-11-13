import type {Renderer} from '../core/Renderer';
import type {Rect} from '../core/types';
import type {Ingredient,PotSnapshot} from '../gameplay/Pot';
import type {ActionEffect} from '../core/EffectManager';
import {PORTIONS,stockSlots,pickedSlot,heldIngredientArea} from '../config/portions';
import {mouth,oval,waterSurface} from './PotGeometry';
import type {DragState} from './KitchenView';
const clamp=(v:number)=>Math.max(0,Math.min(1,v));
export function mixColor(from:string,to:string,t:number):string {
  const a=parseInt(from.slice(1),16),b=parseInt(to.slice(1),16),p=clamp(t);
  return '#'+[16,8,0].map(shift=>Math.round(((a>>shift)&255)*(1-p)+((b>>shift)&255)*p).toString(16).padStart(2,'0')).join('');
}
export function ingredientOpacity(kind:Ingredient,effects:readonly ActionEffect[],pot:number):number {
  const effect=effects.find(e=>e.kind===kind&&e.pot===pot);
  return effect?clamp((effect.elapsed/effect.duration-.65)/.35):1;
}
export function dryNoodleArea(area:Rect,units:number):Rect {
  const m=mouth(area),surface=waterSurface(area,units);
  return {x:m.x-m.rx*.84,y:surface.y-area.h*.16,w:m.rx*1.68,h:area.h*.30};
}
export function eggArea(area:Rect,units:number):Rect {
  const s=waterSurface(area,units);
  return {x:s.x-s.rx*.1,y:s.y-s.ry*.4,w:s.rx*.95,h:s.ry*1.2};
}
export function drawScallions(r:Renderer,area:Rect,units:number,alpha=1):void {
  const c=r.ctx,s=waterSurface(area,units);c.save();c.globalAlpha=alpha;
  for(let i=0;i<26;i++){
    const x=s.x-s.rx*.28+Math.cos(i*4.13)*s.rx*.47,y=s.y+Math.sin(i*2.39)*s.ry*.48;
    const w=area.w*(.009+(i%3)*.003),h=w*.45;
    c.save();c.translate(x,y);c.rotate(Math.sin(i)*.45);oval(c,0,0,w,h);
    c.fillStyle=i%3?'#39963f':'#74b84e';c.fill();oval(c,0,0,w*.46,h*.47);c.fillStyle='#d3e89a';c.fill();c.restore();
  }
  c.restore();
}
export class IngredientView {
  constructor(private r:Renderer){}
  stock(kind:Ingredient,drag:DragState|null):void {
    const slots=stockSlots(kind);
    const selected=drag?.item===kind?pickedSlot(kind,drag.start,slots):-1;
    slots.forEach((slot,i)=>{
      if(i===selected)return;
      this.r.contactShadow(slot.x+slot.w/2,slot.y+slot.h-2,slot.w*.36,2.5);
      // 去掉素材透明边距，让食材底部与层板上的接触阴影一致。
      this.r.imageFill(PORTIONS[kind].id,slot);
    });
  }
  held(kind:Ingredient,drag:DragState):void {
    const area=heldIngredientArea(kind,drag.point,drag.start,stockSlots(kind));
    this.r.contactShadow(area.x+area.w/2,area.y+area.h+7,area.w*.35,5);
    this.r.imageFill(PORTIONS[kind].id,area);
  }
  drop(effect:ActionEffect,area:Rect,pot:PotSnapshot,units:number):void {
    if(effect.kind==='water')return;
    const r=this.r,c=r.ctx,t=clamp(effect.elapsed/effect.duration),m=mouth(area),s=waterSurface(area,units);
    const kind=effect.kind,from=effect.originArea??{x:m.x-PORTIONS[kind].w/2,y:area.y-20,w:PORTIONS[kind].w,h:PORTIONS[kind].h};
    c.save();
    try{
      if(kind==='seasoning'){
        const cx=from.x+from.w/2+(m.x+m.rx*.5-from.x-from.w/2)*t;
        const cy=from.y+from.h/2+(s.y-80-from.y-from.h/2)*t;
        c.globalAlpha=1-clamp((t-.6)/.4);r.rotatedImageFill('seasoning-single',{x:cx-42,y:cy-50,w:84,h:100},-.7*t);c.globalAlpha=1;
        for(let i=0;i<18;i++){
          const p=clamp((t-.15-i*.006)/.65),endX=s.x+Math.sin(i*6.3)*s.rx*.62,endY=s.y+Math.cos(i*3.1)*s.ry*.48;
          const x=(cx-28)*(1-p)+endX*p,y=cy+32+(endY-cy-32)*p*p;
          if(p<=0||p>=1)continue;oval(c,x,y,2.5,1.6);c.fillStyle=i%2?'#bf3214':'#f3751f';c.fill();
        }
        return;
      }
      if(kind==='egg'){
        const lift=clamp(t/.23),shell={x:from.x+(m.x-40-from.x)*lift,y:from.y+(area.y-25-from.y)*lift,w:80,h:46};
        // 壳留在上方，只有蛋液进入锅口；不能让整张裂蛋图跟着落进汤里。
        if(t<.23)r.imageFill('egg-single',{...from,y:from.y+(shell.y-from.y)*lift});
        else {c.globalAlpha=1-clamp((t-.57)/.23);r.imageFill('egg-shells',shell);c.globalAlpha=1;}
        if(t>.28){
          const p=clamp((t-.28)/.72),to=eggArea(area,units);
          const liquid={x:shell.x+shell.w/2-to.w*.36,y:shell.y+shell.h-6,w:to.w*.72,h:area.h*.34};
          c.save();if(p>.25){oval(c,m.x,m.y,m.rx,m.ry);c.clip();}
          c.globalAlpha=1-ingredientOpacity(kind,[effect],pot.index);
          r.imageFill('egg-falling',{x:liquid.x+(to.x-liquid.x)*p,y:liquid.y+(to.y-liquid.y)*p*p,w:liquid.w+(to.w-liquid.w)*p,h:liquid.h+(to.h-liquid.h)*p});c.restore();
        }
        return;
      }
      const to=kind==='noodles'?dryNoodleArea(area,units):
        {x:s.x-s.rx*.8,y:s.y-s.ry*.5,w:s.rx*1.4,h:s.ry};
      if(t>.38){oval(c,m.x,m.y,m.rx,m.ry);c.clip();}
      const moving={x:from.x+(to.x-from.x)*t,y:from.y+(to.y-from.y)*t-Math.sin(Math.PI*t)*12,w:from.w+(to.w-from.w)*t,h:from.h+(to.h-from.h)*t};
      c.globalAlpha=1-ingredientOpacity(kind,[effect],pot.index);
      if(kind==='noodles')r.imageFill('noodle-block',moving);
      else{
        if(t<.3){c.globalAlpha=1-t/.3;r.imageFill('scallion-bunch',moving);}
        c.globalAlpha=1-ingredientOpacity(kind,[effect],pot.index);
        for(let i=0;i<20;i++){
          const p=clamp((t-.12-i*.005)/.72),endX=s.x-s.rx*.28+Math.cos(i*4.13)*s.rx*.47,endY=s.y+Math.sin(i*2.39)*s.ry*.48;
          oval(c,from.x+from.w/2+(endX-from.x-from.w/2)*p,from.y+from.h*.5+(endY-from.y-from.h*.5)*p,3.7,1.8);
          c.fillStyle=i%2?'#3d9a43':'#94c164';c.fill();
        }
      }
    }finally{c.restore();}
  }
}
