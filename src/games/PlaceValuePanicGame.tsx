import React, { useCallback, useEffect, useLayoutEffect, useMemo, useRef, useState } from 'react';
import { AnimatePresence, motion } from 'motion/react';
import medButton from '../assets/casual_ui/inputs/btn_1.png';
import animatedEnemy1 from '../assets/maps/ezgif-261d69e7ae90ee8c.webp';
import hudAvatarName from '../assets/ui_frames/hudfortextplace_slices/hud_avatar_name.png';
import hourglassIcon from '../assets/casual_ui/icons/hourglass.png';
import questionBarTiny from '../assets/ui_frames/hudfortextplace_slices/text_bar_tiny.png';
import questionBarSmall from '../assets/ui_frames/hudfortextplace_slices/text_bar_small.png';
import questionBarMedium from '../assets/ui_frames/hudfortextplace_slices/text_bar_medium.png';
import questionBarLarge from '../assets/ui_frames/hudfortextplace_slices/text_bar_large.png';
import socketM from '../assets/casual_ui/updaed_sockets_slices/socket_m.png';
import socketHth from '../assets/casual_ui/updaed_sockets_slices/socket_hth.png';
import socketTth from '../assets/casual_ui/updaed_sockets_slices/socket_tth.png';
import socketTh from '../assets/casual_ui/updaed_sockets_slices/socket_th.png';
import socketH from '../assets/casual_ui/updaed_sockets_slices/socket_h.png';
import socketT from '../assets/casual_ui/updaed_sockets_slices/socket_t.png';
import socketU from '../assets/casual_ui/updaed_sockets_slices/socket_u.png';
import { triggerHaptic } from '../haptics';
import { AVATARS } from '../constants';
import { formatFantasyPrompt } from '../utils/fantasyPrompt';

interface PlaceValuePanicGameProps {
  levelId: number;
  miniGameLevel?: number;
  avatarId: string;
  useSharedTopHud?: boolean;
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
const TARGET_ROW_Y_OFFSET_PX = 0;
const SOURCE_ROW_Y_OFFSET_PX = 30;

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
];

const TENS_WORDS = ['', '', 'twenty', 'thirty', 'forty', 'fifty', 'sixty', 'seventy', 'eighty', 'ninety'];

const randomInt = (min: number, max: number) => Math.floor(Math.random() * (max - min + 1)) + min;

const shuffle = <T,>(items: T[]): T[] => {
  const clone = [...items];
  for (let i = clone.length - 1; i > 0; i -= 1) {
    const j = Math.floor(Math.random() * (i + 1));
    [clone[i], clone[j]] = [clone[j], clone[i]];
  }
  return clone;
};

const createStaticEnemyFrame = (src: string): Promise<string> =>
  new Promise((resolve, reject) => {
    const image = new Image();
    image.onload = () => {
      try {
        const canvas = document.createElement('canvas');
        canvas.width = image.naturalWidth;
        canvas.height = image.naturalHeight;
        const ctx = canvas.getContext('2d');
        if (!ctx) {
          resolve(src);
          return;
        }

        ctx.drawImage(image, 0, 0);
        const imageData = ctx.getImageData(0, 0, canvas.width, canvas.height);
        const data = imageData.data;
        const width = canvas.width;
        const height = canvas.height;
        const visited = new Uint8Array(width * height);
        const stack: number[] = [];

        const isNearBlack = (index: number) => {
          const r = data[index];
          const g = data[index + 1];
          const b = data[index + 2];
          const a = data[index + 3];
          if (a === 0) return false;
          const max = Math.max(r, g, b);
          const min = Math.min(r, g, b);
          return max <= 42 && max - min <= 18;
        };

        const pushIfBlack = (x: number, y: number) => {
          if (x < 0 || y < 0 || x >= width || y >= height) return;
          const point = y * width + x;
          if (visited[point]) return;
          const pixelIndex = point * 4;
          if (!isNearBlack(pixelIndex)) return;
          visited[point] = 1;
          stack.push(point);
        };

        for (let x = 0; x < width; x += 1) {
          pushIfBlack(x, 0);
          pushIfBlack(x, height - 1);
        }
        for (let y = 0; y < height; y += 1) {
          pushIfBlack(0, y);
          pushIfBlack(width - 1, y);
        }

        while (stack.length > 0) {
          const point = stack.pop() as number;
          const pixelIndex = point * 4;
          data[pixelIndex + 3] = 0;
          const x = point % width;
          const y = (point / width) | 0;
          pushIfBlack(x + 1, y);
          pushIfBlack(x - 1, y);
          pushIfBlack(x, y + 1);
          pushIfBlack(x, y - 1);
        }

        ctx.putImageData(imageData, 0, 0);
        resolve(canvas.toDataURL('image/png'));
      } catch (error) {
        reject(error);
      }
    };
    image.onerror = () => reject(new Error('Failed to load enemy frame'));
    image.src = src;
  });

