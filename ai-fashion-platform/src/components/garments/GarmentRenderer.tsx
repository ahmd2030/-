"use client";
import React from 'react';
import { motion, AnimatePresence } from 'framer-motion';
import { DesignState } from '@/store/merchantStore';

interface GarmentRendererProps {
    design: DesignState;
}

// ----------------------------------------------------------------------
// 1. ADVANCED SVG FILTERS (The Secret Sauce)
// ----------------------------------------------------------------------
const TextureFilters = () => (
    <defs>
        {/* --- A. COTTON (Grainy & Soft) --- */}
        <filter id="texture-cotton">
            <feTurbulence type="fractalNoise" baseFrequency="0.8" numOctaves="3" result="noise" />
            <feColorMatrix type="matrix" values="0 0 0 0 0  0 0 0 0 0  0 0 0 0 0  0 0 0 0.15 0" in="noise" result="coloredNoise" />
            <feComposite operator="in" in="coloredNoise" in2="SourceGraphic" result="composite" />
            <feBlend mode="multiply" in="composite" in2="SourceGraphic" />
        </filter>

        {/* --- B. SILK (Smooth & Shiny Waves) --- */}
        <filter id="texture-silk">
            <feTurbulence type="fractalNoise" baseFrequency="0.05" numOctaves="2" result="noise" />
            <feGaussianBlur stdDeviation="2" in="noise" result="softNoise" />
            <feSpecularLighting surfaceScale="5" specularConstant="1" specularExponent="20" lightingColor="#ffffff" in="softNoise" result="specular">
                <fePointLight x="-500" y="-1000" z="800" />
            </feSpecularLighting>
            <feComposite operator="in" in="specular" in2="SourceGraphic" result="composite" />
            <feBlend mode="screen" in="composite" in2="SourceGraphic" />
        </filter>

        {/* --- C. LINEN (Crosshatch & Rough) --- */}
        <filter id="texture-linen">
            <feTurbulence type="turbulence" baseFrequency="0.6 0.1" numOctaves="2" result="warp" />
            <feTurbulence type="turbulence" baseFrequency="0.1 0.6" numOctaves="2" result="weft" />
            <feBlend mode="multiply" in="warp" in2="weft" result="weave" />
            <feColorMatrix type="matrix" values="0 0 0 0 0  0 0 0 0 0  0 0 0 0 0  0 0 0 0.3 0" in="weave" result="coloredWeave" />
            <feComposite operator="in" in="coloredWeave" in2="SourceGraphic" result="composite" />
            <feBlend mode="multiply" in="composite" in2="SourceGraphic" />
        </filter>

        {/* --- D. VOLUMETRIC LIGHTING (3D Depth) --- */}
        <filter id="dropShadow" x="-20%" y="-20%" width="140%" height="140%">
            <feGaussianBlur in="SourceAlpha" stdDeviation="3" />
            <feOffset dx="2" dy="4" result="offsetblur" />
            <feComponentTransfer>
                <feFuncA type="linear" slope="0.3" />
            </feComponentTransfer>
            <feMerge>
                <feMergeNode />
                <feMergeNode in="SourceGraphic" />
            </feMerge>
        </filter>

        {/* Gradient for "Roundness" (Cylindrical effect) */}
        <linearGradient id="bodyGradient" x1="0%" y1="0%" x2="100%" y2="0%">
            <stop offset="0%" stopColor="rgba(0,0,0,0.4)" />
            <stop offset="20%" stopColor="rgba(0,0,0,0.1)" />
            <stop offset="50%" stopColor="rgba(255,255,255,0.1)" />
            <stop offset="80%" stopColor="rgba(0,0,0,0.1)" />
            <stop offset="100%" stopColor="rgba(0,0,0,0.4)" />
        </linearGradient>
    </defs>
);

