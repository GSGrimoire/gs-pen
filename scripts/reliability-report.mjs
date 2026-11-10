#!/usr/bin/env node
// Local-only aggregation. Never fetch sources or print observation fields, URLs, or raw parser errors.
import { readFileSync } from 'node:fs';
import { parseObservation, summarizeReliability } from '../src/reliability-report.mjs';

function fail(code,lineNumber) {
  const line=Number.isInteger(lineNumber)?' at observation '+lineNumber:'';
  process.stderr.write('Reliability input rejected: '+code+line+'\n');
  process.exitCode=1;
}
function main() {
  if(process.argv.length>3){fail('INVALID_ARGUMENTS');return;}
  let raw;
  try { raw=readFileSync(process.argv[2]||0,'utf8'); }
  catch {fail('INPUT_UNAVAILABLE');return;}
  if(Buffer.byteLength(raw,'utf8')>1_000_000){fail('INPUT_TOO_LARGE');return;}
  const rows=[];
  for(const [index,line] of raw.split(/\r?\n/).entries()){
    if(!line.trim())continue;
    if(Buffer.byteLength(line,'utf8')>2048){fail('OBSERVATION_TOO_LARGE',index+1);return;}
    try {rows.push(parseObservation(line));}
    catch(error){fail(error?.code||'INVALID_RECORD',index+1);return;}
    if(rows.length>10000){fail('TOO_MANY_RECORDS');return;}
  }
  try {
    const report=summarizeReliability(rows);
    process.stdout.write(JSON.stringify(report,null,2)+'\n');
  }catch(error){fail(error?.code||'INVALID_RECORD');}
}
main();
