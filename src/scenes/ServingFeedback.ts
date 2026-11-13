import type {Renderer} from '../core/Renderer';
import type {RoundSystem} from '../gameplay/RoundSystem';
import {TIMING} from '../config/timing';
import {oval} from './PotGeometry';
export class ServingFeedback {
  constructor(private r:Renderer) {}
  render(round:RoundSystem): void {
    const judgment=round.lastJudgment,age=round.time-round.lastJudgmentAt;
    if(!judgment || age<0 || age>=TIMING.feedbackSeconds) return;
    const r=this.r,c=r.ctx,x=1220,y=460;
    c.save();c.globalAlpha=Math.min(1,(TIMING.feedbackSeconds-age)/.25);
    // 托盘上方独立评价气泡，与该次冻结的价格一致，不挤进底部状态条。
    oval(c,x,y,193,97);c.fillStyle='#fff9e6';c.fill();c.strokeStyle='#e65c96';c.lineWidth=5;c.stroke();
    c.beginPath();c.moveTo(x-45,y+86);c.quadraticCurveTo(x-55,y+105,x-85,y+130);
    c.quadraticCurveTo(x-12,y+111,x+3,y+94);c.fill();c.stroke();
    for(let i=0;i<5;i++){const a=i*Math.PI*2/5;oval(c,x-153+Math.cos(a)*11,y-59+Math.sin(a)*11,8,8);c.fillStyle='#ff85b8';c.fill();}
    r.text(judgment.burnt?'哎呀，烧焦了！':judgment.label,x,y-25,28,'#a32152',320,{strokeWidth:0});
    if(judgment.burnt)r.text('清理好了，继续加油',x,y+28,25,'#8d3952',315,{strokeWidth:0});
    else {r.image('coin',{x:x-94,y:y+9,w:39,h:39});r.text(`+${judgment.price}`,x+28,y+30,34,'#c32461',225,{strokeWidth:0});}
    c.restore();
  }
}
