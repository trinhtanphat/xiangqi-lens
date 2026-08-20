import { readdir } from 'node:fs/promises';
import { extname, join, relative } from 'node:path';
import { fileURLToPath } from 'node:url';

const PROHIBITED=new Set(['.nnue','.onnx','.pt','.pth','.ckpt','.safetensors']);
const SKIP=new Set(['.git','node_modules','dist','.worktrees','worktrees']);

export async function findProhibited(root){
  const found=[];
  async function walk(dir){
    for(const entry of await readdir(dir,{withFileTypes:true})){
      if(SKIP.has(entry.name))continue;
      const full=join(dir,entry.name);
      if(entry.isDirectory()) await walk(full);
      else if(PROHIBITED.has(extname(entry.name).toLowerCase())) found.push(relative(root,full));
    }
  }
  await walk(root); return found.sort();
}

const isMain=process.argv[1]&&fileURLToPath(import.meta.url)===process.argv[1];
if(isMain){
  const root=process.cwd(); const found=await findProhibited(root);
  if(found.length){console.error('Commercial license guard blocked bundled model/weight files:\n'+found.map(x=>` - ${x}`).join('\n'));process.exit(1);}
  console.log('license-guard: OK (no unapproved bundled model/weight files)');
}
