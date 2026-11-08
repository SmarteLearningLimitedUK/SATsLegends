const transient=new Set(['id','options','choices','pads','tokenValues','correctAnswers','selected','feedback']);
export function mathematicalModel(value:unknown):unknown{
 if(Array.isArray(value))return value.map(mathematicalModel);
 if(value&&typeof value==='object')return Object.fromEntries(Object.entries(value).filter(([key])=>!transient.has(key)).sort(([a],[b])=>a.localeCompare(b)).map(([key,item])=>[key,mathematicalModel(item)]));
 return typeof value==='bigint'?String(value):value;
}
/** Stable local deduplication identity, not an encryption/authentication primitive. */
export function mathematicalFingerprint(model:unknown):string {
 const text=JSON.stringify(mathematicalModel(model))??'null';let a=2166136261,b=2246822507;
 for(let i=0;i<text.length;i++){a=Math.imul(a^text.charCodeAt(i),16777619);b=Math.imul(b^text.charCodeAt(i),3266489909);}
 return `v1-${(a>>>0).toString(16).padStart(8,'0')}${(b>>>0).toString(16).padStart(8,'0')}`;
}
