import {normaliseAnswer,answersMatch} from './satsAdventure';

/** Serializable response contract, separate from correctness and game rewards. */
export interface AnswerSpec {
  kind:'number'|'fraction'|'quotient-remainder';
  expectedUnit?:string;
  simplest?:boolean;
}
export type EntryValidation={ok:true;value:string}|{ok:false;message:string;mathematicalReminder?:boolean};
export function numericAnswer(value:string):number {
  const match=normaliseAnswer(value).match(/^number:(-?\d+)\/(\d+)$/);
  return match?Number(match[1])/Number(match[2]):NaN;
}
export function validateAnswerEntry(raw:string,spec:AnswerSpec):EntryValidation {
  let value=raw.trim().replace(/−/g,'-');
  const fail=(message:string,mathematicalReminder=false):EntryValidation=>({ok:false,message,...(mathematicalReminder?{mathematicalReminder:true}:{})});
  if(value.length>64)return fail('Please check the size of your answer.');
  const unit=value.match(/\s*(cm²|m²|cm³|m³|mm|cm|km|kg|ml|m|g|l|°|%)$/i);
  if(unit){
    if(!spec.expectedUnit||unit[1].toLowerCase()!==spec.expectedUnit.toLowerCase())return fail(spec.expectedUnit?`Give your answer in ${spec.expectedUnit}.`:'Enter the number in the units stated in the question.');
    value=value.slice(0,unit.index).trim();
  }
  if(spec.kind==='quotient-remainder')return /^\d+\s+r\s*\d+$/i.test(value)
    ?{ok:true,value:value.replace(/\s*r\s*/i,' r')}:fail('Enter full boxes and leftovers, for example 3 r1.');
  const scalar=/^-?(?:(?:\d{1,3}(?:,\d{3})+|\d+)(?:\.\d+)?|\.\d+|\d+\s+\d+\s*\/\s*[1-9]\d*|\d+\s*\/\s*[1-9]\d*)$/;
  if(!scalar.test(value)||!Number.isFinite(numericAnswer(value)))return fail('Enter a complete number, decimal or fraction.');
  if(spec.kind==='fraction'&&!value.includes('/'))return fail('Write your answer as a fraction, for example 3/4.');
  if(spec.simplest){
    const fraction=value.match(/(?:^|\s)(-?\d+)\s*\/\s*(\d+)$/);
    if(fraction){let a=Math.abs(Number(fraction[1])),b=Number(fraction[2]);while(b)[a,b]=[b,a%b];
      if(a!==1)return fail('Give the fraction in simplest form. Divide both parts by a common factor.',true);
    }
  }
  return {ok:true,value};
}

/** Numerical controllers here have whole or terminating-decimal targets.
 * Do not let a rounded floating-point conversion turn a different rational into that target.
 * Fraction-valued controllers compare the original strings with answersMatch instead.
 */
export function finiteDecimalAnswer(value:string):number {
  const number=numericAnswer(value);
  return Number.isFinite(number)&&answersMatch(String(number),value)?number:NaN;
}
