"use client";

import { useState, useEffect } from 'react';
import { motion, AnimatePresence } from "framer-motion";
import { X, Check, ArrowRight } from 'lucide-react';
import { useMerchantStore, DesignState } from '@/store/merchantStore';
import {
    IconThobe, IconAbaya, IconDressEvening, IconTwoPieceSet,
    IconKaftan, IconBisht, IconBlazer, IconTShirt,
    IconShorts, IconPants, IconDressCasual, IconHoodie,
    IconSuit, IconBlouse, IconSkirt, IconCoat, IconJeans
} from '@/components/icons/GarmentIcons';

interface OptionsSidebarProps {
    activeCategory: string | null;
    onClose: () => void;
}

// ----------------------------------------------------------------------
// DATA: Trend Colors
// ----------------------------------------------------------------------
const trendyColors: Record<string, string[]> = {
    'Asia': [
        '#E63946', '#F1FAEE', '#A8DADC', '#457B9D', '#1D3557',
        '#F4A261', '#2A9D8F', '#E76F51', '#264653', '#E9C46A',
        '#FFCDB2', '#FFB4A2', '#E5989B', '#B5838D', '#6D6875',
        '#D8E2DC', '#FFE5D9', '#FFCAD4', '#F4ACB7', '#9D8189',
        '#003049', '#D62828', '#F77F00', '#FCBF49', '#EAE2B7',
    ],
    'Africa': [
        '#9C6644', '#7F5539', '#B08968', '#DDB892', '#EDE0D4',
        '#606C38', '#283618', '#FEFAE0', '#DDA15E', '#BC6C25',
        '#583101', '#603808', '#6F4518', '#8B5E34', '#A47148',
        '#CC3333', '#FF9933', '#FFCC00', '#336633', '#000000',
        '#800000', '#A52A2A', '#DAA520', '#556B2F', '#8B4513',
    ],
    'Europe': [
        '#2B2D42', '#8D99AE', '#EDF2F4', '#EF233C', '#D90429',
        '#000000', '#14213D', '#FCA311', '#E5E5E5', '#FFFFFF',
        '#355070', '#6D597A', '#B56576', '#E56B6F', '#EAAC8B',
        '#CAD2C5', '#84A98C', '#52796F', '#354F52', '#2F3E46',
        '#5F0F40', '#9A031E', '#FB8B24', '#E36414', '#0F4C5C',
    ],
    'Americas': [
        '#03071E', '#370617', '#6A040F', '#9D0208', '#D00000',
        '#DC0073', '#008BF8', '#89FC00', '#F5B700', '#000000',
        '#FF595E', '#FFCA3A', '#8AC926', '#1982C4', '#6A4C93',
        '#22223B', '#4A4E69', '#9A8C98', '#C9ADA7', '#F2E9E4',
        '#F72585', '#7209B7', '#3A0CA3', '#4361EE', '#4CC9F0',
    ]
};

const continents = [
    { id: 'Asia', label: 'آسيا', icon: '🌏' },
    { id: 'Africa', label: 'أفريقيا', icon: '🌍' },
    { id: 'Europe', label: 'أوروبا', icon: '🇪🇺' },
    { id: 'Americas', label: 'أمريكا', icon: '🌎' },
];

// ----------------------------------------------------------------------
// DATA: Target Groups
// ----------------------------------------------------------------------
const targetGroups = [
    { id: 'men', label: 'رجالي', value: 'Men' },
    { id: 'women', label: 'نسائي', value: 'Women' },
    { id: 'boys', label: 'ولادي', value: 'Boys' },
    { id: 'girls', label: 'بناتي', value: 'Girls' },
    { id: 'kids', label: 'أطفال', value: 'Kids' },
];

