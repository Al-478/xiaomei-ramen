import type { Platform } from '../../src/core/Platform';
import type { DrawContext, GameImage, RenderSurface, Screen, Touch, TouchEvent, TouchPhase } from '../../src/core/types';

// 浏览器使用原生音频；保留游戏实际依赖的最小接口，不引入微信运行时。
class BrowserAudio {
  private readonly element = new Audio();
  private readonly ended = new Set<() => void>();
  private readonly errors = new Set<() => void>();
  private wanted = false;
  private disposed = false;
  private attempt = 0;

  constructor(private readonly release: () => void) {
    this.element.preload = 'auto';
    this.element.addEventListener('ended', () => {
      this.wanted = false;
      this.ended.forEach(callback => callback());
    });
    this.element.addEventListener('error', () => {
      if (!this.disposed) this.errors.forEach(callback => callback());
    });
  }
  get src(): string { return this.element.getAttribute('src') ?? ''; }
  set src(value: string) { this.element.src = value; }
  get loop(): boolean { return this.element.loop; }
  set loop(value: boolean) { this.element.loop = value; }
  get volume(): number { return this.element.volume; }
  set volume(value: number) { this.element.volume = value; }
  play(): void {
    if (this.disposed) return;
    this.wanted = true;
    const attempt = ++this.attempt;
    void this.element.play().catch((error: unknown) => {
      if (this.disposed || attempt !== this.attempt || !this.wanted) return;
      // 浏览器未授权自动播放时留到下次真实触摸重试，不把音频永久标记为损坏。
      const name = error instanceof DOMException ? error.name : '';
      if (name !== 'NotAllowedError' && name !== 'AbortError') this.errors.forEach(callback => callback());
    });
  }
  retry(): void { if (this.wanted && this.element.paused) this.play(); }
  pause(): void { this.wanted = false; this.attempt++; this.element.pause(); }
  stop(): void {
    this.pause();
    if (this.element.readyState > 0) this.element.currentTime = 0;
  }
  destroy(): void {
    if (this.disposed) return;
    this.pause(); this.disposed = true;
    this.element.removeAttribute('src'); this.element.load();
    this.ended.clear(); this.errors.clear(); this.release();
  }
  onEnded(callback: () => void): void { this.ended.add(callback); }
  offEnded(callback: () => void): void { this.ended.delete(callback); }
  onError(callback: () => void): void { this.errors.add(callback); }
  offError(callback: () => void): void { this.errors.delete(callback); }
}

export class BrowserPlatform implements Platform {
  readonly canvas: WechatMinigame.Canvas;
  readonly context: DrawContext;
  private readonly pointers = new Map<number, Touch>();
  private readonly touchCallbacks = new Map<TouchPhase, Set<(event: TouchEvent) => void>>();
  private readonly hideCallbacks = new Set<() => void>();
  private readonly showCallbacks = new Set<() => void>();
  private readonly audio = new Set<BrowserAudio>();
  private readonly cleanup: (() => void)[] = [];
  private hidden = document.hidden;
  private pageHidden = false;

