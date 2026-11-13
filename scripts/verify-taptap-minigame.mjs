import assert from 'node:assert/strict';
import http from 'node:http';
import { readFile, mkdir, writeFile } from 'node:fs/promises';
import { createHash } from 'node:crypto';
import { inflateRawSync, crc32 } from 'node:zlib';
import path from 'node:path';
import { pathToFileURL } from 'node:url';

const root = process.cwd();
const release = path.join(root, 'release/taptap-minigame');
const report = JSON.parse(await readFile(path.join(release, 'build-report.json'), 'utf8'));
const zip = await readFile(path.join(release, report.artifact));
assert.equal(createHash('sha256').update(zip).digest('hex'), report.sha256);
const files = new Map();
let offset = 0;
while (zip.readUInt32LE(offset) === 0x04034b50) {
  const size = zip.readUInt32LE(offset + 18), length = zip.readUInt16LE(offset + 26);
  const name = zip.subarray(offset + 30, offset + 30 + length).toString();
  const start = offset + 30 + length + zip.readUInt16LE(offset + 28);
  const data = inflateRawSync(zip.subarray(start, start + size));
  assert.equal(crc32(data), zip.readUInt32LE(offset + 14));
  assert(!files.has(name) && !name.startsWith('/') && !name.split('/').includes('..'));
  files.set(name, data); offset = start + size;
}
assert.equal(files.size, report.files.length);
for (const file of report.files) assert.equal(createHash('sha256').update(files.get(file.path)).digest('hex'), file.sha256);
assert(files.has('game.js') && files.has('game.json') && files.has('project.config.json'));
assert(!files.has('index.html'));
assert.equal(JSON.parse(files.get('game.json')).deviceOrientation, 'landscape');
assert(!/\bwx\.|\bdocument\b|\bwindow\b|__preview/.test(files.get('game.js').toString()));
// 仅在测试服务器提供API模拟器；删除离屏新API以验证基础createCanvas回退路径。
let adapter = (await readFile('scripts/preview-adapter.js', 'utf8')).replace('window.wx = api;', 'window.tap = api; delete api.createOffscreenCanvas;');
const html = '<!doctype html><meta charset="utf-8"><link rel="icon" href="data:,"><style>html,body{margin:0;overflow:hidden}canvas{display:block;touch-action:none}</style><canvas id="game"></canvas><script src="/adapter.js"></script><script src="/game.js"></script>';
const server = http.createServer((req, res) => {
  const pathname = new URL(req.url, 'http://localhost').pathname;
  const content = pathname === '/' ? html : pathname === '/adapter.js' ? adapter : files.get(pathname.slice(1));
  if (!content) { res.writeHead(404).end(); return; }
  const ext = path.extname(pathname);
  res.setHeader('Content-Type', pathname === '/' ? 'text/html; charset=utf-8' : ({'.js':'text/javascript; charset=utf-8','.png':'image/png','.jpg':'image/jpeg','.mp3':'audio/mpeg'})[ext] ?? 'application/octet-stream');
  res.end(content);
});
await new Promise(resolve => server.listen(0, '127.0.0.1', resolve));
process.env.RAMEN_PREVIEW_PORT = String(server.address().port);
await mkdir('.preview/taptap-minigame', {recursive:true});
let test = await readFile('scripts/verify-gameplay.mjs', 'utf8');
test = test.replaceAll('previews/phase4', 'previews/taptap-minigame');
test = test.replace('release/resource-report.json', 'release/taptap-minigame/build-report.json');
test = test.replace('Chrome通过开发适配器运行同一微信bundle', '从普通小游戏ZIP取出game.js与全部资源，在Chrome使用仅含tap API的模拟器运行；未验证TapTap真机');
test = test.replace("assert.equal(await page.evaluate(() => window.__preview.imagePaths.length), 5);", "assert.equal(await page.evaluate(() => window.__preview.imagePaths.length), 5); assert.equal(await page.evaluate(() => typeof window.wx), 'undefined');");
const testPath = path.join(root, '.preview/taptap-minigame/gameplay.mjs');
await writeFile(testPath, test);
try {
  await import(pathToFileURL(testPath).href);
  const gameplay = JSON.parse(await readFile('previews/taptap-minigame/browser-check.json', 'utf8'));
  await writeFile(path.join(release, 'verification.json'), JSON.stringify({status:'PASS', artifact:report.artifact,
    sha256:report.sha256, checkedAt:new Date().toISOString(), scope:'发布ZIP完整性与tap API模拟环境的真实93秒玩法回归',
    checks:['ZIP条目CRC与SHA256通过；根目录三项入口正确；不包含H5入口、微信运行时、测试模拟器和源码映射', ...gameplay.checks],
    platformVerified:false, remaining:['TapTap普通小游戏包体权限及平台解析','TapTap Android/iOS真机验证','按平台要求处理登录与资质']},null,2)+'\n');
} finally { server.closeAllConnections(); await new Promise(resolve => server.close(resolve)); }
