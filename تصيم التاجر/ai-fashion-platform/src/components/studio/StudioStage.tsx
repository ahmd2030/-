'use client';

import { motion, useMotionValue, useSpring, useTransform } from 'framer-motion';
import React, { useRef } from 'react';
import { Sparkles, Maximize2, ZoomIn, Share2, Layers } from 'lucide-react';

interface StudioStageProps {
    imageSrc?: string;
    isLoading?: boolean;
    onZoom?: () => void;
}

export function StudioStage({ imageSrc, isLoading, onZoom }: StudioStageProps) {
    const ref = useRef<HTMLDivElement>(null);

    // Mouse position for parallax and lighting
    const x = useMotionValue(0);
    const y = useMotionValue(0);

    // Smooth spring animation for the values
    const mouseX = useSpring(x, { stiffness: 150, damping: 15 });
    const mouseY = useSpring(y, { stiffness: 150, damping: 15 });

    const handleMouseMove = (e: React.MouseEvent<HTMLDivElement>) => {
        if (!ref.current) return;
        const rect = ref.current.getBoundingClientRect();
        const centerX = rect.left + rect.width / 2;
        const centerY = rect.top + rect.height / 2;

        // Calculate distance from center normalized (-1 to 1)
        x.set((e.clientX - centerX) / (rect.width / 2));
        y.set((e.clientY - centerY) / (rect.height / 2));
    };

    const handleMouseLeave = () => {
        x.set(0);
        y.set(0);
    };

    // Parallax transforms
    const rotateX = useTransform(mouseY, [-1, 1], [5, -5]); // Inverted for natural feel
    const rotateY = useTransform(mouseX, [-1, 1], [-5, 5]);

    // Lighting gradient position
    const glowX = useTransform(mouseX, [-1, 1], [0, 100]);
    const glowY = useTransform(mouseY, [-1, 1], [0, 100]);

    return (
        <div className="relative w-full h-full flex flex-col items-center justify-center p-8 perspective-1000">

            {/* Ambient Studio Lighting (Background) */}
            <div className="absolute inset-0 bg-[radial-gradient(circle_at_50%_30%,_rgba(60,60,80,0.4)_0%,_rgba(0,0,0,0)_60%)] pointer-events-none" />

            {/* The Stage Platform */}
            <motion.div
                ref={ref}
                onMouseMove={handleMouseMove}
                onMouseLeave={handleMouseLeave}
                style={{
                    rotateX,
                    rotateY,
                    transformStyle: "preserve-3d",
                }}
                className="relative group w-full max-w-2xl aspect-[3/4] bg-neutral-900/50 rounded-2xl border border-white/5 shadow-2xl backdrop-blur-sm overflow-hidden"
            >
                {/* Dynamic Spotlight Overlay */}
                <motion.div
                    className="absolute inset-0 opacity-40 pointer-events-none z-10 mix-blend-soft-light"
                    style={{
                        background: useTransform(
                            [glowX, glowY],
                            ([gx, gy]: number[]) => `radial-gradient(circle at ${gx + 50}% ${gy + 50}%, rgba(255,255,255,0.3) 0%, transparent 60%)`
                        )
                    }}
                />

                {/* Content Container */}
                <div className="relative w-full h-full z-0 flex items-center justify-center">
                    {isLoading ? (
                        <div className="flex flex-col items-center gap-4 text-white/50">
                            <div className="w-16 h-16 border-t-2 border-l-2 border-white/20 rounded-full animate-spin" />
                            <p className="font-light tracking-widest text-sm animate-pulse">WEAVING PIXELS...</p>
                        </div>
                    ) : imageSrc ? (
                        <motion.img
                            initial={{ opacity: 0, scale: 0.95 }}
                            animate={{ opacity: 1, scale: 1 }}
                            transition={{ duration: 0.8, ease: "easeOut" }}
                            src={imageSrc}
                            alt="Fashion Design"
                            className="w-full h-full object-contain filter drop-shadow-2xl"
                            style={{ transform: "translateZ(20px)" }} // Pop out effect
                        />
                    ) : (
                        <div className="text-center space-y-4 opacity-30">
                            <Layers className="w-24 h-24 mx-auto stroke-1" />
                            <p className="font-light tracking-[0.2em] text-sm">THE MANNEQUIN IS EMPTY</p>
                        </div>
                    )}
                </div>

                {/* Floating Controls (Hidden until hover for immersion) */}
                <motion.div
                    initial={{ opacity: 0, y: 20 }}
                    whileHover={{ opacity: 1, y: 0 }}
                    className="absolute bottom-6 left-1/2 -translate-x-1/2 flex items-center gap-2 px-4 py-2 bg-black/60 backdrop-blur-md rounded-full border border-white/10 text-white z-20 transition-all"
                >
                    <button onClick={onZoom} className="p-2 hover:bg-white/10 rounded-full transition-colors tooltip" title="Zoom In">
                        <ZoomIn size={18} />
                    </button>
                    <div className="w-px h-4 bg-white/20" />
                    <button className="p-2 hover:bg-white/10 rounded-full transition-colors" title="View Fullscreen">
                        <Maximize2 size={18} />
                    </button>
                    <div className="w-px h-4 bg-white/20" />
                    <button className="p-2 hover:bg-white/10 rounded-full transition-colors" title="Share Design">
                        <Share2 size={18} />
                    </button>
                </motion.div>

                {/* Quality Badge */}
                <div className="absolute top-6 right-6 flex items-center gap-1.5 px-3 py-1 rounded-full bg-white/5 border border-white/10 backdrop-blur-md text-[10px] font-medium tracking-widest text-white/70">
                    <Sparkles size={10} className="text-amber-300" />
                    <span>STUDIO QUALITY</span>
                </div>

            </motion.div>

            {/* Floor Reflection/Shadow for grounding */}
            <div className="w-1/2 h-8 bg-black/50 blur-xl rounded-[100%] mt-8 opacity-60" />

        </div>
    );
}
