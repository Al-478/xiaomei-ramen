import type { Renderer } from '../core/Renderer';
import type { SaveManager } from '../core/SaveManager';
import type { AudioManager } from '../core/AudioManager';
import { contains, type Point } from '../core/types';
const MUSIC = {x:470,y:400,w:510,h:78}, SOUND = {x:470,y:500,w:510,h:78};
const CLOSE = {x:550,y:690,w:350,h:82};
export class SettingsDialog {
  open = false;
  constructor(private save: SaveManager, private audio: AudioManager) {}
  show(): void { this.open = true; this.audio.pause('dialog'); }
  close(): void { this.open = false; this.audio.resume('dialog'); }
  render(r: Renderer, title = '声音设置'): void {
    if (!this.open) return;
    r.dim();
    r.panel({x:280,y:225,w:900,h:680});
    r.text(title,724,335,43);
    r.pill(MUSIC); r.text(`音乐：${this.save.data.musicEnabled ? '开启' : '关闭'}`,725,439,32);
    r.pill(SOUND); r.text(`音效：${this.save.data.soundEnabled ? '开启' : '关闭'}`,725,539,32);
    r.text(this.save.writable ? '轻触按钮切换，设置会自动保存' : '设置保留在本次游戏，暂时无法写入存档',724,625,23);
    r.pill(CLOSE); r.text(title === '游戏已暂停' ? '继续煮面' : '返回',725,731,32);
  }
  tap(point: Point): void {
    if (!this.open) return;
    if (contains(MUSIC,point)) this.save.update({musicEnabled:!this.save.data.musicEnabled});
    else if (contains(SOUND,point)) this.save.update({soundEnabled:!this.save.data.soundEnabled});
    else if (contains(CLOSE,point)) this.close();
    this.audio.configure(this.save.data.musicEnabled,this.save.data.soundEnabled);
  }
  dispose(): void { if (this.open) this.close(); }
}
