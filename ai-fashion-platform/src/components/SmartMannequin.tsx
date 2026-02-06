"use client";
import { motion, AnimatePresence } from 'framer-motion';
import { useMerchantStore } from '@/store/merchantStore';
import { useEffect, useState } from 'react';

/**
 * SMART MANNEQUIN - PRO EDITION (Whole Garment Templates)
 * 
 * Instead of stacking misaligned parts (body + neck + sleeves), 
 * we load a single, high-quality, pre-composed image (Template).
 * This ensures perfect lighting, folds, and realism.
 */
export default function SmartMannequin() {
    const { design } = useMerchantStore();

    // Construct the template filename based on state
    // e.g. "tshirt-round-short.png"
    const getTemplatePath = () => {
        // 1. Base Type
        const type = 'tshirt'; // Currently only T-Shirt supported in this demo

        // 2. Neck Type (simplify to 'round' or 'v-neck')
        const neck = design.neckType.toLowerCase().includes('v') ? 'v-neck' : 'round';

        // 3. Sleeve Type
        const sleeve = design.sleeveType.toLowerCase();

        return `/assets/templates/${type}-${neck}-${sleeve}.png`;
    };

    const templatePath = getTemplatePath();

    return (
        <div className="relative w-full h-full flex items-center justify-center p-4">

            {/* Container with Spotlight Effect */}
            <div className="relative w-[500px] h-[700px] flex items-center justify-center">

                {/* FLOOR SHADOW */}
                <div className="absolute bottom-12 left-1/2 -translate-x-1/2 w-48 h-6 bg-black/40 blur-2xl rounded-full" />

                {/* --- MAIN GARMENT LAYER --- */}
                <motion.div
                    key={templatePath} // Animate when template changes
                    initial={{ opacity: 0, scale: 0.95 }}
                    animate={{ opacity: 1, scale: 1 }}
                    transition={{ duration: 0.4 }}
                    className="relative w-full h-full flex items-center justify-center"
                >
                    {/* 1. BASE IMAGE (Grayscale for Shadows/Depth) */}
                    <img
                        src={templatePath}
                        alt="Garment Base"
                        className="relative w-[90%] h-auto object-contain drop-shadow-2xl z-10"
                        style={{
                            filter: 'grayscale(100%) contrast(1.1) brightness(1.05)'
                        }}
                        onError={(e) => {
                            // Fallback if specific combo doesn't exist
                            e.currentTarget.src = '/assets/templates/tshirt-round-short.png';
                        }}
                    />

                    {/* 2. COLOR OVERLAY (The Magic Layer) */}
                    <div
                        className="absolute inset-0 w-full h-full flex items-center justify-center z-20 pointer-events-none"
                    >
                        <div
                            className="w-[90%] h-auto mix-blend-multiply transition-colors duration-300"
                            style={{
                                // We use the exact same image structure as the mask
                                // This applies the color ONLY to the shirt pixels
                                backgroundColor: design.baseColor,
                                maskImage: `url(${templatePath})`,
                                WebkitMaskImage: `url(${templatePath})`,
                                maskSize: 'contain',
                                WebkitMaskSize: 'contain',
                                maskRepeat: 'no-repeat',
                                WebkitMaskRepeat: 'no-repeat',
                                maskPosition: 'center',
                                WebkitMaskPosition: 'center',
                                aspectRatio: '500/700' // Approximate aspect ratio maintenance
                            }}
                        />
                    </div>

                    {/* 3. TEXTURE OVERLAY (Optional) */}
                    {design.fabric !== 'Cotton' && (
                        <div className="absolute inset-0 w-full h-full flex items-center justify-center z-20 pointer-events-none mix-blend-overlay opacity-40">
                            <div
                                className="w-[90%] h-auto"
                                style={{
                                    backgroundImage: `url(/assets/textures/${design.fabric}.png)`,
                                    maskImage: `url(${templatePath})`,
                                    WebkitMaskImage: `url(${templatePath})`,
                                    maskSize: 'contain',
                                    WebkitMaskSize: 'contain',
                                    maskRepeat: 'no-repeat',
                                    WebkitMaskRepeat: 'no-repeat',
                                    maskPosition: 'center',
                                    backgroundSize: '150px'
                                }}
                            />
                        </div>
                    )}

                    {/* 4. GRAPHIC / LOGO LAYER */}
                    <AnimatePresence>
                        {design.graphic && (
                            <motion.div
                                initial={{ scale: 0.8, opacity: 0 }}
                                animate={{ scale: 1, opacity: 1 }}
                                exit={{ scale: 0.8, opacity: 0 }}
                                drag
                                dragConstraints={{ left: -100, right: 100, top: -200, bottom: 200 }}
                                className="absolute z-30 w-32 h-32 cursor-move"
                                style={{ top: '35%', left: '38%' }}
                            >
                                <img
                                    src={design.graphic}
                                    alt="Logo"
                                    className="w-full h-full object-contain"
                                    style={{ mixBlendMode: 'multiply', opacity: 0.9 }}
                                />
                                {/* Hover Border */}
                                <div className="absolute inset-0 border-2 border-dashed border-blue-400 opacity-0 hover:opacity-50 rounded-lg pointer-events-none" />
                            </motion.div>
                        )}
                    </AnimatePresence>
                </motion.div>

            </div>
        </div>
    );
}
