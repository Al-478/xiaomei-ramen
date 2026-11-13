import manifest from '../../assets/audio-manifest.json';
export const AUDIO_ASSETS = manifest.assets;
export const AUDIO_PATHS = new Map(AUDIO_ASSETS.map(item => [item.id, item.path]));
export const AUDIO_LIMITS = { effects:6, musicVolume:0.25, effectVolume:0.5, boilingVolume:0.12 } as const;
