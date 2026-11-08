import {createContext,useContext} from 'react';
export type GraphMode='bars'|'pictogram';
export const GraphActivityModeContext=createContext<{mode:GraphMode;change:(mode:GraphMode)=>void}|null>(null);
export default function GraphActivityMode(){
 const state=useContext(GraphActivityModeContext);
 if(!state)return null;
 return <label className="graph-activity-mode">Mode<select aria-label="Graph mode" value={state.mode} onChange={e=>state.change(e.target.value as GraphMode)}><option value="bars">Bar charts</option><option value="pictogram">Pictograms</option></select></label>;
}
