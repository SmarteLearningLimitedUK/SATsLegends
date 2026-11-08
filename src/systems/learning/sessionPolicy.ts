import type {MiniGameSessionState} from '../../app/gameplaySessionContract';
import {currentLearningPolicy} from './learningSupport';

const fixedGoalGames = new Set([
  'graph_grabber', 'line_graph_lab', 'mean_machine', 'scale_builder', 'calendar_quest',
  'angle_arena', 'coordinates_quest', 'rotation_relay', 'perimeter_path',
  'place_value_panic', 'multiplication_mine', 'divide_conquer', 'acropolis_clearout', 'shape_secrets',
]);

export function usesUntimedTaskGoal(game?: string) {
  return game !== undefined && fixedGoalGames.has(game);
}

export function isUntimedRevision(session?:MiniGameSessionState){const p=currentLearningPolicy();return session?.untimed===true||p.noTimeLimit||p.relaxedPractice;}
export function isRelaxedRevision(session?:MiniGameSessionState){return session?.relaxed===true||currentLearningPolicy().relaxedPractice;}
