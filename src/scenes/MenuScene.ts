import { LAYOUT } from '../config/assets';
import { contains, rect, type Point, type Scene } from '../core/types';
import type { Renderer } from '../core/Renderer';
import type { SaveManager } from '../core/SaveManager';
import type { AudioManager } from '../core/AudioManager';
import { SettingsDialog } from '../ui/SettingsDialog';

export class MenuScene implements Scene {
  private settings: SettingsDialog | null;
  constructor(private renderer: Renderer, private start: () => void, private help?: () => void,
    private save?: SaveManager, audio?: AudioManager) { this.settings = save && audio ? new SettingsDialog(save,audio) : null; }
  render(): void {
    const r = this.renderer;
    r.background('menu-wide');
    r.beginScene();
    LAYOUT.menu.forEach(item => r.image(item.id, item));
    r.text('准备好了吗？', 815, 443, 49, '#e50077', 430);
    r.text('和小美一起', 815, 517, 42, '#9e084a', 430);
    r.text('开火煮面！', 815, 574, 46, '#9e084a', 430);
    r.text(`最好成绩 ${this.save?.data.bestScore ?? 0}`,815,682,25);
    r.endScene();
    r.pill({x:850,y:1007,w:230,h:60}); r.text('声音设置',965,1037,27);
    r.pill({x:1110,y:1007,w:230,h:60}); r.text('玩法说明',1225,1037,27);
    this.settings?.render(r);
  }
  tap(point: Point): void {
    if (this.settings?.open) { this.settings.tap(point); return; }
    if (contains({x:850,y:1007,w:230,h:60},point)) this.settings?.show();
    else if (contains({x:1110,y:1007,w:230,h:60},point)) this.help?.();
    else if (contains(rect(LAYOUT.input.start), this.renderer.scenePoint(point))) this.start();
  }
  dispose(): void { this.settings?.dispose(); }
}
