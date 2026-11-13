import {readFile,writeFile} from 'node:fs/promises';
const version=process.argv[2];
if(!/^\d+\.\d+\.\d+$/.test(version??''))throw new Error('需要明确的版本号');
for(const name of ['package.json','package-lock.json']){
 const data=JSON.parse(await readFile(name,'utf8'));data.version=version;
 if(data.packages)data.packages[''].version=version;
 await writeFile(name,JSON.stringify(data,null,2)+'\n');
}
await writeFile('src/config/version.ts',`export const GAME_VERSION = '${version}';\nexport const DEV = false;\n`);
