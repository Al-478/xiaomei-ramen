export interface Point { x: number; y: number }
export interface Rect extends Point { w: number; h: number }
export interface SafeArea { left: number; top: number; right: number; bottom: number }
export interface Screen { width: number; height: number; dpr: number; safeArea?: SafeArea }
export interface Touch { identifier: number; clientX: number; clientY: number }
export interface TouchEvent { touches: readonly Touch[]; changedTouches: readonly Touch[] }
export type TouchPhase = 'start' | 'move' | 'end' | 'cancel';
export type GameImage = WechatMinigame.Image;
export interface RenderSurface { width:number; height:number; getContext(type:'2d'): unknown }
export interface DrawGradient { addColorStop(offset: number, color: string): void }

// 只描述实际使用的二维画布接口，避免依赖浏览器类型或官方上下文中的宽泛类型。
export interface DrawContext {
  fillStyle: string | DrawGradient; strokeStyle: string; lineWidth: number; font: string;
  textAlign: 'left' | 'center' | 'right'; textBaseline: 'top' | 'middle' | 'alphabetic';
  globalAlpha: number; imageSmoothingEnabled: boolean;
  globalCompositeOperation: string;
  save(): void; restore(): void;
  translate(x: number, y: number): void; scale(x: number, y: number): void;
  rotate(angle: number): void;
  createRadialGradient(x0: number, y0: number, r0: number, x1: number, y1: number, r1: number): DrawGradient;
  beginPath(): void; moveTo(x: number, y: number): void; lineTo(x: number, y: number): void;
  quadraticCurveTo(cx: number, cy: number, x: number, y: number): void;
  bezierCurveTo(a:number,b:number,c:number,d:number,e:number,f:number): void;
  closePath(): void; fill(): void; stroke(): void;
  clip(): void;
  setTransform(a: number, b: number, c: number, d: number, e: number, f: number): void;
  clearRect(x: number, y: number, w: number, h: number): void;
  fillRect(x: number, y: number, w: number, h: number): void;
  strokeRect(x: number, y: number, w: number, h: number): void;
  fillText(text: string, x: number, y: number, maxWidth?: number): void;
  strokeText(text: string, x: number, y: number, maxWidth?: number): void;
  drawImage(image: GameImage | RenderSurface, x: number, y: number, w: number, h: number): void;
  drawImage(image: GameImage | RenderSurface, sx:number,sy:number,sw:number,sh:number,x:number,y:number,w:number,h:number): void;
}
export interface Scene {
  readonly diagnostics?: readonly string[];
  gesture?(phase: TouchPhase, point: Point | null): void;
  readonly effectCount?: number;
  update?(dt: number): void;
  render(): void;
  tap(point: Point): void;
  dispose(): void;
}
export const rect = (values: readonly number[]): Rect => {
  const [x, y, w, h] = values;
  if (x === undefined || y === undefined || w === undefined || h === undefined) {
    throw new Error('布局矩形数据不完整');
  }
  return { x, y, w, h };
};
export const contains = (r: Rect, p: Point): boolean =>
  p.x >= r.x && p.x < r.x + r.w && p.y >= r.y && p.y < r.y + r.h;
