import React, { useEffect, useState } from 'react';
import { createPortal } from 'react-dom';
import { MiniGamePracticeBriefing } from '../../app/gameplaySessionContract';
import AssetIcon, { AssetIconName } from '../AssetIcon';
import MissionCard from '../mission/MissionCard';
import VisualCuePanel from '../mission/VisualCuePanel';
import { emitUiAudio } from '../../audio/uiAudioEvents';
import CurriculumCategoryIcon, { type CurriculumCategory } from '../CurriculumCategoryIcon';

type PracticeIntroPopupProps = {
  open: boolean;
  title: string;
  body: React.ReactNode;
  briefing?: MiniGamePracticeBriefing | null;
  actionLabel?: string;
  onAction: () => void;
};

const normalizeBriefingText = (value: string) => (
  value
    .replace(/\r\n/g, '\n')
    // Some briefing strings were authored/stored with literal markers rather than real newlines.
    .replace(/\\n/g, '\n')
    .replace(/\/n/g, '\n')
);

const clampWords = (value: string, maxWords: number) => {
  const cleaned = value
    .replace(/\s+/g, ' ')
    .replace(/[.!?]+$/g, '')
    .trim();
  if (!cleaned) return '';
  const words = cleaned.split(' ').filter(Boolean);
  if (words.length <= maxWords) return cleaned;
  return `${words.slice(0, maxWords).join(' ')}...`;
};

const firstSentence = (value: string) => {
  const normalized = normalizeBriefingText(value);
  const sentence = normalized.split(/(?<=[.!?])\s+/)[0] ?? normalized;
  return sentence.trim();
};

const toGameyCopy = (value: string) => {
  const v = value.trim();
  if (!v) return v;

  return v
    .replace(/Select all statements that are true\./i, 'Pick the true ones.')
    .replace(/Select (the )?correct/gi, 'Pick the right')
    .replace(/Answer the following\./gi, 'Solve it.')
    .replace(/Read the question/gi, 'Read the mission')
    .replace(/Use the Number Line/gi, 'Slice the number line')
    .replace(/Use long division/gi, 'Run the division')
    .replace(/Choose the correct/gi, 'Pick the right')
    .replace(/Tap the main button/gi, 'Tap the button')
    .replace(/\bpractice run\b/gi, 'warm-up');
};

type SkillMeta = {
  label: string;
  icon: AssetIconName;
  tone?: 'cyan' | 'amber' | 'emerald' | 'rose';
};

const CATEGORY_BY_GAME_TITLE: Record<string, CurriculumCategory> = {
  'Angle Arena': 'Geometry',
  'Area Architect': 'Measure',
  'Calculation Clash': 'Number',
  'Calculation Cup': 'Number',
  'Change Counter': 'Measure',
  'Crystal Match': 'Fractions',
  'Coordinates Quest': 'Geometry',
  'Coordinate Quest': 'Geometry',
  'Arithmetic Showdown': 'SATs Practice',
  'Data Dungeon': 'Statistics',
  'Order Ops Arena': 'Algebra',
  'Equation Grove': 'Algebra',
  'Formula Forge': 'Algebra',
  'Fraction Match': 'Fractions',
  'Graph Grabber': 'Statistics',
  'Logic Sort': 'Reasoning',
  'Matrix Match': 'Reasoning',
  'Mean Machine': 'Statistics',
  'Conversion Canyon': 'Measure',
  'Measurement Forge': 'Measure',
  'Reasoning Trial': 'Reasoning',
  'Monster Market': 'Measure',
  'Observatory Overload': 'Statistics',
  'Percent Power': 'Fractions',
  'Place Value Peaks': 'Number',
  'Decimal Sniper': 'Number',
  'Polygon Palace': 'Geometry',
  'Potion Panic': 'Ratio',
  'Prime Pop': 'Number',
  Quiz: 'SATs Practice',
  'Ratio Racer': 'Ratio',
  'Ratio Rapids': 'Ratio',
  'Reasoning Quest': 'Reasoning',
  'Remainder Run': 'Number',
  'Rule Runner': 'Algebra',
  'Scale Builder': 'Ratio',
  'Scale Master': 'Measure',
  'Take-Out Rush': 'Fractions',
  'Chrono Dash: Time Trial': 'Measure',
  'Chrono Dash': 'Measure',
  'Tower of Factors': 'Number',
  'Factor Forge': 'Number',
  'Rotation Station': 'Geometry',
  'Lava Path': 'Measure',
};

const resolveCategory = (titleValue: string): CurriculumCategory | null => {
  const cleaned = titleValue.trim();
  if (!cleaned) return null;
  if (CATEGORY_BY_GAME_TITLE[cleaned]) return CATEGORY_BY_GAME_TITLE[cleaned];

  const lowered = cleaned.toLowerCase();
  const found = Object.entries(CATEGORY_BY_GAME_TITLE).find(([key]) => key.toLowerCase() === lowered);
  return found ? found[1] : null;
};

