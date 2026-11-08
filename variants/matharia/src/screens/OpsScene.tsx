import {adventureTask} from '../../../../src/systems/content/adventureStory';
import IndependentAnswer,{answerAsNumber} from '../../../../src/components/game-ui/IndependentAnswer';
import {roundFeedback} from '../roundFeedback';
import React,{useLayoutEffect,useRef} from 'react';
import type {OpsChoice,OpsToken} from '../../../../src/games/orderOpsEngine';
import {asset} from '../assets';
import ArtworkFrame from '../ArtworkFrame';
import SceneActor from '../SceneActor';
import ScalableQuestionPanel from '../ScalableQuestionPanel';
import {usePresentationHint} from '../PresentationHint';
interface Props {
  expression: string;
  tokens: OpsToken[];
  choices: OpsChoice[];
  notice: string;
  hint: string;
  feedback: {type: string; title: string; subtitle: string} | null;
  round: number;
  health: number;
  total: number;
  score: number;
  combo: number;
  hearts: number;
  finished: boolean;
  paused: boolean;
  onChoose: (choice: OpsChoice) => void;
}

export default function OpsScene(p: Props) {
  const locked = useRef(false);
  const signature = JSON.stringify(p.tokens);
  const feedback = roundFeedback(p.feedback);
  const disabled = Boolean(feedback) || p.finished || p.paused;
  useLayoutEffect(() => {
    if (!feedback) locked.current = false;
  }, [signature, p.round, feedback]);
  usePresentationHint(`${p.hint}\nTap the part to work out next, then enter its result. Keep going until one number remains.\n${p.health} of ${p.total} hits remaining.`);

  // The source also supplies incorrect result choices for its multiple-choice renderer.
  // For keypad play, keep the correct result for each eligible operation.
  const operations = new Map<number, OpsChoice>();
  for (const choice of p.choices) {
    if (choice.correct || !operations.has(choice.operationIndex)) operations.set(choice.operationIndex, choice);
  }
  const lastOperation = p.tokens.length === 3;
  const submitChoice = (choice: OpsChoice) => {
    if (locked.current || disabled) return;
    locked.current = true;
    p.onChoose(choice);
  };

  return <section className="ops-scene" data-ops-game data-ops-tokens={signature} data-ops-round={p.round} data-ops-health={p.health} data-ops-total={p.total} data-ops-score={p.score} data-ops-combo={p.combo} data-ops-hearts={p.hearts} data-ops-feedback={feedback?.type??'idle'} data-ops-paused={p.paused}>
    <ScalableQuestionPanel longText={p.expression.length>15}>
      <strong className="ops-expression"><span key={signature} className="ops-expression-step">{p.expression}</span></strong>
      <span className="ops-question-helper">{adventureTask('order_ops_arena',p.round)}</span>
    </ScalableQuestionPanel>
    <img className="ops-platform" src={asset('props','ops_pedestal_v5')} alt="" aria-hidden="true"/>
    <div className="ops-opponent" role="img" aria-label={`Goblin opponent, ${p.health} of ${p.total} hits remaining`}>
      <SceneActor identity="goblin" legacyIdentity="goblin" source={asset('heroes','hero_mage_idle')} decorative
        reaction={feedback?.type==='error'?'taunt':feedback?'hit':'idle'} reactionKey={`${p.round}:${p.health}`} soundMode="all"/>
    </div>
    <div className="ops-answer-console">
      <p className="ops-step-notice" role="status" aria-live="polite" data-tone={feedback?.type}>
        <ArtworkFrame name="frames/glacier_panel_v3" corner={.13}/>
        {feedback ? <><strong>{feedback.title}</strong><span>{feedback.subtitle}</span></>
          : lastOperation ? 'Work out the remaining calculation.' : p.notice}
      </p>
      {!feedback && <div className="ops-live-choices" role="group" aria-label={lastOperation?'Finish the calculation':'Choose the next operation'}>
        {[...operations.values()].map(choice => {
          const label = choice.label.split(' = ')[0];
          const calculation = label.replace(/^Part \d+: /, '');
          return <IndependentAnswer key={`${signature}:${choice.operationIndex}`}
            questionId={`${p.round}:${signature}:${choice.operationIndex}`} fingerprint={`${signature}:${choice.operationIndex}`}
            gameKey="order_ops_arena" skillId="calculation.operation-order" curriculumRefs={['6C9']}
            reference={`${calculation} = ?`} submitLabel="Check result" disabled={disabled}
            onSubmit={value => {
              const result = answerAsNumber(value);
              submitChoice({...choice, result, correct: choice.correct && result === choice.result, label: `${label} = ${value}`});
            }}>
            {open => <button type="button" data-button-skin="none" data-ops-choice={choice.id} data-operation-index={choice.operationIndex}
              disabled={disabled} onClick={() => { if (choice.correct) open(); else submitChoice(choice); }}>
              <ArtworkFrame name="buttons/ops_answer_v3" corner={.12} fit="height"/>
              <img className="ops-answer-jewel" src={asset('frames','sapphire_crest_v3')} alt="" aria-hidden="true"/>
              <span>{lastOperation?'Enter result':label}</span>
            </button>}
          </IndependentAnswer>;
        })}
      </div>}
    </div>
  </section>;
}
