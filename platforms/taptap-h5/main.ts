import { Game } from '../../src/core/Game';
import { BrowserPlatform } from './BrowserPlatform';

const canvas = document.getElementById('game');
if (!(canvas instanceof HTMLCanvasElement)) throw new Error('找不到游戏画布');
const platform = new BrowserPlatform(canvas);
const game = new Game(platform);
game.start();
window.addEventListener('pagehide', event => {
  // 返回缓存中的页面仍可恢复，真正离开时释放音频和监听。
  if (!event.persisted) { game.dispose(); platform.dispose(); }
});
