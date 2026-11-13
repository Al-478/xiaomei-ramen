import { RUNTIME } from '../config/runtime';
import type { AssetManager } from './AssetManager';
import type { Platform } from './Platform';
import type { Viewport } from './Viewport';
import type { Point, Rect, RenderSurface, DrawContext, GameImage } from './types';
import { mouth, oval } from '../scenes/PotGeometry';

export class Renderer {
  private layer: RenderSurface | null = null;
  private cacheKey = '';
  private cacheDisabled = false;
  get layerCount(): number { return this.layer ? 1 : 0; }
  readonly ctx;
  constructor(private platform: Platform, readonly viewport: Viewport, private assets: AssetManager) {
    this.ctx = platform.context;
  }
  resize(): void {
    this.viewport.resize(this.platform.screen());
    this.platform.canvas.width = Math.max(1,Math.floor(this.viewport.width * this.viewport.dpr));
    this.platform.canvas.height = Math.max(1,Math.floor(this.viewport.height * this.viewport.dpr));
    this.ctx.imageSmoothingEnabled = true;
  }
  begin(): void {
    const { ctx, viewport: v } = this;
    ctx.setTransform(1, 0, 0, 1, 0, 0);
    ctx.fillStyle = '#542039';
    ctx.fillRect(0, 0, this.platform.canvas.width, this.platform.canvas.height);
    ctx.setTransform(v.scale * v.dpr, 0, 0, v.scale * v.dpr, v.offsetX * v.dpr, v.offsetY * v.dpr);
  }
  image(id: string, r: Rect): void {
    const image = this.assets.get(id);
    if (!image) throw new Error(`绘制资源未加载：${id}`);
    const ratio = Math.min(r.w / image.width, r.h / image.height);
    const w = image.width * ratio, h = image.height * ratio;
    this.ctx.drawImage(image, r.x + (r.w - w) / 2, r.y + (r.h - h) / 2, w, h);
  }
  private scenePlacement() {
    const v=this.viewport,scale=Math.min(v.width/RUNTIME.logicalWidth,v.height/RUNTIME.logicalHeight);
    return {scale,x:(v.width-RUNTIME.logicalWidth*scale)/2,y:(v.height-RUNTIME.logicalHeight*scale)/2};
  }
  beginScene():void {
    const p=this.scenePlacement(),dpr=this.viewport.dpr;
    this.ctx.save();this.ctx.setTransform(p.scale*dpr,0,0,p.scale*dpr,p.x*dpr,p.y*dpr);
  }
  endScene():void {this.ctx.restore();}
  scenePoint(point:Point):Point {
    const p=this.scenePlacement(),v=this.viewport;
    return {x:(point.x*v.scale+v.offsetX-p.x)/p.scale,y:(point.y*v.scale+v.offsetY-p.y)/p.scale};
  }
  imagePart(id:string, source:Rect, target:Rect): void {
    const image=this.assets.get(id);
    if(!image) throw new Error(`绘制资源未加载：${id}`);
    this.ctx.drawImage(image,source.x,source.y,source.w,source.h,target.x,target.y,target.w,target.h);
  }
  imageFill(id:string,target:Rect):void {
    const image=this.assets.get(id);
    if(!image)throw new Error(`绘制资源未加载：${id}`);
    this.ctx.drawImage(image,12,12,image.width-24,image.height-24,target.x,target.y,target.w,target.h);
  }
  mitts(area:Rect):void {
    this.image('oven-mitt',{x:area.x-area.w*.015,y:area.y+area.h*.58,w:area.w*.26,h:area.h*.44});
    this.ctx.save();this.ctx.translate(area.x+area.w,area.y);this.ctx.scale(-1,1);
    this.image('oven-mitt',{x:-area.w*.015,y:area.h*.58,w:area.w*.26,h:area.h*.44});this.ctx.restore();
  }
  trayFront(area:Rect,sourceY:number):void {
    const image=this.assets.get('tray');
    if(!image)throw new Error('托盘素材未加载');
    const scale=Math.min(area.w/image.width,area.h/image.height);
    const x=area.x+(area.w-image.width*scale)/2,y=area.y+(area.h-image.height*scale)/2;
    this.ctx.drawImage(image,0,sourceY,image.width,image.height-sourceY,x,y+sourceY*scale,image.width*scale,(image.height-sourceY)*scale);
  }
  potFront(area:Rect):void {
    const image=this.assets.get('pot-empty');
    if(!image)throw new Error('锅体素材未加载');
    const scale=Math.min(area.w/image.width,area.h/image.height);
    const x=area.x+(area.w-image.width*scale)/2,y=area.y+(area.h-image.height*scale)/2;
    const c=this.ctx,m=mouth(area),k=.5522848;
    // 沿锅口下半椭圆恢复前壁，避免矩形裁切把汤面截出一条横线。
    c.save();c.beginPath();c.moveTo(m.x-m.rx,m.y);
    c.bezierCurveTo(m.x-m.rx,m.y+m.ry*k,m.x-m.rx*k,m.y+m.ry,m.x,m.y+m.ry);
    c.bezierCurveTo(m.x+m.rx*k,m.y+m.ry,m.x+m.rx,m.y+m.ry*k,m.x+m.rx,m.y);
    c.lineTo(area.x+area.w,m.y);c.lineTo(area.x+area.w,area.y+area.h);
    c.lineTo(area.x,area.y+area.h);c.lineTo(area.x,m.y);c.closePath();c.clip();
    c.drawImage(image,x,y,image.width*scale,image.height*scale);c.restore();
  }
  scorchedPot(area:Rect): void {
    // 保留金属锅身和把手，只在锅内壁添加局部焦痕。
    this.image('pot-empty',area);
    const c=this.ctx,m=mouth(area);
    c.save();oval(c,m.x,m.y,m.rx*.96,m.ry*.96);c.clip();
    const soot=c.createRadialGradient(m.x,m.y+m.ry*.4,m.rx*.18,m.x,m.y+m.ry*.25,m.rx);
    soot.addColorStop(0,'#42281899');soot.addColorStop(.68,'#77441c66');soot.addColorStop(1,'#9a5b2500');
    c.fillStyle=soot;c.fillRect(m.x-m.rx,m.y-m.ry,m.rx*2,m.ry*2);c.restore();
  }
  sceneColor(color:string): void {
    const c=this.ctx;c.save();c.setTransform(1,0,0,1,0,0);c.fillStyle=color;
    c.fillRect(0,0,this.platform.canvas.width,this.platform.canvas.height);c.restore();
  }
  background(id: string): void {
    const image = this.assets.get(id);
    if (!image) throw new Error(`背景未加载：${id}`);
    const c = this.ctx, canvas = this.platform.canvas;
    const v = this.viewport;
    if (this.platform.createLayer && !this.cacheDisabled) {
      try {
        const key = `${id}:${canvas.width}:${canvas.height}:${v.scale}:${v.offsetX}:${v.offsetY}:${v.dpr}`;
        if (!this.layer) this.layer = this.platform.createLayer();
        if (key !== this.cacheKey) {
          this.layer.width = canvas.width; this.layer.height = canvas.height;
          const target = this.layer.getContext('2d') as DrawContext | null;
          if (!target) throw new Error('静态背景缓存不可用');
          target.imageSmoothingEnabled = true;
          this.paintBackground(target,image);
          this.cacheKey = key;
        }
        c.save(); c.setTransform(1,0,0,1,0,0); c.drawImage(this.layer,0,0,canvas.width,canvas.height); c.restore();
        return;
      } catch { this.cacheDisabled = true; this.layer = null; }
    }
    this.paintBackground(c,image);
  }
  private paintBackground(c:DrawContext,image:GameImage):void {
    const canvas=this.platform.canvas,p=this.scenePlacement(),dpr=this.viewport.dpr;
    const side=(image.width-RUNTIME.logicalWidth)/2;
    const centerX=Math.round(p.x*dpr);
    const rightX=Math.round((p.x+RUNTIME.logicalWidth*p.scale)*dpr);
    const centerW=rightX-centerX;
    c.save();
    try {
      c.setTransform(1,0,0,1,0,0);c.imageSmoothingEnabled=true;
      // 中央厨房与物件共用坐标；仅伸缩两侧装饰区，宽屏也不裁掉标题和柜台。
      // 微信真机可能把小数像素接缝采样成黑线；边界取整，装饰区多铺一个像素后再覆盖中央。
      if(centerX>0)c.drawImage(image,0,0,side,image.height,0,0,centerX+1,canvas.height);
      if(canvas.width>rightX)c.drawImage(image,side+RUNTIME.logicalWidth,0,side,image.height,rightX-1,0,canvas.width-rightX+1,canvas.height);
      c.drawImage(image,side,0,RUNTIME.logicalWidth,image.height,centerX,0,centerW,canvas.height);
    } finally {c.restore();}
  }

