import { useState } from 'react';
import { motion, AnimatePresence } from 'framer-motion';
import {
    MapPin,
    Shirt,
    Palette,
    Scissors,
    Check,
    ChevronDown,
    Search
} from 'lucide-react';
import { useMerchantStore } from '@/store/merchantStore';
import { cn } from '@/lib/utils';
import {
    IconThobe, IconAbaya, IconDressEvening, IconTwoPieceSet,
    IconKaftan, IconBlazer, IconDressCasual, IconTShirt,
    IconShorts, IconPants, IconBisht
} from '@/components/icons/GarmentIcons';

// --- Types ---
type Region = typeof REGIONS[number];
type ItemType = typeof ITEM_TYPES[number];
type Color = typeof COLORS[number];
type Fabric = typeof FABRICS[number];

type StepId = 'region' | 'type' | 'material' | 'cut';

interface Step {
    id: StepId;
    title: string;
    color: string;
    icon: React.ElementType;
}

// --- Data ---
const STEPS: Step[] = [
    { id: 'region', title: 'المنطقة (الهوية)', color: 'bg-emerald-600', icon: MapPin },     // Green
    { id: 'type', title: 'القطعة (القالب)', color: 'bg-rose-600', icon: Shirt },         // Red
    { id: 'material', title: 'الخامة واللون', color: 'bg-blue-600', icon: Palette },        // Blue
    { id: 'cut', title: 'القصة (التفاصيل)', color: 'bg-purple-600', icon: Scissors },    // Purple
];

const REGIONS = [
    { id: 'riyadh', name: 'الرياض (نجد)', style: 'modern-najdi' },
    { id: 'jeddah', name: 'جدة (الحجاز)', style: 'hjazi-flow' },
    { id: 'south', name: 'الجنوب (عسير)', style: 'asir-colorful' },
    { id: 'north', name: 'الشمال', style: 'north-classic' },
    { id: 'east', name: 'الشرقية', style: 'gulf-glam' },
    { id: 'gulf', name: 'دول الخليج', style: 'gulf-common' },
];

const ITEM_TYPES = [
    { id: 'thobe', name: 'ثوب', tag: 'الأكثر طلباً', icon: IconThobe },
    { id: 'abaya-classic', name: 'عباية كلاسيك', tag: 'أساسي', icon: IconAbaya },
    { id: 'dress-evening', name: 'فستان سهرة', tag: 'ترند 2025', icon: IconDressEvening },
    { id: 'set-2pc', name: 'طقم قطعتين', tag: 'عملي', icon: IconTwoPieceSet },
    { id: 'kaftan', name: 'جلابية / قفطان', tag: 'رمضان', icon: IconKaftan },
    { id: 'bisht', name: 'بشت / مشلح', tag: 'رسمي', icon: IconBisht },
    { id: 'blazer', name: 'بليزر رسمي', tag: 'مودرن', icon: IconBlazer },
    { id: 't-shirt', name: 'تيشرت', tag: 'كاجوال', icon: IconTShirt },
    { id: 'pants', name: 'بنطلون', tag: '', icon: IconPants },
    { id: 'shorts', name: 'شورت', tag: 'صيفي', icon: IconShorts },
    { id: 'dress-casual', name: 'فستان ناعم', tag: 'يومي', icon: IconDressCasual },
];

const COLORS = [
    { hex: '#000000', name: 'أسود ملكي' },
    { hex: '#F5F5DC', name: 'بيج رملي' },
    { hex: '#800020', name: 'عودي (Burgundy)' },
    { hex: '#FFFFFF', name: 'أبيض نقي' },
    { hex: '#1A365D', name: 'كحلي ليلي' },
    { hex: '#CC5500', name: 'برتقالي محروق' },
];

const FABRICS = [
    { id: 'silk', name: 'حرير طبيعي' },
    { id: 'linen', name: 'كتان (Linen)' },
    { id: 'velvet', name: 'مخمل (Velvet)' },
    { id: 'chiffon', name: 'شيفون' },
    { id: 'cotton', name: 'قطن فاخر' },
    { id: 'crepe', name: 'كريب سعودي' },
];

