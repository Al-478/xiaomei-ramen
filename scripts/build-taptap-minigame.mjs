import { build } from 'esbuild';
import { mkdir, readFile, writeFile } from 'node:fs/promises';
import { createHash } from 'node:crypto';
import path from 'node:path';
import { checkAssets, root } from './check-assets.mjs';
import { createZip } from './lib/zip.mjs';

const version = '1.4.5';
const { manifest, layout } = await checkAssets();
const groups = JSON.parse(await readFile(path.join(root, 'assets/runtime-groups.json'), 'utf8'));
const audio = JSON.parse(await readFile(path.join(root, 'assets/audio-manifest.json'), 'utf8'));
const ids = new Set([...groups.menu, 'kitchen-wide', 'coin', ...layout.menu.map(item => item.id),
  ...layout.game.map(item => item.id), ...groups.cooking]);
const images = manifest.assets.filter(item => ids.has(item.id));
const result = await build({
  absWorkingDir: root, entryPoints: ['platforms/taptap-minigame/main.ts'], bundle: true, write: false,
  platform: 'neutral', format: 'iife', target: 'es2020', minify: true, legalComments: 'none',
  plugins: [{ name: '只包含运行资源', setup(builder) {
    builder.onLoad({ filter: /[\\/]assets[\\/]audio-manifest\.json$/ }, () => ({ loader: 'json',
      contents: JSON.stringify({ assets: audio.assets.map(({ id, path, duration }) => ({ id, path, duration })) }) }));
    builder.onLoad({ filter: /[\\/]assets[\\/]manifest\.json$/ }, () => ({ loader: 'json',
      contents: JSON.stringify({ assets: images.map(({ id, path, width, height }) => ({ id, path, width, height })) }) }));
  } }],
});
const files = new Map([
  ['game.js', Buffer.from(result.outputFiles[0].contents)],
  ['game.json', Buffer.from(JSON.stringify({ deviceOrientation: 'landscape', appId: '1052860',
    productName: '小美煮拉面', productVersion: version, iOSHighPerformance: true,
    isWasmSplitSupport: false }, null, 2) + '\n')],
  ['project.config.json', Buffer.from(JSON.stringify({ description: '小美煮拉面 TapTap 普通小游戏',
    appid: 'tapmcudnbohdxirt7w', projectname: 'xiaomei-ramen', compileType: 'game', libVersion: '2.4.0',
    setting: { es6: true, minified: true, uploadWithSourceMap: false }, packOptions: { ignore: [] } }, null, 2) + '\n')],
]);
for (const asset of [...images, ...audio.assets]) {
  if (!/^assets\/(images|audio)\/[a-z0-9/_-]+\.(png|jpg|mp3)$/.test(asset.path)) throw new Error('资源路径非法');
  files.set(asset.path, await readFile(path.join(root, asset.path)));
}
const bundle = files.get('game.js').toString();
if (/\bwx\.|\bdocument\b|\bwindow\b|__preview|wxe6851863490a7827/.test(bundle)) throw new Error('普通小游戏包混入其他平台依赖');
const output = path.join(root, 'dist-taptap-minigame');
for (const [name, content] of files) {
  await mkdir(path.dirname(path.join(output, name)), { recursive: true });
  await writeFile(path.join(output, name), content);
}
const zip = createZip(files);
const release = path.join(root, 'release/taptap-minigame');
await mkdir(release, { recursive: true });
const artifact = `xiaomei-ramen-taptap-minigame-${version}.zip`;
await writeFile(path.join(release, artifact), zip);
const hash = content => createHash('sha256').update(content).digest('hex');
await writeFile(path.join(release, 'build-report.json'), JSON.stringify({ name: '小美煮拉面', version,
  appId: 1052860, miniappId: 'tapmcudnbohdxirt7w', format: 'TapTap 普通小游戏候选包',
  entry: 'game.js', archiveRoot: '根目录直接包含game.js、game.json、project.config.json及assets',
  builtAt: new Date().toISOString(), artifact, zipBytes: zip.length, sha256: hash(zip), imageCount: images.length,
  packaging: '自定义TypeScript构建与标准ZIP打包，未运行Unity转换器，未伪造转换器版本',
  platformVerification: '未验证TapTap平台解析、普通小游戏包体上传权限及真机运行；未接入平台登录账号体系',
  files: [...files].map(([name, content]) => ({ path: name, bytes: content.length, sha256: hash(content) })),
}, null, 2) + '\n');
console.log(`普通小游戏候选包已生成：${artifact}，${files.size}个文件，${(zip.length / 1048576).toFixed(2)} MiB`);
