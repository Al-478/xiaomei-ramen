import type { AssetManager, LoadProgress } from '../core/AssetManager';
import type { Renderer } from '../core/Renderer';
import { contains, type Point, type Rect, type Scene } from '../core/types';

const RETRY: Rect = { x: 544, y: 690, w: 360, h: 108 };
const BACK: Rect = { x: 544, y: 825, w: 360, h: 90 };

export class BootScene implements Scene {
  private active = true;
  private loading = false;
  private failed = false;
  private progress: LoadProgress = { loaded: 0, total: 0, failed: [] };
  constructor(private renderer: Renderer, private assets: AssetManager, private ids: readonly string[],
    private complete: () => void, private back?: () => void) {}
  async begin(): Promise<void> {
    if (!this.active || this.loading) return;
    this.loading = true; this.failed = false;
    this.progress = { loaded: 0, total: this.ids.length, failed: [] };
    try {
      const result = await this.assets.load(this.ids, progress => { if (this.active) this.progress = progress; });
      if (!this.active) return;
      this.failed = result.failed.length > 0;
      if (!this.failed) this.complete();
    } catch (error) {
      if (this.active) this.failed = true;
      console.error('场景资源加载失败', error);
    } finally { this.loading = false; }
  }
  render(): void {
    const r = this.renderer;
    if (this.assets.get('menu-wide')) r.background('menu-wide');
    else { r.ctx.fillStyle = '#ffe4ec'; r.ctx.fillRect(0, 0, 1448, 1086); }
    r.ctx.fillStyle = '#54203999'; r.ctx.fillRect(0, 0, 1448, 1086);
    r.panel({ x: 294, y: 300, w: 860, h: this.failed ? 650 : 400 });
    r.text('小美煮拉面', 724, 376, 54);
    r.text(this.failed ? '厨房准备遇到问题' : '正在准备厨房…', 724, 474, 40);
    const ratio = this.progress.total ? this.progress.loaded / this.progress.total : 0;
    r.ctx.fillStyle = '#f2b8c8'; r.ctx.fillRect(394, 550, 660, 38);
    r.ctx.fillStyle = '#fba82d'; r.ctx.fillRect(394, 550, 660 * ratio, 38);
    r.text(`${this.progress.loaded} / ${this.progress.total}`, 724, 637, 34);
    if (this.failed) {
      r.panel(RETRY); r.text('重新加载', 724, 744, 40);
      if (this.back) { r.panel(BACK); r.text('返回菜单', 724, 870, 34); }
    }
  }
  tap(point: Point): void {
    if (!this.failed || this.loading) return;
    if (contains(RETRY, point)) void this.begin();
    else if (this.back && contains(BACK, point)) this.back();
  }
  dispose(): void { this.active = false; }
}
