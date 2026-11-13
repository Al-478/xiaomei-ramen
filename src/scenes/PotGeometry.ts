import type { DrawContext, Rect } from '../core/types';
import {TIMING} from '../config/timing';
// 与空锅素材内壁一致的透视椭圆；所有汤面、入料与水流共享这一坐标。
export function oval(c: DrawContext, x:number,y:number,rx:number,ry:number): void {
  const k=0.5522848;
  c.beginPath(); c.moveTo(x-rx,y);
  c.bezierCurveTo(x-rx,y-ry*k,x-rx*k,y-ry,x,y-ry);
  c.bezierCurveTo(x+rx*k,y-ry,x+rx,y-ry*k,x+rx,y);
  c.bezierCurveTo(x+rx,y+ry*k,x+rx*k,y+ry,x,y+ry);
  c.bezierCurveTo(x-rx*k,y+ry,x-rx,y+ry*k,x-rx,y); c.closePath();
}
export const mouth = (a:Rect) => ({x:a.x+a.w*.5,y:a.y+a.h*.405,rx:a.w*.302,ry:a.h*.275});
export const fillProgress = (elapsed:number) => Math.max(0,Math.min(1,(elapsed-TIMING.pourLiftSeconds)/TIMING.pourFlowSeconds));
export function waterSurface(a:Rect,units:number) {
  const level=Math.max(0,Math.min(1,units<=1?units*.9:.9+(units-1)*.05));
  // 水面随水位向后壁上升，前缘贴合锅内壁，不能浮在锅口的上半部。
  return {x:a.x+a.w*.5,y:a.y+a.h*(.58-.17*level),rx:a.w*(.235+.065*level),ry:a.h*(.095+.165*level)};
}
