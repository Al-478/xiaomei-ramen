import { build } from 'esbuild';
import { mkdir, copyFile, readFile, writeFile, rm, readdir, stat } from 'node:fs/promises';
import path from 'node:path';
import { checkAssets, root } from './check-assets.mjs';

const { manifest, layout } = await checkAssets();
const groups = JSON.parse(await readFile(path.join(root, 'assets/runtime-groups.json'), 'utf8'));
const audio = JSON.parse(await readFile(path.join(root,'assets/audio-manifest.json'),'utf8'));
const ids = new Set([...groups.menu, 'kitchen-wide', 'coin', ...layout.menu.map(item => item.id), ...layout.game.map(item => item.id), ...groups.cooking]);
const output = path.resolve(root, 'dist-wechat');
if (path.dirname(output) !== root || path.basename(output) !== 'dist-wechat') throw new Error('发布目录越界');
await mkdir(path.join(root, 'dist'), { recursive: true });
const result = await build({
  absWorkingDir: root, entryPoints: ['src/main.ts'], bundle: true, write: false,
  platform: 'neutral', format: 'iife', target: 'es2020', minify: true, legalComments: 'none',
  plugins: [{ name: '仅保留运行资源信息', setup(builder) {
    builder.onLoad({filter:/[\\/]assets[\\/]audio-manifest\.json$/},async () => ({loader:'json',
      contents:JSON.stringify({assets:audio.assets.map(({id,path,duration})=>({id,path,duration}))})}));
    builder.onLoad({ filter: /[\\/]assets[\\/]manifest\.json$/ }, async () => ({
      loader: 'json', contents: JSON.stringify({ assets: manifest.assets.filter(item => ids.has(item.id)).map(({ id, path, width, height }) =>
        ({ id, path, width, height })) }),
    }));
  } }],
});
const bundle = result.outputFiles[0].contents;
// 微信工具可能锁住项目根目录；保留目录，只更新运行文件和清理过期资源。
await mkdir(output, { recursive: true });
await writeFile(path.join(root, 'dist/main.js'), bundle);
await mkdir(path.join(output, 'dist'), { recursive: true });
await writeFile(path.join(output, 'dist/main.js'), bundle);
for (const name of ['game.js', 'game.json', 'project.config.json']) await copyFile(path.join(root, name), path.join(output, name));
const config = JSON.parse(await readFile(path.join(output, 'project.config.json'), 'utf8'));
config.packOptions = { ignore: [] };
await writeFile(path.join(output, 'project.config.json'), JSON.stringify(config, null, 2) + '\n');
for (const asset of manifest.assets.filter(item => ids.has(item.id))) {
  await mkdir(path.dirname(path.join(output, asset.path)), { recursive: true });
  await copyFile(path.join(root, asset.path), path.join(output, asset.path));
}
for (const asset of audio.assets) {
  await mkdir(path.dirname(path.join(output,asset.path)),{recursive:true});
  await copyFile(path.join(root,asset.path),path.join(output,asset.path));
}
const files = [];
const expected = new Set(['game.js', 'game.json', 'project.config.json', 'dist/main.js',
  ...manifest.assets.filter(item => ids.has(item.id)).map(item => item.path), ...audio.assets.map(item=>item.path)]);
async function walk(directory) {
  for (const entry of await readdir(directory, { withFileTypes: true })) {
    const file = path.join(directory, entry.name);
    if (entry.isDirectory()) await walk(file);
    else {
      const relative = path.relative(output, file).replaceAll('\\', '/');
      if (relative === 'project.private.config.json') continue;
      if (!expected.has(relative)) { await rm(file, { force: true }); continue; }
      files.push({ path: relative, bytes: (await stat(file)).size });
    }
  }
}
await walk(output);
const report = { version: JSON.parse(await readFile(path.join(root, 'package.json'), 'utf8')).version,
  scope: '正式运行包，工具与真机按实际验收记录', imageCount: ids.size,
  jsBytes: files.filter(item => item.path.endsWith('.js')).reduce((n, item) => n + item.bytes, 0),
  imageBytes: files.filter(item => /\.(png|jpg)$/.test(item.path)).reduce((n, item) => n + item.bytes, 0),
  audioBytes: files.filter(item=>item.path.endsWith('.mp3')).reduce((n,item)=>n+item.bytes,0),
  audioCount:audio.assets.length,fontBytes: 0, totalBytes: files.reduce((n, item) => n + item.bytes, 0),
  subpackages: [], files, largest20: [...files].sort((a, b) => b.bytes - a.bytes).slice(0, 20) };
await mkdir(path.join(root, 'release'), { recursive: true });
await writeFile(path.join(root, 'release/resource-report.json'), JSON.stringify(report, null, 2) + '\n');
console.log(`构建成功：dist-wechat，${ids.size}项图片，${(report.totalBytes / 1048576).toFixed(2)} MiB。`);
