import { mkdir,copyFile } from 'node:fs/promises';
await mkdir('public/modules',{recursive:true});
for(const f of ['app.mjs','styles.css'])await copyFile('web/'+f,'public/'+f);
for(const f of ['diagnostics.mjs','url-classifier.mjs'])await copyFile('src/'+f,'public/modules/'+f);
