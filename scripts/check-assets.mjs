import { readdir, readFile, stat } from 'node:fs/promises';
import path from 'node:path';
import { fileURLToPath } from 'node:url';

export const root = path.resolve(path.dirname(fileURLToPath(import.meta.url)), '..');
export async function checkAssets() {
  const manifest = JSON.parse(await readFile(path.join(root, 'assets/manifest.json'), 'utf8'));
  const layout = JSON.parse(await readFile(path.join(root, 'assets/scene-layout.json'), 'utf8'));
  const ids = new Set();
  for (const asset of manifest.assets) {
    if (ids.has(asset.id)) throw new Error(`素材标识重复：${asset.id}`);
    ids.add(asset.id);
    if (!/^assets\/images\/[a-z0-9/_-]+\.(png|jpg)$/.test(asset.path)) {
      throw new Error(`资源路径必须为项目内英文相对路径：${asset.path}`);
    }
    let directory = root;
    for (const part of asset.path.split('/')) {
      if (!(await readdir(directory)).includes(part)) throw new Error(`资源缺失或大小写错误：${asset.path}`);
      directory = path.join(directory, part);
    }
    if (!(await stat(directory)).isFile()) throw new Error(`资源不是文件：${asset.path}`);
  }
  for (const layer of [...layout.menu, ...layout.game]) {
    if (!ids.has(layer.id)) throw new Error(`场景引用未知素材：${layer.id}`);
  }
  for (const id of ['menu', 'kitchen']) {
    if (!ids.has(id)) throw new Error(`基础场景资源缺失：${id}`);
  }
  const groups = JSON.parse(await readFile(path.join(root, 'assets/runtime-groups.json'), 'utf8'));
  for (const id of [...groups.menu, ...groups.cooking]) {
    if (!ids.has(id)) throw new Error(`运行资源组引用未知素材：${id}`);
  }
  const audio = JSON.parse(await readFile(path.join(root,'assets/audio-manifest.json'),'utf8'));
  for (const asset of audio.assets) {
    if (!/^assets\/audio\/[a-z0-9_-]+\.mp3$/.test(asset.path)) throw new Error(`音频路径不合法：${asset.path}`);
    let directory = root;
    for (const part of asset.path.split('/')) {
      if (!(await readdir(directory)).includes(part)) throw new Error(`音频缺失或大小写错误：${asset.path}`);
      directory = path.join(directory,part);
    }
    if (!(asset.duration > 0) || (await stat(directory)).size < 100) throw new Error(`音频内容无效：${asset.id}`);
  }
  return { manifest, layout };
}
if (process.argv[1] && path.resolve(process.argv[1]) === fileURLToPath(import.meta.url)) {
  const { manifest } = await checkAssets();
  console.log(`资源引用与路径检查通过：${manifest.assets.length}项。`);
}
