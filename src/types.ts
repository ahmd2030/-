/**
 * @license
 * SPDX-License-Identifier: Apache-2.0
 */

export interface InvoiceData {
  fileName: string;
  id?: number; // Serial 'م'
  date: string;
  invoiceNumber: string;
  plateNumber: string; // اللوحة
  count: string; // العدد (مثل العداد أو الكمية)
  carType: string; // نوع السيارة
  branch: string; // الفرع
  oilName: string;
  oilQty: string;
  oilPrice: string;
  oilFilterName: string;
  oilFilterQty: string;
  oilFilterPrice: string;
  gearOilName: string;
  gearOilQty: string;
  gearOilPrice: string;
  diffOilName: string;
  diffOilQty: string;
  diffOilPrice: string;
  airFilterName: string;
  airFilterQty: string;
  airFilterPrice: string;
  acFilterName: string;
  acFilterQty: string;
  acFilterPrice: string;
  dieselFilterName: string;
  dieselFilterQty: string;
  dieselFilterPrice: string;
  dieselFilterServiceName: string;
  dieselFilterServiceQty: string;
  dieselFilterServicePrice: string;
  tiresName: string;
  tiresQty: string;
  tiresPrice: string;
  wipersName: string;
  wipersQty: string;
  wipersPrice: string;
  batteriesName: string;
  batteriesQty: string;
  batteriesPrice: string;
  servicesName: string;
  servicesQty: string;
  servicesPrice: string;
  sparePartsName: string;
  sparePartsQty: string;
  sparePartsPrice: string;
  subTotal: number; // الإجمالي قبل الضريبة
  taxAmount: number; // الضريبة
  totalAmount: number; // الإجمالي بعد الضريبة
  notes: string; // ملاحظات
  status: 'pending' | 'processing' | 'completed' | 'error';
  isFinished?: boolean;
  error?: string;
  originalFile?: File;
  locations?: {
    [key: string]: number[];
  };
  [key: string]: any;
}

export enum AppMode {
  ANALYSIS = 'analysis',
  VERIFICATION = 'verification',
  REPORT = 'report'
}

export enum TableTemplate {
  MODERN = 'modern',
  CLASSIC = 'classic',
  CORPORATE = 'corporate'
}

export interface VerificationResult {
  fileName: string;
  invoiceNumber: string;
  foundInExcel: boolean;
  mismatches: string[];
  originalData?: any;
  extractedData?: InvoiceData;
}

export interface ProcessingState {
  total: number;
  processed: number;
  currentBatch: number;
  isProcessing: boolean;
  mode: AppMode;
}

export interface ExcelTemplate {
  headers: string[];
  existingData: any[];
  file?: File;
  name?: string;
}

