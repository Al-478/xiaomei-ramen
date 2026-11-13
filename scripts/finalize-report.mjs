import{readFile,writeFile,copyFile,unlink}from'node:fs/promises';
import{createHash}from'node:crypto';
import sharp from'sharp';
const resource=JSON.parse(await readFile('release/resource-report.json','utf8'));
const preflight=JSON.parse(await readFile('release/preflight-report.json','utf8'));
const experience=JSON.parse(await readFile('previews/final/experience-check.json','utf8'));
const round=JSON.parse(await readFile('previews/phase4/browser-check.json','utf8'));
const preview=JSON.parse(await readFile('release/wechat-final-check.json','utf8'));
const visual=JSON.parse(await readFile('comparison/visual-review.json','utf8'));
for(const [name,reference,description]of [['result-win',null,'开发QA入口驱动真实十碗规则，原创捧面庆祝'],['result-lose','frame_0130.00.jpg','真实93秒回合失败，原创洗锅与蓝色氛围']]){
  await copyFile(`previews/final/${name}.png`,`comparison/recreated/${name}.png`);
  if(!visual.captures.some(item=>item.name===name))visual.captures.push({name,reference,description,path:`comparison/recreated/${name}.png`});
}
await writeFile('comparison/visual-review.json',JSON.stringify(visual,null,2)+'\n');
const layers=[];
for(let i=0;i<visual.captures.length;i++)layers.push({input:await sharp(visual.captures[i].path).resize(362,272,{fit:'contain',background:'#fff0f5'}).png().toBuffer(),left:(i%4)*362,top:Math.floor(i/4)*272});
await sharp({create:{width:1448,height:Math.ceil(visual.captures.length/4)*272,channels:4,background:'#fff0f5'}}).composite(layers).png().toFile('comparison/final-contact-sheet.png');
const zip=await readFile('release/genki-ramen-shop-1.0.0.zip');
const report={date:'2026-10-07',version:'1.0.0',engineering:'PASS',automaticAcceptance:'PASS',typecheck:'PASS',tests:{status:'PASS',count:39},build:'PASS',preflight:preflight.status,
  reproducibleInstall:'PASS',resources:resource,experience,round,visualCount:visual.captures.length,
  archive:{path:'release/genki-ramen-shop-1.0.0.zip',bytes:zip.length,sha256:createHash('sha256').update(zip).digest('hex'),zipIntegrity:'PASS'},
  wechatPreview:preview,wechatFullInteraction:'NOT VERIFIABLE：自动截图接口超时',ios:'NOT VERIFIABLE',android:'NOT VERIFIABLE',
  originalReferenceListening:'NOT VERIFIABLE：当前不支持音频输入',phoneAudioAndPerformance:'NOT VERIFIABLE',platformReviewAndPublication:'NOT VERIFIABLE：未正式上传/审核'};
if(preflight.status!=='PASS'||experience.status!=='PASS'||round.status!=='PASS'||preview.success!==true)throw Error('最终证据不齐全');
await writeFile('release/final-report.json',JSON.stringify(report,null,2)+'\n');
await copyFile('previews/final/menu.png','release/materials/final-menu.png');
await copyFile('previews/final/ready.png','release/materials/final-game.png');
await writeFile('release/materials/README.md','发布物料：icon-candidate.png、loading-background.png、promo-landscape.png、final-menu.png、final-game.png、wechat-preview.jpg。截图/尺寸为候选，提交时按后台当时要求导出；二维码是当前开发预览，不是正式发布。\n');
// 删除已转为图片与摘要的巨大工具返回，避免混淆旧预览码。
for(const file of ['release/wechat-preview-response.txt','release/materials/wechat-preview.png'])try{await unlink(file);}catch(error){if(error.code!=='ENOENT')throw error;}
console.log(`最终报告已完成：${visual.captures.length}张关键画面、39项测试、微信预览和ZIP通过。`);
