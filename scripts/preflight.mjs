import { spawnSync } from 'node:child_process';
import { readFile, readdir, writeFile, stat, mkdir } from 'node:fs/promises';
import { createHash } from 'node:crypto';
import path from 'node:path';
import { root } from './check-assets.mjs';

const steps=[];
function run(name,args) {
  console.log(`检查：${name}`);
  const result=spawnSync(process.execPath,args,{cwd:root,encoding:'utf8'});
  if(result.stdout)process.stdout.write(result.stdout);
  if(result.status!==0){if(result.stderr)process.stderr.write(result.stderr);throw new Error(`${name}未通过`);}
  steps.push({name,status:'PASS'});
}
try {
  run('类型检查',['node_modules/typescript/bin/tsc','--noEmit']);
  run('单元/集成/回归',['scripts/test.mjs']);
  run('源资源引用',['scripts/check-assets.mjs']);
  run('图片解码/透明边距',['scripts/art/check.mjs']);
  run('正式构建与资源报告',['scripts/build.mjs']);
  const report=JSON.parse(await readFile(path.join(root,'release/resource-report.json'),'utf8'));
  const project=JSON.parse(await readFile(path.join(root,'dist-wechat/project.config.json'),'utf8'));
  const orientation=JSON.parse(await readFile(path.join(root,'dist-wechat/game.json'),'utf8'));
  const pkg=JSON.parse(await readFile(path.join(root,'package.json'),'utf8'));
  const version=await readFile(path.join(root,'src/config/version.ts'),'utf8');
  if(project.compileType!=='game'||orientation.deviceOrientation!=='landscape'||!/^wx[a-z0-9]{16}$/.test(project.appid))throw Error('微信配置无效');
  if(!version.includes(`GAME_VERSION = '${pkg.version}'`)||!version.includes('DEV = false'))throw Error('版本或正式标志不一致');
  const bundle=await readFile(path.join(root,'dist-wechat/dist/main.js'),'utf8');
  for(const pattern of [
    /\bdocument\s*[.\[]/,/\bwindow\s*[.\[]/,/\blocalStorage\b/,/\bsessionStorage\b/,/\bHTMLAudioElement\b/,
    /\bfetch\s*\(/,/\bXMLHttpRequest\b/,/\bWebSocket\b/,/\bprocess\./,/\bchild_process\b/,
    /require\(["'](?:node:)?(?:fs|path|child_process)["']\)/,/https?:\/\//,/file:\/\//,/localhost|127\.0\.0\.1/,
    /art_sources\/|reference_analysis\/|\.mp4/,/__preview|__benchmark|__debug|DEV\s*=\s*true/,
    /\bwx\.(?:request|connectSocket|downloadFile|uploadFile)\s*\(/,
    /AppSecret|appsecret|-----BEGIN [A-Z ]*PRIVATE KEY-----/,/[A-Za-z]:\\/,
  ])if(pattern.test(bundle))throw Error(`正式运行包扫描未通过：${pattern}`);
  const references=[...new Set(bundle.match(/assets\/(?:images\/[a-z0-9/_-]+\.(?:png|jpg)|audio\/[a-z0-9_-]+\.mp3)/g)??[])];
  const expected=new Set(report.files.map(item=>item.path));
  for(const file of references)if(!expected.has(file))throw Error(`运行引用未打包：${file}`);
  const unused=report.files.filter(item=>/^assets\//.test(item.path)&&!references.includes(item.path));
  if(unused.length)throw Error(`发布资源未引用：${unused.map(item=>item.path).join(',')}`);
  const hashes=[];
  async function inspect(directory) {
    for(const item of await readdir(directory,{withFileTypes:true})){
      const file=path.join(directory,item.name),relative=path.relative(path.join(root,'dist-wechat'),file).replaceAll('\\','/');
      if(item.isDirectory())await inspect(file);
      else if(relative!=='project.private.config.json'){
        if(!expected.has(relative)||!/^([a-zA-Z0-9_.-]+\/)*[a-zA-Z0-9_.-]+$/.test(relative))throw Error(`发布目录存在额外文件或非法路径：${relative}`);
        const data=await readFile(file);hashes.push({path:relative,bytes:(await stat(file)).size,sha256:createHash('sha256').update(data).digest('hex')});
      }
    }
  }
  await inspect(path.join(root,'dist-wechat'));
  if(hashes.length!==report.files.length)throw Error('发布文件数量不一致');
  const expectedBytes=hashes.reduce((sum,item)=>sum+item.bytes,0);
  if(expectedBytes!==report.totalBytes)throw Error('包体报告过期');
  steps.push({name:'正式API/联网/秘密/DEV/版本/包体/无用资源',status:'PASS'});
  await mkdir(path.join(root,'release'),{recursive:true});
  await writeFile(path.join(root,'release/preflight-report.json'),JSON.stringify({date:new Date().toLocaleDateString('en-CA',{timeZone:'Asia/Shanghai'}),version:pkg.version,status:'PASS',steps,totalBytes:expectedBytes,hashes,
    scope:'自动发布前检查；微信工具、真机和后台事项以独立验收记录为准'},null,2)+'\n');
  await writeFile(path.join(root,'FINAL_FILE_TREE.txt'),['核心源码：src/','正式源资源：assets/','构建/审计工具：scripts/','测试：tests/','独立运行目录：dist-wechat/',...hashes.map(item=>'  '+item.path),'README.md','TEST_PLAN.md','WECHAT_ACCEPTANCE.md','RELEASE_CHECKLIST.md','FINAL_ACCEPTANCE.md'].join('\n')+'\n');
  console.log(`发布前检查PASS：${hashes.length}个文件，${(expectedBytes/1048576).toFixed(2)} MiB。`);
}catch(error){
  await mkdir(path.join(root,'release'),{recursive:true});
  await writeFile(path.join(root,'release/preflight-report.json'),JSON.stringify({status:'FAIL',steps,error:String(error)},null,2)+'\n');
  console.error(String(error));process.exitCode=1;
}