// Mock Options
const optionsData: Record<string, { id: string, label: string, value: string, color?: string, icon?: React.ElementType | string, iconImage?: string }[]> = {
    type: [
        { id: 'thobe', label: 'ثوب', value: 'Thobe', icon: IconThobe },
        { id: 'abaya', label: 'عباية', value: 'Abaya', icon: IconAbaya },
        { id: 'kaftan', label: 'قفطان', value: 'Kaftan', icon: IconKaftan },
        { id: 'bisht', label: 'بشت', value: 'Bisht', icon: IconBisht },
        { id: 'tshirt', label: 'تيشيرت', value: 'T-Shirt', icon: IconTShirt },
        { id: 'shirt', label: 'قميص', value: 'Shirt', icon: IconBlazer }, // Using Blazer as shirt for now or create generic shirt
        { id: 'hoodie', label: 'هودي', value: 'Hoodie', icon: IconHoodie },
        { id: 'blouse', label: 'بلوزة', value: 'Blouse', icon: IconBlouse },
        { id: 'suit', label: 'بدلة', value: 'Suit', icon: IconSuit },
        { id: 'evening_dress', label: 'سهرة', value: 'Evening Dress', icon: IconDressEvening },
        { id: 'summer_dress', label: 'صيفي', value: 'Summer Dress', icon: IconDressCasual },
        { id: 'jeans', label: 'جينز', value: 'Jeans', icon: IconJeans },
        { id: 'skirt', label: 'تنورة', value: 'Skirt', icon: IconSkirt },
        { id: 'coat', label: 'معطف', value: 'Coat', icon: IconCoat },
    ],
    cut: [
        // Basic
        { id: 'slim', label: 'ضيق (Slim)', value: 'Slim', icon: '📏' },
        { id: 'regular', label: 'عادي (Regular)', value: 'Regular', icon: '👔' },
        { id: 'loose', label: 'فضفاض (Loose)', value: 'Loose', icon: '🌬️' },
        { id: 'oversized', label: 'واسع جداً (Oversized)', value: 'Oversized', icon: '🧢' },

        // Thobe / Traditional
        { id: 'thobe_std', label: 'قصة عادية', value: 'Standard', icon: '🕋' },
        { id: 'thobe_slim', label: 'مسحوب (Slim)', value: 'Slim Fit', icon: '🕴️' },
        { id: 'thobe_wide', label: 'قصة واسعة', value: 'Wide', icon: '🦅' },

        // Dresses / Abayas
        { id: 'a_line', label: 'قصة A-Line', value: 'A-Line', icon: '👗' },
        { id: 'mermaid', label: 'قصة سمكة', value: 'Mermaid', icon: '🧜‍♀️' },
        { id: 'butterfly', label: 'فراشة (Butterfly)', value: 'Butterfly', icon: '🦋' },
        { id: 'straight', label: 'مستقيمة', value: 'Straight', icon: '📏' },
        { id: 'cloche', label: 'كلوش', value: 'Cloche', icon: '💃' },
    ],
    neck: [
        { id: 'round', label: 'دائري', value: 'Round', icon: '⭕' },
        { id: 'vneck', label: 'V-Neck', value: 'V-Neck', icon: '🔽' },
        { id: 'collage', label: 'ياقة قميص', value: 'Collar', icon: '👔' },
        { id: 'high', label: 'ياقة مرتفعة', value: 'High Neck', icon: '🧣' },
        { id: 'off_shoulder', label: 'Off Shoulder', value: 'Off Shoulder', icon: '↔️' },
    ],
    sleeve: [
        { id: 'short', label: 'قصير', value: 'Short', icon: '💪' },
        { id: 'long', label: 'طويل', value: 'Long', icon: '🧥' },
        { id: 'sleeveless', label: 'بدون أكمام', value: 'Sleeveless', icon: '🎽' },
        { id: 'puff', label: 'منفوخ (Puff)', value: 'Puff', icon: '🎈' },
    ],
    embroidery: [
        { id: 'none', label: 'لا شيء', value: 'None', icon: '🚫' },
        { id: 'chest', label: 'شعار الصدر', value: 'Chest Logo', icon: '🛡️' },
        { id: 'gold', label: 'تطريز ذهبي', value: 'Gold', icon: '✨' },
        { id: 'pattern', label: 'نقش كامل', value: 'Pattern', icon: '🎨' },
    ]
};

// Allowed Types Filter (Which Types appear for which Target Group)
const allowedTypes: Record<string, string[]> = {
    'Men': ['thobe', 'bisht', 'suit', 'tshirt', 'shirt', 'hoodie', 'jeans'],
    'Boys': ['thobe', 'bisht', 'suit', 'tshirt', 'shirt', 'hoodie', 'jeans'],
    'Women': ['abaya', 'kaftan', 'evening_dress', 'summer_dress', 'blouse', 'skirt', 'jeans', 'coat'],
    'Girls': ['abaya', 'kaftan', 'evening_dress', 'summer_dress', 'blouse', 'skirt', 'jeans', 'coat'],
    'Kids': ['tshirt', 'hoodie', 'jeans', 'summer_dress', 'skirt'],
};

// Allowed Cuts Filter (Which Cuts appear for which Type)
const allowedCuts: Record<string, string[]> = {
    'T-Shirt': ['slim', 'regular', 'loose', 'oversized'],
    'Hoodie': ['regular', 'oversized'],
    'Thobe': ['thobe_std', 'thobe_slim', 'thobe_wide'], // As user requested: specialized cuts
    'Abaya': ['straight', 'butterfly', 'cloche', 'bisht'],
    'Evening Dress': ['mermaid', 'a_line', 'straight', 'cloche'],
    'Summer Dress': ['a_line', 'loose', 'short'],
    'Jeans': ['slim', 'regular', 'wide_leg', 'skinny'],
    // Default fallback
    'default': ['regular', 'slim', 'loose']
};