const toWordsUnderHundred = (n: number): string => {
  if (n < 20) return ONES_WORDS[n];
  const tens = Math.floor(n / 10);
  const ones = n % 10;
  if (ones === 0) return TENS_WORDS[tens];
  return `${TENS_WORDS[tens]} ${ONES_WORDS[ones]}`;
};

const toWordsUnderThousand = (n: number): string => {
  if (n < 100) return toWordsUnderHundred(n);
  const hundreds = Math.floor(n / 100);
  const rest = n % 100;
  return rest === 0
    ? `${ONES_WORDS[hundreds]} hundred`
    : `${ONES_WORDS[hundreds]} hundred and ${toWordsUnderHundred(rest)}`;
};

const toWords = (n: number): string => {
  if (n < 1000) return toWordsUnderThousand(n);
  if (n < 1000000) {
    const thousands = Math.floor(n / 1000);
    const rest = n % 1000;
    const thousandWords = toWordsUnderThousand(thousands);
    if (rest === 0) return `${thousandWords} thousand`;
    if (rest < 100) return `${thousandWords} thousand and ${toWordsUnderThousand(rest)}`;
    return `${thousandWords} thousand, ${toWordsUnderThousand(rest)}`;
  }
  if (n === 1000000) {
    return 'one million';
  }
  return n.toLocaleString('en-GB');
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

const getSocketAsset = (placeHint: string, _slotIndex: number, _placeHints: string[]) => {
  if (placeHint === 'M') return socketM;
  if (placeHint === 'Hth') return socketHth;
  if (placeHint === 'Tth') return socketTth;
  if (placeHint === 'Th') return socketTh;
  if (placeHint === 'H') return socketH;
  if (placeHint === 'T') return socketT;
  return socketU;
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
  const prompt = toWords(promptNumber).toUpperCase();

  return {
    id: `${Date.now()}-${Math.random().toString(36).slice(2, 8)}`,
    prompt,
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
      questionTop: isTablet ? 11.8 : (isTallPhone ? 12.9 : 12.6),
      questionWidth: isTablet ? 54 : 66,
      questionHeight: isTablet ? 13.4 : 14.8,
      submitY: isTablet ? 88.2 : (isTallPhone ? 88.8 : 88.5),
      submitWidth: isTablet ? 30 : 46,
      submitHeight: isTablet ? 8.6 : 9.2,
      targetY: isTablet ? 79.2 : (isTallPhone ? 80.3 : 79.9),
      sourceY: isTablet ? 32.8 : (isTallPhone ? 33.8 : 33.5),
      targetWidth: isTablet ? '12.8%' : '16.9%',
      sourceWidth: isTablet ? '9.8%' : '12.2%',
      targetHeight: isTablet ? '12.2%' : '14.8%',
      sourceHeight: isTablet ? '8.8%' : '10.2%',
      targetFont: isTablet ? 'clamp(2.2rem,4.9vw,3.8rem)' : 'clamp(2.1rem,5.5vw,3.55rem)',
      sourceFont: isTablet ? 'clamp(2.05rem,4.5vw,3.45rem)' : 'clamp(1.95rem,5.1vw,3.15rem)',
      healthTop: isTablet ? 58.6 : (isTallPhone ? 59.2 : 58.9),
      healthWidth: isTablet ? 16 : 21,
      healthLeft: isTablet ? 66.4 : 68.8,
      enemyWidth: isTablet ? 46 : 54,
    };
  }, [viewport.height, viewport.width]);

  const [question, setQuestion] = useState<QuestionState>(() => makeQuestion(resolvedLevel));
  const [targetSlots, setTargetSlots] = useState<Array<Token | null>>([]);
  const [sourceSlots, setSourceSlots] = useState<Array<Token | null>>([]);
  const [initialSourceSlots, setInitialSourceSlots] = useState<Array<Token | null>>([]);
  const [dragState, setDragState] = useState<DragState | null>(null);
  const [goblinHealth, setGoblinHealth] = useState<number>(GOBLIN_MAX_HEALTH);
  const [XP, setScore] = useState<number>(0);
  const [matchTimeLeft, setMatchTimeLeft] = useState<number>(MATCH_DURATION_SECONDS);
  const [attempts, setAttempts] = useState<number>(0);
  const [correctAnswers, setCorrectAnswers] = useState<number>(0);
  const [feedback, setFeedback] = useState<{ tone: 'success' | 'error'; message: string } | null>(null);
  const [isResolving, setIsResolving] = useState(false);
  const [goblinEffect, setGoblinEffect] = useState<GoblinEffect>('idle');
  const [idleEnemySrc, setIdleEnemySrc] = useState<string>(animatedEnemy1);
  const [showHitFx, setShowHitFx] = useState(false);
  const [enemySpeech, setEnemySpeech] = useState<string | null>(null);
  const [slotPulseKey, setSlotPulseKey] = useState(0);
  const [boardShake, setBoardShake] = useState(false);
  const [wrongFlash, setWrongFlash] = useState(false);

  const victoryDispatchedRef = useRef(false);
  const gameOverDispatchedRef = useRef(false);
  const speechTimeoutRef = useRef<number | null>(null);
  const playfieldRef = useRef<HTMLDivElement | null>(null);

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
    return `calc(${bottomPct.toFixed(2)}% - 23px)`;
  }, [layout.targetY, targetSocketSizing.heightValue]);

  const questionFrameConfig = useMemo(() => {
    const promptLength = question.prompt.trim().length;
    const isTablet = Math.min(viewport.width, viewport.height) >= 760;

    if (promptLength <= 26) {
      return {
        src: questionBarTiny,
        width: isTablet ? 40 : 56,
        height: isTablet ? 9.2 : 11.1,
      };
    }
    if (promptLength <= 44) {
      return {
        src: questionBarSmall,
        width: isTablet ? 52 : 66,
        height: isTablet ? 9.4 : 11.4,
      };
    }
    if (promptLength <= 74) {
      return {
        src: questionBarMedium,
        width: isTablet ? 64 : 78,
        height: isTablet ? 9.7 : 11.7,
      };
    }
    return {
      src: questionBarLarge,
      width: isTablet ? 74 : 88,
      height: isTablet ? 10.0 : 12.0,
    };
  }, [question.prompt, viewport.height, viewport.width]);

  const questionTextBaseFontPx = useMemo(() => {
    const promptLength = question.prompt.trim().length;
    const isTablet = Math.min(viewport.width, viewport.height) >= 760;
    if (isTablet) {
      if (promptLength > 84) return 13;
      if (promptLength > 66) return 14;
      if (promptLength > 48) return 15;
      return 16;
    }
    if (promptLength > 84) return 11.5;
    if (promptLength > 66) return 12.5;
    if (promptLength > 48) return 13.5;
    return 14.5;
  }, [question.prompt, viewport.height, viewport.width]);

  const questionTextFrameRef = useRef<HTMLDivElement | null>(null);
  const questionTextContentRef = useRef<HTMLSpanElement | null>(null);

  useLayoutEffect(() => {
    const frame = questionTextFrameRef.current;
    const content = questionTextContentRef.current;
    if (!frame || !content) return;

    let size = questionTextBaseFontPx;
    const minSize = 9.5;

    content.style.fontSize = `${size}px`;
    content.style.lineHeight = '1.08';
    content.style.letterSpacing = '0.01em';

    const fits = () =>
      content.scrollHeight <= frame.clientHeight + 0.5 && content.scrollWidth <= frame.clientWidth + 0.5;

    let guard = 0;
    while (!fits() && size > minSize && guard < 28) {
      size -= 0.5;
      content.style.fontSize = `${size}px`;
      guard += 1;
    }

    if (!fits()) {
      content.style.letterSpacing = '0';
    }
  }, [question.prompt, questionTextBaseFontPx, viewport.height, viewport.width]);

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
    setGoblinEffect('idle');
    setShowHitFx(false);
  }, []);

  useEffect(() => {
    victoryDispatchedRef.current = false;
    gameOverDispatchedRef.current = false;
    setMatchTimeLeft(MATCH_DURATION_SECONDS);
    resetRound(makeQuestion(resolvedLevel));
  }, [resetRound, resolvedLevel]);

  useEffect(() => {
    if (victoryDispatchedRef.current || gameOverDispatchedRef.current) return undefined;
    const intervalId = window.setInterval(() => {
      setMatchTimeLeft((prev) => Math.max(0, prev - 1));
    }, 1000);
    return () => window.clearInterval(intervalId);
  }, [question.id]);

  useEffect(() => {
    let mounted = true;
    createStaticEnemyFrame(animatedEnemy1)
      .then((frame) => {
        if (mounted) setIdleEnemySrc(frame);
      })
      .catch(() => {
        if (mounted) setIdleEnemySrc(animatedEnemy1);
      });

    return () => {
      mounted = false;
    };
  }, []);

  useEffect(() => {
    if (goblinEffect !== 'hit') return undefined;
    setShowHitFx(true);
    const timeoutId = window.setTimeout(() => setShowHitFx(false), HIT_REACTION_MS);
    return () => window.clearTimeout(timeoutId);
  }, [goblinEffect]);

  useEffect(() => () => {
    if (speechTimeoutRef.current !== null) {
      window.clearTimeout(speechTimeoutRef.current);
    }
  }, []);

  useEffect(() => {
    if (matchTimeLeft > 0 || victoryDispatchedRef.current || gameOverDispatchedRef.current) return;
    gameOverDispatchedRef.current = true;
    setIsResolving(true);
    setFeedback(null);
    setGoblinEffect('heal');
    triggerHaptic('warning');
    setDragState(null);
    window.setTimeout(() => onGameOver(Math.max(0, XP)), 220);
  }, [matchTimeLeft, onGameOver, XP]);

  const getRelativePoint = useCallback((clientX: number, clientY: number) => {
    const rect = playfieldRef.current?.getBoundingClientRect();
    if (!rect) return { x: clientX, y: clientY };
    return {
      x: clientX - rect.left,
      y: clientY - rect.top,
    };
  }, []);

  const beginDrag = useCallback((
    location: TokenLocation,
    index: number,
    event: React.PointerEvent<HTMLButtonElement>,
  ) => {
    if (isResolving || dragState) return;
    const token = location === 'target' ? targetSlots[index] : sourceSlots[index];
    if (!token) return;

    const rect = event.currentTarget.getBoundingClientRect();
    event.currentTarget.setPointerCapture(event.pointerId);

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
      offsetX: event.clientX - rect.left,
      offsetY: event.clientY - rect.top,
      width: rect.width,
      height: rect.height,
    });

    triggerHaptic('selection');
  }, [dragState, isResolving, sourceSlots, targetSlots]);

  const findDropCandidate = useCallback((
    clientX: number,
    clientY: number,
    fromLocation: TokenLocation,
  ): { location: TokenLocation; index: number } | null => {
    const rect = playfieldRef.current?.getBoundingClientRect();
    if (!rect) return null;

    const targetPct = targetSocketSizing.widthValue / 100;
    const sourcePct = Number.parseFloat(layout.sourceWidth) / 100;
    const targetRadius = Math.max(56, rect.width * Math.max(0.09, targetPct * 0.95));
    const sourceRadius = Math.max(42, rect.width * Math.max(0.07, sourcePct * 0.72));

    let bestTarget: { index: number; distance: number } | null = null;
    let bestSource: { index: number; distance: number } | null = null;

    activeTargetAnchors.forEach((anchor, index) => {
      const cx = rect.left + (anchor.x / 100) * rect.width;
      const cy = rect.top + (layout.targetY / 100) * rect.height - TARGET_ROW_Y_OFFSET_PX;
      const d = Math.hypot(clientX - cx, clientY - cy);
      if (!bestTarget || d < bestTarget.distance) bestTarget = { index, distance: d };
    });

    activeSourceAnchors.forEach((anchor, index) => {
      const cx = rect.left + (anchor.x / 100) * rect.width;
      const cy = rect.top + (layout.sourceY / 100) * rect.height - SOURCE_ROW_Y_OFFSET_PX;
      const d = Math.hypot(clientX - cx, clientY - cy);
      if (!bestSource || d < bestSource.distance) bestSource = { index, distance: d };
    });

    // Prefer target sockets when dragging answer tokens downward from the source row.
    if (fromLocation === 'source') {
      if (bestTarget && bestTarget.distance <= targetRadius * 1.45) {
        return { location: 'target', index: bestTarget.index };
      }
      if (bestSource && bestSource.distance <= sourceRadius) {
        return { location: 'source', index: bestSource.index };
      }
      if (bestTarget && clientY >= rect.top + rect.height * 0.54) {
        return { location: 'target', index: bestTarget.index };
      }
      return null;
    }

    if (bestTarget && bestTarget.distance <= targetRadius) {
      return { location: 'target', index: bestTarget.index };
    }
    if (bestSource && bestSource.distance <= sourceRadius * 1.2) {
      return { location: 'source', index: bestSource.index };
    }
    return null;
  }, [activeSourceAnchors, activeTargetAnchors, layout.sourceWidth, layout.sourceY, layout.targetY, targetSocketSizing.widthValue]);

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

  useEffect(() => {
    if (!dragState) return undefined;

    const onMove = (event: PointerEvent) => {
      if (event.pointerId !== dragState.pointerId) return;
      setDragState((current) => {
        if (!current || current.pointerId !== event.pointerId) return current;
        return {
          ...current,
          clientX: event.clientX,
          clientY: event.clientY,
        };
      });
    };

    const onFinish = (event: PointerEvent) => {
      if (event.pointerId !== dragState.pointerId) return;
      const candidate = findDropCandidate(event.clientX, event.clientY, dragState.fromLocation);
      placeTokenInArrays(candidate);
      setDragState(null);
      triggerHaptic('selection');
    };

    window.addEventListener('pointermove', onMove);
    window.addEventListener('pointerup', onFinish);
    window.addEventListener('pointercancel', onFinish);

    return () => {
      window.removeEventListener('pointermove', onMove);
      window.removeEventListener('pointerup', onFinish);
      window.removeEventListener('pointercancel', onFinish);
    };
  }, [dragState, findDropCandidate, placeTokenInArrays]);

  const advanceRound = useCallback((newHealth: number) => {
    if (newHealth <= 0 && !victoryDispatchedRef.current) {
      victoryDispatchedRef.current = true;
      const finalAccuracy = attempts > 0 ? correctAnswers / attempts : 1;
      const stars = scoreToStars(finalAccuracy);
      window.setTimeout(() => onVictory(stars, Math.max(0, XP)), 380);
      return;
    }

    const nextQuestion = makeQuestion(resolvedLevel);
    window.setTimeout(() => {
      setFeedback(null);
      resetRound(nextQuestion);
    }, HIT_REACTION_MS + 140);
  }, [attempts, correctAnswers, onVictory, resetRound, resolvedLevel, XP]);

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
    if (!canSubmit) return;

    const isCorrect = targetSlots.every((token, index) => token?.value === question.expectedDigits[index]);
    setIsResolving(true);
    setAttempts((prev) => prev + 1);

    if (isCorrect) {
      const nextHealth = Math.max(0, goblinHealth - 1);
      setGoblinHealth(nextHealth);
      setCorrectAnswers((prev) => prev + 1);
      setScore((prev) => prev + (140 + resolvedLevel * 22));
      setFeedback(null);
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

      setFeedback(null);
      setGoblinEffect('heal');
      setBoardShake(true);
      setWrongFlash(true);
      triggerHaptic('warning');
      setTargetSlots(Array(question.expectedDigits.length).fill(null));
      setSourceSlots(initialSourceSlots.map((token) => (token ? { ...token } : null)));

    window.setTimeout(() => {
      setFeedback(null);
      setIsResolving(false);
      setGoblinEffect('idle');
      setBoardShake(false);
      setWrongFlash(false);
    }, 520);
  }, [advanceRound, canSubmit, goblinHealth, initialSourceSlots, question.expectedDigits, resolvedLevel, targetSlots]);

  const numberStyle: React.CSSProperties = {
    fontFamily: '"Trebuchet MS", "Arial Rounded MT Bold", "Avenir Next", "Nunito", sans-serif',
    letterSpacing: '0.01em',
    textShadow: '0 2px 0 rgba(5,11,29,0.9), 0 0 8px rgba(148,163,184,0.35)',
  };

  const topHudLayout = useMemo(() => ({
    rowHeight: 'clamp(3.1rem, 8.35vh, 4.35rem)',
    profileWidth: 'clamp(10.4rem, 46vw, 14.6rem)',
    timerWidth: 'clamp(11.2rem, 45vw, 17rem)',
  }), []);

  return (
    <div
      className="relative z-20 h-full w-full min-h-0 overflow-hidden select-none"
      style={{ touchAction: 'manipulation' }}
    >
      <div className="relative z-10 h-full w-full">
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
                      className="h-full w-full object-cover"
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

      <motion.div
        ref={playfieldRef}
        className="absolute inset-0 z-20"
        animate={boardShake ? { x: [0, -10, 10, -8, 8, -4, 4, 0] } : { x: 0 }}
        transition={{ duration: 0.34, ease: 'easeInOut' }}
      >
        <div
          className="pointer-events-none absolute left-1/2 z-30 -translate-x-1/2 overflow-hidden"
          style={{ top: `${layout.questionTop}%`, width: `${questionFrameConfig.width}%`, height: `${questionFrameConfig.height}%` }}
        >
          <img src={questionFrameConfig.src} alt="" aria-hidden="true" draggable={false} className="absolute inset-0 h-full w-full object-fill" />
          <div
            ref={questionTextFrameRef}
            className="absolute inset-x-[8%] top-[20%] bottom-[20%] mx-auto flex items-center justify-center overflow-hidden text-center font-black uppercase tracking-[0.01em] text-white"
            style={{
              textShadow: '0 2px 6px rgba(2,6,23,0.62)',
            }}
          >
            <span
              ref={questionTextContentRef}
              className="block max-w-full overflow-hidden text-center"
              style={{
                width: '100%',
                maxHeight: '100%',
                overflowWrap: 'anywhere',
                wordBreak: 'break-word',
                whiteSpace: 'normal',
              }}
            >
              {formatFantasyPrompt(question.prompt)}
            </span>
          </div>
        </div>

        <div
          className="absolute z-30 rounded-lg border border-amber-200/35 bg-slate-900/76 p-1.5 shadow-[0_10px_20px_rgba(2,6,23,0.46)]"
          style={{
            top: `${layout.healthTop}%`,
            left: `min(calc(50% + ${Math.max(10, layout.enemyWidth * 0.5)}%), calc(100% - max(0.75rem, env(safe-area-inset-right)) - ${layout.healthWidth}%))`,
            width: `${layout.healthWidth}%`,
          }}
        >
          <div className="mb-1 text-center text-[8px] font-black uppercase tracking-[0.12em] text-amber-200 md:text-[9px]">
            Enemy
          </div>
          <div className="relative h-2 overflow-hidden rounded-full border border-slate-700/80 bg-slate-950/80">
            <motion.div
              className="absolute inset-y-0 left-0 rounded-full bg-gradient-to-r from-rose-500 via-rose-400 to-orange-300 shadow-[0_0_12px_rgba(251,113,133,0.75)]"
              animate={{ width: `${(goblinHealth / GOBLIN_MAX_HEALTH) * 100}%` }}
              transition={{ type: 'spring', stiffness: 210, damping: 26 }}
            />
            <div className="pointer-events-none absolute inset-0 bg-[linear-gradient(to_right,rgba(255,255,255,0.14)_1px,transparent_1px)] bg-[length:10%_100%]" />
          </div>
        </div>

        {activeTargetAnchors.map((anchor, idx) => {
          const token = targetSlots[idx];
          const isDraggingThis = dragState?.fromLocation === 'target' && dragState.fromIndex === idx;
          return (
            <motion.button
              key={`target-${idx}`}
              type="button"
              onPointerDown={(event) => beginDrag('target', idx, event)}
              className="absolute -translate-x-1/2 -translate-y-1/2 rounded-xl"
              animate={
                token
                  ? {
                      scale: slotPulseKey > 0 ? [1, 1.08, 1] : 1,
                    }
                  : {
                      scale: 1,
                    }
              }
              transition={{ duration: 0.34, ease: 'easeOut' }}
              style={{
                left: `${anchor.x}%`,
                top: `calc(${layout.targetY}% - ${TARGET_ROW_Y_OFFSET_PX}px)`,
                width: targetSocketSizing.width,
                height: targetSocketSizing.height,
              }}
            >
              <img
                src={getSocketAsset(question.placeHints[idx], idx, question.placeHints)}
                alt=""
                aria-hidden="true"
                draggable={false}
                className="pointer-events-none absolute inset-0 h-full w-full object-contain"
              />
              {token ? (
                <>
                  <motion.span
                    aria-hidden="true"
                    className="pointer-events-none absolute inset-[14%] rounded-[1rem]"
                    animate={
                      wrongFlash
                        ? { opacity: [0, 0.9, 0], backgroundColor: ['rgba(251,113,133,0)', 'rgba(251,113,133,0.34)', 'rgba(251,113,133,0)'] }
                        : { opacity: slotPulseKey > 0 ? [0, 0.9, 0] : 0, backgroundColor: ['rgba(34,211,238,0)', 'rgba(34,211,238,0.25)', 'rgba(34,211,238,0)'] }
                    }
                    transition={{ duration: 0.34, ease: 'easeOut' }}
                  />
                  <span className="pointer-events-none absolute left-1/2 top-1/2 z-[8] h-[56%] w-[66%] -translate-x-1/2 -translate-y-1/2 rounded-full bg-white/28 blur-[10px]" />
                  <motion.span
                    layout
                    transition={{ type: 'spring', stiffness: 560, damping: 27, mass: 0.62 }}
                    className="absolute left-1/2 top-1/2 z-10 block -translate-x-1/2 -translate-y-1/2 font-black text-white"
                    style={{ ...numberStyle, fontSize: layout.targetFont }}
                  >
                    {token.value}
                  </motion.span>
                </>
              ) : null}
              {isDraggingThis ? <span className="sr-only">Dragging</span> : null}
            </motion.button>
          );
        })}

        {activeSourceAnchors.map((anchor, idx) => {
          const token = sourceSlots[idx];
          const isDraggingThis = dragState?.fromLocation === 'source' && dragState.fromIndex === idx;
          return (
            <motion.button
              key={`source-${idx}`}
              type="button"
              onPointerDown={(event) => beginDrag('source', idx, event)}
              className="absolute z-[22] -translate-x-1/2 -translate-y-1/2 rounded-xl"
              initial={{ opacity: 0, y: 14, scale: 0.94 }}
              animate={{ opacity: token ? 1 : 0, y: 0, scale: token ? 1 : 0.94 }}
              transition={{ duration: 0.26, ease: 'easeOut', delay: idx * 0.04 }}
              style={{
                left: `${anchor.x}%`,
                top: `calc(${layout.sourceY}% - ${SOURCE_ROW_Y_OFFSET_PX}px)`,
                width: sourceTokenWidth,
                height: layout.sourceHeight,
              }}
            >
              {token ? (
                <>
                  <span className="pointer-events-none absolute left-1/2 top-1/2 z-[8] h-[56%] w-[66%] -translate-x-1/2 -translate-y-1/2 rounded-full bg-white/24 blur-[11px]" />
                  <motion.span
                    layout
                    transition={{ type: 'spring', stiffness: 560, damping: 27, mass: 0.62 }}
                    className="absolute left-1/2 top-1/2 block -translate-x-1/2 -translate-y-1/2 font-black text-white"
                    style={{ ...numberStyle, fontSize: layout.sourceFont }}
                  >
                    {token.value}
                  </motion.span>
                </>
              ) : null}
              {isDraggingThis ? <span className="sr-only">Dragging</span> : null}
            </motion.button>
          );
        })}

        <div
          className="pointer-events-none absolute left-1/2 z-[16] -translate-x-1/2 -translate-y-1/2 rounded-[2px] border border-cyan-200/30 bg-slate-900/34 shadow-[0_10px_24px_rgba(2,6,23,0.42)]"
          style={{
            top: `calc(${layout.sourceY}% - ${SOURCE_ROW_Y_OFFSET_PX}px)`,
            width: `calc(${sourceTokenBackdropWidth} + ${sourceTokenBackdropPadding} + ${sourceTokenBackdropPadding})`,
            height: `calc(${sourceTokenBackdropHeight} + ${sourceTokenBackdropPadding} + ${sourceTokenBackdropPadding})`,
            backdropFilter: 'blur(2.5px)',
          }}
        />

        <div
          className="pointer-events-none absolute left-1/2 z-30 -translate-x-1/2"
          style={{ bottom: enemyBottomFromPlayfield, width: `${layout.enemyWidth}%` }}
        >
          <div className="relative">
            <AnimatePresence>
              {enemySpeech ? (
                <motion.div
                  key={`enemy-speech-${enemySpeech}`}
                  initial={{ opacity: 0, y: 8, scale: 0.9 }}
                  animate={{ opacity: 1, y: 0, scale: [1, 1.04, 1] }}
                  exit={{ opacity: 0, y: -8, scale: 0.9 }}
                  transition={{ duration: 0.22, ease: 'easeOut' }}
                  className="absolute left-1/2 top-[-22%] z-40 -translate-x-1/2"
                >
                  <div className="relative">
                    <motion.div
                      className="absolute inset-[-8px] rounded-full bg-amber-300/35 blur-md"
                      animate={{ opacity: [0.5, 0.9, 0.5], scale: [0.96, 1.04, 0.96] }}
                      transition={{ duration: 0.7, repeat: Infinity, ease: 'easeInOut' }}
                    />
                    <div className="relative rounded-full border border-amber-200/70 bg-[radial-gradient(circle_at_top,rgba(255,255,255,0.96),rgba(254,243,199,0.94)_42%,rgba(254,215,170,0.92)_100%)] px-3.5 py-1.5 text-[clamp(0.62rem,1.8vw,0.9rem)] font-black uppercase tracking-[0.05em] text-slate-800 shadow-[0_10px_18px_rgba(2,6,23,0.45)]">
                      {enemySpeech}
                    </div>
                    <div className="absolute left-1/2 top-[100%] h-2.5 w-2.5 -translate-x-1/2 rotate-45 border-b border-r border-amber-200/70 bg-amber-100/95" />
                    <motion.span
                      className="absolute -right-1.5 -top-1.5 h-2 w-2 rounded-full bg-amber-200/95 shadow-[0_0_10px_rgba(251,191,36,0.9)]"
                      animate={{ scale: [0.8, 1.15, 0.8], opacity: [0.4, 1, 0.4] }}
                      transition={{ duration: 0.55, repeat: Infinity, ease: 'easeInOut' }}
                    />
                  </div>
                </motion.div>
              ) : null}
            </AnimatePresence>
            <motion.div
              className="absolute left-1/2 top-[66%] h-[38%] w-[56%] -translate-x-1/2 -translate-y-1/2 rounded-full blur-2xl"
              animate={{
                opacity: goblinEffect === 'idle' ? 0.22 : 0.52,
                scale: goblinEffect === 'idle' ? 1 : [1, 1.12, 1],
                backgroundColor:
                  goblinEffect === 'hit'
                    ? 'rgba(248,113,113,0.92)'
                    : goblinEffect === 'heal'
                      ? 'rgba(74,222,128,0.9)'
                      : 'rgba(56,189,248,0.55)',
              }}
              transition={{
                duration: goblinEffect === 'hit' ? 0.32 : 0.45,
                ease: 'easeInOut',
                repeat: goblinEffect === 'idle' ? Infinity : 0,
                repeatDelay: 1.1,
              }}
            />
            <AnimatePresence>
              {showHitFx ? (
                <motion.div
                  key="goblin-hit-vfx"
                  className="pointer-events-none absolute inset-[-16%]"
                  initial={{ opacity: 0.98, scale: 0.54 }}
                  animate={{ opacity: 0, scale: 1.46, rotate: 160 }}
                  exit={{ opacity: 0 }}
                  transition={{ duration: 0.56, ease: 'easeOut' }}
                >
                  <div className="absolute inset-0 rounded-full border-[8px] border-rose-400/90 blur-[1px]" />
                  <div className="absolute inset-[18%] rounded-full border-[5px] border-red-500/85" />
                  <div className="absolute inset-[38%] rounded-full border-[4px] border-orange-300/85" />
                  <motion.div
                    className="absolute inset-[26%] rounded-full bg-[radial-gradient(circle,rgba(254,226,226,0.95)_0%,rgba(251,113,133,0.85)_26%,rgba(244,63,94,0.62)_52%,rgba(239,68,68,0)_84%)]"
                    initial={{ scale: 0.22, opacity: 0.98 }}
                    animate={{ scale: 1.6, opacity: 0 }}
                    transition={{ duration: 0.5, ease: 'easeOut' }}
                  />
                  {Array.from({ length: 14 }).map((_, idx) => {
                    const angle = (idx / 14) * Math.PI * 2;
                    const tx = Math.cos(angle) * 88;
                    const ty = Math.sin(angle) * 88;
                    return (
                      <motion.span
                        key={`blast-particle-${idx}`}
                        className="absolute left-1/2 top-1/2 h-2.5 w-2.5 rounded-full bg-rose-300 shadow-[0_0_12px_rgba(251,113,133,0.9)]"
                        initial={{ x: '-50%', y: '-50%', scale: 0.35, opacity: 0.95 }}
                        animate={{ x: `calc(-50% + ${tx}px)`, y: `calc(-50% + ${ty}px)`, scale: 0.12, opacity: 0 }}
                        transition={{ duration: 0.48, ease: 'easeOut', delay: idx * 0.008 }}
                      />
                    );
                  })}
                </motion.div>
              ) : null}
            </AnimatePresence>
            <motion.div
              className="relative"
              animate={{
                y: [0, -5, 0],
                x: goblinEffect === 'hit' ? [0, -9, 9, -8, 8, -5, 5, 0] : 0,
                rotate: goblinEffect === 'hit' ? [0, -2.2, 2.2, -1.8, 1.8, 0] : 0,
                scale: goblinEffect === 'hit' ? [1.04, 1.08, 1.04] : goblinEffect === 'heal' ? [1, 1.03, 1] : 1,
              }}
              transition={{
                y: { duration: 1.8, repeat: Infinity, ease: 'easeInOut' },
                x: { duration: 0.9, ease: 'easeInOut' },
                rotate: { duration: 0.9, ease: 'easeInOut' },
                scale: { duration: 0.9, ease: 'easeInOut' },
              }}
            >
              <motion.img
                src={idleEnemySrc}
                alt=""
                aria-hidden="true"
                draggable={false}
                className="relative h-auto w-full object-contain drop-shadow-[0_16px_22px_rgba(2,6,23,0.5)]"
                animate={{ opacity: goblinEffect === 'hit' ? 0 : 1 }}
                transition={{ duration: 0.14, ease: 'easeOut' }}
              />
              <AnimatePresence>
                {goblinEffect === 'hit' ? (
                  <motion.img
                    key={`enemy-hit-${slotPulseKey}`}
                    src={animatedEnemy1}
                    alt=""
                    aria-hidden="true"
                    draggable={false}
                    className="absolute inset-0 h-full w-full object-contain"
                    initial={{ opacity: 0.98 }}
                    animate={{ opacity: 1 }}
                    exit={{ opacity: 0 }}
                    transition={{ duration: 0.14, ease: 'easeOut' }}
                    style={{
                      mixBlendMode: 'screen',
                      filter: 'brightness(1.08) contrast(1.1) saturate(1.04)',
                      WebkitMaskImage: `url("${idleEnemySrc}")`,
                      maskImage: `url("${idleEnemySrc}")`,
                      WebkitMaskRepeat: 'no-repeat',
                      maskRepeat: 'no-repeat',
                      WebkitMaskPosition: 'center',
                      maskPosition: 'center',
                      WebkitMaskSize: 'contain',
                      maskSize: 'contain',
                    }}
                  />
                ) : null}
              </AnimatePresence>
            </motion.div>
          </div>
        </div>

        <button
          type="button"
          onClick={handleSubmit}
          disabled={!canSubmit}
          className="absolute left-1/2 z-40 -translate-x-1/2 overflow-hidden transition-transform active:scale-[0.98] disabled:cursor-not-allowed disabled:opacity-60"
          style={{ top: `${layout.submitY}%`, width: `${layout.submitWidth}%`, height: `${layout.submitHeight}%` }}
        >
          <img src={medButton} alt="" aria-hidden="true" draggable={false} className="absolute inset-0 h-full w-full object-contain" />
          <span
            className="pointer-events-none absolute inset-x-[16%] top-1/2 -translate-y-1/2 text-center text-[clamp(0.82rem,2.2vw,1.06rem)] font-black uppercase tracking-[0.08em] text-white"
            style={{ textShadow: '0 2px 4px rgba(2,6,23,0.7)' }}
          >
            Submit
          </span>
        </button>
      </motion.div>

      {dragState ? (
        (() => {
          const relative = getRelativePoint(dragState.clientX, dragState.clientY);
          return (
            <motion.div
              className="pointer-events-none absolute z-[80] flex items-center justify-center rounded-xl"
              style={{
                left: relative.x - dragState.offsetX,
                top: relative.y - dragState.offsetY,
                width: dragState.width,
                height: dragState.height,
              }}
              initial={{ scale: 1 }}
              animate={{ scale: 1.03 }}
            >
              <span className="absolute left-1/2 top-1/2 z-[8] h-[56%] w-[66%] -translate-x-1/2 -translate-y-1/2 rounded-full bg-white/24 blur-[11px]" />
              <span
                className="absolute left-1/2 top-1/2 -translate-x-1/2 -translate-y-1/2 font-black text-white"
                style={{ ...numberStyle, fontSize: layout.sourceFont }}
              >
                {dragState.token.value}
              </span>
            </motion.div>
          );
        })()
      ) : null}

      <AnimatePresence>
        {feedback && feedback.tone === 'error' ? (
          <motion.div
            key={feedback.message}
            initial={{ opacity: 0, y: 16 }}
            animate={{ opacity: 1, y: 0 }}
            exit={{ opacity: 0, y: -16 }}
            className="absolute bottom-[calc(env(safe-area-inset-bottom)+4.6rem)] left-1/2 z-40 -translate-x-1/2 rounded-full border border-rose-200/70 bg-rose-500/35 px-5 py-2 text-xs font-black uppercase tracking-[0.14em] text-amber-50 shadow-[0_12px_28px_rgba(2,6,23,0.55)]"
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
