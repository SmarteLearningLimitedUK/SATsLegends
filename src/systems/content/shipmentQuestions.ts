/** Original shipment-reading questions. Larger tiers add reasoning, never sector construction. */
export interface ShipmentRound {
 id:string;kind:'bar';answerMode:'single';title:string;prompt:string;support:string;chartCaption:string;xLabel:string;yLabel:string;
 bars:{label:string;value:number;color:string}[];options:{id:string;label:string}[];correctAnswers:string[];
}
const colours=['#38bdf8','#818cf8','#34d399','#fbbf24','#e879f9'];
export function buildShipmentRound(level:number,round:number,random:()=>number=Math.random):ShipmentRound {
 const tier=Math.max(1,Math.min(5,level)),count=tier<4?4:5,step=[1,2,5,10,20][tier-1];
 const shuffle=<T,>(items:T[])=>{const copy=[...items];for(let i=copy.length-1;i>0;i--){const j=Math.floor(random()*(i+1));[copy[i],copy[j]]=[copy[j],copy[i]];}return copy;};
 const values=shuffle(Array.from({length:10},(_,i)=>(i+1)*step)).slice(0,count);
 const bars=['Windward','Eden','Jerry','Ivy','Aurora'].slice(0,count).map((label,i)=>({label,value:values[i],color:colours[i]}));
 const first=Math.floor(random()*count),second=(first+1+Math.floor(random()*(count-1)))%count;
 let prompt='',answer='',choices:string[]=[],support='Read the bar chart. Then choose your answer.';
 const numeric=(value:number)=>{answer=String(value);const candidates=new Set([value]);for(const delta of [step,-step,step*2,-step*2,step*3])if(value+delta>=0)candidates.add(value+delta);choices=shuffle([...candidates].filter(n=>n!==value)).slice(0,3).map(String);choices.push(answer);};
 if((tier===1&&round%2===0)||(tier===2&&round%3===1)){
  const least=tier===2;const target=least?Math.min(...values):Math.max(...values);answer=bars.find(b=>b.value===target)!.label;
  prompt=`Which boat delivered the ${least?'fewest':'most'} crates?`;choices=shuffle(bars.map(b=>b.label)).slice(0,4);if(!choices.includes(answer))choices[0]=answer;
 }else if(tier===1||(tier===2&&round%3===0)){
  prompt=`How many crates did ${bars[first].label} deliver?`;numeric(values[first]);
 }else if(tier===2||tier===3&&round%2===1){
  const high=values[first]>values[second]?first:second,low=high===first?second:first;
  prompt=`How many more crates did ${bars[high].label} deliver than ${bars[low].label}?`;numeric(values[high]-values[low]);support='Read both bar heights, then find the difference.';
 }else if(tier===3||tier===4&&round%2===0){
  prompt=tier===3?'How many crates did all four boats deliver altogether?':`How many crates did ${bars[first].label} and ${bars[second].label} deliver altogether?`;
  numeric(tier===3?values.reduce((a,b)=>a+b,0):values[first]+values[second]);support='Add the bar heights for the boats named in the question.';
 }else if(tier===4||round%2===0){
  const total=values.reduce((a,b)=>a+b,0),target=total+(2+Math.floor(random()*8))*step;
  prompt=`The harbour needs ${target} crates. How many more are needed after these five deliveries?`;numeric(target-total);support='Find the total delivered, then compare it with the amount needed.';
 }else{
  const a=values[0]+values[1],b=values[2]+values[3],larger=a>=b?'Windward and Eden':'Jerry and Ivy',smaller=a>=b?'Jerry and Ivy':'Windward and Eden';
  prompt=`How many more crates did ${larger} deliver together than ${smaller} together?`;numeric(Math.abs(a-b));support='Find each pair’s total before finding the difference.';
 }
 const options=shuffle(choices).map((label,i)=>({id:String(i),label}));
 return {id:`shipment-${tier}-${round}`,kind:'bar',answerMode:'single',title:'Shipment Records',prompt,support,chartCaption:'Supply crates by boat',xLabel:'Boats',yLabel:'Crates',bars,options,correctAnswers:[options.find(o=>o.label===answer)!.id]};
}
