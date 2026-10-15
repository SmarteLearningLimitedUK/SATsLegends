import React, { useEffect, useRef, useState } from 'react';
import { motion, useReducedMotion } from 'motion/react';
import { triggerHaptic } from '../haptics';
import { playGameSound } from '../audio/gameAudio';
import gameplayBackground from '../assets/maps/premium/rotation-station.webp';
import SceneEnvironment from '../components/SceneEnvironment';
import { GameQuestionCard } from '../components/game-ui/GameUiKit';
import { emitMiniGameSessionEvent, MiniGameShellContractProps } from '../app/gameplaySessionContract';
import { createQuestion, GridPoint, sameVertices, movementLabel } from './rotationStationQuestions';
import './rotation-station.css';
interface Props extends MiniGameShellContractProps {
    levelId: number;
    miniGameLevel?: number;
    avatarId: string;
    useSharedTopHud?: boolean;
    onVictory: (stars: number, XP: number) => void;
    onGameOver: (XP: number) => void;
    onBack: () => void;
}
const LETTERS = ['A', 'B', 'C'];
const RotationStationGame: React.FC<Props> = ({ levelId, miniGameLevel, sessionState, sessionEvents, onVictory, onGameOver }) => {
    const level = Math.max(1, Math.min(5, miniGameLevel || levelId || 1));
    const [question, setQuestion] = useState(() => createQuestion(level));
    const [placed, setPlaced] = useState<(GridPoint | null)[]>([null, null, null]);
    const [selected, setSelected] = useState(0), [cursor, setCursor] = useState<GridPoint>({ x: 0, y: 0 });
    const [feedback, setFeedback] = useState<boolean | null>(null);
    const [showHint, setShowHint] = useState(false);
    const [seconds, setSeconds] = useState(level <= 2 ? 90 : level <= 4 ? 75 : 60);
    const [results, setResults] = useState({ attempts: 0, correct: 0, score: 0 });
    const guard = useRef(false), ended = useRef(false), dragging = useRef<number | null>(null), dragPlaced = useRef(false), svgRef = useRef<SVGSVGElement>(null);
    const reducedMotion = useReducedMotion(), paused = Boolean(sessionState?.paused), timeLeft = sessionState?.timeLeft ?? seconds;
    useEffect(() => { setQuestion(createQuestion(level)); setPlaced([null, null, null]); setSelected(0); setFeedback(null); setShowHint(false); setResults({ attempts: 0, correct: 0, score: 0 }); setSeconds(level <= 2 ? 90 : level <= 4 ? 75 : 60); guard.current = false; ended.current = false; }, [level]);
    useEffect(() => {
        if (sessionState || paused)
            return;
        const timer = window.setInterval(() => setSeconds(t => Math.max(0, t - 1)), 1000);
        return () => window.clearInterval(timer);
    }, [sessionState, paused]);
    useEffect(() => {
        if (timeLeft > 0 || ended.current)
            return;
        ended.current = true;
        if (!results.attempts) {
            onGameOver(results.score);
            return;
        }
        const accuracy = results.correct / results.attempts;
        onVictory(accuracy >= .85 && results.correct >= 3 ? 3 : accuracy >= .6 && results.correct >= 2 ? 2 : 1, results.score);
    }, [timeLeft, results, onVictory, onGameOver]);
    const size = question.max - question.min;
    const project = (p: GridPoint) => ({ x: 40 + (p.x - question.min) * 320 / size, y: 360 - (p.y - question.min) * 320 / size });
    const polygon = (points: GridPoint[]) => points.map(p => { const a = project(p); return `${a.x},${a.y}`; }).join(' ');
    const put = (point: GridPoint, index = selected) => {
        if (guard.current || ended.current || paused || question.mode === 'describe')
            return;
        playGameSound('place'); setPlaced(prev => prev.map((p, i) => i === index ? point : p));
        setCursor(point);
        setSelected(index === 2 ? 0 : index + 1);
        triggerHaptic('selection');
    };
    const pointerPoint = (clientX: number, clientY: number) => {
        const matrix = svgRef.current?.getScreenCTM();
        if (!matrix)
            return null;
        const p = new DOMPoint(clientX, clientY).matrixTransform(matrix.inverse());
        if (p.x < 25 || p.x > 375 || p.y < 25 || p.y > 375)
            return null;
        return { x: Math.max(question.min, Math.min(question.max, Math.round((p.x - 40) * size / 320 + question.min))), y: Math.max(question.min, Math.min(question.max, Math.round((360 - p.y) * size / 320 + question.min))) };
    };
    const check = (correct: boolean) => {
        if (guard.current || ended.current || paused)
            return;
        guard.current = true;
        setFeedback(correct);
        const score = results.score + (correct ? 200 + level * 25 : 0);
        setResults(r => ({ attempts: r.attempts + 1, correct: r.correct + (correct ? 1 : 0), score }));
        emitMiniGameSessionEvent(sessionEvents, correct ? 'correct_answer' : 'incorrect_answer', { score, metadata: { questionId: question.id, mode: question.mode } });
        triggerHaptic(correct ? 'success' : 'error');
    };
    const next = () => {
        if (ended.current || paused)
            return;
        setQuestion(createQuestion(level, results.attempts));
        setPlaced([null, null, null]);
        setSelected(0);
        setCursor({ x: 0, y: 0 });
        setFeedback(null);
        setShowHint(false);
        guard.current = false;
    };
    const moveCursor = (x: number, y: number) => setCursor(p => ({ x: Math.max(question.min, Math.min(question.max, p.x + x)), y: Math.max(question.min, Math.min(question.max, p.y + y)) }));
    return <div className="rotation-station-game relative z-20 h-full w-full overflow-hidden select-none"><SceneEnvironment src={gameplayBackground}/><main className="rs-main">
 <GameQuestionCard title="Transformation Station">{question.instruction}{showHint && <span className="rs-question-hint">{question.mode === 'reflect' ? `Start at blue ${LETTERS[selected]}. Count the squares to the pink line. Count the same number on the other side.` : question.mode === 'describe' ? 'Follow one blue corner to its matching gold corner. Count across, then up or down.' : `Start at blue ${LETTERS[selected]}. Count ${movementLabel(question.dx, question.dy)}. Tap where you finish.`}</span>}</GameQuestionCard>
 <div className="rs-workspace"><section className="rs-grid-stage" aria-label="Transformation grid"><div className="rs-legend"><span>{question.mode === 'describe' ? 'Blue → gold' : feedback !== null ? 'Blue: start · Gold: answer' : placed.every(Boolean) ? 'All 3 corners placed. Press Check image.' : `Place corner ${LETTERS[selected]} · ${placed.filter(Boolean).length} of 3 done`}</span></div>
 <svg ref={svgRef} viewBox="0 0 400 400" className="rs-grid" role="application" tabIndex={0} aria-label="Coordinate grid. Arrow keys move the cursor; Enter places the selected vertex." onPointerUp={e => {
            const p = pointerPoint(e.clientX, e.clientY);
            if (p)
                put(p, dragging.current ?? selected);
            dragging.current = null;
        }} onKeyDown={e => {
            if (['ArrowLeft', 'ArrowRight', 'ArrowUp', 'ArrowDown', 'Enter', ' '].includes(e.key))
                e.preventDefault();
            if (e.key === 'Enter' || e.key === ' ')
                put(cursor);
            else if (e.key === 'ArrowLeft')
                moveCursor(-1, 0);
            else if (e.key === 'ArrowRight')
                moveCursor(1, 0);
            else if (e.key === 'ArrowUp')
                moveCursor(0, 1);
            else if (e.key === 'ArrowDown')
                moveCursor(0, -1);
        }}>
 <rect width="400" height="400" rx="16" fill="#0a263c"/>
 {Array.from({ length: size + 1 }, (_, i) => question.min + i).map(n => { const p = project({ x: n, y: n }); return <g key={n}><path d={`M ${p.x} 40 V 360 M 40 ${p.y} H 360`} stroke={n === 0 ? '#effaff' : '#537186'} strokeWidth={n === 0 ? 2 : 1}/><text x={p.x} y="382" textAnchor="middle">{n}</text><text x="23" y={p.y + 5} textAnchor="middle">{n}</text></g>; })}
 <text x="389" y="382">x</text><text x="20" y="23">y</text>
 {question.mode === 'reflect' && <path d={question.axis === 'x' ? `M ${project({ x: question.mirror, y: 0 }).x} 35 V 365` : `M 35 ${project({ x: 0, y: question.mirror }).y} H 365`} stroke="#ff9eb9" strokeWidth="3" strokeDasharray="7 5"/>}
 <polygon points={polygon(question.source)} fill="#37bfe13b" stroke="#7fe8ff" strokeWidth="3"/>
 {question.source.map((p, i) => { const a = project(p); return <g key={i}><circle cx={a.x} cy={a.y} r={feedback === null && question.mode !== 'describe' && selected === i ? 9 : 4} fill="#aaf0ff" stroke={feedback === null && selected === i ? '#ffffff' : 'none'} strokeWidth="2"/><text x={a.x + 9} y={a.y - 8} className="rs-vertex-label">{LETTERS[i]}</text></g>; })}
 {(question.mode === 'describe' || feedback !== null) && <motion.polygon key={question.id} points={polygon(question.target)} fill="#ffc85c40" stroke="#ffd478" strokeWidth="3" strokeDasharray={feedback === false ? '6 4' : undefined} initial={{ opacity: reducedMotion ? 1 : 0 }} animate={{ opacity: 1 }} transition={{ duration: .35 }}/>}
 {placed.every(Boolean) && question.mode !== 'describe' && <polygon points={polygon(placed as GridPoint[])} fill="#ffc85c30" stroke={feedback === false ? '#ff8eaa' : '#ffd478'} strokeWidth="3"/>}
 {question.mode !== 'describe' && placed.map((p, i) => {
            if (!p)
                return null;
            const a = project(p);
            return <g key={i}><circle cx={a.x} cy={a.y} r="6" fill="#ffd478"/><text x={a.x + 9} y={a.y - 8} className="rs-vertex-label">{LETTERS[i]}′</text></g>;
        })}
 {question.mode !== 'describe' && feedback === null && <circle cx={project(cursor).x} cy={project(cursor).y} r="10" fill="none" stroke="white" strokeWidth="2" strokeDasharray="3 3" pointerEvents="none"/>}
 </svg></section><section className="rs-controls" aria-label="Answer controls"><div className="rs-status">{results.correct} correct · {results.score} XP<span>{timeLeft}s</span></div>
 {question.mode === 'describe' ? <div className="rs-choices"><button className="ui-button-secondary" disabled={feedback !== null || paused} aria-pressed={showHint} onClick={() => setShowHint(v => !v)}>{showHint ? 'Hide hint' : 'Hint'}</button>{question.options.map(o => <button key={o.id} className="ui-button-secondary" disabled={feedback !== null || paused} onClick={() => check(o.id === 'correct')}>{o.label}</button>)}</div> : <>
 <p className="rs-helper">Tap the new position of the highlighted blue corner. Then do the next corner.</p>
 <div className="rs-vertices">{LETTERS.map((l, i) => <button key={l} aria-pressed={selected === i} disabled={feedback !== null || paused} className={selected === i ? 'rs-selected' : ''} onClick={() => {
                    if (dragPlaced.current) {
                        dragPlaced.current = false;
                        return;
                    }
                    setSelected(i);
                    const p = placed[i];
                    if (p)
                        setCursor(p);
                }} onPointerDown={e => { dragging.current = i; e.currentTarget.setPointerCapture(e.pointerId); }} onPointerUp={e => {
                    const p = pointerPoint(e.clientX, e.clientY);
                    if (p) {
                        put(p, i);
                        dragPlaced.current = true;
                    }
                    dragging.current = null;
                }}>Corner {l}<small>{placed[i] ? `(${placed[i].x}, ${placed[i].y})` : 'Tap grid'}</small></button>)}</div>
 {feedback === null && <><div className="rs-cursor"><span>Cursor ({cursor.x}, {cursor.y})</span><div>{[['←', -1, 0, 'left'], ['↑', 0, 1, 'up'], ['↓', 0, -1, 'down'], ['→', 1, 0, 'right']].map(([label, x, y, name]) => <button key={String(name)} aria-label={`Move cursor ${name}`} disabled={paused} onClick={() => moveCursor(Number(x), Number(y))}>{label}</button>)}</div><button disabled={paused} onClick={() => put(cursor)}>Place {LETTERS[selected]}′</button></div><div className="rs-actions"><button className="ui-button-secondary" aria-pressed={showHint} disabled={paused} onClick={() => setShowHint(v => !v)}>{showHint ? 'Hide hint' : 'Hint'}</button><button className="ui-button-secondary" disabled={paused} onClick={() => { setPlaced([null, null, null]); setSelected(0); }}>Clear</button><button className="ui-button-primary" disabled={!placed.every(Boolean) || paused} onClick={() => check(sameVertices(placed, question.target))}>Check image</button></div></>}
 </>}
 <div className="rs-feedback" role="status" aria-live="polite">{feedback === null ? 'Moving a shape without turning it is a translation. A mirror image is a reflection.' : <><strong>{feedback ? 'Correct — alignment restored!' : 'Not quite — the gold outline shows the correct image.'}</strong><p>{question.explanation}</p><button className="ui-button-primary" disabled={paused} onClick={next}>Next mission</button></>}</div>
 </section></div></main></div>;
};
export default RotationStationGame;
