import React, { useState } from 'react';
import { motion, AnimatePresence } from 'motion/react';
import { X, ChevronRight, ChevronLeft, HelpCircle } from './GameIcons';

interface TutorialProps {
  onClose: () => void;
}

const steps = [
  {
    title: "Welcome to Sats Mastery!",
    content: "Match three or more tiles with equivalent mathematical values to clear them from the grid.",
    image: "☁️"
  },
  {
    title: "Mathematical Equivalence",
    content: "Tiles can be fractions (1/2), decimals (0.5), or expressions (5+5). If they equal the same value, they match!",
    image: "🧮"
  },
  {
    title: "Tile Swapping",
    content: "Click a tile and then an adjacent one to swap them. A match must be formed to complete the swap.",
    image: "🔄"
  },
  {
    title: "Power-Ups",
    content: "Match 4 or more tiles to create Power-Ups! Bombs clear areas, while Row/Column clears wipe entire lines.",
    image: "💣"
  },
  {
    title: "Your Goal",
    content: "Reach the target score before the timer runs out to unlock the next level and earn stars!",
    image: "🏆"
  }
];

const Tutorial: React.FC<TutorialProps> = ({ onClose }) => {
  const [currentStep, setCurrentStep] = useState(0);

  return (
    <div className="fixed inset-0 z-50 flex items-center justify-center p-4 bg-black/60 backdrop-blur-md">
      <motion.div 
        initial={{ scale: 0.9, opacity: 0, y: 20 }}
        animate={{ scale: 1, opacity: 1, y: 0 }}
        className="bg-white/90 backdrop-blur-xl rounded-[3rem] shadow-[0_30px_60px_rgba(0,0,0,0.3)] max-w-md w-full overflow-hidden border-8 border-white"
      >
        <div className="bg-gradient-to-r from-blue-500 to-blue-600 p-8 flex justify-between items-center text-white relative">
          <div className="shine" />
          <div className="flex items-center gap-3 z-10">
            <div className="bg-white/20 p-2 rounded-2xl">
              <HelpCircle className="w-6 h-6" />
            </div>
            <h2 className="text-3xl font-black drop-shadow-md">How to Play</h2>
          </div>
          <button onClick={onClose} className="hover:bg-white/20 p-2 rounded-2xl transition-all z-10">
            <X className="w-7 h-7" />
          </button>
        </div>

        <div className="p-10 flex flex-col items-center gap-8 text-center">
          <motion.div 
            key={currentStep}
            initial={{ scale: 0.5, rotate: -10 }}
            animate={{ scale: 1, rotate: 0 }}
            className="text-9xl mb-2 drop-shadow-2xl"
          >
            {steps[currentStep].image}
          </motion.div>
          
          <div className="space-y-3">
            <h3 className="text-3xl font-black text-gray-800 tracking-tight">
              {steps[currentStep].title}
            </h3>
            
            <p className="text-gray-600 text-xl font-medium leading-relaxed px-2">
              {steps[currentStep].content}
            </p>
          </div>

          <div className="flex items-center gap-3 mt-2">
            {steps.map((_, i) => (
              <motion.div 
                key={i} 
                animate={{ 
                  width: i === currentStep ? 32 : 12,
                  backgroundColor: i === currentStep ? '#3b82f6' : '#e5e7eb'
                }}
                className="h-3 rounded-full transition-all" 
              />
            ))}
          </div>
        </div>

        <div className="p-8 bg-gray-50/50 flex justify-between gap-4 border-t-2 border-gray-100">
          <button
            disabled={currentStep === 0}
            onClick={() => setCurrentStep(prev => prev - 1)}
            className="flex items-center gap-2 px-8 py-4 rounded-2xl font-black text-gray-400 disabled:opacity-0 hover:bg-gray-200 transition-all uppercase tracking-widest text-sm"
          >
            <ChevronLeft className="w-5 h-5" /> Back
          </button>
          
          {currentStep === steps.length - 1 ? (
            <motion.button
              whileHover={{ scale: 1.05 }}
              whileTap={{ scale: 0.95 }}
              onClick={onClose}
              className="px-10 py-4 bg-yellow-400 text-white rounded-2xl font-black shadow-[0_8px_0_#ca8a04] hover:bg-yellow-500 transition-all uppercase tracking-widest text-lg"
            >
              Let's Play!
            </motion.button>
          ) : (
            <motion.button
              whileHover={{ scale: 1.05 }}
              whileTap={{ scale: 0.95 }}
              onClick={() => setCurrentStep(prev => prev + 1)}
              className="flex items-center gap-2 px-10 py-4 bg-blue-500 text-white rounded-2xl font-black shadow-[0_8px_0_#1d4ed8] hover:bg-blue-600 transition-all uppercase tracking-widest text-lg"
            >
              Next <ChevronRight className="w-5 h-5" />
            </motion.button>
          )}
        </div>
      </motion.div>
    </div>
  );
};

export default Tutorial;
