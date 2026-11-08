import type {RevisionActivityPresentationProps} from '../../../../src/components/game-ui/RevisionActivityPresentation';
import GraphScene from './GraphScene';
import ArtworkFrame from '../ArtworkFrame';
import '../../../../src/components/game-ui/revision-activities.css';
import './revision-activity-scene.css';
/** New mathematical content occupies existing chart/answer regions without changing the art. */
export default function RevisionActivityScene(p:RevisionActivityPresentationProps){
 return <GraphScene id={p.id} title={p.title} prompt={p.prompt} support={p.hint} caption="" bars={[]} difficulty={1} options={[]} feedback={null} locked={p.paused} finished={false} paused={p.paused} score={p.score} time={p.time??0} hearts={p.hearts??3} round={p.round} total={p.total??5} intro={p.intro} onAnswer={()=>{}} board={p.board} controls={<div className="revision-activity-controls"><ArtworkFrame name="frames/glacier_panel_v3" corner={.13}/><div className="revision-activity-control-content">{p.controls}</div></div>}/>;
}
