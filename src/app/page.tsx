"use client";

import { useState } from 'react';
import dynamic from 'next/dynamic';
import { motion, AnimatePresence } from 'motion/react';
import SplashScreen from '@/components/SplashScreen';

const Dashboard = dynamic(() => import('@/components/Dashboard'), { ssr: false });

export default function Home() {
  const [showSplash, setShowSplash] = useState(true);

  return (
    <main className="min-h-screen bg-white">
      <AnimatePresence mode="wait">
        {showSplash ? (
          <SplashScreen key="splash" onFinish={() => setShowSplash(false)} />
        ) : (
          <motion.div
            key="dashboard"
            initial={{ opacity: 0 }}
            animate={{ opacity: 1 }}
            transition={{ duration: 1 }}
          >
            <Dashboard />
          </motion.div>
        )}
      </AnimatePresence>
    </main>
  );
}
