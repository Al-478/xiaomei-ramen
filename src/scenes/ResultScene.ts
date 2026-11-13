import type { Renderer } from '../core/Renderer';
import type { RoundSystem } from '../gameplay/RoundSystem';
import { contains, type Point, type Scene } from '../core/types';
import { oval } from './PotGeometry';
export const RESULT_RETRY={x:440,y:925,w:265,h:82},RESULT_MENU={x:740,y:925,w:265,h:82};
export class ResultScene implements Scene {
  private elapsed=0;
  constructor(private r:Renderer,private result:RoundSystem,private best:number,
    private retry:()=>void,private menu:()=>void) {}
  update(dt:number):void {this.elapsed+=dt;}
  render():void {
    const r=this.r,c=r.ctx,win=this.result.state==='WON',clock=Math.floor(this.elapsed*10)/10;
    // 独立结算场景：失败为蓝色泡沫刷锅，成功为粉色庆祝；人物承担主视觉。
    r.sceneColor(win?'#ffd5e4':'#59bfd9');
    for(let i=0;i<65;i++){
      const x=-300+(i%13)*165,y=60+Math.floor(i/13)*190,rx=12+(i%4)*8;
      oval(c,x,y+Math.sin(clock*1.5+i)*5,rx,rx);c.fillStyle=win?'#fff5ce66':'#d9fbff55';c.fill();
    }
    if(!win){
      r.rotatedImage('kettle',{x:40,y:555,w:240,h:285},-.2);
      r.rotatedImage('pot-empty',{x:945,y:698,w:385,h:270},.2);
    }
    r.rotatedImage(win?'chef-win':'chef-lose',{x:255,y:210+Math.sin(clock*3)*5,w:670,h:680},Math.sin(clock*4)*.012);
    if(!win){
      for(let i=0;i<40;i++){
        const x=20+(i%20)*72,y=775+Math.floor(i/20)*60+Math.sin(i*3.7)*25;
        const rx=25+i%4*8;
        const foam=c.createRadialGradient(x-rx*.3,y-rx*.3,0,x,y,rx);
        foam.addColorStop(0,'#ffffff');foam.addColorStop(1,'#c8f4ff');
        oval(c,x,y,rx,rx*.9);c.fillStyle=foam;c.fill();c.strokeStyle='#87dcec';c.lineWidth=2;c.stroke();
      }
    } else for(let i=0;i<8;i++)r.rotatedImage('coin',{x:70+i*180,y:735+Math.sin(clock*2+i)*40,w:55,h:55},Math.sin(clock+i)*.15);
    r.panel({x:910,y:330,w:465,h:330});
    r.text(win?'目标达成！':'本局结束',724,120,62,win?'#b71960':'#344c93',1050,{strokeWidth:4});
    r.text(win?'小美的招牌拉面，今天大受欢迎！':'再练练火候，和小美一起刷锅吧！',724,190,30,win?'#a9275b':'#275785',1050,{strokeWidth:0});
    r.text(`获得 ${this.result.money} 金币`,1130,445,34,'#9e285b',405,{strokeWidth:0});
    r.text(`完成 ${this.result.completedBowls} 碗拉面`,1130,510,28,'#9e285b',395,{strokeWidth:0});
    r.text(`最好成绩 ${this.best}`,1130,550,25,'#9e285b',385,{strokeWidth:0});
    r.pill(RESULT_RETRY);r.text('再来一局',572,966,32);
    r.pill(RESULT_MENU);r.text('返回菜单',872,966,32);
  }
  tap(point:Point):void {if(contains(RESULT_RETRY,point))this.retry();else if(contains(RESULT_MENU,point))this.menu();}
  dispose():void {this.elapsed=0;}
}
