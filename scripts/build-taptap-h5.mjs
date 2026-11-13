import { build } from 'esbuild';
import { mkdir, readFile, writeFile } from 'node:fs/promises';
import { createHash } from 'node:crypto';
import path from 'node:path';
import { checkAssets, root } from './check-assets.mjs';
import { createZip } from './lib/zip.mjs';

const { manifest, layout } = await checkAssets();
const groups = JSON.parse(await readFile(path.join(root, 'assets/runtime-groups.json'), 'utf8'));
const audio = JSON.parse(await readFile(path.join(root, 'assets/audio-manifest.json'), 'utf8'));
const { version } = JSON.parse(await readFile(path.join(root, 'package.json'), 'utf8'));
const ids = new Set([...groups.menu, 'kitchen-wide', 'coin', ...layout.menu.map(item => item.id),
  ...layout.game.map(item => item.id), ...groups.cooking]);
const images = manifest.assets.filter(item => ids.has(item.id));
const output = path.resolve(root, 'dist-taptap-h5');
if (path.dirname(output) !== root || path.basename(output) !== 'dist-taptap-h5') throw new Error('H5输出目录越界');
const result = await build({
  absWorkingDir: root, entryPoints: ['platforms/taptap-h5/main.ts'], bundle: true, write: false,
  platform: 'browser', format: 'iife', target: 'es2020', minify: true, legalComments: 'none',
  plugins: [{ name: '仅保留运行资源信息', setup(builder) {
    builder.onLoad({ filter: /[\\/]assets[\\/]audio-manifest\.json$/ }, () => ({ loader: 'json',
      contents: JSON.stringify({ assets: audio.assets.map(({ id, path, duration }) => ({ id, path, duration })) }) }));
    builder.onLoad({ filter: /[\\/]assets[\\/]manifest\.json$/ }, () => ({ loader: 'json',
      contents: JSON.stringify({ assets: images.map(({ id, path, width, height }) => ({ id, path, width, height })) }) }));
  } }],
});
const files = new Map([
  ['index.html', await readFile(path.join(root, 'platforms/taptap-h5/index.html'))],
  ['game.js', Buffer.from(result.outputFiles[0].contents)],
]);
for (const asset of [...images, ...audio.assets]) {
  if (!/^assets\/(images|audio)\/[a-z0-9/_-]+\.(png|jpg|mp3)$/.test(asset.path)) throw new Error('资源路径非法');
  files.set(asset.path, await readFile(path.join(root, asset.path)));
}
for (const [file, content] of files) {
  await mkdir(path.dirname(path.join(output, file)), { recursive: true });
  await writeFile(path.join(output, file), content);
}
const archiveDirectory = 'xiaomei-ramen';
const zip = createZip(new Map([...files].map(([file, content]) => [`${archiveDirectory}/${file}`, content])));
const artifact = `xiaomei-ramen-taptap-h5-${version}.zip`;
const release = path.join(root, 'release/taptap');
await mkdir(release, { recursive: true });
await writeFile(path.join(release, artifact), zip);
const hash = content => createHash('sha256').update(content).digest('hex');
await writeFile(path.join(release, 'h5-build-report.json'), JSON.stringify({
  name: '小美煮拉面', appId: 1052860, version, format: 'TapTap H5 小游戏', orientation: 'landscape',
  entry: 'index.html', archiveDirectory, archiveEntry: `${archiveDirectory}/index.html`,
  archiveRoot: '压缩包解压后仅有一个文件夹，其中包含index.html、game.js及assets',
  builtAt: new Date().toISOString(), artifact, zipBytes: zip.length, sha256: hash(zip),
  imageCount: images.length, audioCount: audio.assets.length,
  totalBytes: [...files.values()].reduce((sum, data) => sum + data.length, 0),
  files: [...files].map(([file, data]) => ({ path: file, bytes: data.length, sha256: hash(data) })),
  platformVerification: '待上传平台解析并进行TapTap Android/iOS真机自测；本地构建不等于通过平台审核',
}, null, 2) + '\n');
await writeFile(path.join(release, 'h5-sha256.txt'), `${hash(zip)}  ${artifact}\n`);
console.log(`TapTap H5包已生成：release/taptap/${artifact}，${files.size}个文件，${(zip.length / 1048576).toFixed(2)} MiB。`);
