/** Original seeded recipes. Bounds keep the existing fraction cards legible. */
/** Evidence describes the required recipe, not shuffled tray IDs or distractors. */
export function forgeRecipeModel(round:{id:string;target:unknown;operators:readonly unknown[];solutionIds:string[];cards:{id:string;numerator:number;denominator:number}[]}) {
 return {id:round.id,target:round.target,operators:round.operators,operands:round.solutionIds.map(id=>{const card=round.cards.find(c=>c.id===id);return card?{numerator:card.numerator,denominator:card.denominator}:null;})};
}
export function generatedForgeRecipe(tier:number,seed:number):string{
 let state=seed>>>0;const next=()=>{state=(Math.imul(state,1664525)+1013904223)>>>0;return state/4294967296;};
 const pick=(a:number,b:number)=>a+Math.floor(next()*(b-a+1));
 const fraction=()=>{const d=pick(3,tier>=4?12:8);return {n:pick(1,d-1),d};};
 if(tier<=2){const d=pick(4,tier===1?10:12),a=pick(2,d-1),subtract=tier===2&&next()<.5,b=subtract?pick(1,a-1):pick(1,Math.max(1,d-a));return `${a}/${d}${subtract?'-':'+'}${b}/${d}`;}
 if(tier>=3&&seed%3===0){const d=pick(3,tier===3?12:tier===4?20:24),whole=pick(1,tier===3?3:5),n=pick(1,d-1),times=pick(2,tier===3?5:9);return `${whole*d+n}/${d}×${times}/1`;}
 if(tier===3){const d=pick(2,6);return `${pick(1,d-1)}/${d}+${pick(1,d*2-1)}/${d*2}`;}
 let a=fraction(),b=fraction();
 if(tier===5&&next()<.5)return `${a.n}/${a.d}÷${pick(2,5)}/1`;
 const op=tier===5?'×':(['+','-','×'] as const)[pick(0,2)];
 if(op==='-'&&a.n*b.d<=b.n*a.d){if(a.n*b.d===b.n*a.d)return `${a.n}/${a.d}+${b.n}/${b.d}`;[a,b]=[b,a];}
 return `${a.n}/${a.d}${op}${b.n}/${b.d}`;
}