const CUT_OPTIONS = [
    { type: 'neck', label: 'ياقة V-Neck', val: 'V-Neck' },
    { type: 'neck', label: 'ياقة مربعة', val: 'Square' },
    { type: 'neck', label: 'ياقة دائرية', val: 'Round' },
    { type: 'sleeve', label: 'كم واسع', val: 'Loose' },
    { type: 'sleeve', label: 'كم مزموم', val: 'Puff' },
    { type: 'sleeve', label: 'بدون أكمام', val: 'Sleeveless' },
    { type: 'pocket', label: 'جيوب مخفية', val: 'Hidden' },
    { type: 'pocket', label: 'تطريز يدوي', val: 'Embroidery' },
];

export default function DesignStepper() {
    const { profile, setDesign, design } = useMerchantStore();
    const [activeStep, setActiveStep] = useState<StepId>('region');
    const [completedSteps, setCompletedSteps] = useState<StepId[]>([]);

    // Helper to check if step represents current selection
    const getSelectionText = (stepId: StepId) => {
        switch (stepId) {
            case 'region': return profile.region || 'اختر المنطقة';
            case 'type': return design?.type || 'اختر القالب';
            case 'material': return design?.baseColor ? `${design.fabric} - ${design.baseColor}` : 'اختر الخامة';
            case 'cut': return design?.neckType ? `${design.neckType} / ${design.sleeveType}` : 'تخصيص القصة';
            default: return '';
        }
    };

    const markComplete = (stepId: StepId) => {
        if (!completedSteps.includes(stepId)) {
            setCompletedSteps(prev => [...prev, stepId]);
        }
    };

    const handleSelectRegion = (r: Region) => {
        // Assume updateProfile exists or we map to setDesign for now
        // In real app, we update profile logic
        useMerchantStore.setState(state => ({
            ...state,
            profile: { ...state.profile, region: r.name }
        }));
        setDesign({}, `تم اختيار المنطقة: ${r.name}`); // Just to trigger history
        markComplete('region');
        setTimeout(() => setActiveStep('type'), 400);
    };

    const handleSelectType = (t: ItemType) => {
        setDesign({ type: t.name }, `تم اختيار الموديل: ${t.name}`);
        markComplete('type');
        setTimeout(() => setActiveStep('material'), 400);
    };

    const handleSelectColor = (c: Color) => {
        setDesign({ baseColor: c.hex }, 'تغيير اللون');
    };

    const handleSelectFabric = (f: Fabric) => {
        setDesign({ fabric: f.name }, `تغيير القماش: ${f.name}`);
        markComplete('material');
        // Stay on material or let user manually go to next?
        // Let's auto advance only if both are picked? simplified: stay here.
    };

    const handleSelectCut = (type: string, val: string) => {
        if (type === 'neck') setDesign({ neckType: val }, `ياقة ${val}`);
        if (type === 'sleeve') setDesign({ sleeveType: val }, `كم ${val}`);
        markComplete('cut');
    };

    return (
        <div className="w-full h-full flex flex-col gap-2 p-2 overflow-y-auto custom-scrollbar">

            {STEPS.map((step) => {
                const isActive = activeStep === step.id;
                const isCompleted = completedSteps.includes(step.id);

                return (
                    <motion.div
                        key={step.id}
                        layout
                        initial={false}
                        animate={{
                            flexGrow: isActive ? 1 : 0,
                            minHeight: isActive ? '350px' : '70px',
                        }}
                        transition={{ type: 'spring', stiffness: 300, damping: 25 }}
                        className={cn(
                            "relative rounded-2xl overflow-hidden shadow-sm transition-all duration-300 flex flex-col",
                            step.color,
                            isActive ? "shadow-2xl ring-4 ring-white/30 z-10" : "hover:brightness-110 cursor-pointer opacity-90 hover:opacity-100"
                        )}
                        onClick={() => !isActive && setActiveStep(step.id)}
                    >
                        {/* Header */}
                        <div className="flex items-center justify-between p-4 h-[70px] text-white shrink-0">
                            <div className="flex items-center gap-3">
                                <div className="p-2 bg-white/20 rounded-xl backdrop-blur-md">
                                    <step.icon size={22} />
                                </div>
                                <div className="flex flex-col">
                                    <span className="font-bold text-lg leading-tight">
                                        {step.title}
                                    </span>
                                    {!isActive && (
                                        <motion.span
                                            initial={{ opacity: 0 }}
                                            animate={{ opacity: 0.8 }}
                                            className="text-xs font-light text-white/90 truncate max-w-[150px]"
                                        >
                                            {getSelectionText(step.id)}
                                        </motion.span>
                                    )}
                                </div>
                            </div>

                            <div className="flex items-center gap-2">
                                {isCompleted && !isActive && (
                                    <motion.div
                                        initial={{ scale: 0 }} animate={{ scale: 1 }}
                                        className="bg-white text-black rounded-full p-1"
                                    >
                                        <Check size={14} strokeWidth={3} />
                                    </motion.div>
                                )}
                                {!isActive && <ChevronDown size={18} className="text-white/60" />}
                            </div>
                        </div>

                        {/* Content Body */}
                        <AnimatePresence>
                            {isActive && (
                                <motion.div
                                    initial={{ opacity: 0, y: 20 }}
                                    animate={{ opacity: 1, y: 0 }}
                                    exit={{ opacity: 0 }}
                                    className="flex-1 bg-white/95 rounded-t-3xl p-4 overflow-y-auto"
                                >
                                    {/* 1. Region Content */}
                                    {step.id === 'region' && (
                                        <div className="grid grid-cols-1 gap-2">
                                            {REGIONS.map((r) => (
                                                <button
                                                    key={r.id}
                                                    onClick={() => handleSelectRegion(r)}
                                                    className={cn(
                                                        "flex items-center justify-between p-3 rounded-xl border-2 transition-all group",
                                                        profile.region === r.name
                                                            ? "border-emerald-500 bg-emerald-50"
                                                            : "border-slate-100 hover:border-emerald-200"
                                                    )}
                                                >
                                                    <div className="flex items-center gap-3">
                                                        <span className="text-xl">🇸🇦</span>
                                                        <span className="font-bold text-slate-700">{r.name}</span>
                                                    </div>
                                                    {profile.region === r.name && <Check size={16} className="text-emerald-600" />}
                                                </button>
                                            ))}
                                        </div>
                                    )}

                                    {/* 2. Type Content */}
                                    {step.id === 'type' && (
                                        <div className="space-y-3">
                                            <div className="relative">
                                                <Search className="absolute right-3 top-2.5 text-gray-400" size={16} />
                                                <input
                                                    type="text"
                                                    placeholder="بحث..."
                                                    className="w-full bg-slate-100 rounded-lg py-2 pr-9 pl-4 text-xs focus:outline-none focus:ring-2 focus:ring-rose-500"
                                                />
                                            </div>
                                            <div className="grid grid-cols-2 gap-3 pb-4">
                                                {ITEM_TYPES.map((t) => (
                                                    <button
                                                        key={t.id}
                                                        onClick={() => handleSelectType(t)}
                                                        className={cn(
                                                            "relative flex flex-col items-center justify-center p-4 rounded-2xl transition-all h-36 border",
                                                            "backdrop-blur-sm group",
                                                            design.type === t.name
                                                                ? "bg-rose-50 border-rose-500 shadow-md transform -translate-y-1"
                                                                : "bg-white border-slate-100/50 shadow-sm hover:shadow-lg hover:border-rose-200"
                                                        )}
                                                    >
                                                        {t.tag && (
                                                            <span className={cn(
                                                                "absolute top-2 left-2 text-[10px] px-2 py-0.5 rounded-full font-bold transition-colors",
                                                                design.type === t.name ? "bg-rose-100 text-rose-600" : "bg-slate-100 text-slate-500"
                                                            )}>
                                                                {t.tag}
                                                            </span>
                                                        )}
                                                        {/* Icon Container with Glass Effect */}
                                                        <div className={cn(
                                                            "w-16 h-16 rounded-full flex items-center justify-center mb-3 transition-all duration-300",
                                                            design.type === t.name
                                                                ? "bg-rose-500 text-white shadow-rose-300 shadow-lg"
                                                                : "bg-slate-50 text-slate-400 group-hover:bg-rose-100 group-hover:text-rose-500"
                                                        )}>
                                                            <t.icon width={32} height={32} strokeWidth={1.5} />
                                                        </div>
                                                        <span className={cn(
                                                            "font-bold text-sm leading-tight transition-colors",
                                                            design.type === t.name ? "text-rose-700" : "text-slate-600 group-hover:text-rose-600"
                                                        )}>
                                                            {t.name}
                                                        </span>
                                                    </button>
                                                ))}
                                            </div>
                                        </div>
                                    )}

                                    {/* 3. Material (Color + Fabric) */}
                                    {step.id === 'material' && (
                                        <div className="space-y-6">
                                            {/* Colors */}
                                            <div>
                                                <h4 className="text-xs font-bold text-gray-400 mb-2 uppercase tracking-wider">الألوان</h4>
                                                <div className="flex gap-2 overflow-x-auto pb-2 scrollbar-hide">
                                                    {COLORS.map((c) => (
                                                        <button
                                                            key={c.hex}
                                                            onClick={() => handleSelectColor(c)}
                                                            className={cn(
                                                                "shrink-0 w-10 h-10 rounded-full border-2 transition-transform hover:scale-110",
                                                                design.baseColor === c.hex ? "ring-2 ring-offset-2 ring-blue-500 border-transparent" : "border-slate-200"
                                                            )}
                                                            style={{ backgroundColor: c.hex }}
                                                        />
                                                    ))}
                                                </div>
                                            </div>

                                            {/* Fabrics */}
                                            <div>
                                                <h4 className="text-xs font-bold text-gray-400 mb-2 uppercase tracking-wider">الأقمشة</h4>
                                                <div className="grid grid-cols-2 gap-2">
                                                    {FABRICS.map((f) => (
                                                        <button
                                                            key={f.id}
                                                            onClick={() => handleSelectFabric(f)}
                                                            className={cn(
                                                                "p-3 rounded-lg border text-right text-xs font-bold transition-all",
                                                                design.fabric === f.name
                                                                    ? "border-blue-500 bg-blue-50 text-blue-700"
                                                                    : "border-slate-100 text-slate-600 hover:border-blue-200"
                                                            )}
                                                        >
                                                            {f.name}
                                                        </button>
                                                    ))}
                                                </div>
                                            </div>

                                            <button
                                                onClick={() => setActiveStep('cut')}
                                                className="w-full py-2 bg-blue-600 text-white rounded-lg font-bold text-sm mt-2 hover:bg-blue-700"
                                            >
                                                التالي: القصة والتفاصيل
                                            </button>
                                        </div>
                                    )}

                                    {/* 4. Cut (Neck, Sleeves) */}
                                    {step.id === 'cut' && (
                                        <div className="space-y-4">
                                            <div className="grid grid-cols-2 gap-3">
                                                {CUT_OPTIONS.map((opt, idx) => (
                                                    <div
                                                        key={idx}
                                                        draggable={true}
                                                        onDragStart={(e) => {
                                                            e.dataTransfer.setData('application/json', JSON.stringify(opt));
                                                            e.dataTransfer.effectAllowed = 'copy';
                                                        }}
                                                        onClick={() => handleSelectCut(opt.type, opt.val)}
                                                        className="p-3 bg-purple-50 hover:bg-purple-100 rounded-xl text-center border border-purple-100 transition-colors cursor-grab active:cursor-grabbing"
                                                    >
                                                        <span className="block text-purple-900 font-bold text-xs mb-1">{opt.label}</span>
                                                        <span className="text-purple-400 text-[10px] uppercase">{opt.type}</span>
                                                    </div>
                                                ))}
                                            </div>
                                            <div className="p-3 bg-slate-50 rounded-xl border border-dashed border-slate-300 text-center">
                                                <p className="text-xs text-slate-500 mb-2">اسحب القطع إلى المانيكان مباشرة</p>
                                                <div className="flex justify-center gap-2 opacity-50">
                                                    <Scissors size={16} />
                                                    <Shirt size={16} />
                                                </div>
                                            </div>
                                        </div>
                                    )}
                                </motion.div>
                            )}
                        </AnimatePresence>
                    </motion.div>
                );
            })}
        </div>
    );
}

