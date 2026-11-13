import sharp from 'sharp';
import { mkdir, writeFile } from 'node:fs/promises';
import path from 'node:path';
import { fileURLToPath } from 'node:url';

// 仅裁切用户授权素材及生成图集，保留原图；不承担生成式美术编辑。
const root = path.resolve(path.dirname(fileURLToPath(import.meta.url)), '../..');
const entries = [];
async function cut(source, name, rect, group, size) {
  let pipeline = sharp(path.join(root, source)).extract({
    left: rect[0], top: rect[1], width: rect[2], height: rect[3]
  });
  let input = await pipeline.png().toBuffer();
  if(name==='ramen-bowl') {
    // 邻格葱花偶有进入矩形裁切范围，以连通轮廓提取完整碗，保留主图像素。
    const {data,info}=await sharp(input).ensureAlpha().raw().toBuffer({resolveWithObject:true});
    const labels=new Int32Array(info.width*info.height),queue=new Int32Array(labels.length);
    const counts=[0];let component=0;
    for(let index=0;index<labels.length;index++) {
      if(labels[index]||data[index*4+3]<32)continue;
      component++;let head=0,tail=1;queue[0]=index;labels[index]=component;
      while(head<tail) {
        const point=queue[head++],x=point%info.width,y=Math.floor(point/info.width);
        for(let dy=-1;dy<=1;dy++)for(let dx=-1;dx<=1;dx++) {
          const nx=x+dx,ny=y+dy;
          if(nx<0||ny<0||nx>=info.width||ny>=info.height)continue;
          const next=ny*info.width+nx;
          if(!labels[next]&&data[next*4+3]>=32){labels[next]=component;queue[tail++]=next;}
        }
      }
      counts.push(tail);
    }
    const minimum=Math.max(...counts)*0.02;
    for(let index=0;index<labels.length;index++)if(labels[index]&&counts[labels[index]]<minimum)data[index*4+3]=0;
    input=await sharp(data,{raw:info}).png().toBuffer();
  }
  const { data, info } = await sharp(input).ensureAlpha().raw().toBuffer({ resolveWithObject: true });
  let minX = info.width, minY = info.height, maxX = -1, maxY = -1;
  for (let y = 0; y < info.height; y++) for (let x = 0; x < info.width; x++) {
    if (data[(y * info.width + x) * 4 + 3] >= 32) {
      minX = Math.min(minX, x); minY = Math.min(minY, y);
      maxX = Math.max(maxX, x); maxY = Math.max(maxY, y);
    }
  }
  if (maxX < 0) throw new Error(`素材为空：${name}`);
  const margin = 3;
  const left = Math.max(0, minX - margin), top = Math.max(0, minY - margin);
  pipeline = sharp(input).extract({ left, top,
    width: Math.min(info.width - left, maxX - left + margin + 1),
    height: Math.min(info.height - top, maxY - top + margin + 1) });
  if (size) pipeline = pipeline.resize(size[0], size[1], { fit: name === 'logo' ? 'inside' : 'contain', background: '#00000000' });
  const relative = `assets/images/${group}/${name}.png`;
  await mkdir(path.dirname(path.join(root, relative)), { recursive: true });
  await pipeline.extend({ top: 12, bottom: 12, left: 12, right: 12, background: '#00000000' })
    .png({ compressionLevel: 9, palette:true, colours:256, dither:0.5, effort:10 })
    .toFile(path.join(root, relative));
  const metadata = await sharp(path.join(root, relative)).metadata();
  entries.push({ id: name, path: relative, width: metadata.width, height: metadata.height,
    alpha: true, source, sourceRect: rect, padding: 12, sourceType: '内置图片生成工具，用户授权图片派生' });
}

const objects = 'art_sources/objects-atlas-v2.png';
const names = [
  ['pot-empty','cookware'],['pot-water','cookware'],['pot-noodles','cookware'],null,
  ['pot-burnt','cookware'],['kettle','cookware'],null,['burner','cookware'],
  null,null,null,null,
  ['steam','effects'],['smoke','effects'],['bubbles','effects'],['coin','ui']
];
for (let index = 0; index < names.length; index++) {
  if (!names[index]) continue;
  const col = index % 4, row = Math.floor(index / 4);
  const x = Math.floor(col * 1254 / 4), y = Math.floor(row * 1254 / 4);
  const w = Math.floor((col + 1) * 1254 / 4) - x, h = Math.floor((row + 1) * 1254 / 4) - y;
  const cropCorrections = {
    kettle:[319,320,291,308], burner:[955,388,290,218], 'noodle-block':[325,674,304,240]
  };
  await cut(objects, names[index][0], cropCorrections[names[index][0]] ?? [x,y,w,h], names[index][1],
    names[index][0].startsWith('pot-') ? [360,250] : undefined);
}

