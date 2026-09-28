import React, { useCallback, useEffect, useMemo, useRef, useState } from 'react';
import { AnimatePresence, motion, useReducedMotion } from 'motion/react';
import animatedEnemy1 from '../assets/maps/ezgif-261d69e7ae90ee8c.webp';
import forestBackground from '../assets/maps/premium/place-value-panic.webp';
import hudAvatarName from '../assets/ui_frames/hudfortextplace_slices/hud_avatar_name.png';
import hourglassIcon from '../assets/casual_ui/icons/hourglass.png';
import { triggerHaptic } from '../haptics';
import { AVATARS } from '../constants';
import { GameQuestionCard } from '../components/game-ui/GameUiKit';
import PracticeIntroPopup from '../components/game-ui/PracticeIntroPopup';
import MonsterMindActor from '../components/game-ui/MonsterMindActor';
import { formatFantasyPrompt } from '../utils/fantasyPrompt';
import { emitMiniGameSessionEvent, MiniGameShellContractProps } from '../app/gameplaySessionContract';
import './place-value-panic.css';

interface PlaceValuePanicGameProps extends MiniGameShellContractProps {
  levelId: number;
  miniGameLevel?: number;
  avatarId: string;
  useSharedTopHud?: boolean;
  isPractice?: boolean;
  onVictory: (stars: number, XP: number) => void;
  onGameOver: (XP: number) => void;
  onBack: () => void;
}

type TokenLocation = 'source' | 'target';
type QuestionKind = 'fluency' | 'reasoning';

interface AnchorPoint {
  x: number;
}

interface Token {
  id: string;
  value: number;
}

interface QuestionState {
  id: string;
  prompt: string;
  expectedDigits: number[];
  tokenValues: number[];
  placeHints: string[];
  kind: QuestionKind;
}

interface DragState {
  token: Token;
  fromLocation: TokenLocation;
  fromIndex: number;
  pointerId: number;
  clientX: number;
  clientY: number;
  offsetX: number;
  offsetY: number;
  width: number;
  height: number;
}

type GoblinEffect = 'idle' | 'hit' | 'heal';

const GOBLIN_MAX_HEALTH = 10;
const MATCH_DURATION_SECONDS = 90;
const PLAYER_STORAGE_KEY = 'maths_quest_player';
const GOBLIN_DAMAGE_LINES = ['Ouch!', 'Hey!', 'Oof!', 'Wahhh!', 'Ugh!'] as const;
const HIT_REACTION_MS = 900;

const FULL_PLACE_VALUE_HINTS = ['M', 'Hth', 'Tth', 'Th', 'H', 'T', 'U'] as const;
const PLACE_NAMES: Record<string, string> = {
  M: 'Millions', Hth: 'Hundred thousands', Tth: 'Ten thousands',
  Th: 'Thousands', H: 'Hundreds', T: 'Tens', U: 'Units',
};
const TARGET_ROW_Y_OFFSET_PX = 0;
const SOURCE_ROW_Y_OFFSET_PX = 30;

const randomInt = (min: number, max: number) => Math.floor(Math.random() * (max - min + 1)) + min;

const shuffle = <T,>(items: T[]): T[] => {
  const clone = [...items];
  for (let i = clone.length - 1; i > 0; i -= 1) {
    const j = Math.floor(Math.random() * (i + 1));
    [clone[i], clone[j]] = [clone[j], clone[i]];
  }
  return clone;
};

const scoreToStars = (accuracy: number): number => {
  if (accuracy >= 0.9) return 3;
  if (accuracy >= 0.7) return 2;
  return 1;
};

const centeredAnchors = (count: number, spanPercent: number, centerPercent = 50): AnchorPoint[] => {
  if (count <= 0) return [];
  if (count === 1) {
    return [{ x: centerPercent }];
  }

  const left = centerPercent - spanPercent / 2;
  const step = spanPercent / (count - 1);
  return Array.from({ length: count }, (_, idx) => ({ x: left + step * idx }));
};

const spanForSlots = (count: number, type: 'source' | 'target') => {
  if (type === 'target') {
    if (count <= 2) return 24;
    if (count === 3) return 36;
    if (count === 4) return 48;
    if (count === 5) return 58;
    if (count === 6) return 68;
    if (count === 7) return 76;
    return 80;
  }

  if (count <= 2) return 18;
  if (count === 3) return 26;
  if (count === 4) return 34;
  if (count === 5) return 44;
  if (count === 6) return 52;
  if (count === 7) return 60;
  if (count === 8) return 66;
  if (count === 9) return 74;
  return 80;
};

const getDistractorDigits = (expectedDigits: number[], count: number): number[] => {
  const expectedSet = new Set(expectedDigits);
  const pool = shuffle(Array.from({ length: 10 }, (_, n) => n).filter((n) => !expectedSet.has(n)));
  return pool.slice(0, Math.min(count, pool.length));
};

const slotCountForLevel = (level: number): number => {
  // Gradual staged ramp:
  // L1-2: T,U
  // L3-4: H,T,U
  // L5-6: Th,H,T,U
  // L7-8: Tth,Th,H,T,U
  // L9:   Hth,Tth,Th,H,T,U
  // L10+: M,Hth,Tth,Th,H,T,U
  if (level <= 2) return 2;
  if (level <= 4) return 3;
  if (level <= 6) return 4;
  if (level <= 8) return 5;
  if (level === 9) return 6;
  return 7;
};

const ONES_WORDS = [
  'zero',
  'one',
  'two',
  'three',
  'four',
  'five',
  'six',
  'seven',
  'eight',
  'nine',
] as const;

const TEENS_WORDS = [
  'ten',
  'eleven',
  'twelve',
  'thirteen',
  'fourteen',
  'fifteen',
  'sixteen',
  'seventeen',
  'eighteen',
  'nineteen',
] as const;

const TENS_WORDS = [
  '',
  '',
  'twenty',
  'thirty',
  'forty',
  'fifty',
  'sixty',
  'seventy',
  'eighty',
  'ninety',
] as const;

