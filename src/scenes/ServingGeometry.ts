import {ASSETS,LAYOUT} from '../config/assets';
import type {Point,Rect} from '../core/types';
function anchor(id:string,area:Rect,source:readonly number[]):Point {
  const asset=ASSETS.find(item=>item.id===id)!;
  const scale=Math.min(area.w/asset.width,area.h/asset.height);
  return {x:area.x+(area.w-asset.width*scale)/2+source[0]!*scale,
    y:area.y+(area.h-asset.height*scale)/2+source[1]!*scale};
}
export function trayFloor():Point {
  const tray=LAYOUT.game.find(item=>item.id==='tray')!;
  return anchor('tray',tray,LAYOUT.mounts.trayFloorSource);
}
export function servingLanding():Rect {
  const size=LAYOUT.servingPotSize,floor=trayFloor(),area={x:0,y:0,w:size[0]!,h:size[1]!};
  // 按素材真实缩放后的锅底接触点落盘，不能把外框底部误当成锅底。
  const foot=anchor('pot-empty',area,LAYOUT.mounts.potSourceFoot);
  return {...area,x:floor.x-foot.x,y:floor.y-foot.y};
}