  constructor(private readonly element: HTMLCanvasElement) {
    this.canvas = element as unknown as WechatMinigame.Canvas;
    const context = element.getContext('2d');
    if (!context) throw new Error('无法创建二维画布');
    this.context = context as unknown as DrawContext;
    for (const [name, phase] of [
      ['pointerdown', 'start'], ['pointermove', 'move'], ['pointerup', 'end'], ['pointercancel', 'cancel'],
    ] as const) {
      const handler = (event: PointerEvent): void => {
        if (phase === 'start' && (event.button !== 0 || this.hidden)) return;
        if (phase !== 'start' && !this.pointers.has(event.pointerId)) return;
        event.preventDefault();
        const rect = element.getBoundingClientRect();
        const touch = { identifier: event.pointerId, clientX: event.clientX - rect.left, clientY: event.clientY - rect.top };
        if (phase === 'start') {
          this.pointers.set(event.pointerId, touch);
          element.setPointerCapture(event.pointerId);
        } else if (phase === 'move') this.pointers.set(event.pointerId, touch);
        else this.pointers.delete(event.pointerId);
        this.emit(phase, { touches: [...this.pointers.values()], changedTouches: [touch] });
        if (phase === 'start') this.audio.forEach(audio => audio.retry());
      };
      element.addEventListener(name, handler);
      this.cleanup.push(() => element.removeEventListener(name, handler));
    }
    const lostCapture = (event: PointerEvent): void => {
      const touch = this.pointers.get(event.pointerId);
      if (!touch) return;
      this.pointers.delete(event.pointerId);
      this.emit('cancel', { touches: [...this.pointers.values()], changedTouches: [touch] });
    };
    element.addEventListener('lostpointercapture', lostCapture);
    this.cleanup.push(() => element.removeEventListener('lostpointercapture', lostCapture));
    const visibility = (): void => this.setHidden(document.hidden || this.pageHidden);
    const pageHide = (): void => { this.pageHidden = true; visibility(); };
    const pageShow = (): void => { this.pageHidden = false; visibility(); };
    document.addEventListener('visibilitychange', visibility);
    window.addEventListener('pagehide', pageHide);
    window.addEventListener('pageshow', pageShow);
    this.cleanup.push(() => {
      document.removeEventListener('visibilitychange', visibility);
      window.removeEventListener('pagehide', pageHide);
      window.removeEventListener('pageshow', pageShow);
    });
  }
  screen(): Screen {
    const rect = this.element.getBoundingClientRect();
    const style = getComputedStyle(this.element);
    const inset = (name: string): number => Math.max(0, parseFloat(style.getPropertyValue(name)) || 0);
    return {
      width: rect.width, height: rect.height, dpr: window.devicePixelRatio || 1,
      safeArea: { left: inset('--safe-left'), top: inset('--safe-top'),
        right: rect.width - inset('--safe-right'), bottom: rect.height - inset('--safe-bottom') },
    };
  }
  createImage(): GameImage { return new Image() as unknown as GameImage; }
  createLayer(): RenderSurface { return document.createElement('canvas'); }
  requestFrame(callback: (time: number) => void): number { return window.requestAnimationFrame(callback); }
  cancelFrame(id: number): void { window.cancelAnimationFrame(id); }
  now(): number { return Date.now(); }
  onTouch(phase: TouchPhase, callback: (event: TouchEvent) => void): () => void {
    const callbacks = this.touchCallbacks.get(phase) ?? new Set();
    callbacks.add(callback); this.touchCallbacks.set(phase, callbacks);
    return () => { callbacks.delete(callback); };
  }
  onResize(callback: () => void): () => void {
    window.addEventListener('resize', callback);
    window.visualViewport?.addEventListener('resize', callback);
    return () => {
      window.removeEventListener('resize', callback);
      window.visualViewport?.removeEventListener('resize', callback);
    };
  }
  onHide(callback: () => void): () => void {
    this.hideCallbacks.add(callback); return () => { this.hideCallbacks.delete(callback); };
  }
  onShow(callback: () => void): () => void {
    this.showCallbacks.add(callback); return () => { this.showCallbacks.delete(callback); };
  }
  read(key: string): unknown { return JSON.parse(localStorage.getItem(`taptap.${key}`) ?? 'null') as unknown; }
  write(key: string, value: unknown): void { localStorage.setItem(`taptap.${key}`, JSON.stringify(value)); }
  vibrate(): void { /* 烹饪操作不依赖震动，避免申请额外设备能力。 */ }
  createAudio(): WechatMinigame.InnerAudioContext {
    const audio = new BrowserAudio(() => { this.audio.delete(audio); });
    this.audio.add(audio);
    return audio as unknown as WechatMinigame.InnerAudioContext;
  }
  dispose(): void {
    this.cancelPointers();
    this.cleanup.forEach(off => off()); this.cleanup.length = 0;
    this.audio.forEach(audio => audio.destroy());
    this.touchCallbacks.clear(); this.hideCallbacks.clear(); this.showCallbacks.clear();
  }
  private emit(phase: TouchPhase, event: TouchEvent): void {
    this.touchCallbacks.get(phase)?.forEach(callback => callback(event));
  }
  private cancelPointers(): void {
    if (!this.pointers.size) return;
    const changedTouches = [...this.pointers.values()];
    this.pointers.clear(); this.emit('cancel', { touches: [], changedTouches });
  }
  private setHidden(hidden: boolean): void {
    if (this.hidden === hidden) return;
    this.hidden = hidden;
    if (hidden) this.cancelPointers();
    (hidden ? this.hideCallbacks : this.showCallbacks).forEach(callback => callback());
  }
}