export const FIELD_COLORS: Record<string, { bg: string, border: string, text: string, highlight: string, solid: string }> = {
  invoiceNumber: { bg: 'bg-indigo-100', border: 'border-indigo-500', text: 'text-indigo-900', highlight: 'rgba(79, 70, 229, 0.15)', solid: '#4F46E5' },
  date: { bg: 'bg-blue-100', border: 'border-blue-500', text: 'text-blue-900', highlight: 'rgba(37, 99, 235, 0.15)', solid: '#2563EB' },
  plateNumber: { bg: 'bg-amber-100', border: 'border-amber-500', text: 'text-amber-900', highlight: 'rgba(217, 119, 6, 0.15)', solid: '#D97706' },
  count: { bg: 'bg-emerald-100', border: 'border-emerald-500', text: 'text-emerald-900', highlight: 'rgba(5, 150, 105, 0.15)', solid: '#059669' },
  carType: { bg: 'bg-fuchsia-100', border: 'border-fuchsia-500', text: 'text-fuchsia-900', highlight: 'rgba(192, 38, 211, 0.15)', solid: '#C026D3' },
  branch: { bg: 'bg-rose-100', border: 'border-rose-500', text: 'text-rose-900', highlight: 'rgba(225, 29, 72, 0.15)', solid: '#E11D48' },
  oilName: { bg: 'bg-amber-50', border: 'border-amber-400', text: 'text-amber-900', highlight: 'rgba(251, 191, 36, 0.15)', solid: '#FBBF24' },
  oilQty: { bg: 'bg-amber-50', border: 'border-amber-400', text: 'text-amber-900', highlight: 'rgba(251, 191, 36, 0.15)', solid: '#FBBF24' },
  oilPrice: { bg: 'bg-amber-50', border: 'border-amber-400', text: 'text-amber-900', highlight: 'rgba(251, 191, 36, 0.15)', solid: '#FBBF24' },
  oilFilterName: { bg: 'bg-amber-100', border: 'border-amber-500', text: 'text-amber-900', highlight: 'rgba(245, 158, 11, 0.15)', solid: '#F59E0B' },
  oilFilterQty: { bg: 'bg-amber-100', border: 'border-amber-500', text: 'text-amber-900', highlight: 'rgba(245, 158, 11, 0.15)', solid: '#F59E0B' },
  oilFilterPrice: { bg: 'bg-amber-100', border: 'border-amber-500', text: 'text-amber-900', highlight: 'rgba(245, 158, 11, 0.15)', solid: '#F59E0B' },
  gearOilName: { bg: 'bg-yellow-50', border: 'border-yellow-400', text: 'text-yellow-900', highlight: 'rgba(250, 204, 21, 0.15)', solid: '#FACC15' },
  gearOilQty: { bg: 'bg-yellow-50', border: 'border-yellow-400', text: 'text-yellow-900', highlight: 'rgba(250, 204, 21, 0.15)', solid: '#FACC15' },
  gearOilPrice: { bg: 'bg-yellow-50', border: 'border-yellow-400', text: 'text-yellow-900', highlight: 'rgba(250, 204, 21, 0.15)', solid: '#FACC15' },
  diffOilName: { bg: 'bg-lime-50', border: 'border-lime-400', text: 'text-lime-900', highlight: 'rgba(163, 230, 53, 0.15)', solid: '#A3E635' },
  diffOilQty: { bg: 'bg-lime-50', border: 'border-lime-400', text: 'text-lime-900', highlight: 'rgba(163, 230, 53, 0.15)', solid: '#A3E635' },
  diffOilPrice: { bg: 'bg-lime-50', border: 'border-lime-400', text: 'text-lime-900', highlight: 'rgba(163, 230, 53, 0.15)', solid: '#A3E635' },
  airFilterName: { bg: 'bg-orange-50', border: 'border-orange-400', text: 'text-orange-900', highlight: 'rgba(251, 146, 60, 0.15)', solid: '#FB923C' },
  airFilterQty: { bg: 'bg-orange-50', border: 'border-orange-400', text: 'text-orange-900', highlight: 'rgba(251, 146, 60, 0.15)', solid: '#FB923C' },
  airFilterPrice: { bg: 'bg-orange-50', border: 'border-orange-400', text: 'text-orange-900', highlight: 'rgba(251, 146, 60, 0.15)', solid: '#FB923C' },
  acFilterName: { bg: 'bg-orange-100', border: 'border-orange-500', text: 'text-orange-900', highlight: 'rgba(249, 115, 22, 0.15)', solid: '#F97316' },
  acFilterQty: { bg: 'bg-orange-100', border: 'border-orange-500', text: 'text-orange-900', highlight: 'rgba(249, 115, 22, 0.15)', solid: '#F97316' },
  acFilterPrice: { bg: 'bg-orange-100', border: 'border-orange-500', text: 'text-orange-900', highlight: 'rgba(249, 115, 22, 0.15)', solid: '#F97316' },
  dieselFilterName: { bg: 'bg-stone-100', border: 'border-stone-500', text: 'text-stone-900', highlight: 'rgba(120, 113, 108, 0.15)', solid: '#78716C' },
  dieselFilterQty: { bg: 'bg-stone-100', border: 'border-stone-500', text: 'text-stone-900', highlight: 'rgba(120, 113, 108, 0.15)', solid: '#78716C' },
  dieselFilterPrice: { bg: 'bg-stone-100', border: 'border-stone-500', text: 'text-stone-900', highlight: 'rgba(120, 113, 108, 0.15)', solid: '#78716C' },
  dieselFilterServiceName: { bg: 'bg-neutral-100', border: 'border-neutral-500', text: 'text-neutral-900', highlight: 'rgba(115, 115, 115, 0.15)', solid: '#737373' },
  dieselFilterServiceQty: { bg: 'bg-neutral-100', border: 'border-neutral-500', text: 'text-neutral-900', highlight: 'rgba(115, 115, 115, 0.15)', solid: '#737373' },
  dieselFilterServicePrice: { bg: 'bg-neutral-100', border: 'border-neutral-500', text: 'text-neutral-900', highlight: 'rgba(115, 115, 115, 0.15)', solid: '#737373' },
  tiresName: { bg: 'bg-zinc-100', border: 'border-zinc-500', text: 'text-zinc-900', highlight: 'rgba(113, 113, 122, 0.15)', solid: '#71717A' },
  tiresQty: { bg: 'bg-zinc-100', border: 'border-zinc-500', text: 'text-zinc-900', highlight: 'rgba(113, 113, 122, 0.15)', solid: '#71717A' },
  tiresPrice: { bg: 'bg-zinc-100', border: 'border-zinc-500', text: 'text-zinc-900', highlight: 'rgba(113, 113, 122, 0.15)', solid: '#71717A' },
  wipersName: { bg: 'bg-cyan-100', border: 'border-cyan-500', text: 'text-cyan-900', highlight: 'rgba(6, 182, 212, 0.15)', solid: '#06B6D4' },
  wipersQty: { bg: 'bg-cyan-100', border: 'border-cyan-500', text: 'text-cyan-900', highlight: 'rgba(6, 182, 212, 0.15)', solid: '#06B6D4' },
  wipersPrice: { bg: 'bg-cyan-100', border: 'border-cyan-500', text: 'text-cyan-900', highlight: 'rgba(6, 182, 212, 0.15)', solid: '#06B6D4' },
  batteriesName: { bg: 'bg-yellow-100', border: 'border-yellow-500', text: 'text-yellow-900', highlight: 'rgba(234, 179, 8, 0.15)', solid: '#EAB308' },
  batteriesQty: { bg: 'bg-yellow-100', border: 'border-yellow-500', text: 'text-yellow-900', highlight: 'rgba(234, 179, 8, 0.15)', solid: '#EAB308' },
  batteriesPrice: { bg: 'bg-yellow-100', border: 'border-yellow-500', text: 'text-yellow-900', highlight: 'rgba(234, 179, 8, 0.15)', solid: '#EAB308' },
  servicesName: { bg: 'bg-pink-100', border: 'border-pink-500', text: 'text-pink-900', highlight: 'rgba(236, 72, 153, 0.15)', solid: '#EC4899' },
  servicesQty: { bg: 'bg-pink-100', border: 'border-pink-500', text: 'text-pink-900', highlight: 'rgba(236, 72, 153, 0.15)', solid: '#EC4899' },
  servicesPrice: { bg: 'bg-pink-100', border: 'border-pink-500', text: 'text-pink-900', highlight: 'rgba(236, 72, 153, 0.15)', solid: '#EC4899' },
  sparePartsName: { bg: 'bg-teal-100', border: 'border-teal-500', text: 'text-teal-900', highlight: 'rgba(20, 184, 166, 0.15)', solid: '#14B8A6' },
  sparePartsQty: { bg: 'bg-teal-100', border: 'border-teal-500', text: 'text-teal-900', highlight: 'rgba(20, 184, 166, 0.15)', solid: '#14B8A6' },
  sparePartsPrice: { bg: 'bg-teal-100', border: 'border-teal-500', text: 'text-teal-900', highlight: 'rgba(20, 184, 166, 0.15)', solid: '#14B8A6' },
  subTotal: { bg: 'bg-slate-100', border: 'border-slate-400', text: 'text-slate-900', highlight: 'rgba(148, 163, 184, 0.15)', solid: '#94A3B8' },
  taxAmount: { bg: 'bg-slate-200', border: 'border-slate-500', text: 'text-slate-900', highlight: 'rgba(100, 116, 139, 0.15)', solid: '#64748B' },
  totalAmount: { bg: 'bg-violet-100', border: 'border-violet-500', text: 'text-violet-900', highlight: 'rgba(124, 58, 237, 0.15)', solid: '#7C3AED' },
};

