import type { DrawContext, GameImage, Screen, TouchEvent, TouchPhase, RenderSurface } from './types';

export interface Platform {
  canvas: WechatMinigame.Canvas;
  context: DrawContext;
  screen(): Screen;
  createImage(): GameImage;
  createLayer?(): RenderSurface;
  requestFrame(callback: (time: number) => void): number;
  cancelFrame(id: number): void;
  now(): number;
  onTouch(phase: TouchPhase, callback: (event: TouchEvent) => void): () => void;
  onResize(callback: () => void): () => void;
  onHide(callback: () => void): () => void;
  onShow(callback: () => void): () => void;
  read(key: string): unknown;
  write(key: string, value: unknown): void;
  vibrate(): void;
  createAudio(): WechatMinigame.InnerAudioContext;
}

export class WechatPlatform implements Platform {
  readonly canvas = wx.createCanvas();
  readonly context: DrawContext;

  constructor() {
    const context: unknown = this.canvas.getContext('2d');
    if (!context) throw new Error('无法创建二维画布');
    this.context = context as DrawContext;
  }

  screen(): Screen {
    const info = typeof wx.getWindowInfo === 'function' ? wx.getWindowInfo() : wx.getSystemInfoSync();
    return { width: info.windowWidth, height: info.windowHeight, dpr: info.pixelRatio, safeArea: info.safeArea };
  }
  createImage(): GameImage { return wx.createImage(); }
  createLayer(): RenderSurface {
    const api = wx as typeof wx & {createOffscreenCanvas?:(options:{type:'2d';width:number;height:number})=>RenderSurface};
    return api.createOffscreenCanvas ? api.createOffscreenCanvas({type:'2d',width:1,height:1}) : wx.createCanvas();
  }
  requestFrame(callback: (time: number) => void): number { return requestAnimationFrame(callback); }
  cancelFrame(id: number): void { cancelAnimationFrame(id); }
  now(): number { return Date.now(); }

  onTouch(phase: TouchPhase, callback: (event: TouchEvent) => void): () => void {
    switch (phase) {
      case 'start': wx.onTouchStart(callback); return () => wx.offTouchStart(callback);
      case 'move': wx.onTouchMove(callback); return () => wx.offTouchMove(callback);
      case 'end': wx.onTouchEnd(callback); return () => wx.offTouchEnd(callback);
      case 'cancel': wx.onTouchCancel(callback); return () => wx.offTouchCancel(callback);
    }
  }
  onResize(callback: () => void): () => void { wx.onWindowResize(callback); return () => wx.offWindowResize(callback); }
  onHide(callback: () => void): () => void { wx.onHide(callback); return () => wx.offHide(callback); }
  onShow(callback: () => void): () => void { wx.onShow(callback); return () => wx.offShow(callback); }
  read(key: string): unknown { return wx.getStorageSync(key) as unknown; }
  write(key: string, value: unknown): void { wx.setStorageSync(key, value); }
  vibrate(): void { wx.vibrateShort({ type: 'light', fail: () => undefined }); }
  createAudio(): WechatMinigame.InnerAudioContext { return wx.createInnerAudioContext(); }
}
