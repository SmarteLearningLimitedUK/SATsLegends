import React, { useEffect, useMemo, useState } from 'react';
import { motion } from 'motion/react';
import balloonBackground from '../../assets/balloon background.png';
import balloonArt from '../../assets/wellbeing/balloon/balloon.png';
import braveCard from '../../assets/wellbeing/balloon/feeling-brave.png';
import frustratedCard from '../../assets/wellbeing/balloon/feeling-frustrated.png';
import nervousCard from '../../assets/wellbeing/balloon/feeling-nervous.png';
import overwhelmedCard from '../../assets/wellbeing/balloon/feeling-overwhelmed.png';
import sadCard from '../../assets/wellbeing/balloon/feeling-sad.png';
import steadyCard from '../../assets/wellbeing/balloon/feeling-steady.png';
import tiredCard from '../../assets/wellbeing/balloon/feeling-tired.png';
import worriedCard from '../../assets/wellbeing/balloon/feeling-worried.png';
import pickFeelingsLabel from '../../assets/wellbeing/balloon/label-pick-feelings.png';
import sendBalloonButton from '../../assets/wellbeing/balloon/send-balloon-button.png';
import AssetIcon from '../../components/AssetIcon';
import WellbeingShell from '../WellbeingShell';
import { WellbeingActivityComponentProps } from '../types';

const feelings = [
  { word: 'worried', card: worriedCard },
  { word: 'frustrated', card: frustratedCard },
  { word: 'tired', card: tiredCard },
  { word: 'sad', card: sadCard },
  { word: 'nervous', card: nervousCard },
  { word: 'overwhelmed', card: overwhelmedCard },
  { word: 'steady', card: steadyCard },
  { word: 'brave', card: braveCard },
];

const LetItGoBadge: React.FC = () => (
  <div
    aria-label="Let it go"
    className="relative w-full select-none"
    style={{ aspectRatio: '436 / 138' }}
  >
    <div className="absolute inset-0 rounded-full bg-[radial-gradient(circle_at_45%_40%,rgba(251,191,36,0.35),rgba(244,114,182,0.28)_36%,rgba(168,85,247,0.22)_62%,rgba(59,130,246,0.18)_90%)] blur-[14px]" />
    <div className="absolute inset-[7%] rounded-full border border-white/20 bg-[linear-gradient(180deg,rgba(236,72,153,0.32),rgba(168,85,247,0.26))] shadow-[0_14px_36px_rgba(0,0,0,0.28),inset_0_1px_0_rgba(255,255,255,0.18)]" />
    <div className="absolute inset-[10%] rounded-full border border-white/28 shadow-[inset_0_0_0_2px_rgba(236,72,153,0.26)]" />
    <div className="absolute inset-[13%] rounded-full border border-white/12 bg-[linear-gradient(180deg,rgba(251,191,36,0.16),rgba(168,85,247,0.12))]" />

    <div className="absolute inset-0 flex flex-col items-center justify-center gap-2">
      <div className="text-center text-[clamp(1.05rem,6.2vw,1.55rem)] font-black tracking-[0.18em] text-white drop-shadow-[0_4px_18px_rgba(0,0,0,0.5)]">
        LET IT GO
      </div>
      <div className="flex h-10 w-10 items-center justify-center rounded-full border border-amber-200/40 bg-[radial-gradient(circle_at_35%_30%,rgba(254,243,199,0.95),rgba(251,191,36,0.7)_45%,rgba(244,114,182,0.35)_78%)] shadow-[0_10px_22px_rgba(0,0,0,0.25),inset_0_1px_0_rgba(255,255,255,0.25)]">
        <AssetIcon name="heart" className="h-5 w-5 text-white drop-shadow-[0_2px_10px_rgba(0,0,0,0.35)]" alt="" />
      </div>
    </div>
  </div>
);

