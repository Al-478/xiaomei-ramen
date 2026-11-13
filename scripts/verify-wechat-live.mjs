import {spawn} from 'node:child_process';
import {mkdir,writeFile} from 'node:fs/promises';
import path from 'node:path';
import {WechatLiveClient} from './wechat-live-client.mjs';
import {Viewport} from '../.test-build/core.mjs';
const project=path.resolve('dist-wechat'),out='previews/desktop/live';await mkdir(out,{recursive:true});
const client=new WechatLiveClient(),records=[],pending=new Map();let id=0,buffer='';
const capture=spawn('pwsh',['-NoProfile','-File','scripts/wechat-capture-service.ps1'],{windowsHide:true,stdio:['pipe','pipe','pipe']});
const ready=new Promise((resolve,reject)=>{
 capture.on('error',reject);capture.stderr.on('data',d=>reject(Error(String(d))));
 capture.stdout.on('data',chunk=>{buffer+=String(chunk);let end;
  while((end=buffer.indexOf('\n'))>=0){const line=buffer.slice(0,end).trim();buffer=buffer.slice(end+1);if(!line)continue;
   const r=JSON.parse(line);if(r.ready)resolve(r);else {const p=pending.get(r.id);pending.delete(r.id);r.ok?p.resolve(r):p.reject(Error(r.error));}
  }
 });
});
const shot=async name=>{const seq=++id;await new Promise((resolve,reject)=>{pending.set(seq,{resolve,reject});capture.stdin.write(JSON.stringify({id:seq,action:'capture',file:`${out}/${name}.png`})+'\n');});records.push({capture:name});};
const sleep=ms=>new Promise(r=>setTimeout(r,ms));
try{
 await ready;await client.init();await client.call('simulator_refresh',{project});await sleep(500);
 const info=(await client.call('automation_evaluate',{project,action:'evaluate',fnSource:'function(){return wx.getWindowInfo();}'})).result;
 const v=new Viewport();v.resize({width:info.windowWidth,height:info.windowHeight,dpr:info.pixelRatio,safeArea:info.safeArea});
 const point=(x,y)=>({x:v.offsetX+x*v.scale,y:v.offsetY+y*v.scale});
 const action=async args=>{const at=performance.now();await client.call('automation_game_action',{project,...args});records.push({action:args,milliseconds:Math.round(performance.now()-at)});};
 const tap=async(x,y)=>action({action:'tap',...point(x,y)});
 const drag=async(from,to)=>{const a=point(...from),b=point(...to);await action({action:'swipe',startX:a.x,startY:a.y,endX:b.x,endY:b.y,duration:120});};
 await shot('menu');await tap(1100,800);await sleep(700);await shot('initial');
 // 输入只走工具注册的画布触摸，截图来自真实桌面；不读取或改变锅、时间、金币对象。
 for(const [kind,from] of [['egg',[410,275]],['seasoning',[180,165]],['scallion',[410,165]],['noodles',[180,275]]]){
  const a=point(...from),b=point(250,375);
  await action({action:'touchstart',...a});await action({action:'touchmove',...b});await shot(`${kind}-held`);
  await action({action:'touchend',...b});
 }
 await drag([180,275],[240,480]);await shot('dry-noodles');
 await drag([180,165],[240,480]);await shot('seasoning-settled');
 // 此轮特意检验“提前葱蛋”的降价，不为工具延迟放宽游戏火候。
 await drag([410,165],[240,480]);await shot('scallion-added');
 await drag([410,275],[240,480]);await sleep(250);await shot('egg-added');
 await drag([880,750],[240,480]);await sleep(300);await shot('water');
 await sleep(3500);await shot('cooking-complete');
 await drag([240,480],[1200,680]);await sleep(750);await shot('score');
 await tap(322,982);await shot('paused');
 await writeFile(`${out}/record.json`,JSON.stringify({version:'1.3.0',scope:'实际微信小游戏工具：已授权Codex会话的标准画布触摸；真实Windows窗口截图；自然计时，没有模型/金额/计时注入。此轮提前放葱蛋，售价应降低，实际金额以截图为准。',status:'CAPTURED_REQUIRES_VISUAL_REVIEW',window:info,records},null,2));
 console.log('已完成微信窗口中四种材料拿起、逐次入锅、加水和出餐，已保存桌面截图。');
}finally{await client.close();capture.stdin.write(JSON.stringify({action:'close'})+'\n');capture.stdin.end();}
