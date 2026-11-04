export type HeroArtPose = 'blueprint' | 'guide' | 'navigate' | 'carry';
export interface HeroArtFrame {x:number;y:number;width:number;height:number;}
const sources=import.meta.glob('./premium/*-activities-v1.png',{eager:true,query:'?url',import:'default'}) as Record<string,string>;
const cells:Record<HeroArtPose,readonly [number,number]>={blueprint:[0,0],guide:[1,0],navigate:[0,1],carry:[1,1]};
// Cell boundaries follow the empty gutters in each generated sheet.
const regions:Record<string,Record<HeroArtPose,HeroArtFrame>>={
 barratt:{blueprint:{x:0,y:0,width:.52,height:.49},guide:{x:.53,y:0,width:.47,height:.49},navigate:{x:0,y:.49,width:.52,height:.51},carry:{x:.53,y:.495,width:.47,height:.505}},
 mochi:{blueprint:{x:0,y:0,width:.515,height:.493},guide:{x:.518,y:0,width:.482,height:.493},navigate:{x:0,y:.495,width:.525,height:.505},carry:{x:.526,y:.495,width:.474,height:.505}},
 vex:{blueprint:{x:0,y:0,width:.52,height:.488},guide:{x:.525,y:0,width:.475,height:.482},navigate:{x:0,y:.489,width:.515,height:.511},carry:{x:.518,y:.483,width:.482,height:.517}},
};
/** Pose cells keep the four original identities and are sampled without rewriting their artwork. */
export function originalHeroActivity(identity:string,pose?:HeroArtPose){
 if(!pose)return undefined;
 const source=sources[`./premium/${identity==='deer'?'barratt':identity}-activities-v1.png`];
 if(!source)return undefined;
 const [x,y]=cells[pose];
 return {source,frame:regions[identity==='deer'?'barratt':identity]?.[pose]??{x:x/2,y:y/2,width:.5,height:.5}};
}
