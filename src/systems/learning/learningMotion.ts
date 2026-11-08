import {useReducedMotion} from 'motion/react';
import confetti from 'canvas-confetti';
import {useLearningPolicy,currentLearningPolicy} from './learningSupport';
export function useLearningReducedMotion(){const os=useReducedMotion(),policy=useLearningPolicy();return Boolean(os)||policy.reducedMovement;}
export const learningConfetti:typeof confetti=Object.assign((...args:Parameters<typeof confetti>)=>currentLearningPolicy().reducedEffects?Promise.resolve(null):confetti(...args),confetti);
