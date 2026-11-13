import sharp from 'sharp';
import { readFile, readdir, stat, writeFile } from 'node:fs/promises';
import { createHash } from 'node:crypto';
import path from 'node:path';
import { fileURLToPath } from 'node:url';

const root=path.resolve(path.dirname(fileURLToPath(import.meta.url)),'../..');
const manifest=JSON.parse(await readFile(path.join(root,'assets/manifest.json'),'utf8'));
const ids=new Set(),paths=new Set(),errors=[],report=[];
for(const item of manifest.assets) {
  if(ids.has(item.id)||paths.has(item.path)) errors.push(`重复素材：${item.id}`);
  ids.add(item.id);paths.add(item.path);
  if(!/^assets\/images\/[a-z0-9/-]+\.(png|jpg)$/.test(item.path)) errors.push(`路径不合规范：${item.path}`);
  try {
    // 逐层核对磁盘大小写，避免仅在 Windows 上可用。
    let parent=root;
    for(const part of item.path.split('/')) {
      if(!(await readdir(parent)).includes(part)) throw new Error(`大小写或文件缺失：${part}`);
      parent=path.join(parent,part);
    }
    const file=path.join(root,item.path),meta=await sharp(file).metadata();
    if(meta.width!==item.width||meta.height!==item.height) errors.push(`尺寸不符：${item.id}`);
    if(item.alpha&&!meta.hasAlpha) errors.push(`缺少透明通道：${item.id}`);
    const {data,info}=await sharp(file).ensureAlpha().raw().toBuffer({resolveWithObject:true});
    let visible=0,transparent=0,border=0;
    for(let y=0;y<info.height;y++) for(let x=0;x<info.width;x++) {
      const alpha=data[(y*info.width+x)*4+3];
      if(alpha>0)visible++; else transparent++;
      if(item.alpha&&(x<10||y<10||x>=info.width-10||y>=info.height-10)&&alpha>0)border++;
    }
    if(!visible)errors.push(`全透明素材：${item.id}`);
    if(item.alpha&&(!transparent||border))errors.push(`透明边距不通过：${item.id}`);
    if(!item.alpha&&(info.width!==(item.id.endsWith('-wide')?2400:1448)||info.height!==1086))errors.push(`背景比例错误：${item.id}`);
    report.push({id:item.id,path:item.path,bytes:(await stat(file)).size,
      width:meta.width,height:meta.height,transparentPixels:transparent,borderViolations:border,
      sha256:createHash('sha256').update(await readFile(file)).digest('hex')});
  }catch(error){errors.push(`${item.id}：${error.message}`);}
}
async function files(directory){
  const result=[];
  for(const entry of await readdir(directory,{withFileTypes:true})) {
    const full=path.join(directory,entry.name);
    if(entry.isDirectory())result.push(...await files(full));else result.push(path.relative(root,full).replaceAll('\\','/'));
  }
  return result;
}
for(const file of await files(path.join(root,'assets/images')))if(!paths.has(file))errors.push(`无清单素材：${file}`);
for(const id of ['egg-whole','egg-cracking','egg-falling','egg-poached','logo','menu','kitchen'])
  if(!ids.has(id))errors.push(`必要素材缺失：${id}`);
if(ids.has('egg-half')||ids.has('meat')||ids.has('seaweed')||ids.has('fish-cake'))errors.push('残留旧食材');
if(manifest.targetAmount!==100000||manifest.standardBowlPrice!==10000)errors.push('金额未按最新要求配置');
const output={date:'2026-10-07',status:errors.length?'FAIL':'PASS',assetCount:report.length,
  totalBytes:report.reduce((sum,item)=>sum+item.bytes,0),errors,assets:report,
  scope:'阶段二素材文件、路径、解码、尺寸和透明边距检查；不是微信或游戏运行验收'};
await writeFile(path.join(root,'art_sources/asset-check-report.json'),JSON.stringify(output,null,2)+'\n');
console.log(`素材检查 ${output.status}：${output.assetCount} 项，${(output.totalBytes/1024/1024).toFixed(2)} MiB。`);
if(errors.length){console.error(errors.join('\n'));process.exitCode=1;}