  dispose(): void { if (this.layer) { this.layer.width = 1; this.layer.height = 1; } this.layer = null; this.cacheKey = ''; }
  dim(color='#54203999'): void {
    const c=this.ctx;c.save();c.setTransform(1,0,0,1,0,0);c.fillStyle=color;
    c.fillRect(0,0,this.platform.canvas.width,this.platform.canvas.height);c.restore();
  }
  rotatedImage(id: string, area: Rect, angle: number): void {
    this.ctx.save(); this.ctx.translate(area.x + area.w / 2, area.y + area.h / 2); this.ctx.rotate(angle);
    this.image(id, {x:-area.w/2,y:-area.h/2,w:area.w,h:area.h}); this.ctx.restore();
  }
  rotatedImageFill(id:string,area:Rect,angle:number):void {
    this.ctx.save();this.ctx.translate(area.x+area.w/2,area.y+area.h/2);this.ctx.rotate(angle);
    this.imageFill(id,{x:-area.w/2,y:-area.h/2,w:area.w,h:area.h});this.ctx.restore();
  }
  text(text: string, x: number, y: number, size = 34, color = '#9e084a', maxWidth = 1400,
    style: { strokeWidth?: number; strokeColor?: string } = {}): void {
    const c = this.ctx;
    c.font = `bold ${size}px ${RUNTIME.font}`;
    c.textAlign = 'center'; c.textBaseline = 'middle';
    const strokeWidth = style.strokeWidth ?? 2;
    c.lineWidth = strokeWidth; c.strokeStyle = style.strokeColor ?? '#fff8dd'; c.fillStyle = color;
    if (strokeWidth > 0) c.strokeText(text, x, y, maxWidth);
    c.fillText(text, x, y, maxWidth);
  }
  contactShadow(x: number, y: number, rx: number, ry: number): void {
    const c = this.ctx;
    c.save(); c.translate(x, y); c.scale(rx, ry);
    const gradient = c.createRadialGradient(0, 0, 0, 0, 0, 1);
    gradient.addColorStop(0, '#48213460');
    gradient.addColorStop(0.55, '#48213428');
    gradient.addColorStop(1, '#48213400');
    c.fillStyle = gradient; c.fillRect(-1, -1, 2, 2); c.restore();
  }
  pill(area: Rect): void {
    const c = this.ctx, { x, y, w, h } = area, radius = h / 2;
    c.save(); c.beginPath(); c.moveTo(x + radius, y); c.lineTo(x + w - radius, y);
    c.quadraticCurveTo(x + w, y, x + w, y + radius);
    c.quadraticCurveTo(x + w, y + h, x + w - radius, y + h);
    c.lineTo(x + radius, y + h); c.quadraticCurveTo(x, y + h, x, y + radius);
    c.quadraticCurveTo(x, y, x + radius, y); c.closePath();
    const gloss=c.createRadialGradient(x+w*.35,y+h*.12,0,x+w*.5,y+h*.5,w*.8);
    gloss.addColorStop(0,'#fff8e3');gloss.addColorStop(1,'#ffc6db');
    c.fillStyle=gloss;c.fill();c.strokeStyle='#c93872';c.lineWidth=7;c.stroke();
    c.strokeStyle='#fff3c9';c.lineWidth=2;c.stroke();c.restore();
  }
  panel(r: Rect): void {
    const c=this.ctx,{x,y,w,h}=r,corner=Math.min(32,h*.1);
    c.save();c.beginPath();c.moveTo(x+corner,y);c.lineTo(x+w-corner,y);
    c.quadraticCurveTo(x+w,y,x+w,y+corner);c.lineTo(x+w,y+h-corner);
    c.quadraticCurveTo(x+w,y+h,x+w-corner,y+h);c.lineTo(x+corner,y+h);
    c.quadraticCurveTo(x,y+h,x,y+h-corner);c.lineTo(x,y+corner);
    c.quadraticCurveTo(x,y,x+corner,y);c.closePath();
    c.fillStyle='#fff5df';c.fill();c.strokeStyle='#d45183';c.lineWidth=9;c.stroke();
    c.strokeStyle='#ffdb83';c.lineWidth=3;c.stroke();c.restore();
  }
}
