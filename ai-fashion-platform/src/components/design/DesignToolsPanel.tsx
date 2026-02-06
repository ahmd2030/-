"use client";

import { motion } from "framer-motion";
import { Layers, Scissors, Shirt, Globe, Citrus, PenTool, Users } from 'lucide-react';

interface DesignToolsPanelProps {
    activeCategory: string | null;
    onSelectCategory: (category: string) => void;
}

const categories = [
    { id: 'region', label: 'المنطقة', icon: Globe },
    { id: 'category', label: 'الفئة', icon: Users }, // Target Group
    { id: 'type', label: 'القطعة', icon: Shirt },
    { id: 'cut', label: 'القصة', icon: Scissors },
    { id: 'neck', label: 'الرقبة', icon: Layers },
    { id: 'sleeve', label: 'الاكمام', icon: Citrus }, // Using Citrus as placeholder for Sleeve/Arm shape if no better icon
    { id: 'embroidery', label: 'رسوم وتطريز', icon: PenTool },
];

export default function DesignToolsPanel({ activeCategory, onSelectCategory }: DesignToolsPanelProps) {
    return (
        <motion.div
            initial={{ opacity: 0, y: -50 }}
            animate={{ opacity: 1, y: 0 }}
            className="absolute top-6 left-1/2 -translate-x-1/2 z-40 bg-white/80 backdrop-blur-xl p-2 rounded-full shadow-2xl border border-white/40 flex items-center gap-2"
        >
            {categories.map((cat) => {
                const Icon = cat.icon;
                const isActive = activeCategory === cat.id;

                return (
                    <button
                        key={cat.id}
                        onClick={() => onSelectCategory(cat.id)}
                        className={`group relative flex flex-col items-center justify-center w-16 h-14 rounded-full transition-all duration-300 ${isActive
                            ? 'bg-gradient-to-b from-blue-500 to-blue-600 text-white shadow-lg shadow-blue-500/30 -translate-y-1'
                            : 'hover:bg-white/50 text-slate-600 hover:text-blue-600'
                            }`}
                    >
                        <Icon size={20} className={isActive ? 'mb-0' : 'mb-1 group-hover:mb-0 transition-all'} />

                        {/* Label - Only show on hover or active to keep it clean, or always small? 
                            User said "Elegant", so let's make it show label on hover/active or just clean icons with tooltips. 
                            Let's try small text for better UX but very subtle. */}
                        <span className={`text-[10px] font-bold ${isActive ? 'opacity-100' : 'opacity-0 h-0 group-hover:opacity-100 group-hover:h-auto'} transition-all`}>
                            {cat.label}
                        </span>

                        {/* Active Indicator Dot */}
                        {isActive && (
                            <motion.div
                                layoutId="active-dot"
                                className="absolute -bottom-1 w-1 h-1 bg-white rounded-full opacity-50"
                            />
                        )}
                    </button>
                );
            })}
        </motion.div>
    );
}
