import { mkdir, writeFile, stat } from 'node:fs/promises';
import { spawnSync } from 'node:child_process';

// 原创乐谱与合成器；不读取录屏音频。此工具仅供开发期重新制作音频。
const RATE = 44100, BPM = 112, step = 60 / BPM / 2;
await mkdir('art_sources/audio', { recursive: true });
await mkdir('assets/audio', { recursive: true });
let seed = 1729;
const random = () => { seed = (seed * 1664525 + 1013904223) >>> 0; return seed / 4294967296 * 2 - 1; };
const frequency = note => 440 * 2 ** ((note - 69) / 12);
const wave = seconds => new Float64Array(Math.ceil(seconds * RATE));
function tone(buffer, start, note, seconds, gain, kind = 'bell') {
  const f = frequency(note), from = Math.round(start * RATE), length = Math.round(seconds * RATE);
  for (let i = 0; i < length && from + i < buffer.length; i++) {
    const t = i / RATE, envelope = Math.min(1, t / 0.008) * Math.min(1, (seconds - t) / 0.035) * Math.exp(-t * (kind === 'bass' ? 4 : 7));
    const fundamental = Math.sin(2 * Math.PI * f * t);
    const harmonic = kind === 'bell' ? 0.3 * Math.sin(2 * Math.PI * f * 2 * t) + 0.1 * Math.sin(2 * Math.PI * f * 3 * t) : 0.2 * Math.sin(2 * Math.PI * f * 2 * t);
    buffer[from + i] += gain * envelope * (fundamental + harmonic);
  }
}
function noise(buffer, start, seconds, gain, pitch = 0) {
  const from = Math.round(start * RATE);
  for (let i = 0; i < seconds * RATE && from + i < buffer.length; i++) {
    const t = i / RATE, envelope = Math.min(1, t / 0.01) * Math.min(1, (seconds - t) / 0.04);
    buffer[from + i] += gain * envelope * (random() * 0.65 + (pitch ? Math.sin(2 * Math.PI * pitch * t) * 0.35 : 0));
  }
}
function wav(samples) {
  const peak = Math.max(0.001, samples.reduce((m, n) => Math.max(m, Math.abs(n)), 0));
  const gain = peak > 0.78 ? 0.78 / peak : 1;
  const bytes = Buffer.alloc(44 + samples.length * 2);
  bytes.write('RIFF'); bytes.writeUInt32LE(bytes.length - 8, 4); bytes.write('WAVE', 8); bytes.write('fmt ', 12);
  bytes.writeUInt32LE(16, 16); bytes.writeUInt16LE(1, 20); bytes.writeUInt16LE(1, 22);
  bytes.writeUInt32LE(RATE, 24); bytes.writeUInt32LE(RATE * 2, 28); bytes.writeUInt16LE(2, 32); bytes.writeUInt16LE(16, 34);
  bytes.write('data', 36); bytes.writeUInt32LE(samples.length * 2, 40);
  samples.forEach((sample, i) => bytes.writeInt16LE(Math.round(Math.max(-1, Math.min(1, sample * gain)) * 32767), 44 + i * 2));
  return bytes;
}
const melody = [72,76,79,76,74,77,81,79, 76,79,84,81,79,76,74,72,
  77,81,84,81,79,77,76,74, 76,79,83,79,77,74,72,71,
  72,79,76,84,81,79,76,74, 77,81,79,84,81,77,76,74,
  79,83,86,83,81,79,77,74, 76,79,84,79,76,74,72,72];
const bass = [48,48,53,55,57,53,55,48];
const bgm = wave(step * melody.length);
melody.forEach((note, i) => tone(bgm, i * step, note, step * 0.9, 0.22));
for (let i = 0; i < melody.length; i++) {
  if (i % 2 === 0) tone(bgm, i * step, bass[Math.floor(i / 8)], step * 1.5, 0.18, 'bass');
  noise(bgm, i * step, 0.045, i % 2 ? 0.014 : 0.009, 6000);
  if (i % 4 === 0) tone(bgm, i * step, 31, 0.11, 0.12, 'bass');
}
const tracks = new Map([['bgm_game', bgm]]);
for (const [name, notes, length] of [
  ['click',[84],0.14],['ingredient_drop',[67,72],0.28],['cooking_done',[76,79,84],0.65],
  ['warning',[81,77],0.5],['coin',[88,91],0.34],['win',[72,76,79,84,88],1.5],
  ['lose',[72,69,65,60],1.5],['burnt',[60,55,48],0.8],['egg_crack',[91,79],0.22],
]) {
  const samples = wave(length); notes.forEach((note, i) => tone(samples, i * length / (notes.length + 1), note, Math.min(0.35, length), 0.2));
  if (name === 'egg_crack') noise(samples, 0, 0.06, 0.11);
  tracks.set(name, samples);
}
const pour = wave(0.85); noise(pour, 0, 0.85, 0.11, 350); tracks.set('pour_water', pour);
const boiling = wave(1.6);
for (let i = 0; i < 16; i++) tone(boiling, i * 0.1, 47 + i % 5, 0.1, 0.05, 'bass');
noise(boiling, 0, 1.6, 0.022); tracks.set('boiling', boiling);
const assets = [];
for (const [id, samples] of tracks) {
  const input = `art_sources/audio/${id}.wav`, output = `assets/audio/${id}.mp3`;
  await writeFile(input, wav(samples));
  // 音频技能列出的操作不含普通PCM转MP3，按其回退规则使用本机FFmpeg。
  const result = spawnSync('ffmpeg', ['-hide_banner','-loglevel','error','-y','-i',input,'-ac','1','-ar','44100','-c:a','libmp3lame','-b:a',id === 'bgm_game' ? '96k' : '64k',output], { encoding:'utf8' });
  if (result.status !== 0) throw new Error(`音频导出失败：${id} ${result.stderr}`);
  const probe = spawnSync('ffprobe',['-v','error','-show_streams','-show_format','-of','json',output],{encoding:'utf8'});
  if (probe.status !== 0) throw new Error(`音频检查失败：${id}`);
  const metadata = JSON.parse(probe.stdout), stream = metadata.streams[0];
  if (stream.codec_name !== 'mp3' || stream.channels !== 1 || stream.sample_rate !== '44100') throw new Error(`音频格式错误：${id}`);
  assets.push({id,path:output,duration:Number(metadata.format.duration),bytes:(await stat(output)).size,source:input,original:true});
}
await writeFile('assets/audio-manifest.json',JSON.stringify({bpm:BPM,style:'原创轻快铃音、低音与轻打击乐',assets},null,2)+'\n');
await writeFile('art_sources/audio-score.json',JSON.stringify({bpm:BPM,stepSeconds:step,melody,bass,seed:1729,author:'项目原创程序合成，无录屏音频'},null,2)+'\n');
console.log(`已生成并FFprobe验证${assets.length}项原创MP3音频。`);