const spellUnderThousand = (value: number) => {
  const hundreds = Math.floor(value / 100);
  const remainder = value % 100;
  const tens = Math.floor(remainder / 10);
  const ones = remainder % 10;

  const parts: string[] = [];
  if (hundreds > 0) {
    parts.push(`${ONES_WORDS[hundreds]} hundred`);
    if (remainder > 0) parts.push('and');
  }

  if (remainder >= 20) {
    parts.push(ones > 0 ? `${TENS_WORDS[tens]}-${ONES_WORDS[ones]}` : TENS_WORDS[tens]);
  } else if (remainder >= 10) {
    parts.push(TEENS_WORDS[remainder - 10]);
  } else if (remainder > 0 || parts.length === 0) {
    parts.push(ONES_WORDS[remainder]);
  }

  return parts.join(' ');
};

const numberToWords = (value: number) => {
  if (value === 0) return 'zero';
  if (value === 1_000_000) return 'one million';

  const thousands = Math.floor(value / 1000);
  const remainder = value % 1000;

  if (thousands > 0) {
    const thousandWords = spellUnderThousand(thousands);
    if (remainder === 0) return `${thousandWords} thousand`;
    const remainderWords = spellUnderThousand(remainder);
    return remainder < 100
      ? `${thousandWords} thousand and ${remainderWords}`
      : `${thousandWords} thousand ${remainderWords}`;
  }

  return spellUnderThousand(remainder);
};

const makeQuestion = (level: number): QuestionState => {
  const slotCount = slotCountForLevel(level);
  let promptNumber: number;
  if (slotCount === 2) {
    promptNumber = randomInt(10, 99);
  } else if (slotCount === 3) {
    promptNumber = randomInt(100, 999);
  } else if (slotCount === 4) {
    promptNumber = randomInt(1000, 9999);
  } else if (slotCount === 5) {
    promptNumber = randomInt(10000, 99999);
  } else if (slotCount === 6) {
    promptNumber = randomInt(100000, 999999);
  } else {
    // Highest round supports full range up to 1,000,000.
    promptNumber = randomInt(1, 1000000);
  }

  const expectedDigits = String(promptNumber)
    .padStart(slotCount, '0')
    .split('')
    .map((digit) => Number(digit));
  const distractorDigits = getDistractorDigits(expectedDigits, 2);
  const tokenValues = shuffle([...expectedDigits, ...distractorDigits]);
  const placeHints = FULL_PLACE_VALUE_HINTS.slice(FULL_PLACE_VALUE_HINTS.length - slotCount);
  return {
    id: `${Date.now()}-${Math.random().toString(36).slice(2, 8)}`,
    prompt: `The Monster Minds have scrambled the number stones.\nRebuild ${numberToWords(promptNumber)}.`,
    expectedDigits,
    tokenValues,
    placeHints,
    kind: 'fluency',
  };
};