const ui = 'art_sources/ui-atlas-v2.png';
for(const id of ['chef-win','chef-lose']){
  const source=`art_sources/${id}.png`,metadata=await sharp(path.join(root,source)).metadata();
  await cut(source,id,[0,0,metadata.width,metadata.height],'character',[420,420]);
}
const traySource = 'art_sources/tray-empty-v4.png';
const trayMeta = await sharp(path.join(root, traySource)).metadata();
await cut(traySource, 'tray', [0,0,trayMeta.width,trayMeta.height], 'cookware', [488,276]);
for (const [name, rect, group] of [
  ['start-button',[733,62,521,269],'ui'],
  ['speech-panel',[8,336,626,351],'ui'],
  ['dialog-panel',[638,346,616,350],'ui'],
  ['chef',[36,689,583,560],'character'],
  ['icon',[684,720,507,511],'ui']
]) await cut(ui, name, rect, group);
const wideLogo = await sharp(path.join(root,'art_sources/logo-xiaomei.png')).metadata();
await cut('art_sources/logo-xiaomei.png', 'logo', [0,0,wideLogo.width,wideLogo.height], 'ui', [1804,383]);

// 新鸡蛋素材替代图集中旧切蛋；正式清单不导出旧切蛋和旧成品锅。
const eggs = 'art_sources/egg-atlas.png';
for (const [name, rect, group] of [
  ['egg-cracking',[548,45,459,467],'effects'],
  ['egg-falling',[1054,50,482,461],'effects'],
  ['egg-poached',[10,526,465,431],'ingredients'],
]) await cut(eggs, name, rect, group, name === 'pot-ready' ? [360,250] : undefined);

const overlays = 'art_sources/overlays-atlas.png';
for (const [name, rect, group] of [
  ['water-surface',[30,50,476,280],'cookware'],
  ['noodle-surface',[521,49,502,281],'cookware'],
  ['ready-badge',[518,343,526,344],'ui'],
  ['warning-badge',[1071,354,457,325],'ui'],
  ['heart',[38,706,460,301],'ui'],
  ['selection-ring',[518,710,516,297],'effects'],
  ['pour-stream',[1090,682,441,342],'effects']
]) await cut(overlays, name, rect, group);

// 横向陈列素材让四种食材铺满格子；葱使用细长葱叶和细碎斜切葱花。
const ingredients='art_sources/ingredients-atlas-v3.png';
for(const [name,rect,group] of [
  ['seasoning',[0,55,559,259],'ingredients'],
  ['noodle-block',[560,65,465,246],'ingredients'],
  ['scallion-bunch',[1027,52,509,266],'ingredients'],
  ['egg-whole',[20,370,553,271],'ingredients'],
  ['scallion-rings',[578,374,482,273],'ingredients'],
  ['ramen-bowl',[1030,334,495,340],'ui'],
  ['pot-ready',[0,642,683,371],'cookware'],
  ['scallion-falling',[684,673,395,332],'effects'],
  ['seasoning-falling',[1097,687,439,323],'effects']
]) await cut(ingredients,name,rect,group,name==='pot-ready'?[360,250]:undefined);
const seasonedMetadata=await sharp(path.join(root,'art_sources/pot-seasoned.png')).metadata();
await cut('art_sources/pot-seasoned.png','pot-seasoned',
  [0,0,seasonedMetadata.width,seasonedMetadata.height],'cookware',[360,250]);

for(const [id,source,group,size] of [
  ['noodle-strands','art_sources/noodle-strands-v2.png','cookware',[512,210]],
  ['oven-mitt','art_sources/oven-mitt-v1.png','effects',[170,160]],
  ['egg-single','art_sources/egg-single-v1.png','ingredients',[70,94]],
  ['seasoning-single','art_sources/seasoning-single-v1.png','ingredients',[84,100]],
  ['egg-shells','art_sources/egg-shells-v1.png','effects',[160,85]],
]) {
  const m=await sharp(path.join(root,source)).metadata();
  await cut(source,id,[0,0,m.width,m.height],group,size);
}

for (const id of ['kitchen','menu']) {
  const relative=`assets/images/background/${id}.jpg`;
  const source = `art_sources/${id}-wide-v4.png`;
  const wide = await sharp(path.join(root,source)).resize(2400,1086,{fit:'cover'}).png().toBuffer();
  const wideRelative = `assets/images/background/${id}-wide.jpg`;
  await sharp(wide).jpeg({quality:91,mozjpeg:true}).toFile(path.join(root,wideRelative));
  entries.push({ id:`${id}-wide`, path:wideRelative, width:2400, height:1086, alpha:false, source,
    sourceType:'内置图片生成工具，宽屏延展' });
  await sharp(wide).extract({left:476,top:0,width:1448,height:1086})
    .jpeg({quality:93,mozjpeg:true}).toFile(path.join(root,relative));
  const m = await sharp(path.join(root, relative)).metadata();
  entries.push({ id, path: relative, width:m.width, height:m.height, alpha:false, source,
    sourceType:'内置图片生成工具，用户授权图片派生' });
}
await writeFile(path.join(root,'assets/manifest.json'), JSON.stringify({
  version:1, logicalWidth:1448, logicalHeight:1086,
  targetAmount:100000, standardBowlPrice:10000,
  eggStyle:'敲开生蛋入汤，凝固成荷包蛋', assets:entries
}, null, 2) + '\n');
console.log(`已导出 ${entries.length} 个独立素材及清单。`);
