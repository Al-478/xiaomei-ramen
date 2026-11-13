import type { Renderer } from '../core/Renderer';
import { contains, type Point, type Scene } from '../core/types';
const NEXT = {x:740,y:775,w:190,h:82}, PLAY = {x:950,y:775,w:235,h:82}, BACK = {x:520,y:775,w:195,h:82};
const LESSONS = [
  ['加水与煮面','按住水壶，拖到锅附近松手倒水。','把面和辣椒粉拖进锅，松手放料。','拖错位置会归位；四锅要轮流照看。'],
  ['水开后放葱蛋','看到气泡后，把葱和鸡蛋拖进锅。','整颗生蛋敲开，蛋液落入汤中。','重复放料或放早了，会影响评价。'],
  ['熟成与上菜','出现“煮好啦”，立即把锅拖到托盘。','标准每碗一万，目标赚到十万金币。','烧焦的锅要清理；备用锅一共三口。'],
] as const;
export class TutorialScene implements Scene {
  private page = 0;
  constructor(private r: Renderer, private play: () => void, private back: () => void) {}
  render(): void {
    const r = this.r, lesson = LESSONS[this.page] ?? LESSONS[0];
    r.background('menu-wide'); r.dim();
    r.panel({x:80,y:210,w:1288,h:720});
    r.image('chef',{x:130,y:360,w:360,h:540});
    r.text('小美的厨房课堂',875,330,42);
    r.text(`${this.page + 1} / 3  ${lesson[0]}`,875,410,31);
    for (let i = 1; i < lesson.length; i++) r.text(lesson[i] ?? '',875,465+i*65,27,'#8e3153',700,{strokeWidth:0});
    r.pill(BACK); r.text('返回菜单',617,816,26);
    r.pill(NEXT); r.text(this.page === 2 ? '再看一次' : '下一页',835,816,26);
    r.pill(PLAY); r.text('开始煮面',1067,816,30);
  }
  tap(point: Point): void {
    if (contains(PLAY,point)) this.play();
    else if (contains(NEXT,point)) this.page = (this.page + 1) % LESSONS.length;
    else if (contains(BACK,point)) this.back();
  }
  dispose(): void {}
}
