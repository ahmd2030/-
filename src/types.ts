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
}
