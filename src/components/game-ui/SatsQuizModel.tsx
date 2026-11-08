import type {SatsMission} from '../../systems/content/satsAdventure';
import SatsMissionVisual from './SatsMissionVisual';
export default function SatsQuizModel({mission:q}:{mission:SatsMission}){
 const response=q.assessment?.response;
 if(response?.kind==='matching')return <SatsMissionVisual visual={{type:'table',headings:['Fractions','Decimals'],rows:response.left.map((left,i)=>[left,response.right[i]])}}/>;
 if(response?.kind==='ordering')return <SatsMissionVisual visual={{type:'equation',lines:response.values}}/>;
 if(response?.kind==='select-one'||response?.kind==='select-many')return q.visual.type==='equation'&&q.visual.lines.length===0?<SatsMissionVisual visual={{type:'equation',lines:response.options}}/>:<SatsMissionVisual visual={q.visual}/>;
 return <SatsMissionVisual visual={q.visual}/>;
}