const detectSkill = (titleValue: string, hintText: string): SkillMeta | null => {
  const haystack = `${titleValue} ${hintText}`.toLowerCase();

  if (haystack.includes('boss') || haystack.includes('trial') || haystack.includes('encounter')) {
    return { label: 'Boss Trial', icon: 'medal', tone: 'amber' };
  }
  if (haystack.includes('calm') || haystack.includes('breathe') || haystack.includes('grove')) {
    return { label: 'Calm', icon: 'tree', tone: 'emerald' };
  }
  if (haystack.includes('fraction') || haystack.includes('numerator') || haystack.includes('denominator')) {
    return { label: 'Fractions', icon: 'gem', tone: 'cyan' };
  }
  if (haystack.includes('ratio')) {
    return { label: 'Ratio', icon: 'plusSquare', tone: 'cyan' };
  }
  if (haystack.includes('angle')) {
    return { label: 'Angles', icon: 'timer', tone: 'amber' };
  }
  if (haystack.includes('place value') || haystack.includes('digit') || haystack.includes('hundreds') || haystack.includes('tens')) {
    return { label: 'Place Value', icon: 'plusSquare', tone: 'cyan' };
  }
  if (haystack.includes('graph') || haystack.includes('chart') || haystack.includes('data')) {
    return { label: 'Data', icon: 'doc', tone: 'cyan' };
  }
  if (haystack.includes('add') || haystack.includes('subtract') || haystack.includes('multiply') || haystack.includes('divide') || haystack.includes('bidmas')) {
    return { label: 'Arithmetic', icon: 'gamepad', tone: 'amber' };
  }

  return null;
};

const PracticeIntroPopup: React.FC<PracticeIntroPopupProps> = ({
  open,
  title,
  body,
  briefing,
  actionLabel = 'Start',
  onAction,
}) => {
  const [locallyDismissed, setLocallyDismissed] = useState(false);

  useEffect(() => {
    if (!open) return;
    setLocallyDismissed(false);
    emitUiAudio('modal_open', { name: 'practice_intro' });
  }, [open]);

  if (!open || locallyDismissed) return null;

  const resolvedTitle = briefing?.title || title;
  const resolvedSummary = briefing?.summary ? toGameyCopy(firstSentence(briefing.summary)) : undefined;
  const resolvedBodySentence = typeof body === 'string' ? toGameyCopy(firstSentence(body)) : undefined;
  const instruction = clampWords(resolvedSummary || resolvedBodySentence || 'Ready? Beat this challenge.', 12);
  const howToPlay = briefing?.howToPlay
    ? clampWords(toGameyCopy(firstSentence(briefing.howToPlay)), 18)
    : undefined;

  const resolvedBullets = (briefing?.bullets ?? [])
    .map((bullet) => clampWords(toGameyCopy(firstSentence(bullet)), 4))
    .filter(Boolean);

  const fallbackHints = [
    'Read mission',
    'Tap answer',
    'Press check',
  ];

  const skill = detectSkill(resolvedTitle, `${resolvedSummary ?? ''} ${(briefing?.bullets ?? []).join(' ')}`);
  const category = resolveCategory(resolvedTitle);

  const overlay = (
    <div
      data-testid="practice-intro-overlay"
      className="fixed inset-0 z-[9999] flex items-center justify-center bg-slate-950/72 px-4 py-6 backdrop-blur-[6px]"
    >
      <MissionCard
        eyebrow="Mission Briefing"
        title={resolvedTitle}
        instruction={howToPlay || instruction}
        skillLabel={skill?.label}
        skillIcon={skill?.icon}
        skillTone={skill?.tone}
        hintChips={[]}
        visual={(
          <VisualCuePanel className="h-[160px] w-full md:h-[190px]">
            <div className="relative flex items-center justify-center">
              <div className="pointer-events-none absolute -inset-6 rounded-full bg-cyan-200/15 blur-[22px]" />
              <div className="pointer-events-none absolute -inset-10 rounded-full bg-amber-200/10 blur-[28px]" />
              <div className="relative flex h-[104px] w-[104px] items-center justify-center rounded-[1.25rem] border border-white/10 bg-white/5 shadow-[0_18px_40px_rgba(2,6,23,0.42)] md:h-[118px] md:w-[118px] sat-calm-breathe">
                {category ? (
                  <CurriculumCategoryIcon category={category} size={84} className="opacity-95 md:scale-[1.03]" />
                ) : (
                  <AssetIcon name={skill?.icon ?? 'gamepad'} className="h-14 w-14 opacity-95 md:h-16 md:w-16" alt="" />
                )}
              </div>
            </div>
          </VisualCuePanel>
        )}
        ctaLabel={actionLabel}
        onCta={() => {
          // Defensive: some screens can remount rapidly or have practice-mode props that
          // accidentally re-open the overlay. Always allow the CTA to dismiss locally.
          emitUiAudio('modal_close', { name: 'practice_intro' });
          setLocallyDismissed(true);
          onAction();
        }}
      />
    </div>
  );

  // Render via portal so the overlay is not trapped inside transformed/scaled gameplay stages.
  // Prefer the React root container so events are still delegated correctly.
  if (typeof document !== 'undefined') {
    const root = document.getElementById('root');
    return createPortal(overlay, root ?? document.body);
  }

  return overlay;
};

export default PracticeIntroPopup;
