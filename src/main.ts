import { Game } from './core/Game';
import { WechatPlatform } from './core/Platform';

const game = new Game(new WechatPlatform());
game.start();
