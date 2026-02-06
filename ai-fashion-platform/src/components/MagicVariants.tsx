"use client";
import { useState } from 'react';
import { Sparkles, Loader2 } from 'lucide-react';
import { useMerchantStore } from '@/store/merchantStore';

interface Variant {
    color: string;
    title: string;
    fabric: string;
}

export default function MagicVariants() {
    const [loading, setLoading] = useState(false);
    const { design, profile, setVariants, variants, setDesign } = useMerchantStore();

    const generate = async () => {
        setLoading(true);
        // Fixed: pointing to the existing API route '/api/generate-variants' instead of '/api/magic-variants'
        try {
            const res = await fetch('/api/generate-variants', {
                method: 'POST',
                body: JSON.stringify({ design, region: profile.region }),
            });

            if (!res.ok) throw new Error('Failed to generate variants');

            const data = await res.json();
            setVariants(data.variants);
        } catch (error) {
            console.error(error);
            // Optional: Add some user feedback here
        } finally {
            setLoading(false);
        }
    };

    return (
        <div className="bg-white p-4 rounded-2xl shadow-sm border border-gray-100">
            <button
                onClick={generate}
                disabled={loading}
                className="w-full bg-gradient-to-r from-purple-500 to-indigo-600 text-white p-3 rounded-xl font-bold flex justify-center items-center gap-2 hover:opacity-90 transition"
            >
                {loading ? <Loader2 className="animate-spin" /> : <Sparkles size={18} />}
                توليد 4 أفكار سحرية
            </button>

            <div className="grid grid-cols-2 gap-2 mt-4">
                {variants.map((v: Variant, i) => (
                    <div
                        key={i}
                        onClick={() => setDesign({ baseColor: v.color, fabric: v.fabric }, `تطبيق فكرة: ${v.title}`)}
                        className="p-3 border rounded-xl cursor-pointer hover:border-purple-500 hover:bg-purple-50 transition"
                    >
                        <div className="h-16 rounded-lg mb-2" style={{ backgroundColor: v.color }}></div>
                        <p className="font-bold text-xs truncate">{v.title}</p>
                        <p className="text-[10px] text-gray-500">{v.fabric}</p>
                    </div>
                ))}
            </div>
        </div>
    );
}
