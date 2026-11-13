import { ASSETS, type AssetSpec } from '../config/assets';
import { RUNTIME } from '../config/runtime';
import type { Platform } from './Platform';
import type { GameImage } from './types';

export interface LoadProgress { loaded: number; total: number; failed: readonly string[] }
export class AssetManager {
  get cachedCount(): number { return this.images.size; }
  private images = new Map<string, GameImage>();
  private pending = new Map<string, Promise<GameImage>>();
  private cancellations = new Set<() => void>();
  private disposed = false;
  constructor(private platform: Pick<Platform, 'createImage'>,
    private timeoutMs: number = RUNTIME.imageTimeoutMs,
    private attempts: number = RUNTIME.imageAttempts) {}

  get(id: string): GameImage | undefined { return this.images.get(id); }
  async load(ids: readonly string[], report: (progress: LoadProgress) => void): Promise<LoadProgress> {
    const unique = [...new Set(ids)];
    const counted = new Set(unique.filter(id => this.images.has(id)));
    const progress: LoadProgress = { loaded: counted.size,
      total: unique.length, failed: [] };
    const failed: string[] = [];
    let cursor = 0;
    report({ ...progress });
    const worker = async (): Promise<void> => {
      while (cursor < unique.length && !this.disposed) {
        const id = unique[cursor++];
        if (!id || counted.has(id)) continue;
        if (this.images.has(id)) {
          counted.add(id); progress.loaded++;
          report({ ...progress });
          continue;
        }
        try { await this.loadOne(id); progress.loaded++; }
        catch { failed.push(id); }
        progress.failed = [...failed];
        if (!this.disposed) report({ ...progress });
      }
    };
    await Promise.all(Array.from({ length: Math.min(RUNTIME.loadConcurrency, unique.length) }, worker));
    return { ...progress, failed };
  }
  dispose(): void {
    this.disposed = true;
    [...this.cancellations].forEach(cancel => cancel());
    this.images.clear();
  }
  private loadOne(id: string): Promise<GameImage> {
    const cached = this.images.get(id);
    if (cached) return Promise.resolve(cached);
    const existing = this.pending.get(id);
    if (existing) return existing;
    const spec = ASSETS.find(item => item.id === id);
    if (!spec) return Promise.reject(new Error(`未知素材：${id}`));
    const task = this.retry(spec).finally(() => this.pending.delete(id));
    this.pending.set(id, task);
    return task;
  }
  private async retry(spec: AssetSpec): Promise<GameImage> {
    for (let attempt = 0; attempt < this.attempts; attempt++) {
      if (this.disposed) throw new Error('资源管理器已释放');
      try {
        const image = await this.decode(spec.path);
        if (this.disposed) throw new Error('资源管理器已释放');
        this.images.set(spec.id, image);
        return image;
      } catch (error) {
        if (attempt + 1 === this.attempts || this.disposed) throw error;
      }
    }
    throw new Error(`素材加载失败：${spec.id}`);
  }
  private decode(path: string): Promise<GameImage> {
    return new Promise((resolve, reject) => {
      const image = this.platform.createImage();
      let settled = false;
      const finish = (error?: Error): void => {
        if (settled) return;
        settled = true;
        clearTimeout(timer);
        this.cancellations.delete(cancel);
        image.onload = () => undefined;
        image.onerror = () => undefined;
        if (error) reject(error); else resolve(image);
      };
      const cancel = (): void => finish(new Error('资源加载已取消'));
      const timer = setTimeout(() => finish(new Error(`素材加载超时：${path}`)), this.timeoutMs);
      this.cancellations.add(cancel);
      image.onload = () => finish();
      image.onerror = () => finish(new Error(`素材解码失败：${path}`));
      try { image.src = path; } catch (error) { finish(error instanceof Error ? error : new Error(String(error))); }
    });
  }
}
