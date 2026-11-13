import { RUNTIME } from '../config/runtime';
import type { Point, Screen } from './types';

export class Viewport {
  width = 1; height = 1; dpr = 1; scale = 1; offsetX = 0; offsetY = 0;

  resize(screen: Screen): void {
    this.width = Math.max(1, screen.width);
    this.height = Math.max(1, screen.height);
    this.dpr = Math.min(RUNTIME.maxDpr, Math.max(1, screen.dpr || 1), Math.sqrt(RUNTIME.maxCanvasPixels/(this.width*this.height)));
    const area = screen.safeArea;
    // 部分设备返回竖屏安全区；只有位于当前窗口内的有效矩形才参与横屏适配。
    const valid = area && area.left >= 0 && area.top >= 0 && area.right <= this.width &&
      area.bottom <= this.height && area.right > area.left && area.bottom > area.top;
    const left = valid ? area.left : 0;
    const top = valid ? area.top : 0;
    const width = valid ? area.right - area.left : this.width;
    const height = valid ? area.bottom - area.top : this.height;
    this.scale = Math.min(width / RUNTIME.logicalWidth, height / RUNTIME.logicalHeight);
    this.offsetX = left + (width - RUNTIME.logicalWidth * this.scale) / 2;
    this.offsetY = top + (height - RUNTIME.logicalHeight * this.scale) / 2;
  }

  toLogical(x: number, y: number): Point | null {
    const point = { x: (x - this.offsetX) / this.scale, y: (y - this.offsetY) / this.scale };
    return point.x >= 0 && point.y >= 0 && point.x < RUNTIME.logicalWidth &&
      point.y < RUNTIME.logicalHeight ? point : null;
  }
}
