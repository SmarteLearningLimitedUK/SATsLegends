import React, { useState } from 'react';
import { motion } from 'motion/react';
import { X, ChevronRight, ChevronLeft, HelpCircle } from './GameIcons';

interface TutorialProps {
  onClose: () => void;
}

const steps = [
  {
    title: 'Welcome to Sats Mastery!',
    content: 'Match three or more tiles with equivalent mathematical values to clear them from the grid.',
    image: '??'
  },
  {
    title: 'Mathematical Equivalence',
    content: 'Tiles can be fractions (1/2), decimals (0.5), or expressions (5+5). If they equal the same value, they match!',
    image: '??'
  },
  {
    title: 'Tile Swapping',
    content: 'Click a tile and then an adjacent one to swap them. A match must be formed to complete the swap.',
    image: '??'
  },
  {
    title: 'Power-Ups',
    content: 'Match 4 or more tiles to create power-ups. Bombs clear areas, while row and column clears wipe entire lines.',
    image: '??'
  },
  {
    title: 'Your Goal',
    content: 'Reach the target score before the timer runs out to unlock the next level and earn stars.',
    image: '??'
  }
];

const Tutorial: React.FC<TutorialProps> = ({ onClose }) => {
  const [currentStep, setCurrentStep] = useState(0);

  return (
    <div className="fixed inset-0 z-50 flex items-center justify-center bg-black/60 p-4 backdrop-blur-md">
      <motion.div
        initial={{ scale: 0.9, opacity: 0, y: 20 }}
        animate={{ scale: 1, opacity: 1, y: 0 }}
        className="app-modal-panel w-full max-w-md overflow-hidden rounded-[2rem] border-4 border-white bg-white/90 shadow-[0_30px_60px_rgba(0,0,0,0.3)] backdrop-blur-xl md:rounded-[3rem] md:border-8"
      >
        <div className="relative flex items-center justify-between bg-gradient-to-r from-blue-500 to-blue-600 p-4 text-white md:p-8">
          <div className="shine" />
          <div className="z-10 flex min-w-0 items-center gap-3">
            <div className="rounded-2xl bg-white/20 p-2">
              <HelpCircle className="h-5 w-5 md:h-6 md:w-6" />
            </div>
            <h2 className="truncate text-xl font-black drop-shadow-md md:text-3xl">How to Play</h2>
          </div>
          <button onClick={onClose} className="z-10 rounded-2xl p-2 transition-all hover:bg-white/20">
            <X className="h-6 w-6 md:h-7 md:w-7" />
          </button>
        </div>

        <div className="flex flex-col items-center gap-5 p-5 text-center md:gap-8 md:p-10">
          <motion.div
            key={currentStep}
            initial={{ scale: 0.5, rotate: -10 }}
            animate={{ scale: 1, rotate: 0 }}
            className="mb-1 text-6xl drop-shadow-2xl md:mb-2 md:text-9xl"
          >
            {steps[currentStep].image}
          </motion.div>

          <div className="space-y-2 md:space-y-3">
            <h3 className="text-2xl font-black tracking-tight text-gray-800 md:text-3xl">
              {steps[currentStep].title}
            </h3>

            <p className="px-1 text-sm font-medium leading-relaxed text-gray-600 md:px-2 md:text-xl">
              {steps[currentStep].content}
            </p>
          </div>

          <div className="mt-1 flex items-center gap-2 md:mt-2 md:gap-3">
            {steps.map((_, i) => (
              <motion.div
                key={i}
                animate={{
                  width: i === currentStep ? 28 : 10,
                  backgroundColor: i === currentStep ? '#3b82f6' : '#e5e7eb'
                }}
                className="h-2.5 rounded-full transition-all md:h-3"
              />
            ))}
          </div>
        </div>

        <div className="flex justify-between gap-3 border-t-2 border-gray-100 bg-gray-50/50 p-4 md:gap-4 md:p-8">
          <button
            disabled={currentStep === 0}
            onClick={() => setCurrentStep(prev => prev - 1)}
            className="flex items-center gap-2 rounded-2xl px-5 py-3 text-[11px] font-black uppercase tracking-[0.18em] text-gray-400 transition-all hover:bg-gray-200 disabled:opacity-0 md:px-8 md:py-4 md:text-sm"
          >
            <ChevronLeft className="h-4 w-4 md:h-5 md:w-5" /> Back
          </button>

          {currentStep === steps.length - 1 ? (
            <motion.button
              whileHover={{ scale: 1.03 }}
              whileTap={{ scale: 0.97 }}
              onClick={onClose}
              className="rounded-2xl bg-yellow-400 px-6 py-3 text-sm font-black text-white shadow-[0_6px_0_#ca8a04] transition-all hover:bg-yellow-500 md:px-10 md:py-4 md:text-lg md:shadow-[0_8px_0_#ca8a04]"
            >
              Let's Play!
            </motion.button>
          ) : (
            <motion.button
              whileHover={{ scale: 1.03 }}
              whileTap={{ scale: 0.97 }}
              onClick={() => setCurrentStep(prev => prev + 1)}
              className="flex items-center gap-2 rounded-2xl bg-blue-500 px-6 py-3 text-sm font-black text-white shadow-[0_6px_0_#1d4ed8] transition-all hover:bg-blue-600 md:px-10 md:py-4 md:text-lg md:shadow-[0_8px_0_#1d4ed8]"
            >
              Next <ChevronRight className="h-4 w-4 md:h-5 md:w-5" />
            </motion.button>
          )}
        </div>
      </motion.div>
    </div>
  );
};

export default Tutorial;
