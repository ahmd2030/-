import { create } from 'zustand';

export interface DesignState {
  type?: string;
  baseColor: string;
  fabric: string;
  neckType: string;
  sleeveType: string;
  pattern: string | null;
  embroidery?: string;
  targetGroup?: string;
  graphic?: string;
}

export interface Variant {
  title: string;
  color: string;
  fabric: string;
  description: string;
}

interface HistoryItem {
  timestamp: number;
  state: DesignState;
  description: string;
}

interface MerchantStore {
  // بروفايل التاجر
  profile: { name: string; region: string; shopName: string };

  // حالة التصميم الحالية
  design: DesignState;

  // آلة الزمن (History)
  history: HistoryItem[];
  historyIndex: number;

  // المتغيرات السحرية
  variants: Variant[];

  // الأكشنز
  setDesign: (updates: Partial<DesignState>, description: string) => void;
  updateProfile: (updates: Partial<MerchantStore['profile']>) => void;
  undo: () => void;
  redo: () => void;
  jumpToTime: (index: number) => void;
  setVariants: (variants: Variant[]) => void;
}

const initialDesign: DesignState = {
  baseColor: '#ffffff',
  fabric: 'Cotton',
  neckType: 'Round',
  sleeveType: 'Short',
  pattern: null,
  embroidery: 'None',
  targetGroup: 'Men'
};

export const useMerchantStore = create<MerchantStore>((set) => ({
  profile: { name: "أبو خالد", region: "الرياض", shopName: "روائع الأناقة" },

  design: initialDesign,
  history: [{ timestamp: Date.now(), state: initialDesign, description: "بداية التصميم" }],
  historyIndex: 0,
  variants: [],

  setDesign: (updates, description) => set((state) => {
    const newDesign = { ...state.design, ...updates };
    // قص التاريخ إذا كنا في المنتصف وأضفنا تعديل جديد
    const newHistory = state.history.slice(0, state.historyIndex + 1);

    newHistory.push({
      timestamp: Date.now(),
      state: newDesign,
      description
    });

    return {
      design: newDesign,
      history: newHistory,
      historyIndex: newHistory.length - 1
    };
  }),

  updateProfile: (updates) => set((state) => ({
    profile: { ...state.profile, ...updates }
  })),

  undo: () => set((state) => {
    if (state.historyIndex > 0) {
      const newIndex = state.historyIndex - 1;
      return { historyIndex: newIndex, design: state.history[newIndex].state };
    }
    return {};
  }),

  redo: () => set((state) => {
    if (state.historyIndex < state.history.length - 1) {
      const newIndex = state.historyIndex + 1;
      return { historyIndex: newIndex, design: state.history[newIndex].state };
    }
    return {};
  }),

  jumpToTime: (index) => set((state) => ({
    historyIndex: index,
    design: state.history[index].state
  })),

  setVariants: (variants) => set({ variants }),
}));
