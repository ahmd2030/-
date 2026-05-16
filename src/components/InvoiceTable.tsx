"use client";

import React from 'react';
import { motion } from 'motion/react';
import { 
  CheckCircle2, 
  Eye, 
  Trash2,
  FileText,
  AlertCircle,
  Download
} from 'lucide-react';
import { InvoiceData, AppMode, VerificationResult } from '@/types';
import { clsx, type ClassValue } from 'clsx';
import { twMerge } from 'tailwind-merge';

function cn(...inputs: ClassValue[]) {
  return twMerge(clsx(inputs));
}

interface InvoiceTableProps {
  mode: AppMode;
  results: InvoiceData[];
  verificationResults: VerificationResult[];
  selectedInvoice: InvoiceData | null;
  openedIds: (string | number)[];
  lastWorkedOnId: string | number | null;
  onSelect: (invoice: InvoiceData) => void;
  onToggleComplete: (id: string | number) => void;
  onDelete: (id: string | number) => void;
  onExport: () => void;
}

export default function InvoiceTable({ 
  mode, 
  results, 
  verificationResults, 
  selectedInvoice,
  openedIds,
  lastWorkedOnId,
  onSelect,
  onToggleComplete,
  onDelete,
  onExport
}: InvoiceTableProps) {
  
  const completedCount = results.filter(r => r.status === 'completed').length;
  const errorCount = results.filter(r => r.status === 'error').length;

  return (
    <div className="flex flex-col h-full">
      {/* Table Header Bar */}
      <div className="p-4 border-b border-slate-100 bg-slate-50/80 flex justify-between items-center flex-shrink-0">
        <h3 className="font-bold text-slate-700 text-sm">
          {mode === AppMode.ANALYSIS ? 'نتائج التحليل' : 
           mode === AppMode.VERIFICATION ? 'نتائج المطابقة والتدقيق' : 'معاينة التقرير النهائي'}
        </h3>
        <div className="flex items-center gap-4">
          {results.length > 0 && (
            <div className="text-xs font-mono flex gap-3">
              <span className="flex items-center gap-1 text-green-600"><CheckCircle2 className="w-3.5 h-3.5"/> {completedCount}</span>
              {errorCount > 0 && <span className="flex items-center gap-1 text-red-500"><AlertCircle className="w-3.5 h-3.5"/> {errorCount}</span>}
            </div>
          )}
          {results.length > 0 && (
            <button 
              onClick={onExport}
              className="flex items-center gap-1.5 px-3 py-1.5 bg-accent/10 text-accent rounded-lg text-xs font-bold hover:bg-accent hover:text-white transition-all"
            >
              <Download className="w-3.5 h-3.5" />
              تصدير Excel
            </button>
          )}
        </div>
      </div>

      {/* Table Content */}
      {results.length === 0 && verificationResults.length === 0 ? (
        <div className="flex-1 flex flex-col items-center justify-center p-12 text-slate-300">
          <div className="w-24 h-24 bg-slate-50 rounded-full flex items-center justify-center mb-6">
            <FileText className="w-12 h-12 opacity-20" />
          </div>
          <p className="text-lg font-bold text-slate-400 mb-2">لا توجد بيانات لمعالجتها حالياً</p>
          <p className="text-sm text-slate-300">قم برفع ملفات PDF والضغط على "ابدأ المعالجة" للبدء</p>
        </div>
      ) : (
        <div className="overflow-auto flex-1">
          {mode === AppMode.VERIFICATION ? (
            <table className="w-full text-right">
              <thead className="bg-slate-50/80 backdrop-blur sticky top-0 z-10 border-b border-slate-100">
                <tr>
                  <th className="p-3 text-[10px] font-black uppercase tracking-wider border-l border-slate-100 w-12 text-slate-400">م</th>
                  <th className="p-3 text-[10px] font-black uppercase tracking-wider border-l border-slate-100 text-slate-400">اسم الملف</th>
                  <th className="p-3 text-[10px] font-black uppercase tracking-wider border-l border-slate-100 text-slate-400">رقم الفاتورة</th>
                  <th className="p-3 text-[10px] font-black uppercase tracking-wider border-l border-slate-100 text-slate-400">حالة المطابقة</th>
                  <th className="p-3 text-[10px] font-black uppercase tracking-wider border-l border-slate-100 text-slate-400">الفروقات</th>
                  <th className="p-3 text-[10px] font-black uppercase tracking-wider text-slate-400 w-16">عرض</th>
                </tr>
              </thead>
              <tbody className="divide-y divide-slate-50">
                {verificationResults.map((v, idx) => (
                  <motion.tr 
                    initial={{ opacity: 0 }}
                    animate={{ opacity: 1 }}
                    key={idx} 
                    className={cn(
                      "hover:bg-accent/5 transition-colors cursor-pointer",
                      selectedInvoice?.fileName === v.fileName && "bg-accent/5"
                    )}
                    onClick={() => v.extractedData && onSelect(v.extractedData)}
                  >
                    <td className="p-3 text-xs font-bold text-slate-400 text-center">{idx + 1}</td>
                    <td className="p-3 text-xs font-bold text-slate-700 max-w-[180px] truncate">{v.fileName}</td>
                    <td className="p-3 text-xs font-medium text-slate-600">{v.invoiceNumber}</td>
                    <td className="p-3">
                      {v.foundInExcel ? (
                        <span className="inline-flex items-center gap-1 text-green-600 bg-green-50 px-2 py-1 rounded-full text-[10px] font-bold">
                          <CheckCircle2 className="w-3 h-3" /> تم العثور عليها
                        </span>
                      ) : (
                        <span className="inline-flex items-center gap-1 text-red-500 bg-red-50 px-2 py-1 rounded-full text-[10px] font-bold">
                          <AlertCircle className="w-3 h-3" /> غير موجودة
                        </span>
                      )}
                    </td>
                    <td className="p-3">
                      {v.mismatches.length > 0 ? (
                        <div className="flex flex-wrap gap-1">
                          {v.mismatches.map((m, mi) => (
                            <span key={mi} className="text-[10px] bg-amber-100 text-amber-700 px-1.5 py-0.5 rounded font-bold">{m}</span>
                          ))}
                        </div>
                      ) : v.foundInExcel ? (
                        <span className="text-[10px] text-green-600 font-bold">مطابقة تماماً ✓</span>
                      ) : '-'}
                    </td>
                    <td className="p-3 text-center">
                      <button 
                        onClick={(e) => { e.stopPropagation(); v.extractedData && onSelect(v.extractedData); }}
                        className="p-1.5 hover:bg-white rounded-lg text-slate-400 hover:text-accent transition-all"
                      >
                        <Eye className="w-4 h-4" />
                      </button>
                    </td>
                  </motion.tr>
                ))}
              </tbody>
            </table>
          ) : (
            <table className="w-full text-right">
              <thead className="bg-slate-50/80 backdrop-blur sticky top-0 z-10 border-b border-slate-100">
                <tr>
                  <th className="p-3 text-[10px] font-black uppercase tracking-wider border-l border-slate-100 w-16 text-slate-400">م</th>
                  <th className="p-3 text-[10px] font-black uppercase tracking-wider border-l border-slate-100 text-slate-400">التاريخ</th>
                  <th className="p-3 text-[10px] font-black uppercase tracking-wider border-l border-slate-100 text-slate-400">رقم الفاتورة</th>
                  <th className="p-3 text-[10px] font-black uppercase tracking-wider border-l border-slate-100 text-slate-400">اللوحة</th>
                  <th className="p-3 text-[10px] font-black uppercase tracking-wider border-l border-slate-100 text-slate-400">العداد</th>
                  <th className="p-3 text-[10px] font-black uppercase tracking-wider border-l border-slate-100 text-slate-400">نوع السيارة</th>
                  <th className="p-3 text-[10px] font-black uppercase tracking-wider border-l border-slate-100 text-slate-400">الإجمالي</th>
                  <th className="p-3 text-[10px] font-black uppercase tracking-wider text-slate-400 w-20">إجراءات</th>
                </tr>
              </thead>
              <tbody className="divide-y divide-slate-50">
                {results.map((res, idx) => (
                  <motion.tr 
                    layout
                    initial={{ opacity: 0, y: 5 }}
                    animate={{ opacity: 1, y: 0 }}
                    transition={{ delay: idx * 0.02 }}
                    key={res.id || idx} 
                    className={cn(
                      "hover:bg-accent/5 transition-colors cursor-pointer group",
                      openedIds.includes(res.id!) && "bg-green-50/60",
                      lastWorkedOnId === res.id && "bg-orange-100/20 border-r-4 border-orange-400",
                      res.status === 'error' && "bg-red-50/40",
                      selectedInvoice?.id === res.id && "bg-accent/5 ring-1 ring-inset ring-accent/20"
                    )}
                    onClick={() => onSelect(res)}
                  >
                    <td className="p-3">
                      <div className="flex items-center gap-2">
                        <button 
                          onClick={(e) => { e.stopPropagation(); res.id && onToggleComplete(res.id); }}
                          className={cn(
                            "w-5 h-5 rounded-full border-2 flex items-center justify-center transition-all flex-shrink-0",
                            res.isFinished ? "bg-green-500 border-green-500 text-white" : "border-slate-200 hover:border-accent"
                          )}
                        >
                          {res.isFinished && <CheckCircle2 className="w-3 h-3" />}
                        </button>
                        <span className="text-xs font-bold text-slate-400">{idx + 1}</span>
                      </div>
                    </td>
                    <td className="p-3 text-xs font-medium text-slate-600 whitespace-nowrap">{res.date}</td>
                    <td className="p-3 text-xs font-black text-accent whitespace-nowrap">{res.invoiceNumber}</td>
                    <td className="p-3 text-xs font-bold text-amber-700 whitespace-nowrap">{res.plateNumber}</td>
                    <td className="p-3 text-xs text-slate-500 whitespace-nowrap">{res.count}</td>
                    <td className="p-3 text-xs font-medium text-slate-700 max-w-[180px] truncate">{res.carType}</td>
                    <td className="p-3 text-xs font-black text-slate-900 whitespace-nowrap">
                      {res.totalAmount ? `${Number(res.totalAmount).toLocaleString()} ر.س` : '-'}
                    </td>
                    <td className="p-3">
                      <div className="flex items-center gap-1 justify-center">
                        <button 
                          onClick={(e) => { e.stopPropagation(); onSelect(res); }}
                          className="p-1.5 rounded-lg text-slate-300 hover:text-accent hover:bg-white transition-all"
                          title="عرض التفاصيل"
                        >
                          <Eye className="w-4 h-4" />
                        </button>
                        <button 
                          onClick={(e) => { e.stopPropagation(); res.id && onDelete(res.id); }}
                          className="p-1.5 rounded-lg text-slate-300 hover:text-red-500 hover:bg-white transition-all"
                          title="حذف"
                        >
                          <Trash2 className="w-3.5 h-3.5" />
                        </button>
                      </div>
                    </td>
                  </motion.tr>
                ))}
              </tbody>
              {/* Summary Footer */}
              {results.length > 0 && (
                <tfoot className="border-t-2 border-slate-200 bg-slate-50/80">
                  <tr>
                    <td colSpan={6} className="p-3 text-left text-xs font-black text-slate-500">
                      الإجمالي ({results.filter(r => r.status === 'completed').length} فاتورة)
                    </td>
                    <td className="p-3 text-xs font-black text-accent whitespace-nowrap">
                      {results.reduce((sum, r) => sum + (Number(r.totalAmount) || 0), 0).toLocaleString()} ر.س
                    </td>
                    <td></td>
                  </tr>
                </tfoot>
              )}
            </table>
          )}
        </div>
      )}
    </div>
  );
}
