import type { Platform } from './Platform';
export interface SaveData { version: 1; tutorialCompleted: boolean; musicEnabled: boolean; soundEnabled: boolean; bestScore: number }
export const SAVE_KEY = 'genkiRamen.save';
export const defaults = (): SaveData => ({ version:1, tutorialCompleted:false, musicEnabled:true, soundEnabled:true, bestScore:0 });
export function migrateSave(raw: unknown): SaveData {
  let value = raw;
  if (typeof value === 'string') { try { value = JSON.parse(value) as unknown; } catch { return defaults(); } }
  if (!value || typeof value !== 'object' || Array.isArray(value)) return defaults();
  const record = value as Record<string, unknown>;
  if (record.version !== undefined && record.version !== 0 && record.version !== 1) return defaults();
  const data = defaults();
  for (const key of ['tutorialCompleted','musicEnabled','soundEnabled'] as const) {
    if (typeof record[key] === 'boolean') data[key] = record[key];
  }
  if (typeof record.bestScore === 'number' && Number.isFinite(record.bestScore) && record.bestScore >= 0 && record.bestScore <= 1e9) data.bestScore = Math.floor(record.bestScore);
  return data;
}
export class SaveManager {
  data = defaults();
  writable = true;
  constructor(private platform: Pick<Platform,'read'|'write'>) {
    try { this.data = migrateSave(platform.read(SAVE_KEY)); } catch { this.data = defaults(); }
  }
  update(patch: Partial<Omit<SaveData,'version'>>): void {
    this.data = migrateSave({ ...this.data, ...patch });
    try { this.platform.write(SAVE_KEY, { ...this.data }); this.writable = true; }
    catch { this.writable = false; }
  }
  recordScore(score: number): void { this.update({ bestScore:Math.max(this.data.bestScore, Number.isFinite(score) ? score : 0) }); }
}
