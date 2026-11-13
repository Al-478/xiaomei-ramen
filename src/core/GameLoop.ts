import type { Platform } from './Platform';

export class GameLoop {
  private samples: number[] = [];
  get metrics(): {samples:number; averageFps:number; p95FrameMs:number} {
    const sorted=[...this.samples].sort((a,b)=>a-b),sum=this.samples.reduce((a,b)=>a+b,0);
    return {samples:sorted.length,averageFps:sum>0?this.samples.length/sum:0,p95FrameMs:(sorted[Math.floor(sorted.length*0.95)]??0)*1000};
  }
  get requestCount(): number { return this.frame === null ? 0 : 1; }
  private frame: number | null = null;
  private running = false;
  private previous: number | null = null;
  constructor(private platform: Platform, private tick: (dt: number) => void) {}
  start(): void {
    if (this.running) return;
    this.running = true;
    this.previous = null;
    this.samples = [];
    this.frame = this.platform.requestFrame(this.update);
  }
  stop(): void {
    this.running = false;
    if (this.frame !== null) this.platform.cancelFrame(this.frame);
    this.frame = null;
    this.previous = null;
  }
  private update = (time: number): void => {
    this.frame = null;
    if (!this.running) return;
    const dt = this.previous === null ? 0 : Math.max(0, (time - this.previous) / 1000);
    this.previous = time;
    if (dt>0) { this.samples.push(dt); if(this.samples.length>120)this.samples.shift(); }
    this.tick(dt);
    if (this.running) this.frame = this.platform.requestFrame(this.update);
  };
}
