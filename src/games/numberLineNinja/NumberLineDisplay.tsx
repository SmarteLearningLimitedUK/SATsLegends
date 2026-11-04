import React from 'react';
import { motion } from 'motion/react';
import { ChevronDown } from 'lucide-react';
import numberLineRail from '../../assets/number-line-ninja/number-line-rail.svg';
import type { NumberLineQuestion } from '../numberLineQuestions';

interface NumberLineDisplayProps {
  question: NumberLineQuestion;
  lineShake: boolean;
  reducedMotion: boolean | null;
  missingSlotRef: React.RefObject<HTMLDivElement | null>;
}

/** Separately sized visual rail; marks and values remain live game content. */
export default function NumberLineDisplay({ question, lineShake, reducedMotion, missingSlotRef }: NumberLineDisplayProps) {
  const focusPct = (question.focusIndex / (question.labels.length - 1)) * 100;
  return (
          <motion.div
            animate={lineShake && !reducedMotion ? { x: [0, -10, 10, -8, 8, -4, 4, 0] } : { x: 0 }}
            transition={{ duration: 0.34, ease: 'easeInOut' }}
            className="qa-number-line relative mt-0 flex h-[24%] min-h-[156px] w-full max-w-[760px] items-center justify-center"
            style={{ marginTop: 12 }}
          >
            <div className="relative w-full rounded-[1.3rem] border border-cyan-100/18 bg-slate-950/30 px-3.5 py-3.5 shadow-[0_16px_34px_rgba(2,6,23,0.28)] backdrop-blur-[8px] md:px-4 md:py-4">
              <div className="mb-2 flex items-center justify-center gap-3 px-2 text-[clamp(0.6rem,1.25vw,0.72rem)] font-black uppercase tracking-[0.28em] text-amber-200/92">
                <span className="h-px flex-1 max-w-12 bg-gradient-to-r from-transparent via-amber-200/65 to-transparent" />
                <span>Find the missing number</span>
                <span className="h-px flex-1 max-w-12 bg-gradient-to-r from-transparent via-amber-200/65 to-transparent" />
              </div>

              <motion.div
                animate={reducedMotion ? { opacity: 0.4, scale: 1 } : { opacity: [0.28, 0.58, 0.28], scale: [0.985, 1.02, 0.985] }}
                transition={{ duration: 2.3, repeat: Infinity, ease: 'easeInOut' }}
                className="pointer-events-none absolute inset-0 rounded-[1.4rem] bg-[radial-gradient(circle_at_50%_50%,rgba(56,189,248,0.2),rgba(30,41,59,0.08)_58%,transparent_80%)]"
              />

              <div className="relative mx-auto h-[118px] w-[88%] max-w-[610px]">
                <motion.div
                  animate={reducedMotion ? { opacity: 1 } : {
                    boxShadow: [
                      '0 0 18px rgba(34,211,238,0.45)',
                      '0 0 32px rgba(34,211,238,0.84)',
                      '0 0 18px rgba(34,211,238,0.45)',
                    ],
                    opacity: [0.9, 1, 0.9],
                  }}
                  transition={{ duration: 1.7, repeat: Infinity, ease: 'easeInOut' }}
                  className="absolute left-0 right-0 top-[32px] h-[7px] -translate-y-1/2 rounded-full bg-gradient-to-r from-cyan-200 via-white to-cyan-200"
                >
                  <img src={numberLineRail} alt="" aria-hidden="true" className="absolute inset-0 h-full w-full" />
                </motion.div>

                {question.labels.map((label, index) => {
                  const pct = (index / (question.labels.length - 1)) * 100;
                  const isMissing = index === question.focusIndex;
                  const isQuestionMark = label === '?';

                  return (
                    <React.Fragment key={`${question.id}-${index}`}>
                      <div
                        className="absolute top-[32px] -translate-x-1/2 -translate-y-1/2"
                        style={{ left: `${pct}%` }}
                      >
                        <div
                          className={`h-[58px] w-[5px] rounded-full ${
                            isMissing ? 'bg-amber-300 shadow-[0_0_20px_rgba(251,191,36,0.98)]' : 'bg-white/95'
                          }`}
                        />
                      </div>

                      <div
                        data-line-marker={index}
                        className="absolute -translate-x-1/2"
                        style={{ left: `${pct}%`, top: 66 }}
                      >
                        <div className="flex h-[48px] w-[74px] items-center justify-center">
                          {isQuestionMark ? (
                            <motion.div
                              ref={missingSlotRef}
                              data-number-line-missing="true"
                              animate={reducedMotion ? { scale: 1 } : {
                                scale: [1, 1.08, 1],
                                boxShadow: [
                                  '0 0 0px rgba(245,158,11,0.25)',
                                  '0 0 28px rgba(245,158,11,0.96)',
                                  '0 0 0px rgba(245,158,11,0.25)',
                                ],
                              }}
                              transition={{ duration: 1.05, repeat: Infinity, ease: 'easeInOut' }}
                              className="flex h-[52px] w-[52px] items-center justify-center rounded-full border-2 border-amber-300/95 bg-slate-900/82 text-[36px] font-black leading-none text-amber-100"
                            >
                              ?
                            </motion.div>
                          ) : (
                            <span className="text-[clamp(20px,2.2vw,30px)] font-black leading-none tracking-tight text-white drop-shadow-[0_4px_8px_rgba(2,6,23,0.92)]">
                              {label}
                            </span>
                          )}
                        </div>
                      </div>
                    </React.Fragment>
                  );
                })}

                <motion.div
                  animate={reducedMotion ? { y: 0, opacity: 1 } : { y: [0, 10, 0], opacity: [0.55, 1, 0.55] }}
                  transition={{ duration: 1.05, repeat: Infinity, ease: 'easeInOut' }}
                  className="pointer-events-none absolute top-0 -translate-x-1/2"
                  style={{ left: `${focusPct}%` }}
                >
                  <ChevronDown className="h-7 w-7 text-amber-200 drop-shadow-[0_0_12px_rgba(251,191,36,0.96)]" />
                </motion.div>
              </div>
            </div>
          </motion.div>
  );
}
