import { readFile, writeFile } from 'node:fs/promises';
import { deflateRawSync } from 'node:zlib';
import { createHash } from 'node:crypto';
import path from 'node:path';
import { root } from './check-assets.mjs';
const report=JSON.parse(await readFile(path.join(root,'release/preflight-report.json'),'utf8'));
if(report.status!=='PASS')throw Error('发布前检查未通过，不能打包');
function crc32(data){let crc=0xffffffff;for(const byte of data){crc^=byte;for(let bit=0;bit<8;bit++)crc=(crc>>>1)^((crc&1)?0xedb88320:0);}return (crc^0xffffffff)>>>0;}
const local=[],central=[];let offset=0;
for(const file of report.hashes){
  const content=await readFile(path.join(root,'dist-wechat',file.path));
  if(createHash('sha256').update(content).digest('hex')!==file.sha256)throw Error(`发布包文件在检查后变动：${file.path}`);
  const name=Buffer.from(file.path),compressed=deflateRawSync(content),crc=crc32(content);
  const header=Buffer.alloc(30);header.writeUInt32LE(0x04034b50);header.writeUInt16LE(20,4);header.writeUInt16LE(8,8);
  header.writeUInt16LE(0x5d47,12);header.writeUInt32LE(crc,14);header.writeUInt32LE(compressed.length,18);header.writeUInt32LE(content.length,22);header.writeUInt16LE(name.length,26);
  local.push(header,name,compressed);
  const directory=Buffer.alloc(46);directory.writeUInt32LE(0x02014b50);directory.writeUInt16LE(20,4);directory.writeUInt16LE(20,6);directory.writeUInt16LE(8,10);directory.writeUInt16LE(0x5d47,14);
  directory.writeUInt32LE(crc,16);directory.writeUInt32LE(compressed.length,20);directory.writeUInt32LE(content.length,24);directory.writeUInt16LE(name.length,28);directory.writeUInt32LE(offset,42);
  central.push(directory,name);offset+=header.length+name.length+compressed.length;
}
const directory=Buffer.concat(central),end=Buffer.alloc(22);end.writeUInt32LE(0x06054b50);end.writeUInt16LE(report.hashes.length,8);end.writeUInt16LE(report.hashes.length,10);end.writeUInt32LE(directory.length,12);end.writeUInt32LE(offset,16);
const zip=Buffer.concat([...local,directory,end]),name=`release/genki-ramen-shop-${report.version}.zip`;
await writeFile(path.join(root,name),zip);await writeFile(path.join(root,'release/package-checksum.txt'),`${createHash('sha256').update(zip).digest('hex')}  ${name}\n`);
console.log(`已打包：${name}，${(zip.length/1048576).toFixed(2)} MiB，不包含本机私有配置。`);
