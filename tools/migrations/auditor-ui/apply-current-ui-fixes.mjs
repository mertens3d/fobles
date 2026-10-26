import fs from "node:fs/promises";
import path from "node:path";
import { fileURLToPath } from "node:url";
const root=path.resolve(path.dirname(fileURLToPath(import.meta.url)),"../../..");
const changed=[];
async function walk(dir){const out=[];for(const e of await fs.readdir(dir,{withFileTypes:true})){if(["node_modules",".git","dist","build"].includes(e.name))continue;const p=path.join(dir,e.name);if(e.isDirectory())out.push(...await walk(p));else out.push(p);}return out;}
const files=await walk(path.join(root,"src"));
// cleanup dialog: locate exact implementation by function name and add class; fail closed
const errorFile=path.join(root,"src/shared/error-dialog.ts");let errorSource=await fs.readFile(errorFile,"utf8");
if(!errorSource.includes('fobles-cleanup-wait-dialog')){
 const start=errorSource.indexOf('export function showFoblesCleanupDialog'); if(start<0) throw new Error('showFoblesCleanupDialog not found');
 const end=errorSource.indexOf('\n}',start); if(end<0) throw new Error('showFoblesCleanupDialog end not found');
 let block=errorSource.slice(start,end+2);
 if(block.includes('const dialog =')) block=block.replace(/(const dialog\s*=[^;]+;)/, '$1\n  dialog.classList.add("fobles-cleanup-wait-dialog");');
 else if(block.includes('showFoblesErrorDialog(')) block=block.replace(/return\s+(showFoblesErrorDialog\([\s\S]*?\));/, 'const dialog = $1;\n  dialog.classList.add("fobles-cleanup-wait-dialog");\n  return dialog;');
 else throw new Error('showFoblesCleanupDialog current shape not recognized');
 errorSource=errorSource.slice(0,start)+block+errorSource.slice(end+2);await fs.writeFile(errorFile,errorSource);changed.push('src/shared/error-dialog.ts');
}
// trigger: locate exact auditor-trigger
for(const file of files.filter(f=>/\.(ts|tsx)$/.test(f))){let s=await fs.readFile(file,'utf8');if(!s.includes('auditor-trigger'))continue;const o=s;s=s.replace(/(["'`])🔍︎?\1/g,'$1$1');if(s!==o){await fs.writeFile(file,s);changed.push(path.relative(root,file).replaceAll(path.sep,'/'));}}
console.log(JSON.stringify({status:'applied',changed},null,2));
