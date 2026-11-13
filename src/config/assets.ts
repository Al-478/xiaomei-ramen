import manifest from '../../assets/manifest.json';
import layout from '../../assets/scene-layout.json';
import groups from '../../assets/runtime-groups.json';

export interface AssetSpec { id: string; path: string; width: number; height: number }
export const ASSETS: readonly AssetSpec[] = manifest.assets;
export const LAYOUT = layout;
export const MENU_ASSETS = groups.menu;
export const GAME_ASSETS = [...new Set(['kitchen-wide', 'coin', ...layout.game.map(item => item.id), ...groups.cooking])];
