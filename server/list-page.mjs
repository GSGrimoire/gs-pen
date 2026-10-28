import {ContentError} from '../src/content-workflow.mjs';
export const PAGE_SIZE=50;
// Cursors are untrusted ordering hints, never authorization. Every page query
// still restricts rows to the authenticated owner.
export function decodeCursor(value){
 if(value===undefined||value===null)return null;
 if(typeof value!=='string'||value.length>60||!/^\d{1,16}:[0-9a-f]{8}-[0-9a-f]{4}-4[0-9a-f]{3}-[89ab][0-9a-f]{3}-[0-9a-f]{12}$/.test(value))throw new ContentError('INVALID_PAGE_CURSOR');
 const split=value.indexOf(':'),time=Number(value.slice(0,split));
 if(!Number.isSafeInteger(time)||time<0)throw new ContentError('INVALID_PAGE_CURSOR');
 return {time,id:value.slice(split+1)};
}
export const encodeCursor=(time,id)=>String(time)+':'+id;
