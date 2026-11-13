import { Game } from '../../src/core/Game';
import { TapTapPlatform } from './TapTapPlatform';

const game = new Game(new TapTapPlatform());
game.start();
