import type { Platform } from '../../src/core/Platform';
import type { DrawContext, GameImage, Screen, TouchEvent, TouchPhase, RenderSurface } from '../../src/core/types';

// 两个平台使用相同的画布与触摸结构；运行时只调用 TapTap API，不创建微信全局对象。
declare const tap: Pick<typeof wx,
  'createCanvas' | 'createImage' | 'getSystemInfoSync' | 'getWindowInfo' |
  'onTouchStart' | 'offTouchStart' | 'onTouchMove' | 'offTouchMove' |
  'onTouchEnd' | 'offTouchEnd' | 'onTouchCancel' | 'offTouchCancel' |
  'onWindowResize' | 'offWindowResize' | 'onHide' | 'offHide' | 'onShow' | 'offShow' |
  'getStorageSync' | 'setStorageSync' | 'vibrateShort' | 'createInnerAudioContext'>;
export class TapTapPlatform implements Platform {
  readonly canvas = tap.createCanvas();
  readonly context: DrawContext;

  constructor() {
    const context: unknown = this.canvas.getContext('2d');
    if (!context) throw new Error('无法创建二维画布');
    this.context = context as DrawContext;
  }

  screen(): Screen {
    const info = typeof tap.getWindowInfo === 'function' ? tap.getWindowInfo() : tap.getSystemInfoSync();
    return { width: info.windowWidth, height: info.windowHeight, dpr: info.pixelRatio, safeArea: info.safeArea };
  }
  createImage(): GameImage { return tap.createImage(); }
  createLayer(): RenderSurface {
    const api = tap as typeof tap & {createOffscreenCanvas?:(options:{type:'2d';width:number;height:number})=>RenderSurface};
    return api.createOffscreenCanvas ? api.createOffscreenCanvas({type:'2d',width:1,height:1}) : tap.createCanvas();
  }
  requestFrame(callback: (time: number) => void): number { return requestAnimationFrame(callback); }
  cancelFrame(id: number): void { cancelAnimationFrame(id); }
  now(): number { return Date.now(); }

  onTouch(phase: TouchPhase, callback: (event: TouchEvent) => void): () => void {
    switch (phase) {
      case 'start': tap.onTouchStart(callback); return () => tap.offTouchStart(callback);
      case 'move': tap.onTouchMove(callback); return () => tap.offTouchMove(callback);
      case 'end': tap.onTouchEnd(callback); return () => tap.offTouchEnd(callback);
      case 'cancel': tap.onTouchCancel(callback); return () => tap.offTouchCancel(callback);
    }
  }
  onResize(callback: () => void): () => void { tap.onWindowResize(callback); return () => tap.offWindowResize(callback); }
  onHide(callback: () => void): () => void { tap.onHide(callback); return () => tap.offHide(callback); }
  onShow(callback: () => void): () => void { tap.onShow(callback); return () => tap.offShow(callback); }
  read(key: string): unknown { return tap.getStorageSync('taptap.minigame.' + key) as unknown; }
  write(key: string, value: unknown): void { tap.setStorageSync('taptap.minigame.' + key, value); }
  vibrate(): void { try { tap.vibrateShort({ type: 'light', fail: () => undefined }); } catch { /* 设备不支持振动时继续游戏。 */ } }
  createAudio(): WechatMinigame.InnerAudioContext { return tap.createInnerAudioContext(); }
}