export const FIELD_NAMES: Record<string, string> = {
  invoiceNumber: 'رقم الفاتورة',
  date: 'التاريخ',
  plateNumber: 'رقم اللوحة',
  count: 'العداد',
  carType: 'نوع السيارة',
  branch: 'الفرع',
  oilName: 'اسم الزيت',
  oilQty: 'كمية الزيت',
  oilPrice: 'سعر الزيت',
  oilFilterName: 'فلتر زيت',
  oilFilterQty: 'كمية فلتر الزيت',
  oilFilterPrice: 'سعر فلتر الزيت',
  gearOilName: 'زيت جير',
  gearOilQty: 'كمية زيت الجير',
  gearOilPrice: 'سعر زيت الجير',
  diffOilName: 'زيت دفرنس',
  diffOilQty: 'كمية زيت الدفرنس',
  diffOilPrice: 'سعر زيت الدفرنس',
  airFilterName: 'فلتر هواء',
  airFilterQty: 'كمية فلتر الهواء',
  airFilterPrice: 'سعر فلتر الهواء',
  acFilterName: 'فلتر مكيف',
  acFilterQty: 'كمية فلتر المكيف',
  acFilterPrice: 'سعر فلتر المكيف',
  dieselFilterName: 'فلتر ديزل',
  dieselFilterQty: 'كمية فلتر الديزل',
  dieselFilterPrice: 'سعر فلتر الديزل',
  dieselFilterServiceName: 'خدمة غيار فلتر ديزل',
  dieselFilterServiceQty: 'كمية خدمة فلتر الديزل',
  dieselFilterServicePrice: 'سعر خدمة فلتر الديزل',
  tiresName: 'كفرات',
  tiresQty: 'كمية الكفرات',
  tiresPrice: 'سعر الكفرات',
  wipersName: 'مساحات',
  wipersQty: 'كمية المساحات',
  wipersPrice: 'سعر المساحات',
  batteriesName: 'بطاريات',
  batteriesQty: 'كمية البطاريات',
  batteriesPrice: 'سعر البطاريات',
  servicesName: 'خدمات',
  servicesQty: 'كمية الخدمات',
  servicesPrice: 'سعر الخدمات',
  sparePartsName: 'قطع غيار',
  sparePartsQty: 'كمية قطع الغيار',
  sparePartsPrice: 'سعر قطع الغيار',
  totalAmount: 'الإجمالي',
  taxAmount: 'الضريبة',
  subTotal: 'المبلغ قبل الضريبة',
  notes: 'ملاحظات'
};
