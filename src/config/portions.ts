import {LAYOUT} from './assets';
import type {Ingredient} from '../gameplay/Pot';
import {contains,type Point,type Rect} from '../core/types';
export const PORTIONS:Record<Ingredient,{id:string;w:number;h:number}>={
  noodles:{id:'noodle-block',w:190,h:94},seasoning:{id:'seasoning-single',w:84,h:100},
  scallion:{id:'scallion-bunch',w:195,h:98},egg:{id:'egg-single',w:70,h:94},
};
export function stockArea(kind:Ingredient):Rect {return LAYOUT.game.find(item=>item.id===PORTIONS[kind].id)!;}
export function stockSlots(kind:Ingredient,area=stockArea(kind)):Rect[] {
  // 陈列尺寸小于手持份量，在柜格四周和层板前缘留出空间。
  if(kind==='egg')return Array.from({length:6},(_,i)=>({x:area.x+12+(i%3)*56+(i>=3?16:0),y:area.y+(i>=3?18:6),w:43,h:58}));
  if(kind==='seasoning')return Array.from({length:3},(_,i)=>({x:area.x+i*71,y:area.y+(i===1?0:2),w:60,h:68}));
  return [area];
}
export function pickedSlot(kind:Ingredient,start:Point,slots=stockSlots(kind)):number {
  for(let i=slots.length-1;i>=0;i--)if(contains(slots[i]!,start))return i;
  return slots.reduce((best,slot,index)=>Math.hypot(start.x-slot.x-slot.w/2,start.y-slot.y-slot.h/2)<
    Math.hypot(start.x-slots[best]!.x-slots[best]!.w/2,start.y-slots[best]!.y-slots[best]!.h/2)?index:best,0);
}
export function heldIngredientArea(kind:Ingredient,point:Point,start:Point,slots=stockSlots(kind)):Rect {
  const source=slots[pickedSlot(kind,start,slots)]!,size=PORTIONS[kind];
  const grabX=Math.max(.1,Math.min(.9,(start.x-source.x)/source.w));
  const grabY=Math.max(.1,Math.min(.9,(start.y-source.y)/source.h));
  return {x:point.x-size.w*grabX,y:point.y-size.h*grabY-12,w:size.w,h:size.h};
}