const categoryTitles: Record<string, string> = {
    region: 'اختر القارة',
    category: 'اختر الفئة المستهدفة',
    type: 'اختر القطعة',
    cut: 'شكل القصة',
    neck: 'شكل الرقبة',
    sleeve: 'طول الأكمام',
    embroidery: 'التطريز',
};

export default function OptionsSidebar({ activeCategory, onClose }: OptionsSidebarProps) {
    const { design, setDesign, updateProfile } = useMerchantStore();
    const [selectedContinent, setSelectedContinent] = useState<string | null>(null);

    useEffect(() => {
        if (activeCategory !== 'region') {
            // eslint-disable-next-line
            setSelectedContinent(null);
        }
    }, [activeCategory]);

    const handleSelect = (category: string, value: string) => {
        if (category === 'region') {
            updateProfile({ region: value });
            return;
        }

        const storeKeyMap: Record<string, keyof DesignState> = {
            'category': 'targetGroup',
            'type': 'type',
            'neck': 'neckType',
            'sleeve': 'sleeveType',
            'cut': 'pattern',
            'embroidery': 'embroidery'
        };

        const key = storeKeyMap[category];
        if (key) {
            setDesign({ [key]: value }, `تغيير ${category} إلى ${value}`);
        }
    };

    const handleColorSelect = (color: string) => {
        setDesign({ baseColor: color }, `تغيير اللون إلى ${color} (موضة ${selectedContinent})`);
    };

    // Filter Logic
    const getFilteredOptions = () => {
        if (!activeCategory) return [];

        // 1. Filter Types based on Target Group (Men/Women/etc)
        if (activeCategory === 'type') {
            const currentGroup = design.targetGroup || 'Men';
            const allowed = allowedTypes[currentGroup] || [];
            return optionsData.type.filter(opt => allowed.includes(opt.id) || allowed.length === 0);
        }

        // 2. Filter Cuts based on Selected Type
        if (activeCategory === 'cut') {
            const currentType = design.type || 'T-Shirt';
            const allowed = allowedCuts[currentType] || allowedCuts['default'];
            return optionsData.cut.filter(opt => allowed.includes(opt.id));
        }

        // 3. Fallback for others
        return optionsData[activeCategory] || [];
    };

    const currentOptions = activeCategory === 'category'
        ? targetGroups.map(g => ({ ...g, color: undefined }))
        : getFilteredOptions();

    // Helper: Is this a "Visual Grid" category?
    const isGridCategory = activeCategory === 'type';

    return (
        <AnimatePresence>
            {activeCategory && (
                <motion.div
                    initial={{ x: "100%", opacity: 0 }}
                    animate={{ x: 0, opacity: 1 }}
                    exit={{ x: "100%", opacity: 0 }}
                    transition={{ type: "spring", stiffness: 300, damping: 30 }}
                    className="absolute top-0 right-0 h-full w-80 bg-white/95 backdrop-blur-xl shadow-2xl z-40 border-l border-white/20"
                >
                    <div className="flex items-center justify-between p-6 border-b border-gray-100">
                        <div className="flex items-center gap-2">
                            {activeCategory === 'region' && selectedContinent && (
                                <button onClick={() => setSelectedContinent(null)} className="p-1 hover:bg-slate-100 rounded-full">
                                    <ArrowRight size={20} />
                                </button>
                            )}
                            <h3 className="text-xl font-bold text-gray-800">
                                {activeCategory === 'region' && selectedContinent
                                    ? `ألوان ${selectedContinent}`
                                    : categoryTitles[activeCategory] || 'الخيارات'}
                            </h3>
                        </div>
                        <button
                            onClick={() => { onClose(); setSelectedContinent(null); }}
                            className="p-2 hover:bg-gray-100 rounded-full transition-colors text-gray-500 hover:text-red-500"
                        >
                            <X size={24} />
                        </button>
                    </div>

                    <div className={`p-6 overflow-y-auto h-[calc(100vh-100px)] ${isGridCategory ? 'grid grid-cols-2 gap-3' : 'flex flex-col gap-4'}`}>

                        {/* 1. REGION */}
                        {activeCategory === 'region' && !selectedContinent && (
                            <div className="grid grid-cols-1 gap-3">
                                {continents.map((cont) => (
                                    <button
                                        key={cont.id}
                                        onClick={() => setSelectedContinent(cont.id)}
                                        className="flex items-center gap-4 p-4 rounded-xl bg-slate-50 hover:bg-blue-50 border-2 border-transparent hover:border-blue-500 transition-all shadow-sm hover:shadow-md text-right"
                                    >
                                        <span className="text-3xl">{cont.icon}</span>
                                        <div>
                                            <div className="font-bold text-gray-800">{cont.label}</div>
                                            <div className="text-xs text-gray-500">استكشف ألوان الموضة</div>
                                        </div>
                                    </button>
                                ))}
                            </div>
                        )}

                        {activeCategory === 'region' && selectedContinent && (
                            <div>
                                <p className="text-xs text-gray-500 mb-4 font-bold">الألوان الأكثر رواجاً هذا الشهر:</p>
                                <div className="grid grid-cols-5 gap-2">
                                    {trendyColors[selectedContinent]?.map((color) => (
                                        <button
                                            key={color}
                                            onClick={() => handleColorSelect(color)}
                                            className="w-10 h-10 rounded-full shadow-sm hover:scale-110 transition-transform border border-gray-200"
                                            style={{ backgroundColor: color }}
                                            title={color}
                                        />
                                    ))}
                                </div>
                            </div>
                        )}

                        {/* 2. OTHER OPTIONS */}
                        {activeCategory !== 'region' && (
                            <>
                                {currentOptions.map((opt: { id: string; label: string; value: string; color?: string, icon?: any }) => {
                                    // FIXED: Correct active state check
                                    let isSelected = false;
                                    if (activeCategory === 'category') isSelected = design.targetGroup === opt.value;
                                    else if (activeCategory === 'type') isSelected = design.type === opt.value;
                                    else if (activeCategory === 'neck') isSelected = design.neckType === opt.value;
                                    else if (activeCategory === 'sleeve') isSelected = design.sleeveType === opt.value;
                                    else if (activeCategory === 'cut') isSelected = design.pattern === opt.value;
                                    else if (activeCategory === 'embroidery') isSelected = design.embroidery === opt.value;

                                    return (
                                        <button
                                            key={opt.id}
                                            onClick={() => activeCategory && handleSelect(activeCategory, opt.value)}
                                            className={`group relative flex ${isGridCategory ? 'flex-col justify-center gap-2 aspect-square text-center' : 'items-center justify-between min-h-[70px]'} p-4 rounded-xl border-2 transition-all ${isSelected
                                                ? 'border-blue-500 bg-blue-50'
                                                : 'border-transparent bg-slate-50 hover:bg-white hover:border-blue-500 hover:shadow-lg'
                                                }`}
                                        >
                                            <div className={`flex ${isGridCategory ? 'flex-col items-center gap-2' : 'items-center gap-3'}`}>
                                                {/* ICON RENDERING */}
                                                {(opt as any).icon && (
                                                    typeof (opt as any).icon === 'string' ? (
                                                        <span className={`${isGridCategory ? 'text-4xl mb-1' : 'text-2xl'}`}>{(opt as any).icon}</span>
                                                    ) : (
                                                        <div className={`flex items-center justify-center ${isGridCategory ? 'w-12 h-12 bg-white/50 rounded-full' : 'w-8 h-8'}`}>
                                                            <opt.icon className="w-full h-full text-slate-600 group-hover:text-blue-600" />
                                                        </div>
                                                    )
                                                )}

                                                {opt.color && (
                                                    <div className="w-6 h-6 rounded-full border border-gray-200" style={{ backgroundColor: opt.color }}></div>
                                                )}
                                                <span className={`font-semibold text-gray-700 group-hover:text-blue-600 ${isGridCategory ? 'text-sm' : ''}`}>
                                                    {opt.label}
                                                </span>
                                            </div>

                                            {/* Show checkmark only for List view? Or minimal check for Grid? */}
                                            {!isGridCategory && (
                                                <div className={`text-blue-500 transition-opacity ${isSelected ? 'opacity-100' : 'opacity-0 group-hover:opacity-100'
                                                    }`}>
                                                    <Check size={20} />
                                                </div>
                                            )}

                                            {isGridCategory && isSelected && (
                                                <div className="absolute top-2 right-2 text-blue-500 bg-white rounded-full p-0.5 shadow-sm">
                                                    <Check size={14} />
                                                </div>
                                            )}
                                        </button>
                                    );
                                })}
                                {currentOptions.length === 0 && (
                                    <p className="text-gray-400 text-center py-10 col-span-2">لا توجد خيارات متاحة لهذا التصنيف.</p>
                                )}
                            </>
                        )}
                    </div>
                </motion.div>
            )}
        </AnimatePresence>
    );
}
