import type { Point, Scene, TouchPhase } from './types';

export class SceneManager {
  get diagnostics(): readonly string[] {return [this.current?.constructor.name ?? '无场景',...(this.current?.diagnostics ?? [])];}
  get count(): number { return this.current ? 1 : 0; }
  get effectCount(): number { return this.current?.effectCount ?? 0; }
  private current: Scene | null = null;
  change(scene: Scene): void {
    this.current?.dispose();
    this.current = scene;
  }
  render(): void { this.current?.render(); }
  update(dt: number): void { this.current?.update?.(dt); }
  tap(point: Point): void { this.current?.tap(point); }
  gesture(phase: TouchPhase, point: Point | null): void { this.current?.gesture?.(phase, point); }
  dispose(): void { this.current?.dispose(); this.current = null; }
}
