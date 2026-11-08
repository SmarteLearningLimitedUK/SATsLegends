import {markMission,type SatsPaper} from '../../systems/content/satsAdventure';
import {missionSkill,REVISION_GAMES} from '../../systems/learning/revisionSkills';
import type {MiniGameType} from '../../types';
import {getMiniGameBlueprintByKey} from '../../systems/content/islandBlueprint';
import {getCanonicalGameLabel} from '../../gameNames';
import type {CoreQuizAttempt} from '../../games/BossEncounterGame';
import SatsQuizModel from './SatsQuizModel';
import {revisionAnswerSummary} from './satsRevisionFeedback';
import {Link} from 'react-router-dom';
import {ISLANDS} from '../../constants';
import {revisionPracticeHref} from '../../systems/content/recommendedPractice';
import {skillLabel} from '../../systems/learning/skillCatalog';
const domains:Record<string,string>={N:'Number and place value',C:'Calculation',F:'Fractions, decimals and percentages',R:'Ratio and proportion',A:'Algebra',M:'Measurement',G:'Geometry',P:'Position and direction',S:'Statistics'};
export default function CoreQuizReview({paper,answers,workpad,previous,notice,onReturn}:{paper:SatsPaper;answers:Record<string,string[]>;workpad:Record<string,string>;previous:CoreQuizAttempt[];notice:string;onReturn:()=>void}){
 const results=paper.missions.map(m=>({m,score:markMission(m,answers[m.id]??[]),attempted:answers[m.id]?.some(v=>v.trim())})),score=results.reduce((n,r)=>n+r.score,0);
 const recommendations=[...new Set(results.filter(r=>!r.score).map(r=>missionSkill(r.m)))].flatMap(skill=>{const href=revisionPracticeHref(skill,ISLANDS);return href?[{skill,href,game:REVISION_GAMES[skill]}]:[];});
 return <div className="sats-review sats-quiz-review" tabIndex={0} aria-label="Quiz review"><h2>{paper.title} complete</h2><p className="sats-score">{score} / 30 correct · {Math.round(score/30*100)}%</p><p>{results.filter(r=>!r.attempted).length} unanswered. One point per complete correct answer. Working notes are not marked.</p><p>Original SATs-style revision questions. This quiz is not a mock examination or an official SATs score.</p>{notice&&<p role="status">{notice}</p>}
 <h3>Topics to revisit</h3><table><thead><tr><th>Topic</th><th>Correct</th></tr></thead><tbody>{Object.entries(domains).filter(([d])=>results.some(r=>r.m.domain===d)).map(([d,label])=>{const group=results.filter(r=>r.m.domain===d);return <tr key={d}><th scope="row">{label}</th><td>{group.reduce((n,r)=>n+r.score,0)}/{group.length}</td></tr>;})}</tbody></table>
 {recommendations.length>0&&<><h3>Recommended revision</h3><p>Practise the specific skills missed:</p><ul>{recommendations.map(r=><li key={r.skill}><Link to={r.href}>{skillLabel(r.skill)}</Link> · {getMiniGameBlueprintByKey(r.game)?.name??getCanonicalGameLabel(r.game as MiniGameType)}</li>)}</ul></>}
 {previous.some(a=>a.format==='quiz')&&<details><summary>Previous quiz results</summary><ol>{previous.filter(a=>a.format==='quiz').slice(-10).map(a=><li key={a.id}>{new Date(a.completedAt).toLocaleDateString('en-GB')}: {a.score}/{a.maxMarks}</li>)}</ol></details>}
 <h3>Question review</h3>{results.map(({m,score,attempted},i)=><details className="sats-review-item" key={m.id}><summary>Question {i+1} · {!attempted?'Unanswered':score?'Correct':'Incorrect'}</summary><p>{m.prompt}</p><SatsQuizModel mission={m}/><p>Your answer: {revisionAnswerSummary(m,answers[m.id]??[])}</p><p><strong>Answer:</strong> {revisionAnswerSummary(m)}</p><p>{m.explanation}</p>{workpad[m.id]&&<p>Working notes (unmarked): {workpad[m.id]}</p>}</details>)}<button type="button" className="ui-button-primary" onClick={onReturn}>Save result and return</button>
 </div>;
}
