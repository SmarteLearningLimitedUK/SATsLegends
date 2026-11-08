export type MathematicalSpeechToken={kind:'text'|'number'|'fraction'|'mixed'|'coordinate'|'ratio'|'time'|'quantity'|'operator';value:string};
const numberPattern='[-−]?(?:(?:\\d{1,3}(?:,\\d{3})+|\\d+)(?:\\.\\d+)?|\\.\\d+)';
/** Ordered lexical tokens preserve negative signs, ratios, times and units. */
export function mathematicalSpeechTokens(text:string):MathematicalSpeechToken[]{
 const n=numberPattern,pattern=new RegExp(`\\(${n}\\s*,\\s*${n}\\)|${n}\\s+\\d+\\s*\\/\\s*\\d+|${n}\\s*\\/\\s*\\d+|\\d+:\\d+|${n}\\s*(?:cm²|m²|cm³|m³|mm|cm|km|kg|ml|m|g|l|%|°)(?![A-Za-z])|${n}|[×÷+−=²³*-]`,'g');
 const out:MathematicalSpeechToken[]=[];let cursor=0;
 for(const match of text.slice(0,2000).matchAll(pattern)){
  if(match.index>cursor)out.push({kind:'text',value:text.slice(cursor,match.index)});
  const value=match[0],before=text.slice(0,match.index).trimEnd().at(-1)??'';
  if(/^[-−]/.test(value)&&/[\d)]/.test(before)){out.push({kind:'operator',value:'−'});out.push({kind:'number',value:value.slice(1)});}
  else {let kind:MathematicalSpeechToken['kind']='number';
   if(value.startsWith('('))kind='coordinate';
   else if(/\d\s+\d+\s*\//.test(value))kind='mixed';
   else if(value.includes('/'))kind='fraction';
   else if(value.includes(':'))kind=/ratio|mix|recipe|parts/i.test(text)||value.split(':')[1].length!==2?'ratio':'time';
   else if(/(?:cm²|m²|cm³|m³|mm|cm|km|kg|ml|m|g|l|%|°)$/.test(value))kind='quantity';
   else if(/^[×÷+−=²³*-]$/.test(value))kind='operator';
   out.push({kind,value});
  }
  cursor=match.index+value.length;
 }
 if(cursor<text.length)out.push({kind:'text',value:text.slice(cursor,2000)});return out;
}
const units:Record<string,string>={'cm²':'square centimetres','m²':'square metres','cm³':'cubic centimetres','m³':'cubic metres',mm:'millimetres',cm:'centimetres',km:'kilometres',kg:'kilograms',ml:'millilitres',m:'metres',g:'grams',l:'litres','%':'percent','°':'degrees'};
const operators:Record<string,string>={'×':'times','*':'times','÷':'divided by','+':'plus','−':'minus','-':'minus','=':'equals','²':'squared','³':'cubed'};
function readNumber(raw:string):string{const value=raw.replaceAll(',','').replace('−','-'),negative=value.startsWith('-'),unsigned=negative?value.slice(1):value,[whole,decimal]=unsigned.split('.');return (negative?'negative ':'')+(whole||'0')+(decimal?' point '+decimal.split('').join(' '):'');}
export function mathematicalSpeech(text:string):string {
 return mathematicalSpeechTokens(text).map(token=>{
  const value=token.value;
  if(token.kind==='text')return value.replace(/□/g,'missing value');
  if(token.kind==='number')return readNumber(value);
  if(token.kind==='operator')return operators[value];
  if(token.kind==='quantity'){const q=value.match(/^(.*?)\s*(cm²|m²|cm³|m³|mm|cm|km|kg|ml|m|g|l|%|°)$/)!;return readNumber(q[1].trim())+' '+units[q[2]];}
  if(token.kind==='coordinate')return 'coordinate '+value.slice(1,-1).split(',').map(v=>readNumber(v.trim())).join(', ');
  if(token.kind==='time'){const [hour,minute]=value.split(':');return Number(hour)+(Number(minute)===0?" o'clock":Number(minute)<10?' oh '+Number(minute):' '+Number(minute));}
  if(token.kind==='ratio')return value.split(':').map(readNumber).join(' to ');
  if(token.kind==='mixed'){const m=value.match(/^(.*?)\s+(\d+)\s*\/\s*(\d+)$/)!;return readNumber(m[1])+' and '+m[2]+' over '+m[3];}
  return value.split('/').map(v=>readNumber(v.trim())).join(' over ');
 }).join(' ').replace(/\s+/g,' ').trim();
}
export function stopQuestionSpeech(){if(typeof window!=='undefined'&&'speechSynthesis'in window)window.speechSynthesis.cancel();}
export function speakQuestion(text:string):boolean {
  if(typeof window==='undefined'||!('speechSynthesis'in window))return false;
  stopQuestionSpeech();const utterance=new SpeechSynthesisUtterance(mathematicalSpeech(text));utterance.lang='en-GB';utterance.rate=.9;utterance.volume=.65;window.speechSynthesis.speak(utterance);return true;
}

/** Reads the question and explicit givens; never consumes answer fields or choices. */
export function currentQuestionReading():string {
  if(typeof document==='undefined'||document.querySelector('[data-sats-paper][data-sats-untimed="false"]'))return '';
  const explicit=document.querySelector<HTMLElement>('.screen-gameplay [data-question-reading]')?.dataset.questionReading;
  return explicit??document.querySelector('.screen-gameplay [data-question-copy], .screen-gameplay [data-game-question]')?.textContent?.trim()??'';
}
