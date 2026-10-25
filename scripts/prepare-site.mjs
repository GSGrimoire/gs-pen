import { mkdir,copyFile } from 'node:fs/promises';
await mkdir('public/modules',{recursive:true});
for(const f of ['app.mjs','styles.css','content-workflow.mjs'])await copyFile('web/'+f,'public/'+f);
for(const f of ['diagnostics.mjs','url-classifier.mjs','extraction-export.mjs','content-workflow.mjs'])await copyFile('src/'+f,'public/modules/'+f);
