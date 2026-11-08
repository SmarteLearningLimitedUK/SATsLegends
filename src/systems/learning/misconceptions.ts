/** Observable error patterns are revision clues, never diagnoses of a pupil. */
export const ERROR_PATTERNS:Record<string,{label:string;reminder:string}>= {
  'prime.one':{label:'Selecting 1 as prime',reminder:'A prime has exactly two factors. The number 1 has only one.'},
  'prime.even':{label:'Selecting an even composite',reminder:'2 is the only even prime. Larger even numbers have 2 as another factor.'},
  'prime.composite':{label:'Selecting a composite',reminder:'Check for a factor other than 1 and the number itself.'},
  'fraction.common-factor':{label:'Dividing only one fraction part exactly',reminder:'A common factor must divide both the numerator and denominator exactly.'},
  'operations.priority':{label:'Choosing an operation out of order',reminder:'Brackets first; then multiplication and division; finally addition and subtraction, from left to right.'},
  'operations.calculation':{label:'Calculating an operation incorrectly',reminder:'Check that operation using a number fact or an inverse operation.'},
  'mean.total-only':{label:'Giving the total for the mean',reminder:'After adding the readings, divide by the number of readings.'},
  'median.unsorted':{label:'Taking the middle before sorting',reminder:'Order all the readings before finding the middle.'},
};
export const primeErrorPattern=(value:number)=>value===1?'prime.one':value>2&&value%2===0?'prime.even':'prime.composite';
export function statisticsErrorPattern(kind:string,values:number[],answer:number):string|undefined {
  if(kind==='mean'&&values.length>1&&answer===values.reduce((a,b)=>a+b,0))return 'mean.total-only';
  if(kind==='median'&&answer===values[Math.floor(values.length/2)])return 'median.unsorted';
  return undefined;
}