const ThoughtSort: React.FC<WellbeingActivityComponentProps> = ({ onComplete, onExit }) => {
  const [selected, setSelected] = useState<string[]>([]);
  const [released, setReleased] = useState(false);
  const [balloonRise, setBalloonRise] = useState(false);

  const balloonText = useMemo(() => selected.join(' • ') || 'let it go', [selected]);
  const status = released ? 'Floating away' : undefined;
  const progress = Math.min(100, (selected.length / 4) * 70 + (released ? 30 : 0));

  useEffect(() => {
    if (!released) return undefined;
    const timeout = window.setTimeout(() => {
      setBalloonRise(true);
      window.setTimeout(() => onComplete(), 1300);
    }, 220);
    return () => window.clearTimeout(timeout);
  }, [onComplete, released]);

  const toggleWord = (word: string) => {
    if (released) return;
    setSelected((current) => {
      if (current.includes(word)) {
        return current.filter((item) => item !== word);
      }
      return [...current, word].slice(0, 4);
    });
  };

  return (
    <WellbeingShell title="Worry Balloon" subtitle={status} type="Thought Reset" progress={progress} onExit={onExit}>
      <div className="relative flex flex-1 flex-col overflow-hidden px-3 pb-2 pt-2 text-white md:px-5 md:pb-5 md:pt-4 lg:grid lg:grid-cols-[minmax(0,1fr)_minmax(18rem,27rem)] lg:grid-rows-[minmax(0,1fr)_auto] lg:gap-x-4">
        <img
          src={balloonBackground}
          alt=""
          className="absolute inset-0 h-full w-full object-cover"
          draggable={false}
        />
        <div className="absolute inset-0 bg-[linear-gradient(180deg,rgba(5,10,42,0.1),rgba(5,11,43,0.08)_44%,rgba(1,8,25,0.18)_100%)]" />

        <div className="relative z-10 grid h-[4.75rem] shrink-0 grid-cols-[1fr] items-start gap-2 md:h-[6.25rem] lg:col-start-1 lg:row-start-1 lg:h-auto lg:min-h-0">
          <div className="max-w-[18rem] pt-1">
            <div className="text-lg font-black leading-tight text-white drop-shadow-[0_3px_12px_rgba(0,0,0,0.45)] md:text-2xl">
              Worry Balloon
            </div>
          </div>
        </div>

        <div className="relative z-20 mx-auto mt-1 w-full max-w-[22.5rem] shrink-0 md:max-w-[28rem] lg:col-start-2 lg:row-span-2 lg:row-start-1 lg:my-auto lg:max-w-none">
          <motion.div
            aria-hidden="true"
            animate={balloonRise ? { y: [-10, -420], opacity: [1, 0], scale: [1, 1.07, 1.12] } : { y: [0, -10, 0], scale: [1, 1.03, 1] }}
            transition={balloonRise ? { duration: 1.45, ease: 'easeOut' } : { duration: 3.4, repeat: Infinity, ease: 'easeInOut' }}
            className="pointer-events-none absolute -top-14 right-4 z-0 h-[9.5rem] w-[9.5rem] select-none md:-top-20 md:right-6 md:h-[12.5rem] md:w-[12.5rem]"
          >
            <img
              src={balloonArt}
              alt=""
              className="h-full w-full object-contain drop-shadow-[0_0_36px_rgba(244,114,182,0.46)]"
              draggable={false}
            />
          </motion.div>

          <div className="relative z-10 rounded-[1.35rem] border border-cyan-100/20 bg-slate-950/54 px-2 pb-2 pt-6 shadow-[0_14px_36px_rgba(0,0,0,0.35)] backdrop-blur-sm md:px-4 md:pb-3 md:pt-7">
            <img
              src={pickFeelingsLabel}
              alt=""
              className="pointer-events-none absolute left-1/2 top-0 z-20 w-[min(82%,24rem)] -translate-x-1/2 -translate-y-1/2 select-none"
              draggable={false}
            />
            <div className="grid grid-cols-4 gap-1.5 md:gap-2">
            {feelings.map(({ word, card }) => {
              const active = selected.includes(word);
              return (
                <motion.button
                  key={word}
                  type="button"
                  onClick={() => toggleWord(word)}
                  whileTap={{ scale: 0.95 }}
                  aria-pressed={active}
                  aria-label={`Select ${word}`}
                  className={`relative appearance-none rounded-2xl bg-transparent p-0 transition focus:outline-none focus-visible:ring-2 focus-visible:ring-amber-200 ${
                    active
                      ? 'scale-[1.03] drop-shadow-[0_0_16px_rgba(251,191,36,0.65)]'
                      : 'drop-shadow-[0_7px_10px_rgba(0,0,0,0.28)]'
                  }`}
                >
                  <img src={card} alt="" className="pointer-events-none w-full select-none" draggable={false} />
                  {active ? (
                    <span className="absolute inset-0 rounded-2xl border-2 border-amber-200 shadow-[inset_0_0_16px_rgba(253,224,71,0.38)]" />
                  ) : null}
                </motion.button>
              );
            })}
          </div>
            <div className="mx-auto mt-2 flex min-h-8 w-fit min-w-[8.2rem] items-center justify-center rounded-xl border border-indigo-200/24 bg-slate-950/84 px-4 text-xs font-black tracking-[0.08em] text-white/78 shadow-[0_8px_18px_rgba(0,0,0,0.32)] md:min-h-9 md:min-w-[8.8rem] md:text-sm">
              {selected.length} / 4 selected
            </div>
          </div>
        </div>

        <div className="relative z-10 flex min-h-0 flex-1 flex-col items-center justify-end gap-1 pb-1 pt-3 md:gap-1 md:pb-2 md:pt-5 lg:col-start-1 lg:row-start-2 lg:flex-none">
          <motion.div
            animate={{ scale: selected.length > 0 ? [1, 1.025, 1] : 1 }}
            transition={{ duration: 1.8, repeat: selected.length > 0 ? Infinity : 0, ease: 'easeInOut' }}
            className="relative w-[min(82%,23rem)] md:w-[min(88%,22rem)]"
          >
            <div aria-label={balloonText} className="pointer-events-none w-full">
              <LetItGoBadge />
            </div>
          </motion.div>
          <button
            type="button"
            onClick={() => setReleased(true)}
            disabled={released || selected.length === 0}
            aria-label={released ? 'Balloon released' : 'Send balloon'}
            className="relative w-[min(92%,25rem)] appearance-none bg-transparent p-0 transition enabled:hover:scale-[1.01] enabled:active:scale-[0.98] disabled:cursor-not-allowed disabled:opacity-75 md:w-[min(88%,22rem)]"
          >
            <img src={sendBalloonButton} alt="" className="pointer-events-none w-full select-none" draggable={false} />
          </button>
        </div>
      </div>
    </WellbeingShell>
  );
};

export default ThoughtSort;
