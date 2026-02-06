"use client";
import { useMerchantStore } from '@/store/merchantStore';
import { History } from 'lucide-react';

export default function TimeMachine() {
    const { history, historyIndex, jumpToTime } = useMerchantStore();

    if (history.length < 2) return null;

    return (
        <div className="absolute bottom-24 left-1/2 -translate-x-1/2 bg-white/80 backdrop-blur p-4 rounded-xl shadow-lg w-80 z-40">
            <div className="flex justify-between text-xs text-gray-500 mb-2 font-bold">
                <span className="flex gap-1"><History size={14} /> آلة الزمن</span>
                <span>{history[historyIndex].description}</span>
            </div>
            <input
                type="range"
                min={0}
                max={history.length - 1}
                value={historyIndex}
                onChange={(e) => jumpToTime(Number(e.target.value))}
                className="w-full accent-blue-600 h-2 bg-gray-300 rounded-lg appearance-none cursor-pointer"
            />
        </div>
    );
}
