import type { Platform } from './Platform';
import { AUDIO_PATHS, AUDIO_LIMITS, AUDIO_ASSETS } from '../config/audio';
interface Slot { audio: WechatMinigame.InnerAudioContext; busy: boolean; broken:boolean; remaining: number; ended: () => void; error: () => void }
export class AudioManager {
  private started = false;
  private disposed = false;
  private unlocked = false;
  private slots: Slot[] = [];
  private music: Slot | null = null;
  private boiling: Slot | null = null;
  private reasons = new Set<string>();
  private failed = new Set<string>();
  private musicEnabled = true;
  private soundEnabled = true;
  private boilingWanted = false;
  get instanceCount(): number { return [...this.slots,this.music,this.boiling].filter(slot=>slot&&!slot.broken).length; }
  constructor(private platform: Pick<Platform, 'createAudio'>) {}
  init(): void {
    if (this.started || this.disposed) return;
    this.started = true;
    this.music = this.create(); this.boiling = this.create();
    for (let i = 0; i < AUDIO_LIMITS.effects; i++) { const slot = this.create(); if (slot) this.slots.push(slot); }
  }
  unlock(): void { if (this.disposed) return; this.init(); this.unlocked = true; this.apply(); }
  configure(music: boolean, sound: boolean): void {
    this.musicEnabled = music; this.soundEnabled = sound;
    if (!sound) this.slots.forEach(slot => this.stop(slot));
    this.apply();
  }
  play(id: string): void {
    if (this.disposed || !this.soundEnabled || this.reasons.size || !this.unlocked || this.failed.has(AUDIO_PATHS.get(id) ?? '')) return;
    const slot = this.slots.find(item => !item.busy && !item.broken);
    if (!slot) return;
    const path = AUDIO_PATHS.get(id); if (!path) return;
    try {
      slot.audio.stop(); slot.audio.loop = false; slot.audio.volume = AUDIO_LIMITS.effectVolume;
      slot.audio.src = path; slot.busy = true;
      slot.remaining = (AUDIO_ASSETS.find(item => item.id === id)?.duration ?? 2) + 0.4;
      slot.audio.play();
    } catch { slot.error(); }
  }
  update(dt: number): void {
    if (this.reasons.size || this.disposed) return;
    for (const slot of this.slots) if (slot.busy) { slot.remaining -= dt; if (slot.remaining <= 0) this.stop(slot); }
  }
  setBoiling(wanted: boolean): void { this.boilingWanted = wanted; this.apply(); }
  pause(reason = 'background'): void {
    this.reasons.add(reason); this.slots.forEach(slot => this.stop(slot));
    this.safelyPause(this.music); this.safelyPause(this.boiling);
  }
  resume(reason = 'background'): void { this.reasons.delete(reason); this.apply(); }
  stopEffects(): void { this.slots.forEach(slot => this.stop(slot)); this.setBoiling(false); }
  dispose(): void {
    if (this.disposed) return; this.disposed = true;
    for (const slot of [...this.slots, this.music, this.boiling]) {
      if (!slot) continue;
      try { slot.audio.offEnded(slot.ended); slot.audio.offError(slot.error); slot.audio.destroy(); } catch { /* 已销毁的音频不再重建。 */ }
    }
    this.slots = []; this.music = null; this.boiling = null; this.reasons.clear();
  }
  private create(): Slot | null {
    let created: WechatMinigame.InnerAudioContext | null = null;
    try {
      const audio = this.platform.createAudio(); created = audio;
      const slot: Slot = { audio, busy:false, broken:false, remaining:0, ended:() => { slot.busy = false; },
        error:() => {
          if(slot.broken)return;slot.broken = true;slot.busy = false;
          try { if (audio.src) this.failed.add(audio.src); audio.destroy(); } catch { /* 失效句柄只处理一次，不再重试。 */ }
        } };
      audio.onEnded(slot.ended); audio.onError(slot.error); return slot;
    } catch {
      try { created?.destroy(); } catch { /* 创建中途失败的句柄不进入实例池。 */ }
      return null;
    }
  }
  private apply(): void {
    if (this.disposed || !this.unlocked) return;
    this.loop(this.music, 'bgm_game', this.musicEnabled && !this.reasons.size, AUDIO_LIMITS.musicVolume);
    this.loop(this.boiling, 'boiling', this.soundEnabled && this.boilingWanted && !this.reasons.size, AUDIO_LIMITS.boilingVolume);
  }
  private loop(slot: Slot | null, id: string, enabled: boolean, volume: number): void {
    if (!slot || slot.broken) return;
    const path = AUDIO_PATHS.get(id);
    if (!enabled || !path || this.failed.has(path)) { this.safelyPause(slot); return; }
    if (slot.busy) return;
    try { slot.audio.loop = true; slot.audio.volume = volume; if (slot.audio.src !== path) slot.audio.src = path;
      slot.audio.play(); slot.busy = true; } catch { slot.error(); }
  }
  private safelyPause(slot: Slot | null): void {
    if (!slot || slot.broken) return;
    try { slot.audio.pause(); } catch { slot.error(); } slot.busy = false;
  }
  private stop(slot: Slot): void { if(!slot.broken) {try { slot.audio.stop(); } catch { slot.error(); }} slot.busy = false; slot.remaining = 0; }
}
