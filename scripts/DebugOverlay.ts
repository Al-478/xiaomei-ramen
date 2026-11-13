import type {Game} from '../src/core/Game';
// 仅由开发入口按DEV开关接入；正式main.ts不导入此模块。
export function attachDebugOverlay(game:Game):void {
  const original=game.scenes.render.bind(game.scenes);
  game.scenes.render=()=>{
    original();const r=game.renderer,c=r.ctx;
    c.save();c.fillStyle='#222b40dd';c.fillRect(820,30,595,335);
    const point=game.lastInput,stats=game.statistics;
    const lines=['开发统计',`帧率 ${game.loop.metrics.averageFps.toFixed(1)} 帧请求 ${stats.raf} 监听 ${stats.listeners} 音频 ${stats.audio} 特效 ${stats.effects}`,
      `触摸 ${point?`${point.x.toFixed(0)}, ${point.y.toFixed(0)}`:'无'}`,...game.scenes.diagnostics];
    lines.forEach((line,i)=>r.text(line,1110,50+i*27,20,'#ffffff',570,{strokeWidth:0}));c.restore();
  };
}
