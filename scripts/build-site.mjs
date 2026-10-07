import {mkdir,readFile,writeFile,copyFile} from 'node:fs/promises';
import {createHash} from 'node:crypto';
import {dirname,posix} from 'node:path';
import {fileURLToPath} from 'node:url';
import {SONGS} from '../src/songs.js';

const root=fileURLToPath(new URL('../',import.meta.url)),out=root+'dist/';
const modules=new Map(),imports=/\bfrom\s*(['"])(\.\.?\/[^'"]+\.js)\1/g;
async function visit(path){
  if(!path.startsWith('src/')||path.includes('..'))throw new Error('Module escapes the game source: '+path);
  if(modules.has(path))return;
  const source=await readFile(root+path,'utf8');modules.set(path,source);
  for(const match of source.matchAll(imports))await visit(posix.normalize(posix.join(posix.dirname(path),match[2])));
}
await visit('src/web.js');
const html=await readFile(root+'index.html','utf8'),css=await readFile(root+'style.css','utf8');
const version=createHash('sha256').update(html).update(css).update([...modules].map(([p,s])=>p+s).join('\n')).digest('hex').slice(0,12);
await mkdir(out,{recursive:true});
await writeFile(out+'index.html',html.replace('href="style.css"','href="style.css?v='+version+'"').replace('src="src/web.js"','src="src/web.js?v='+version+'"'));
await writeFile(out+'style.css',css);
for(const [path,source]of modules){
  await mkdir(dirname(out+path),{recursive:true});
  await writeFile(out+path,source.replace(imports,(_,quote,path)=>'from '+quote+path+'?v='+version+quote));
}
// Only playable assets are published. Tests, raw render manifests and local caches stay out.
const assets=[...SONGS.map(s=>s.file),'assets/menu-theme.wav','assets/result-theme.wav','assets/snap.wav','assets/hit-hold.wav','assets/hit-drag.wav'];
await mkdir(out+'assets/',{recursive:true});
for(const path of assets)await copyFile(root+path,out+path);
await writeFile(out+'.nojekyll','');
await writeFile(out+'release.json',JSON.stringify({name:'Fold',version:JSON.parse(await readFile(root+'package.json','utf8')).version,build:version,songs:SONGS.length,charts:SONGS.length*4}));
console.log('Fold static build: '+modules.size+' modules, '+assets.length+' assets, '+version);
