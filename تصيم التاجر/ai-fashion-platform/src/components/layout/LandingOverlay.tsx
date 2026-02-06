"use client";

import { motion } from "framer-motion";
import { Scissors, MonitorPlay } from 'lucide-react';

interface LandingOverlayProps {
    onStartDesign: () => void;
}

export default function LandingOverlay({ onStartDesign }: LandingOverlayProps) {
    return (
        <div className="fixed inset-0 z-50 bg-slate-900 flex items-center justify-center overflow-hidden">
            {/* Dynamic Background */}
            <div className="absolute inset-0 opacity-20">
                <div className="absolute -top-20 -left-20 w-96 h-96 bg-purple-500 rounded-full mix-blend-multiply filter blur-3xl animate-blob"></div>
                <div className="absolute top-0 -right-4 w-96 h-96 bg-blue-500 rounded-full mix-blend-multiply filter blur-3xl animate-blob animation-delay-2000"></div>
                <div className="absolute -bottom-32 left-20 w-96 h-96 bg-pink-500 rounded-full mix-blend-multiply filter blur-3xl animate-blob animation-delay-4000"></div>
            </div>

            <div className="relative z-10 flex gap-12 md:gap-24 items-center">

                {/* Circle 1: Design Tool */}
                <motion.div
                    onClick={onStartDesign}
                    whileHover={{ scale: 1.1 }}
                    whileTap={{ scale: 0.95 }}
                    className="group cursor-pointer flex flex-col items-center gap-6"
                >
                    <div className="w-48 h-48 md:w-64 md:h-64 rounded-full bg-gradient-to-br from-pink-500 to-purple-600 flex items-center justify-center shadow-2xl shadow-purple-500/30 border-4 border-white/10 group-hover:border-white/30 transition-all">
                        <Scissors className="w-20 h-20 text-white drop-shadow-md" />
                    </div>
                    <span className="text-2xl font-bold text-white tracking-wider group-hover:text-purple-300 transition-colors">
                        إبدأ التصميم
                    </span>
                </motion.div>

                {/* Circle 2: Showcase (Placeholder) */}
                <motion.div
                    whileHover={{ scale: 1.1 }}
                    whileTap={{ scale: 0.95 }}
                    className="group cursor-pointer flex flex-col items-center gap-6 grayscale hover:grayscale-0 transition-all duration-500"
                >
                    <div className="w-48 h-48 md:w-64 md:h-64 rounded-full bg-gradient-to-br from-blue-500 to-cyan-600 flex items-center justify-center shadow-2xl shadow-blue-500/30 border-4 border-white/10 group-hover:border-white/30 transition-all">
                        <MonitorPlay className="w-20 h-20 text-white drop-shadow-md" />
                    </div>
                    <span className="text-2xl font-bold text-white tracking-wider group-hover:text-blue-300 transition-colors">
                        العرض (قريباً)
                    </span>
                </motion.div>

            </div>
        </div>
    );
}
