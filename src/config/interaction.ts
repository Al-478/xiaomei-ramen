import { LAYOUT } from './assets';
import { contains, rect, type Point, type Rect } from '../core/types';

export function waterDropTarget(point: Point): number | null {
  let nearest: number | null = null, distance = Infinity;
  for (const [index, values] of LAYOUT.input.potBowls.entries()) {
    const bowl=rect(values);
    // 锅口四周和锅身都允许松手；重叠处按离锅口中心的距离选择。
    const area={x:bowl.x-64,y:bowl.y-48,w:bowl.w+128,h:bowl.h+128};
    if(!contains(area,point))continue;
    const score=Math.hypot(point.x-(bowl.x+bowl.w/2),point.y-(bowl.y+bowl.h/2));
    if(score<distance){distance=score;nearest=index;}
  }
  return nearest;
}

export const KETTLE_AREAS: readonly Rect[] = [
  rect(LAYOUT.input.kettle),
  // 壶身点击区避开左侧锅面；提手与壶身都可以选择水壶。
  { x: 760, y: 625, w: 250, h: 180 },
];
export const SELECTION_FEEDBACK = {
  ingredientScale: 1.06, ingredientLift: 8,
  kettleScale: 1.025,
  potLift: 22,
} as const;
