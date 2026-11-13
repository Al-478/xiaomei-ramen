import { RUNTIME } from '../config/runtime';
import type { Platform } from './Platform';
import type { Viewport } from './Viewport';
import type { Point, TouchEvent, TouchPhase } from './types';

export class InputManager {
  get listenerCount(): number { return this.unbind.length; }
  private unbind: (() => void)[] = [];
  private primary: { id: number; x: number; y: number; time: number; cancelled: boolean } | null = null;
  private enabled = true;

  constructor(private platform: Platform, private viewport: Viewport, private tap: (point: Point) => void,
    private gesture: (phase: TouchPhase, point: Point | null) => void = () => {}) {}

  bind(): void {
    if (this.unbind.length) return;
    this.unbind = [
      this.platform.onTouch('start', this.start), this.platform.onTouch('move', this.move),
      this.platform.onTouch('end', this.end), this.platform.onTouch('cancel', this.cancel),
    ];
  }
  setEnabled(enabled: boolean): void { this.enabled = enabled; this.cancel(); }
  reset(): void { this.cancel(); }
  dispose(): void { this.unbind.forEach(off => off()); this.unbind = []; this.cancel(); }

  private start = (event: TouchEvent): void => {
    if (!this.enabled || this.primary) return;
    // 不把仍按住的第二根手指接管为新的主指。
    if (event.touches.length !== 1) return;
    const touch = event.changedTouches[0];
    if (!touch || !this.viewport.toLogical(touch.clientX, touch.clientY)) return;
    this.primary = { id: touch.identifier, x: touch.clientX, y: touch.clientY,
      time: this.platform.now(), cancelled: false };
    this.gesture('start', this.viewport.toLogical(touch.clientX, touch.clientY));
  };
  private move = (event: TouchEvent): void => {
    const active = this.primary;
    if (!active) return;
    const touch = event.changedTouches.find(item => item.identifier === active.id);
    if (touch) this.gesture('move', this.viewport.toLogical(touch.clientX, touch.clientY));
    if (touch && Math.hypot(touch.clientX - active.x, touch.clientY - active.y) > RUNTIME.tapSlop) {
      active.cancelled = true;
    }
  };
  private end = (event: TouchEvent): void => {
    const active = this.primary;
    if (!active) return;
    const touch = event.changedTouches.find(item => item.identifier === active.id);
    if (!touch) return;
    this.primary = null;
    this.gesture('end', this.viewport.toLogical(touch.clientX, touch.clientY));
    if (!this.enabled || active.cancelled || this.platform.now() - active.time > RUNTIME.tapDurationMs ||
      Math.hypot(touch.clientX - active.x, touch.clientY - active.y) > RUNTIME.tapSlop) return;
    const point = this.viewport.toLogical(touch.clientX, touch.clientY);
    if (point) this.tap(point);
  };
  private cancel = (event?: TouchEvent): void => {
    if (event && this.primary && event.changedTouches.length &&
      !event.changedTouches.some(touch => touch.identifier === this.primary?.id)) return;
    if (this.primary) this.gesture('cancel', null);
    this.primary = null;
  };
}
