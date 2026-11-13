import { GAME_ASSETS, MENU_ASSETS } from '../config/assets';
import { AssetManager } from './AssetManager';
import { InputManager } from './InputManager';
import { GameLoop } from './GameLoop';
import { Renderer } from './Renderer';
import { SceneManager } from './SceneManager';
import { Viewport } from './Viewport';
import type { Platform } from './Platform';
import { BootScene } from '../scenes/BootScene';
import { MenuScene } from '../scenes/MenuScene';
import { GameScene } from '../scenes/GameScene';
import { TutorialScene } from '../scenes/TutorialScene';
import { ResultScene } from '../scenes/ResultScene';
import { AudioManager } from './AudioManager';
import { SaveManager } from './SaveManager';
import type { RoundSystem } from '../gameplay/RoundSystem';
import type {Point} from './types';

export class Game {
  lastInput:Point|null=null;
  private started = false;
  private disposed = false;
  private hidden = false;
  private fatal = false;
  private cleanup: (() => void)[] = [];
  readonly assets: AssetManager;
  readonly viewport = new Viewport();
  readonly scenes = new SceneManager();
  readonly renderer: Renderer;
  readonly input: InputManager;
  readonly loop: GameLoop;
  readonly audio: AudioManager;
  readonly save: SaveManager;
  get statistics(): { raf:number; listeners:number; audio:number; effects:number; scenes:number; images:number } {
    return {raf:this.loop.requestCount,listeners:this.input.listenerCount+this.cleanup.length,
      audio:this.audio.instanceCount,effects:this.scenes.effectCount,scenes:this.scenes.count,images:this.assets.cachedCount};
  }

  constructor(private platform: Platform) {
    this.save = new SaveManager(platform); this.audio = new AudioManager(platform);
    this.audio.configure(this.save.data.musicEnabled,this.save.data.soundEnabled);
    this.assets = new AssetManager(platform);
    this.renderer = new Renderer(platform, this.viewport, this.assets);
    this.input = new InputManager(platform, this.viewport, point => {
      this.lastInput=point;
      try { this.audio.unlock(); this.audio.play('click'); this.scenes.tap(point); } catch (error) { this.fail(error); }
    }, (phase, point) => {
      if(point)this.lastInput=point;
      try { if (phase === 'start') this.audio.unlock(); this.scenes.gesture(phase,point); } catch (error) { this.fail(error); }
    });
    this.loop = new GameLoop(platform, dt => {
      try { if (!this.fatal) this.scenes.update(dt); this.audio.update(dt); this.render(); } catch (error) { this.fail(error); }
    });
  }
  start(): void {
    if (this.started || this.disposed) return;
    this.started = true;
    this.renderer.resize(); this.input.bind();
    this.cleanup = [
      this.platform.onResize(this.resize), this.platform.onHide(this.hide), this.platform.onShow(this.show),
    ];
    this.load(MENU_ASSETS, this.menu);
    this.loop.start();
  }
  dispose(): void {
    if (this.disposed) return;
    this.disposed = true;
    this.loop.stop(); this.input.dispose(); this.scenes.dispose(); this.assets.dispose();
    this.audio.dispose();
    this.renderer.dispose();
    this.cleanup.forEach(off => off()); this.cleanup = [];
  }
  private load(ids: readonly string[], complete: () => void, back?: () => void): void {
    this.input.reset();
    const boot = new BootScene(this.renderer, this.assets, ids, complete, back);
    this.scenes.change(boot);
    void boot.begin();
  }
  private menu = (): void => {
    if (this.disposed) return;
    this.input.reset();
    this.audio.stopEffects();
    this.scenes.change(new MenuScene(this.renderer, () => this.load(GAME_ASSETS, () => {
      if (this.save.data.tutorialCompleted) this.play(); else this.tutorial();
    }, this.menu), () => this.load(GAME_ASSETS,this.tutorial,this.menu), this.save, this.audio));
  };
  private tutorial = (): void => {
    this.scenes.change(new TutorialScene(this.renderer,() => {
      this.save.update({tutorialCompleted:true}); this.play();
    },this.menu));
  };
  private play = (): void => {
    this.audio.stopEffects(); this.input.reset();
    this.scenes.change(new GameScene(this.renderer,this.menu,{audio:this.audio,save:this.save,finish:this.finish}));
  };
  private finish = (round: RoundSystem): void => {
    this.save.recordScore(round.money);
    this.scenes.change(new ResultScene(this.renderer,round,this.save.data.bestScore,this.play,this.menu));
    this.audio.play(round.state === 'WON' ? 'win' : 'lose');
  };
  private resize = (): void => { this.input.reset(); this.renderer.resize(); };
  private hide = (): void => { this.hidden = true; this.input.setEnabled(false); this.loop.stop(); this.audio.pause(); };
  private show = (): void => {
    if (this.disposed) return;
    this.hidden = false; this.resize();
    this.input.setEnabled(!this.fatal); this.audio.resume(); this.loop.start();
  };
  private render(): void {
    if (this.hidden || this.disposed) return;
    try {
      this.renderer.begin();
      if (this.fatal) {
        this.renderer.panel({ x: 294, y: 350, w: 860, h: 350 });
        this.renderer.text('厨房暂时无法继续', 724, 465, 48);
        this.renderer.text('请重新启动小游戏', 724, 565, 36);
      } else this.scenes.render();
    } catch (error) { this.fail(error); }
  }
  private fail(error: unknown): void {
    console.error('游戏运行失败', error);
    this.fatal = true; this.input.setEnabled(false); this.audio.pause('fatal');
  }
}