export default function GarmentRenderer({ design }: GarmentRendererProps) {

    // ----------------------------------------------------------------------
    // 2. REALISTIC PATHS (Drape & Gravity) - SEGMENTED & POLISHED
    // ----------------------------------------------------------------------
    const getGarmentParts = () => {
        const t = design.type || 'Thobe';

        // --- T-SHIRT (Professional Fit) ---
        if (['T-Shirt', 'tshirt'].includes(t)) {
            const isVNeck = design.neckType === 'V-Neck';

            // Shoulders & Chest Width
            const S_L = 85;  // Shoulder Left
            const S_R = 215; // Shoulder Right
            const C_Y = 35;  // Collar Y Start
            const H_W = 205; // Hem Width
            const B_L = 95;  // Body Left Start

            return {
                // Body: Fitted torso with slight waist taper
                body: `
                    M ${S_L},30 
                    L ${S_L + 25},30 
                    ${isVNeck ? "L 150,70 L 190,30" : "Q 150,65 190,30"} 
                    L ${S_R},30 
                    L ${S_R - 5},80 
                    Q ${S_R - 10},150 205,240 
                    Q 150,245 95,240 
                    Q ${B_L + 10},150 ${B_L + 5},80 
                    L ${S_L},30 Z
                `,

                // Sleeves: Angled naturally downwards (gravity)
                leftSleeve: `
                    M ${S_L},30 
                    L 40,80 
                    Q 55,95 70,85 
                    L ${B_L + 5},80 
                    L ${S_L},30 Z
                `,
                rightSleeve: `
                    M ${S_R},30 
                    L 260,80 
                    Q 245,95 230,85 
                    L ${S_R - 5},80 
                    L ${S_R},30 Z
                `,

                // Neck: Clean overlay
                neck: isVNeck
                    ? "M 105,28 L 150,75 L 195,28"
                    : "M 105,28 Q 150,68 195,28",

                folds: "M95,80 Q115,130 130,90 M205,80 Q185,130 170,90 M100,240 Q130,220 150,240 M200,240 Q170,220 150,240"
            };
        }

        // --- HOODIE (Segmented) ---
        if (['Hoodie', 'hoodie'].includes(t)) {
            return {
                body: "M115,55 Q150,55 185,55 L220,25 L210,100 L210,250 Q150,260 90,250 L90,100 L80,25 L115,55 Z",
                leftSleeve: "M80,25 L35,110 L70,125 L90,100 L80,25 Z",
                rightSleeve: "M220,25 L265,110 L230,125 L210,100 L220,25 Z",
                neck: "M80,25 Q110,30 115,55 Q150,55 185,55 Q190,30 220,25", // Hood Base
                folds: "M100,100 Q140,140 160,100 M200,100 Q160,140 140,100 M95,230 L205,230 M120,130 L180,130 L180,180 L120,180 Z"
            };
        }

        // --- THOBE (Segmented) ---
        if (['Thobe', 'thobe'].includes(t)) {
            return {
                body: "M95,20 L120,20 Q125,45 150,45 Q175,45 180,20 L205,20 L200,80 L200,480 Q150,500 100,480 L100,80 L95,20 Z",
                leftSleeve: "M95,20 L65,90 L90,120 L100,80 L95,20 Z",
                rightSleeve: "M205,20 L235,90 L210,120 L200,80 L205,20 Z",
                neck: "M120,20 L120,45 M180,20 L180,45",
                folds: "M150,45 L150,200 M200,480 Q180,450 160,480"
            };
        }

        // Default Fallback
        return {
            body: "M90,20 L210,20 L200,110 L200,280 L100,280 L100,110 L90,20 Z",
            leftSleeve: "M90,20 L70,110 L100,110 L90,20 Z",
            rightSleeve: "M210,20 L230,110 L200,110 L210,20 Z",
            neck: "",
            folds: ""
        };
    };

    const { body, leftSleeve, rightSleeve, neck, folds } = getGarmentParts();

    // Fabric To Filter Map (Applies global fabric for now, but ready for per-zone)
    const getFilter = (zoneFabric?: string) => {
        const intent = zoneFabric || design.fabric;
        if (!intent) return undefined;
        const f = intent.toLowerCase();
        if (f.includes('silk') || f.includes('حرير')) return 'url(#texture-silk)';
        if (f.includes('linen') || f.includes('كتان')) return 'url(#texture-linen)';
        if (f.includes('cotton') || f.includes('قطن')) return 'url(#texture-cotton)';
        return 'url(#texture-cotton)'; // Default texture
    };

    const [hoveredZone, setHoveredZone] = React.useState<string | null>(null);

    return (
        <div className="relative w-full h-full flex items-center justify-center">
            <svg
                viewBox="0 0 300 550"
                className="w-full h-full"
                style={{ overflow: 'visible' }}
            >
                <TextureFilters />

                <g filter="url(#dropShadow)">
                    {/* --- 3. GHOST MANNEQUIN (Back Interior) --- */}
                    <path
                        d={body}
                        fill="#333" // Darker inside
                        transform="translate(0, -5) scale(0.98)"
                        opacity="0.3"
                        style={{ pointerEvents: 'none' }}
                    />

                    {/* ========================================================
                        ZONE 1: BODY (Torso)
                       ======================================================== */}
                    <motion.g
                        initial={{ opacity: 0 }}
                        animate={{ opacity: 1, scale: hoveredZone === 'body' ? 1.02 : 1 }}
                        onMouseEnter={() => setHoveredZone('body')}
                        onMouseLeave={() => setHoveredZone(null)}
                        className="cursor-pointer"
                        style={{ pointerEvents: 'auto' }}
                    >
                        {/* Base Color */}
                        <motion.path
                            d={body}
                            fill={design.baseColor || '#fff'}
                            stroke={hoveredZone === 'body' ? "#A855F7" : "rgba(0,0,0,0.1)"}
                            strokeWidth={hoveredZone === 'body' ? "2" : "0.5"}
                            animate={{ d: body, fill: design.baseColor }}
                        />
                        {/* Texture */}
                        <motion.path d={body} fill={getFilter()} fillOpacity="0.6" animate={{ d: body }} />
                        {/* Volumetric */}
                        <motion.path d={body} fill="url(#bodyGradient)" style={{ mixBlendMode: 'multiply' }} animate={{ d: body }} />
                    </motion.g>

                    {/* ========================================================
                        ZONE 2: LEFT SLEEVE
                       ======================================================== */}
                    <motion.g
                        initial={{ opacity: 0 }}
                        animate={{ opacity: 1, scale: hoveredZone === 'leftSleeve' ? 1.05 : 1 }}
                        onMouseEnter={() => setHoveredZone('leftSleeve')}
                        onMouseLeave={() => setHoveredZone(null)}
                        className="cursor-pointer"
                        style={{ pointerEvents: 'auto' }}
                    >
                        <motion.path
                            d={leftSleeve}
                            fill={design.baseColor || '#fff'}
                            stroke={hoveredZone === 'leftSleeve' ? "#A855F7" : "rgba(0,0,0,0.1)"}
                            strokeWidth={hoveredZone === 'leftSleeve' ? "2" : "0.5"}
                            animate={{ d: leftSleeve, fill: design.baseColor }}
                        />
                        <motion.path d={leftSleeve} fill={getFilter()} fillOpacity="0.6" animate={{ d: leftSleeve }} />
                        <motion.path d={leftSleeve} fill="url(#bodyGradient)" style={{ mixBlendMode: 'multiply' }} animate={{ d: leftSleeve }} />
                    </motion.g>

                    {/* ========================================================
                        ZONE 3: RIGHT SLEEVE
                       ======================================================== */}
                    <motion.g
                        initial={{ opacity: 0 }}
                        animate={{ opacity: 1, scale: hoveredZone === 'rightSleeve' ? 1.05 : 1 }}
                        onMouseEnter={() => setHoveredZone('rightSleeve')}
                        onMouseLeave={() => setHoveredZone(null)}
                        className="cursor-pointer"
                        style={{ pointerEvents: 'auto' }}
                    >
                        <motion.path
                            d={rightSleeve}
                            fill={design.baseColor || '#fff'}
                            stroke={hoveredZone === 'rightSleeve' ? "#A855F7" : "rgba(0,0,0,0.1)"}
                            strokeWidth={hoveredZone === 'rightSleeve' ? "2" : "0.5"}
                            animate={{ d: rightSleeve, fill: design.baseColor }}
                        />
                        <motion.path d={rightSleeve} fill={getFilter()} fillOpacity="0.6" animate={{ d: rightSleeve }} />
                        <motion.path d={rightSleeve} fill="url(#bodyGradient)" style={{ mixBlendMode: 'multiply' }} animate={{ d: rightSleeve }} />
                    </motion.g>

                    {/* ========================================================
                        ZONE 4: NECK / DETAILS
                       ======================================================== */}
                    <motion.g
                        initial={{ opacity: 0 }}
                        animate={{ opacity: 1, scale: hoveredZone === 'neck' ? 1.1 : 1 }}
                        onMouseEnter={() => setHoveredZone('neck')}
                        onMouseLeave={() => setHoveredZone(null)}
                        className="cursor-pointer"
                        style={{ pointerEvents: 'auto' }}
                    >
                        <motion.path
                            d={neck}
                            fill="none"
                            stroke={hoveredZone === 'neck' ? "#A855F7" : "rgba(0,0,0,0.2)"}
                            strokeWidth={hoveredZone === 'neck' ? "3" : "1.5"}
                            animate={{ d: neck }}
                        />
                    </motion.g>

                    {/* --- DETAILS (Folds overlay on top of everything) --- */}
                    <motion.path
                        d={folds}
                        fill="none"
                        stroke="rgba(0,0,0,0.2)"
                        strokeWidth="2"
                        strokeLinecap="round"
                        style={{ filter: 'blur(2px)', pointerEvents: 'none' }}
                        animate={{ d: folds }}
                    />
                    <motion.path
                        d={folds}
                        fill="none"
                        stroke="rgba(255,255,255,0.15)"
                        strokeWidth="1"
                        strokeLinecap="round"
                        transform="translate(1,1)"
                        animate={{ d: folds }}
                        style={{ pointerEvents: 'none' }}
                    />
                </g>
            </svg>
            {/* HOVER LABEL INDICATOR */}
            <div className="absolute top-4 left-0 w-full text-center pointer-events-none">
                <AnimatePresence>
                    {hoveredZone && (
                        <motion.span
                            initial={{ opacity: 0, y: 10 }}
                            animate={{ opacity: 1, y: 0 }}
                            exit={{ opacity: 0 }}
                            className="bg-black/70 text-white text-[10px] px-2 py-1 rounded-full backdrop-blur-md"
                        >
                            {hoveredZone === 'body' && 'تصميم الجسم (Body Cut)'}
                            {hoveredZone === 'leftSleeve' && 'كم يسار (Left Sleeve)'}
                            {hoveredZone === 'rightSleeve' && 'كم يمين (Right Sleeve)'}
                            {hoveredZone === 'neck' && 'الياقة (Neckline)'}
                        </motion.span>
                    )}
                </AnimatePresence>
            </div>
        </div>
    );
}
