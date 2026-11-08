export interface Rational {n:number;d:number;}
export const gcd=(a:number,b:number):number=>{a=Math.abs(a);b=Math.abs(b);while(b)[a,b]=[b,a%b];return a;};
export function rational(n:number,d=1):Rational {
 if(!Number.isSafeInteger(n)||!Number.isSafeInteger(d)||d===0)throw Error('Invalid rational');
 const g=gcd(n,d),sign=d<0?-1:1;return {n:sign*n/g,d:sign*d/g};
}
export const fractionText=(q:Rational)=>q.d===1?String(q.n):`${q.n}/${q.d}`;
export const equal=(a:Rational,b:Rational)=>a.n*b.d===b.n*a.d;
export const add=(a:Rational,b:Rational)=>rational(a.n*b.d+b.n*a.d,a.d*b.d);
export const compare=(a:Rational,b:Rational)=>a.n*b.d-b.n*a.d;
export function parseRational(raw:string):Rational|null {
 const value=raw.trim().replaceAll('−','-');let match:RegExpMatchArray|null;
 try{
  if((match=value.match(/^(-?\d+)\s+(\d+)\s*\/\s*(\d+)$/))){const w=Number(match[1]),n=Number(match[2]),d=Number(match[3]);if(n>=d||d===0)return null;return rational((w<0||match[1].startsWith('-')?-1:1)*(Math.abs(w)*d+n),d);}
  if((match=value.match(/^(-?\d+)\s*\/\s*(\d+)$/)))return rational(Number(match[1]),Number(match[2]));
  if(!/^-?\d+(?:\.\d{1,6})?$/.test(value))return null;
  const [whole,decimal='']=value.split('.'),d=10**decimal.length;return rational(Number(whole)*d+(value.startsWith('-')?-1:1)*Number(decimal||0),d);
 }catch{return null;}
}
