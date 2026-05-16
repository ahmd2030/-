"use client";

import React, { useEffect, useState } from 'react';
import { motion, AnimatePresence } from 'motion/react';

export default function SplashScreen({ onFinish }: { onFinish: () => void }) {
  const [showText, setShowText] = useState(true);
  const [showLogo, setShowLogo] = useState(false);

  useEffect(() => {
    // 1. Show writing text (0s - 0.7s)
    // 2. Transition to logo (0.7s - 1.2s)
    // 3. Finish (1.5s)
    
    const logoTimer = setTimeout(() => {
      setShowText(false);
      setShowLogo(true);
    }, 700);

    const finishTimer = setTimeout(() => {
      onFinish();
    }, 1500);

    return () => {
      clearTimeout(logoTimer);
      clearTimeout(finishTimer);
    };
  }, [onFinish]);

  return (
    <div className="fixed inset-0 z-[100] bg-slate-900 flex items-center justify-center overflow-hidden">
      <AnimatePresence mode="wait">
        {showText && (
          <motion.div
            key="text"
            initial={{ opacity: 0 }}
            animate={{ opacity: 1 }}
            exit={{ opacity: 0, scale: 1.2, filter: 'blur(10px)' }}
            transition={{ duration: 0.3 }}
            className="text-center"
          >
            <h1 className="text-5xl md:text-7xl font-black text-white tracking-tighter overflow-hidden">
              <motion.span
                initial={{ width: 0 }}
                animate={{ width: 'auto' }}
                transition={{ duration: 0.6, ease: "easeOut" }}
                className="inline-block whitespace-nowrap overflow-hidden text-orange-500"
              >
                فاتورتي
              </motion.span>
              <span className="text-white">.</span>
            </h1>
            <motion.div 
              initial={{ scaleX: 0 }}
              animate={{ scaleX: 1 }}
              transition={{ delay: 0.2, duration: 0.5 }}
              className="h-1 bg-gradient-to-r from-transparent via-orange-500 to-transparent mt-4 w-full origin-center"
            />
          </motion.div>
        )}

        {showLogo && (
          <motion.div
            key="logo"
            initial={{ scale: 0.5, opacity: 0, rotate: -10 }}
            animate={{ scale: 1, opacity: 1, rotate: 0 }}
            exit={{ scale: 1.5, opacity: 0 }}
            transition={{ type: "spring", damping: 12, stiffness: 200 }}
            className="flex flex-col items-center gap-6"
          >
            <div className="relative w-32 h-32 md:w-48 md:h-48">
              <img src="/logo.png" alt="Logo" className="w-full h-full object-contain" />
            </div>
            <motion.div
              initial={{ y: 20, opacity: 0 }}
              animate={{ y: 0, opacity: 1 }}
              transition={{ delay: 0.2 }}
              className="text-center"
            >
              <h2 className="text-3xl font-black text-white mb-2">فاتورتي الذكية</h2>
              <p className="text-orange-500/60 font-black text-[10px] uppercase tracking-[0.4em]">
                Smart Invoice Analyst
              </p>
            </motion.div>
          </motion.div>
        )}
      </AnimatePresence>

      {/* Decorative Background Elements */}
      <div className="absolute top-0 left-0 w-full h-full pointer-events-none opacity-20">
        <div className="absolute top-[-10%] left-[-10%] w-[40%] h-[40%] bg-orange-500/20 blur-[120px] rounded-full" />
        <div className="absolute bottom-[-10%] right-[-10%] w-[40%] h-[40%] bg-orange-600/10 blur-[120px] rounded-full" />
      </div>
    </div>
  );
}
