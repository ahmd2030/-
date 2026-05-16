"use client";

import React, { useEffect, useState } from 'react';
import { motion, AnimatePresence } from 'motion/react';

export default function SplashScreen({ onFinish }: { onFinish: () => void }) {
  const [showText, setShowText] = useState(true);

  useEffect(() => {
    const finishTimer = setTimeout(() => {
      onFinish();
    }, 1500);

    return () => {
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
      </AnimatePresence>

      {/* Decorative Background Elements */}
      <div className="absolute top-0 left-0 w-full h-full pointer-events-none opacity-20">
        <div className="absolute top-[-10%] left-[-10%] w-[40%] h-[40%] bg-orange-500/20 blur-[120px] rounded-full" />
        <div className="absolute bottom-[-10%] right-[-10%] w-[40%] h-[40%] bg-orange-600/10 blur-[120px] rounded-full" />
      </div>
    </div>
  );
}
