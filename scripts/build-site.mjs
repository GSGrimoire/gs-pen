import {mkdir,copyFile,rm} from "node:fs/promises";
import path from "node:path";
const root=process.cwd();
await rm(path.join(root,"local-dist"),{recursive:true,force:true});
await mkdir(path.join(root,"local-dist","modules"),{recursive:true});
for (const file of ["index.html","styles.css","app.mjs"])
  await copyFile(path.join(root,"web",file),path.join(root,"local-dist",file));
for (const file of ["url-classifier.mjs","diagnostics.mjs","extraction-export.mjs"])
  await copyFile(path.join(root,"src",file),path.join(root,"local-dist","modules",file));
process.stdout.write("Built self-contained static preview in local-dist/\n");

