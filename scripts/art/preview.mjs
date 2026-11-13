import sharp from 'sharp';
import { readFile, writeFile, mkdir } from 'node:fs/promises';
import path from 'node:path';
import { fileURLToPath } from 'node:url';

const root = path.resolve(path.dirname(fileURLToPath(import.meta.url)), '../..');
const manifest = JSON.parse(await readFile(path.join(root,'assets/manifest.json'),'utf8'));
const assets = new Map(manifest.assets.map(item => [item.id,item]));
const layout = JSON.parse(await readFile(path.join(root, 'assets/scene-layout.json'), 'utf8'));

function svgText(lines, width=1448,height=1086) {
  const body = lines.map(({text,x,y,size=34,color='#9e084a',anchor='middle',stroke='#fff8dd',sw=4}) =>
    `<text x="${x}" y="${y}" text-anchor="${anchor}" font-size="${size}" fill="${color}" stroke="${stroke}" stroke-width="${sw}" paint-order="stroke" font-family="Microsoft YaHei,SimHei,sans-serif" font-weight="bold">${text}</text>`).join('');
  return Buffer.from(`<svg xmlns="http://www.w3.org/2000/svg" width="${width}" height="${height}">${body}</svg>`);
}
async function layer(item) {
  const asset = assets.get(item.id);
  if (!asset) throw new Error(`缺少素材：${item.id}`);
  return { input:await sharp(path.join(root,asset.path)).resize(item.w,item.h,
    {fit:'contain',background:'#00000000'}).png().toBuffer(),left:Math.round(item.x),top:Math.round(item.y) };
}
async function scene(name, gameplay=false, cracking=false, seasoning=false) {
  const list = structuredClone(layout[name]);
  if (gameplay) {
    list.find(item=>item.pot===0).id='pot-ready';
    list.find(item=>item.pot===1).id='pot-burnt';
    list.find(item=>item.pot===2).id='pot-water';
    list.find(item=>item.pot===3).id='pot-noodles';
    list.push({id:'ready-badge',x:170,y:345,w:168,h:93},
      {id:'smoke',x:530,y:332,w:99,h:140},
      {id:'warning-badge',x:641,y:355,w:99,h:90});
  }
  if (cracking) {
    list.find(item=>item.pot===0).id='pot-noodles';
    list.push({id:'egg-cracking',x:174,y:337,w:128,h:168});
  }
  if(seasoning) {
    list.find(item=>item.pot===0).id='pot-noodles';
    list.find(item=>item.pot===1).id='pot-seasoned';
    list.push({id:'seasoning-falling',x:556,y:386,w:92,h:82});
  }
  const overlays=[];
  for (const item of list) overlays.push(await layer(item));
  if(name==='menu') overlays.push({ input:svgText([
    {text:'准备好了吗？',x:815,y:443,size:49,color:'#e50077'},
    {text:'和小美一起',x:815,y:517,size:42},
    {text:'开火煮面！',x:815,y:574,size:46}
  ]),left:0,top:0 });
  if(name==='game') {
    overlays.push(await layer({id:'coin',x:1290,y:956,w:40,h:40}));
    const value=gameplay?'30000':'0';
    overlays.push({input:Buffer.from(`<svg xmlns="http://www.w3.org/2000/svg" width="1448" height="1086"><rect x="716" y="173" width="${gameplay?296:444}" height="25" rx="12" fill="#ffe329"/></svg>`),left:0,top:0});
    overlays.push({input:svgText([
      {text:'金额',x:1390,y:174,size:30,color:'#fff7e3',sw:0},
      {text:value,x:1390,y:268,size:64,color:'#ffffff',sw:0},
      {text:'目标 100000',x:1350,y:329,size:27,color:'#fff4c9',sw:0},
      {text:gameplay?'剩余 62 秒':'时间 93 秒',x:938,y:190,size:27,color:'#840440',sw:0},
      {text:'备用锅',x:674,y:316,size:29,color:'#fff0d6',sw:0},
      {text:'招牌鸡蛋拉面',x:1260,y:921,size:30,color:'#a50036',sw:0},
      {text:'10000',x:1377,y:983,size:30,color:'#a50036',sw:0},
      {text:'每碗',x:1348,y:1020,size:22,color:'#a50036',sw:0}
    ]),left:0,top:0});
    if(seasoning)overlays.push({input:svgText([
      {text:'加辣前',x:250,y:385,size:27},
      {text:'加辣后',x:587,y:385,size:27}
    ]),left:0,top:0});
  }
  const relative=`previews/phase2-${name}${gameplay?'-cooking':''}${cracking?'-egg-cracking':''}${seasoning?'-seasoning':''}.png`;
  const background=assets.get(name==='game'?'kitchen':'menu').path;
  await sharp(path.join(root,background)).composite(overlays).png({compressionLevel:9}).toFile(path.join(root,relative));
  return relative;
}
await mkdir(path.join(root,'previews'),{recursive:true});
await writeFile(path.join(root,'assets/scene-layout.json'),JSON.stringify(layout,null,2)+'\n');
const files=[await scene('menu'),await scene('game'),await scene('game',true),
  await scene('game',false,true),await scene('game',false,false,true)];

// 图标和加载图使用正式素材导出，不下载或安装外部字体。
await sharp(path.join(root,assets.get('icon').path)).resize(512,512,{fit:'contain',background:'#fff0f5'})
  .png().toFile(path.join(root,'release/materials/icon-candidate.png'));
await sharp(path.join(root,files[0])).resize(1200,900).png()
  .toFile(path.join(root,'release/materials/promo-landscape.png'));
await sharp(path.join(root,assets.get('menu').path)).composite([await layer({id:'logo',x:390,y:17,w:755,h:185})])
  .png().toFile(path.join(root,'release/materials/loading-background.png'));

// 拼图只作为检查用，不进入正式游戏资源清单。
const columns=6,tileW=220,tileH=180;
const rows=Math.ceil(manifest.assets.length/columns);
const gallery=[];
for(let index=0;index<manifest.assets.length;index++) {
  const item=manifest.assets[index];
  const image=await sharp(path.join(root,item.path)).resize(200,138,{fit:'contain',background:'#fff6ee'}).png().toBuffer();
  const left=(index%columns)*tileW+10,top=Math.floor(index/columns)*tileH+8;
  gallery.push({input:image,left,top});
  const caption=svgText([{text:item.id,x:110,y:170,size:15,color:'#821e4a',sw:0}],tileW,tileH);
  gallery.push({input:caption,left:(index%columns)*tileW,top:Math.floor(index/columns)*tileH});
}
await sharp({create:{width:columns*tileW,height:rows*tileH,channels:4,background:'#f9d8e7'}})
  .composite(gallery).png().toFile(path.join(root,'previews/phase2-asset-gallery.png'));
console.log('已输出菜单、游戏初始状态、烹饪状态、敲蛋状态和素材总览。');
