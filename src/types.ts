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
  itemsDescription: string; // إسم الأصناف
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
  itemsDescription: { bg: 'bg-slate-100', border: 'border-slate-500', text: 'text-slate-900', highlight: 'rgba(71, 85, 105, 0.15)', solid: '#475569' },
  totalAmount: { bg: 'bg-violet-100', border: 'border-violet-500', text: 'text-violet-900', highlight: 'rgba(124, 58, 237, 0.15)', solid: '#7C3AED' },
};

export const FIELD_NAMES: Record<string, string> = {
  invoiceNumber: 'رقم الفاتورة',
  date: 'التاريخ',
  plateNumber: 'رقم اللوحة',
  count: 'العداد',
  carType: 'نوع السيارة',
  branch: 'الفرع',
  itemsDescription: 'الأصناف',
  totalAmount: 'الإجمالي',
  taxAmount: 'الضريبة',
  subTotal: 'المبلغ قبل الضريبة',
  notes: 'ملاحظات'
};