const PlaceValuePanicGame: React.FC<PlaceValuePanicGameProps> = ({
  levelId,
  miniGameLevel,
  avatarId,
  useSharedTopHud = false,
  isPractice = false,
  practiceBriefing,
  sessionState,
  sessionEvents,
  onVictory,
  onGameOver,
  onBack,
}) => {
  const [viewport, setViewport] = useState(() => {
    if (typeof window === 'undefined') {
      return { width: 390, height: 844 };
    }
    return { width: window.innerWidth, height: window.innerHeight };
  });

  useEffect(() => {
    const onResize = () => {
      const width = window.visualViewport?.width ?? window.innerWidth;
      const height = window.visualViewport?.height ?? window.innerHeight;
      setViewport({ width, height });
    };
    const visualViewport = window.visualViewport;
    window.addEventListener('resize', onResize);
    visualViewport?.addEventListener('resize', onResize);
    visualViewport?.addEventListener('scroll', onResize);
    return () => {
      window.removeEventListener('resize', onResize);
      visualViewport?.removeEventListener('resize', onResize);
      visualViewport?.removeEventListener('scroll', onResize);
    };
  }, []);

  const resolvedLevel = useMemo(
    () => Math.max(1, Math.min(10, miniGameLevel || levelId || 1)),
    [levelId, miniGameLevel],
  );

  const selectedAvatar = useMemo(
    () => AVATARS.find((avatar) => avatar.id === avatarId) ?? AVATARS[0],
    [avatarId],
  );

  const playerName = useMemo(() => {
    try {
      const saved = localStorage.getItem(PLAYER_STORAGE_KEY);
      const parsed = saved ? JSON.parse(saved) : null;
      const storedName = typeof parsed?.playerName === 'string' ? parsed.playerName.trim() : '';
      return storedName || selectedAvatar.name || 'Learner';
    } catch {
      return selectedAvatar.name || 'Learner';
    }
  }, [selectedAvatar.name]);

  const layout = useMemo(() => {
    const ratio = viewport.height / Math.max(1, viewport.width);
    const isTablet = Math.min(viewport.width, viewport.height) >= 760;
    const isTallPhone = !isTablet && ratio > 1.95;

    return {
      submitY: isTablet ? 89.4 : (isTallPhone ? 90.1 : 89.8),
      submitWidth: isTablet ? 34 : 50,
      submitHeight: isTablet ? 9.4 : 10.2,
      targetY: isTablet ? 73.4 : (isTallPhone ? 74.2 : 73.8),
      sourceY: isTablet ? 45.1 : (isTallPhone ? 46.0 : 45.5),
      targetWidth: isTablet ? '14.6%' : '19.8%',
      sourceWidth: isTablet ? '11.8%' : '15.0%',
      targetHeight: isTablet ? '13.8%' : '17.0%',
      sourceHeight: isTablet ? '10.8%' : '12.2%',
      targetFont: isTablet ? 'clamp(2.6rem,5.8vw,4.35rem)' : 'clamp(2.45rem,6.5vw,4rem)',
      sourceFont: isTablet ? 'clamp(2.35rem,5.0vw,3.95rem)' : 'clamp(2.2rem,5.8vw,3.55rem)',
      healthTop: isTablet ? 63.9 : (isTallPhone ? 64.4 : 64.1),
      healthWidth: isTablet ? 15.6 : 19.8,
      healthLeft: isTablet ? 66.8 : 69.4,
      enemyWidth: isTablet ? 40 : 46,
    };
  }, [viewport.height, viewport.width]);

  const [question, setQuestion] = useState<QuestionState>(() => makeQuestion(resolvedLevel));
  const [targetSlots, setTargetSlots] = useState<Array<Token | null>>([]);
  const [sourceSlots, setSourceSlots] = useState<Array<Token | null>>([]);
  const [initialSourceSlots, setInitialSourceSlots] = useState<Array<Token | null>>([]);
  const [dragState, setDragState] = useState<DragState | null>(null);
  const [goblinHealth, setGoblinHealth] = useState<number>(GOBLIN_MAX_HEALTH);
  const [XP, setScore] = useState<number>(0);
  const [localTimeLeft, setMatchTimeLeft] = useState<number>(MATCH_DURATION_SECONDS);
  const matchTimeLeft = sessionState?.timeLeft ?? localTimeLeft;
  const [attempts, setAttempts] = useState<number>(0);
  const [correctAnswers, setCorrectAnswers] = useState<number>(0);
  const [feedback, setFeedback] = useState<{ tone: 'success' | 'error'; message: string } | null>(null);
  const [isResolving, setIsResolving] = useState(false);
  const [goblinEffect, setGoblinEffect] = useState<GoblinEffect>('idle');
  const reducedMotion = useReducedMotion();
  const [showPracticeIntro, setShowPracticeIntro] = useState(Boolean(isPractice));
  const [enemySpeech, setEnemySpeech] = useState<string | null>(null);
  const [slotPulseKey, setSlotPulseKey] = useState(0);
  const [boardShake, setBoardShake] = useState(false);
  const [wrongFlash, setWrongFlash] = useState(false);

  const victoryDispatchedRef = useRef(false);
  const gameOverDispatchedRef = useRef(false);
  const speechTimeoutRef = useRef<number | null>(null);
  const playfieldRef = useRef<HTMLDivElement | null>(null);
  const submitLockedRef = useRef(false);
  const pendingTimeoutsRef = useRef<Set<number>>(new Set());
  const clearRoundTimeouts = useCallback(() => {
    pendingTimeoutsRef.current.forEach((timeout) => window.clearTimeout(timeout));
    pendingTimeoutsRef.current.clear();
  }, []);
  const scheduleRound = useCallback((callback: () => void, delay: number) => {
    const timeout = window.setTimeout(() => {
      pendingTimeoutsRef.current.delete(timeout);
      callback();
    }, delay);
    pendingTimeoutsRef.current.add(timeout);
  }, []);
  useEffect(() => clearRoundTimeouts, [clearRoundTimeouts]);

  const activeTargetAnchors = useMemo(
    () => centeredAnchors(question.expectedDigits.length, spanForSlots(question.expectedDigits.length, 'target'), 50),
    [question.expectedDigits.length],
  );

  const activeSourceAnchors = useMemo(
    () => centeredAnchors(question.tokenValues.length, spanForSlots(question.tokenValues.length, 'source'), 50),
    [question.tokenValues.length],
  );

  const sourceTokenWidth = useMemo(() => {
    const count = question.tokenValues.length;
    if (count <= 4) return layout.sourceWidth;
    if (count === 5) return '11.2%';
    if (count === 6) return '10.3%';
    return '9.6%';
  }, [layout.sourceWidth, question.tokenValues.length]);

  const sourceTokenBackdropWidth = useMemo(() => {
    const count = question.tokenValues.length;
    const rowSpan = spanForSlots(count, 'source');
    const tokenWidth = Number.parseFloat(sourceTokenWidth) || Number.parseFloat(layout.sourceWidth) || 10;
    const computed = rowSpan + tokenWidth;
    const clamped = Math.max(48, Math.min(88, computed));
    return `${clamped.toFixed(1)}%`;
  }, [layout.sourceWidth, question.tokenValues.length, sourceTokenWidth]);

  const sourceTokenBackdropHeight = useMemo(() => {
    const baseTokenHeight = Number.parseFloat(layout.sourceHeight) || 10;
    const computed = baseTokenHeight * 0.6;
    const clamped = Math.max(5.2, Math.min(7.0, computed));
    return `${clamped.toFixed(1)}%`;
  }, [layout.sourceHeight]);

  const sourceTokenBackdropPadding = useMemo(
    () => 'clamp(6px, 1.5vw, 12px)',
    [],
  );

  const targetSocketSizing = useMemo(() => {
    const count = question.expectedDigits.length;
    const baseWidth = Number.parseFloat(layout.targetWidth) || 12;
    const baseHeight = Number.parseFloat(layout.targetHeight) || 12;

    let width = baseWidth;
    let height = baseHeight;

    if (count === 5) {
      width *= 0.9;
      height *= 0.9;
    } else if (count === 6) {
      width *= 0.82;
      height *= 0.82;
    } else if (count >= 7) {
      width *= 0.74;
      height *= 0.74;
    }

    const normalizedWidth = Math.max(8.8, width);
    const normalizedHeight = Math.max(8.4, height);

    return {
      widthValue: normalizedWidth,
      heightValue: normalizedHeight,
      width: `${normalizedWidth.toFixed(2)}%`,
      height: `${normalizedHeight.toFixed(2)}%`,
    };
  }, [layout.targetHeight, layout.targetWidth, question.expectedDigits.length]);

  // Anchor goblin feet to the top of the receiving sockets for consistent placement across devices.
  const enemyBottomFromPlayfield = useMemo(() => {
    const targetHeightPct = targetSocketSizing.heightValue || 0;
    const socketTopY = layout.targetY - targetHeightPct / 2;
    const bottomPct = 100 - socketTopY;
    return `calc(${bottomPct.toFixed(2)}% - 10px)`;
  }, [layout.targetY, targetSocketSizing.heightValue]);

  const questionPrompt = useMemo(() => {
    if (isPractice) {
      return formatFantasyPrompt(`${question.prompt}\n\nUse place value to put the number back in order.`);
    }
    return formatFantasyPrompt(question.prompt);
  }, [isPractice, question.prompt]);

  const resetRound = useCallback((nextQuestion: QuestionState) => {
    const nextSources: Array<Token | null> = nextQuestion.tokenValues.map((value, idx) => ({
      id: `${nextQuestion.id}-token-${idx}`,
      value,
    }));
    const shuffledSources = shuffle(nextSources);

    setQuestion(nextQuestion);
    setTargetSlots(Array(nextQuestion.expectedDigits.length).fill(null));
    setSourceSlots(shuffledSources);
    setInitialSourceSlots(shuffledSources.map((token) => (token ? { ...token } : null)));
    setDragState(null);
    setIsResolving(false);
    submitLockedRef.current = false;
    setGoblinEffect('idle');
  }, []);

  useEffect(() => {
    victoryDispatchedRef.current = false;
    gameOverDispatchedRef.current = false;
    clearRoundTimeouts();
    setMatchTimeLeft(MATCH_DURATION_SECONDS);
    resetRound(makeQuestion(resolvedLevel));
  }, [clearRoundTimeouts, resetRound, resolvedLevel]);

  useEffect(() => {
    if (sessionState || isPractice || victoryDispatchedRef.current || gameOverDispatchedRef.current) return undefined;
    const intervalId = window.setInterval(() => {
      if (document.hidden) return;
      setMatchTimeLeft((prev) => Math.max(0, prev - 1));
    }, 1000);
    return () => window.clearInterval(intervalId);
  }, [isPractice, question.id, sessionState]);

  useEffect(() => {
    setShowPracticeIntro(Boolean(isPractice));
  }, [isPractice]);

  useEffect(() => () => {
    if (speechTimeoutRef.current !== null) {
      window.clearTimeout(speechTimeoutRef.current);
    }
  }, []);

  useEffect(() => {
    if (sessionState || matchTimeLeft > 0 || victoryDispatchedRef.current || gameOverDispatchedRef.current) return;
    gameOverDispatchedRef.current = true;
    setIsResolving(true);
    setFeedback(null);
    setGoblinEffect('heal');
    triggerHaptic('warning');
    setDragState(null);
    scheduleRound(() => onGameOver(Math.max(0, XP)), 220);
  }, [matchTimeLeft, onGameOver, scheduleRound, sessionState, XP]);

  const getPlayfieldScale = useCallback(() => {
    const node = playfieldRef.current;
    if (!node) return { x: 1, y: 1 };
    const rect = node.getBoundingClientRect();
    const scaleX = rect.width / (node.offsetWidth || rect.width || 1);
    const scaleY = rect.height / (node.offsetHeight || rect.height || 1);
    return {
      x: Number.isFinite(scaleX) && scaleX > 0 ? scaleX : 1,
      y: Number.isFinite(scaleY) && scaleY > 0 ? scaleY : 1,
    };
  }, []);

  const getRelativePoint = useCallback((clientX: number, clientY: number) => {
    const rect = playfieldRef.current?.getBoundingClientRect();
    if (!rect) return { x: clientX, y: clientY };
    const scale = getPlayfieldScale();
    return {
      x: (clientX - rect.left) / scale.x,
      y: (clientY - rect.top) / scale.y,
    };
  }, [getPlayfieldScale]);

  const beginDrag = useCallback((
    location: TokenLocation,
    index: number,
    event: React.PointerEvent<HTMLButtonElement>,
  ) => {
    if (isResolving || dragState) return;
    const token = location === 'target' ? targetSlots[index] : sourceSlots[index];
    if (!token) return;

    const rect = event.currentTarget.getBoundingClientRect();
    const scale = getPlayfieldScale();
    event.currentTarget.setPointerCapture(event.pointerId);
    event.currentTarget.dataset.dragStartX = String(event.clientX);
    event.currentTarget.dataset.dragStartY = String(event.clientY);

    if (location === 'target') {
      setTargetSlots((prev) => prev.map((item, slotIndex) => (slotIndex === index ? null : item)));
    } else {
      setSourceSlots((prev) => prev.map((item, slotIndex) => (slotIndex === index ? null : item)));
    }

    setDragState({
      token,
      fromLocation: location,
      fromIndex: index,
      pointerId: event.pointerId,
      clientX: event.clientX,
      clientY: event.clientY,
      offsetX: (event.clientX - rect.left) / scale.x,
      offsetY: (event.clientY - rect.top) / scale.y,
      width: rect.width / scale.x,
      height: rect.height / scale.y,
    });

    triggerHaptic('selection');
  }, [dragState, isResolving, sourceSlots, targetSlots]);

  const findDropCandidate = useCallback((
    clientX: number,
    clientY: number,
  ): { location: TokenLocation; index: number } | null => {
    const slots: NodeListOf<HTMLButtonElement> | undefined = playfieldRef.current?.querySelectorAll('[data-pvp-location]');
    if (!slots) return null;
    // Measure rendered controls, including the shell's scale, rather than guessing coordinates.
    for (const slot of Array.from(slots)) {
      const bounds = slot.getBoundingClientRect();
      if (clientX >= bounds.left - 8 && clientX <= bounds.right + 8
        && clientY >= bounds.top - 8 && clientY <= bounds.bottom + 8) {
        return { location: slot.dataset.pvpLocation as TokenLocation, index: Number(slot.dataset.pvpIndex) };
      }
    }
    return null;
  }, []);

  const tapToken = (location: TokenLocation, index: number) => {
    if (isResolving || dragState) return;
    const targets = [...targetSlots];
    const sources = [...sourceSlots];
    const token = location === 'source' ? sources[index] : targets[index];
    if (!token) return;
    const destination = (location === 'source' ? targets : sources).findIndex((item) => item === null);
    if (destination < 0) return;
    if (location === 'source') { targets[destination] = token; sources[index] = null; }
    else { sources[destination] = token; targets[index] = null; }
    setTargetSlots(targets);
    setSourceSlots(sources);
    triggerHaptic('selection');
  };

  const placeTokenInArrays = useCallback((candidate: { location: TokenLocation; index: number } | null) => {
    if (!dragState) return;

    const nextTargets = [...targetSlots];
    const nextSources = [...sourceSlots];

    const getToken = (location: TokenLocation, index: number): Token | null => (
      location === 'target' ? nextTargets[index] : nextSources[index]
    );

    const setToken = (location: TokenLocation, index: number, token: Token | null) => {
      if (location === 'target') nextTargets[index] = token;
      else nextSources[index] = token;
    };

    if (!candidate) {
      if (dragState.fromLocation === 'target') {
        const firstOpenSource = nextSources.findIndex((item) => item === null);
        if (firstOpenSource >= 0) {
          nextSources[firstOpenSource] = dragState.token;
        } else {
          setToken(dragState.fromLocation, dragState.fromIndex, dragState.token);
        }
      } else {
        setToken(dragState.fromLocation, dragState.fromIndex, dragState.token);
      }
      setTargetSlots(nextTargets);
      setSourceSlots(nextSources);
      return;
    }

    const destinationToken = getToken(candidate.location, candidate.index);
    setToken(candidate.location, candidate.index, dragState.token);

    if (destinationToken) {
      setToken(dragState.fromLocation, dragState.fromIndex, destinationToken);
    }

    setTargetSlots(nextTargets);
    setSourceSlots(nextSources);
  }, [dragState, sourceSlots, targetSlots]);

  const moveDrag = (event: React.PointerEvent<HTMLDivElement>) => {
    setDragState((current) => current?.pointerId === event.pointerId
      ? { ...current, clientX: event.clientX, clientY: event.clientY }
      : current);
  };

  const finishDrag = (event: React.PointerEvent<HTMLDivElement>) => {
      if (!dragState || event.pointerId !== dragState.pointerId) return;
      const origin = playfieldRef.current?.querySelector<HTMLButtonElement>(`[data-pvp-location="${dragState.fromLocation}"][data-pvp-index="${dragState.fromIndex}"]`);
      const distance = origin ? Math.hypot(event.clientX - Number(origin.dataset.dragStartX), event.clientY - Number(origin.dataset.dragStartY)) : Infinity;
      const openSlot = (dragState.fromLocation === 'source' ? targetSlots : sourceSlots).findIndex((token) => token === null);
      const candidate = distance < 8 && openSlot >= 0
        ? { location: (dragState.fromLocation === 'source' ? 'target' : 'source') as TokenLocation, index: openSlot }
        : findDropCandidate(event.clientX, event.clientY);
      placeTokenInArrays(candidate);
      setDragState(null);
      triggerHaptic('selection');
  };

  const cancelDrag = (event: React.PointerEvent<HTMLDivElement>) => {
    if (!dragState || event.pointerId !== dragState.pointerId) return;
    placeTokenInArrays({ location: dragState.fromLocation, index: dragState.fromIndex });
    setDragState(null);
  };

  const advanceRound = useCallback((newHealth: number) => {
    if (newHealth <= 0 && !victoryDispatchedRef.current) {
      victoryDispatchedRef.current = true;
      const finalAccuracy = attempts > 0 ? correctAnswers / attempts : 1;
      const stars = scoreToStars(finalAccuracy);
      scheduleRound(() => onVictory(stars, Math.max(0, XP)), 380);
      return;
    }

    const nextQuestion = makeQuestion(resolvedLevel);
    scheduleRound(() => {
      setFeedback(null);
      resetRound(nextQuestion);
    }, HIT_REACTION_MS + 140);
  }, [attempts, correctAnswers, onVictory, resetRound, resolvedLevel, scheduleRound, XP]);

  const canSubmit = useMemo(
    () => !isResolving && !dragState && targetSlots.length > 0 && targetSlots.every((token) => token !== null),
    [dragState, isResolving, targetSlots],
  );

  const timerProgress = useMemo(
    () => Math.max(0, Math.min(1, matchTimeLeft / MATCH_DURATION_SECONDS)),
    [matchTimeLeft],
  );

  const timerFillColor = useMemo(() => {
    const hue = Math.round(timerProgress * 120);
    return `hsl(${hue} 88% 52%)`;
  }, [timerProgress]);

  const handleSubmit = useCallback(() => {
    if (!canSubmit || submitLockedRef.current) return;
    submitLockedRef.current = true;

    const isCorrect = targetSlots.every((token, index) => token?.value === question.expectedDigits[index]);
    setIsResolving(true);
    setAttempts((prev) => prev + 1);

    if (isCorrect) {
      emitMiniGameSessionEvent(sessionEvents, 'correct_answer', { metadata: { questionId: question.id } });
      const nextHealth = Math.max(0, goblinHealth - 1);
      setGoblinHealth(nextHealth);
      setCorrectAnswers((prev) => prev + 1);
      setScore((prev) => prev + (140 + resolvedLevel * 22));
      setFeedback({
        tone: 'success',
        message: 'Number restored!\nThe island markers are back in order.',
      });
      setGoblinEffect('hit');
      setSlotPulseKey((prev) => prev + 1);
      setEnemySpeech(GOBLIN_DAMAGE_LINES[Math.floor(Math.random() * GOBLIN_DAMAGE_LINES.length)]);
      if (speechTimeoutRef.current !== null) {
        window.clearTimeout(speechTimeoutRef.current);
      }
      speechTimeoutRef.current = window.setTimeout(() => setEnemySpeech(null), 920);
      triggerHaptic('success');
      advanceRound(nextHealth);
      return;
    }

      emitMiniGameSessionEvent(sessionEvents, 'incorrect_answer', { metadata: { questionId: question.id } });
      setFeedback({
        tone: 'error',
        message: 'Try again. Check each digit’s place value.',
      });
      setGoblinEffect('heal');
      setBoardShake(true);
      setWrongFlash(true);
      triggerHaptic('warning');
      setTargetSlots(Array(question.expectedDigits.length).fill(null));
      setSourceSlots(initialSourceSlots.map((token) => (token ? { ...token } : null)));

    scheduleRound(() => {
      setFeedback(null);
      setIsResolving(false);
      submitLockedRef.current = false;
      setGoblinEffect('idle');
      setBoardShake(false);
      setWrongFlash(false);
    }, 520);
  }, [advanceRound, canSubmit, goblinHealth, initialSourceSlots, question.expectedDigits, question.id, resolvedLevel, scheduleRound, sessionEvents, targetSlots]);

  const numberStyle: React.CSSProperties = {
    fontFamily: 'var(--font-fredoka)',
    letterSpacing: '0.01em',
    textShadow: '0 2px 0 rgba(5,11,29,0.7)',
  };

  const topHudLayout = useMemo(() => ({
    rowHeight: 'clamp(2.8rem, 7.4vh, 3.9rem)',
    profileWidth: 'clamp(9.6rem, 42vw, 13.4rem)',
    timerWidth: 'clamp(10.6rem, 42vw, 15.6rem)',
  }), []);

  return (
    <div
      className="relative z-20 h-full w-full min-h-0 overflow-hidden select-none"
      style={{ touchAction: 'manipulation' }}
    >
      <div className="relative z-10 h-full w-full">
      <PracticeIntroPopup
        open={showPracticeIntro}
        title="Place Value Panic"
        body="The Monster Minds have scrambled the number stones.\nPlace each digit in the correct position.\nCheck the value of each place carefully."
        briefing={practiceBriefing}
        onAction={() => setShowPracticeIntro(false)}
      />
      <div className="pointer-events-none absolute inset-0 z-0 overflow-hidden">
        <img
          src={forestBackground}
          alt=""
          aria-hidden="true"
          draggable={false}
          className="absolute inset-0 h-full w-full object-cover object-center"
        />
        <div className="absolute inset-0 bg-[linear-gradient(180deg,rgba(7,14,24,0.18)_0%,rgba(7,14,24,0.24)_44%,rgba(7,14,24,0.56)_100%)]" />
      </div>
      {!useSharedTopHud ? (
        <div
          className="pointer-events-none absolute inset-x-0 top-0 z-40"
          style={{
            paddingTop: 'max(0.4rem, env(safe-area-inset-top))',
            paddingLeft: 'max(0.55rem, env(safe-area-inset-left))',
            paddingRight: 'max(0.55rem, env(safe-area-inset-right))',
          }}
        >
          <div className="flex w-full items-center justify-between gap-[clamp(0.25rem,1.6vw,0.75rem)] py-[clamp(0.14rem,0.65vh,0.4rem)]">
            <div
              className="relative shrink-0"
              style={{ height: topHudLayout.rowHeight, width: topHudLayout.profileWidth }}
            >
              <img
                src={hudAvatarName}
                alt=""
                aria-hidden="true"
                draggable={false}
                className="absolute inset-0 h-full w-full object-contain"
              />
              <div className="absolute left-[2.8%] top-1/2 h-[79%] w-[26%] -translate-y-1/2">
                <div className="relative h-full w-full">
                  <div className="absolute inset-[10%] overflow-hidden rounded-[28%]">
                    <img
                      src={selectedAvatar.portrait || selectedAvatar.image}
                      alt={selectedAvatar.name}
                      draggable={false}
                      className="h-full w-full object-contain"
                    />
                  </div>
                </div>
              </div>
              <div className="pointer-events-none absolute left-[31%] right-[8.5%] top-1/2 -translate-y-1/2 overflow-hidden text-left text-[clamp(0.76rem,2.35vw,1.06rem)] font-black uppercase tracking-[0.06em] text-cyan-50">
                <span
                  className="block max-w-full overflow-hidden text-ellipsis whitespace-nowrap"
                  style={{ textShadow: '0 1px 2px rgba(2,6,23,0.6)' }}
                >
                  {playerName}
                </span>
              </div>
            </div>

            <div
              className="relative shrink-0"
              style={{ height: topHudLayout.rowHeight, width: topHudLayout.timerWidth }}
            >
              <div className="pointer-events-none absolute inset-0 flex items-center">
                <div className="flex h-[82%] w-full items-center rounded-full border border-cyan-200/35 bg-slate-900/62 px-[clamp(0.35rem,1.3vw,0.62rem)] shadow-[0_6px_16px_rgba(2,6,23,0.45)]">
                  <img
                    src={hourglassIcon}
                    alt=""
                    aria-hidden="true"
                    draggable={false}
                    className="h-[74%] w-auto shrink-0 object-contain drop-shadow-[0_2px_4px_rgba(2,6,23,0.5)]"
                  />
                  <div className="relative ml-[clamp(0.32rem,1.2vw,0.56rem)] h-[44%] flex-1 overflow-hidden rounded-full border border-cyan-100/25 bg-slate-950/58">
                    <motion.div
                      className="absolute inset-y-0 left-0 rounded-full"
                      animate={{ width: `${timerProgress * 100}%`, backgroundColor: timerFillColor }}
                      transition={{ duration: 0.25, ease: 'easeOut' }}
                      style={{
                        boxShadow: '0 0 10px rgba(34,197,94,0.45), inset 0 1px 0 rgba(255,255,255,0.3)',
                        backgroundImage: 'linear-gradient(180deg, rgba(255,255,255,0.28) 0%, rgba(255,255,255,0.08) 100%)',
                      }}
                    />
                    <div className="absolute inset-[1px] rounded-full bg-[linear-gradient(to_right,rgba(255,255,255,0.1)_1px,transparent_1px)] bg-[length:12%_100%]" />
                  </div>
                  <span className="ml-[clamp(0.35rem,1.2vw,0.58rem)] shrink-0 text-[clamp(0.62rem,1.9vw,0.92rem)] font-black uppercase tracking-[0.06em] text-white">
                    {matchTimeLeft}s
                  </span>
                </div>
              </div>
            </div>
          </div>
        </div>
      ) : null}

      <div className="legend-pvp-question pointer-events-none absolute z-[60]" style={{ inset: '0 0 auto' }}>
        <GameQuestionCard
          title="Place Value Panic"
          className="mx-auto rounded-[0.95rem] px-3.25 py-2.25 text-center"
          titleClassName="text-[9px] tracking-[0.28em] md:text-[10px]"
          bodyClassName="mt-1 text-[clamp(0.82rem,1.65vw,0.98rem)] leading-snug md:text-[clamp(0.9rem,1.7vw,1.04rem)]"
          style={{ position: 'relative', top: '5px', width: '94%', transform: 'none' }}
        >
          {questionPrompt}
        </GameQuestionCard>
      </div>

      <motion.div
        ref={playfieldRef}
        className="absolute inset-0 z-20"
        onPointerMove={moveDrag}
        onPointerUp={finishDrag}
        onPointerCancel={cancelDrag}
        animate={boardShake && !reducedMotion ? { x: [0, -6, 6, -3, 3, 0] } : { x: 0 }}
        transition={{ duration: 0.34, ease: 'easeInOut' }}
      >
        <div
          className="legend-pvp-targets pointer-events-auto absolute left-1/2 top-[32%] z-10 -translate-x-1/2"
          style={{ width: question.expectedDigits.length > 5 ? '96%' : '83%' }}
        >
          <div className="pvp-stone-panel" data-pvp-number-stones>
            <div className="pvp-stone-heading">
              <span>Number Stones</span>
            </div>
            <div className="pvp-stone-row">
                {activeTargetAnchors.map((anchor, idx) => {
              const token = targetSlots[idx];
              const isDraggingThis = dragState?.fromLocation === 'target' && dragState.fromIndex === idx;
              return (
            <motion.button
              key={`target-${idx}`}
              type="button"
              onPointerDown={(event) => beginDrag('target', idx, event)}
              onClick={(event) => { if (event.detail === 0) tapToken('target', idx); }}
              aria-label={`${PLACE_NAMES[question.placeHints[idx]]} place${token ? `, digit ${token.value}. Tap to remove` : ', empty'}`}
              data-pvp-location="target"
              data-pvp-index={idx}
              className={`pvp-number-stone relative flex-1 touch-none${token ? ' is-filled' : ''}${wrongFlash ? ' is-error' : ''}${feedback?.tone === 'success' ? ' is-solved' : ''}`}
              data-button-skin="none"
              disabled={isResolving}
              whileHover={reducedMotion ? undefined : { y: -2 }}
              whileTap={reducedMotion ? undefined : { scale: 0.96 }}
              animate={
                token
                  ? {
                      scale: slotPulseKey > 0 && !reducedMotion ? [1, 1.04, 1] : 1,
                    }
                  : {
                      scale: 1,
                    }
              }
              transition={{ duration: 0.34, ease: 'easeOut' }}
              style={{
                maxWidth: '68px',
                minWidth: 0,
                height: '72px',
              }}
            >
              <span className="pvp-place-label" data-pvp-place-label aria-hidden="true">
                {question.placeHints.length <= 4 ? PLACE_NAMES[question.placeHints[idx]] : question.placeHints[idx]}
              </span>
              <span className="pvp-stone-face" aria-hidden="true">
                <span className={`pvp-stone-digit${token ? '' : ' is-empty'}`} data-pvp-stone-digit>{token?.value ?? '—'}</span>
              </span>
              {isDraggingThis ? <span className="sr-only">Dragging</span> : null}
            </motion.button>
          );
        })}
            </div>
          </div>
        </div>

        <div
          className="legend-pvp-sources pointer-events-auto absolute left-1/2 z-40 -translate-x-1/2"
          style={{ width: '84%', top: sourceSlots.length > 6 ? '72%' : '75%' }}
        >
          <div className="pvp-digit-panel">
            <div className="pvp-stone-heading">
              <span>Tap or drag the digits</span>
            </div>
            <div className={`relative gap-1 ${sourceSlots.length > 6 ? 'grid grid-cols-5' : 'flex items-center justify-center'}`}>
              {activeSourceAnchors.map((anchor, idx) => {
              const token = sourceSlots[idx];
              const isDraggingThis = dragState?.fromLocation === 'source' && dragState.fromIndex === idx;
              return (
            <motion.button
              key={`source-${idx}`}
              type="button"
              onPointerDown={(event) => beginDrag('source', idx, event)}
              onClick={(event) => { if (event.detail === 0) tapToken('source', idx); }}
              aria-label={token ? `Digit ${token.value}` : 'Empty digit space'}
              data-pvp-location="source"
              data-pvp-index={idx}
              className="relative z-[22] flex-1 rounded-xl touch-none border-0 bg-transparent"
              data-button-skin="none"
              tabIndex={token ? 0 : -1}
              initial={reducedMotion ? false : { opacity: 0, y: 8, scale: 0.96 }}
              animate={{ opacity: token ? 1 : 0, y: 0, scale: token ? 1 : 0.94 }}
              transition={{ duration: 0.26, ease: 'easeOut', delay: idx * 0.04 }}
              style={{
                maxWidth: '64px',
                minWidth: 0,
                height: sourceSlots.length > 6 ? '44px' : '58px',
              }}
            >
              {token ? (
                <>
                  <span
                    className="absolute left-1/2 top-1/2 block -translate-x-1/2 -translate-y-1/2 font-black text-white"
                    style={{ ...numberStyle, fontSize: '2.2rem' }}
                  >
                    {token.value}
                  </span>
                </>
              ) : null}
              {isDraggingThis ? <span className="sr-only">Dragging</span> : null}
            </motion.button>
          );
        })}
            </div>
          </div>
        </div>

        <div
          className="pointer-events-none absolute left-1/2 top-[52.4%] z-30 -translate-x-1/2"
          style={{ width: `${layout.enemyWidth + 6}%` }}
        >
          <div className="relative">
            <AnimatePresence>
              {enemySpeech ? (
                <motion.div
                  key={`enemy-speech-${enemySpeech}`}
                  initial={{ opacity: 0, y: reducedMotion ? 0 : 6 }}
                  animate={{ opacity: 1, y: 0 }}
                  exit={{ opacity: 0 }}
                  transition={{ duration: 0.22, ease: 'easeOut' }}
                  className="absolute left-1/2 top-[-22%] z-40 -translate-x-1/2"
                >
                  <div className="relative">
                    <div className="relative rounded-full border border-amber-200/70 bg-[radial-gradient(circle_at_top,rgba(255,255,255,0.96),rgba(254,243,199,0.94)_42%,rgba(254,215,170,0.92)_100%)] px-3.5 py-1.5 text-[clamp(0.58rem,1.5vw,0.82rem)] font-black uppercase tracking-[0.05em] text-slate-800 shadow-[0_10px_18px_rgba(2,6,23,0.45)]">
                      {enemySpeech}
                    </div>
                    <div className="absolute left-1/2 top-[100%] h-2.5 w-2.5 -translate-x-1/2 rotate-45 border-b border-r border-amber-200/70 bg-amber-100/95" />
                  </div>
                </motion.div>
              ) : null}
            </AnimatePresence>
            <div className="absolute left-1/2 top-[-6%] z-40 -translate-x-1/2">
              <div className="w-[160px] rounded-2xl border border-amber-200/35 bg-slate-900/80 p-1.5 shadow-[0_10px_20px_rgba(2,6,23,0.46)] sm:w-[178px]">
                <div className="mb-1 text-center text-[8px] font-black uppercase tracking-[0.12em] text-amber-200 md:text-[9px]">
                  Monster Mind
                </div>
                <div className="relative h-2 overflow-hidden rounded-full border border-slate-700/80 bg-slate-950/80" role="progressbar" aria-label="Monster Mind strength" aria-valuemin={0} aria-valuemax={GOBLIN_MAX_HEALTH} aria-valuenow={goblinHealth} data-pvp-health={goblinHealth}>
                  <motion.div
                    className="absolute inset-y-0 left-0 rounded-full bg-gradient-to-r from-rose-500 via-rose-400 to-orange-300 shadow-[0_0_12px_rgba(251,113,133,0.75)]"
                    animate={{ width: `${(goblinHealth / GOBLIN_MAX_HEALTH) * 100}%` }}
                    transition={{ type: 'spring', stiffness: 210, damping: 26 }}
                  />
                  <div className="pointer-events-none absolute inset-0 bg-[linear-gradient(to_right,rgba(255,255,255,0.14)_1px,transparent_1px)] bg-[length:10%_100%]" />
                </div>
              </div>
            </div>
            <div className="pvp-enemy-ground" aria-hidden="true" />
            <MonsterMindActor
              src={animatedEnemy1}
              alt="Monster Mind"
              reaction={goblinHealth <= 0 ? 'defeated' : goblinEffect === 'heal' ? 'taunt' : goblinEffect}
              reactionKey={slotPulseKey}
              className="relative translate-y-[8px]"
            />
          </div>
        </div>

        <div
          className="game-submit-dock-fixed"
          style={{
            bottom: 'calc(env(safe-area-inset-bottom) + 0.55rem)',
          }}
        >
          <button
            type="button"
            onClick={handleSubmit}
            disabled={!canSubmit}
            className="ui-button-primary relative z-40 border-0 bg-transparent px-0 py-0 disabled:cursor-not-allowed disabled:opacity-60"
            style={{
              width: `${layout.submitWidth}%`,
              height: `${layout.submitHeight}%`,
            }}
          >
            <span
              className="pointer-events-none absolute inset-x-[14%] top-1/2 -translate-y-1/2 text-center text-[clamp(0.9rem,2.5vw,1.18rem)] font-black uppercase tracking-[0.08em] text-[#16233d]"
            >
              Submit
            </span>
          </button>
        </div>
      </motion.div>

      {dragState ? (
        (() => {
          const relative = getRelativePoint(dragState.clientX, dragState.clientY);
          return (
            <motion.div
              className="pvp-floating-stone pointer-events-none absolute z-[80] flex items-center justify-center"
              style={{
                left: relative.x - (dragState.width / 2),
                top: relative.y - (dragState.height / 2),
                width: dragState.width,
                height: dragState.height,
              }}
              initial={{ scale: 1 }}
              animate={{ scale: reducedMotion ? 1 : 1.03 }}
            >
              <span
                className="absolute left-1/2 top-1/2 -translate-x-1/2 -translate-y-1/2 font-black text-white"
                style={{ ...numberStyle, fontSize: '2.2rem' }}
              >
                {dragState.token.value}
              </span>
            </motion.div>
          );
        })()
      ) : null}

      <AnimatePresence>
        {feedback ? (
          <motion.div
            key={feedback.message}
            initial={{ opacity: 0, y: 16 }}
            animate={{ opacity: 1, y: 0 }}
            exit={{ opacity: 0, y: -16 }}
            className={`pointer-events-none absolute bottom-[calc(env(safe-area-inset-bottom)+4.6rem)] left-1/2 z-40 -translate-x-1/2 rounded-[1.1rem] border px-5 py-3 text-center text-sm font-black leading-snug shadow-[0_12px_28px_rgba(2,6,23,0.55)] whitespace-pre-line ${
              feedback.tone === 'success'
                ? 'border-emerald-200/70 bg-emerald-500/35 text-emerald-50'
                : 'border-rose-200/70 bg-rose-500/35 text-amber-50'
            }`}
          >
            {feedback.message}
          </motion.div>
        ) : null}
      </AnimatePresence>
      </div>
    </div>
  );
};

export default PlaceValuePanicGame;
