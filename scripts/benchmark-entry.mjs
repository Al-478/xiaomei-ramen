// 仅开发测量入口；不进入微信运行包，也不提供游戏快进或金币修改。
import { Game } from '../src/core/Game.ts';
import { WechatPlatform } from '../src/core/Platform.ts';
import {DEV} from '../src/config/version.ts';
import {attachDebugOverlay} from './DebugOverlay.ts';
const game=new Game(new WechatPlatform());
if(DEV)attachDebugOverlay(game);
globalThis.__benchmarkGame=game;
game.start();
