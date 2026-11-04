/** Presentation terminology only. Round scores and progression XP keep their original values. */
const cache=new WeakMap<object,object>();
export function roundFeedback<T>(value:T):T {
 if(typeof value==='string')return value.replace(/\bXP\b/g,'points') as T;
 if(value&&typeof value==='object'){
  const cached=cache.get(value);if(cached)return cached as T;
  const copy={...value};
  for(const key of ['text','message','title','subtitle']){
   const record=copy as Record<string,unknown>;
   if(typeof record[key]==='string')record[key]=(record[key] as string).replace(/\bXP\b/g,'points');
  }
  cache.set(value,copy);return copy;
 }
 return value;
}
