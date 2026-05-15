"use client";

import React from 'react';
import { motion, AnimatePresence } from 'motion/react';
import { 
  CheckCircle2, 
  Eye, 
  Trash2,
  FileText,
  AlertCircle
} from 'lucide-react';
import { InvoiceData, AppMode, VerificationResult, TableTemplate } from '@/types';
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
  onSelect: (invoice: InvoiceData) => void;
  onToggleComplete: (id: string | number) => void;
  onDelete: (id: string | number) => void;
}

export default function InvoiceTable({ 
  mode, 
  results, 
  verificationResults, 
  selectedInvoice,
  onSelect,
  onToggleComplete,
  onDelete
}: InvoiceTableProps) {
  
  if (results.length === 0 && verificationResults.length === 0) {
    return (
      <div className="flex-1 flex flex-col items-center justify-center p-12 text-slate-300">
        <FileText className="w-20 h-20 mb-4 opacity-20" />
        <p className="text-xl font-bold">لا توجد بيانات لمعالجتها حالياً</p>
        <p className="text-sm">قم برفع ملفات PDF والضغط على "ابدأ المعالجة" للبدء</p>
      </div>
    );
  }

  return (
    <div className="overflow-x-auto">
      {mode === AppMode.VERIFICATION ? (
        <table className="w-full text-right">
          <thead className="bg-slate-50/50 backdrop-blur sticky top-0 z-10 border-b border-slate-100">
            <tr>
              <th className="p-4 text-xs font-black uppercase tracking-wider border-l border-slate-100 w-16 text-slate-400">م</th>
              <th className="p-4 text-xs font-black uppercase tracking-wider border-l border-slate-100 text-slate-400">اسم الملف</th>
              <th className="p-4 text-xs font-black uppercase tracking-wider border-l border-slate-100 text-slate-400">رقم الفاتورة</th>
              <th className="p-4 text-xs font-black uppercase tracking-wider border-l border-slate-100 text-slate-400">حالة المطابقة</th>
              <th className="p-4 text-xs font-black uppercase tracking-wider border-l border-slate-100 text-slate-400">الفروقات</th>
              <th className="p-4 text-xs font-black uppercase tracking-wider text-slate-400">عرض</th>
            </tr>
          </thead>
          <tbody className="divide-y divide-primary/5">
            {verificationResults.map((v, idx) => (
              <motion.tr 
                initial={{ opacity: 0 }}
                animate={{ opacity: 1 }}
                key={idx} 
                className={cn(
                  "hover:bg-slate-50/80 transition-colors",
                  selectedInvoice?.fileName === v.fileName && "bg-accent/5"
                )}
              >
                <td className="p-4 text-xs font-bold text-slate-400">{idx + 1}</td>
                <td className="p-4 text-xs font-bold text-slate-700 max-w-[200px] truncate">{v.fileName}</td>
                <td className="p-4 text-xs font-medium text-slate-600">{v.invoiceNumber}</td>
                <td className="p-4">
                  {v.foundInExcel ? (
                    <span className="inline-flex items-center gap-1 text-green-600 bg-green-50 px-2 py-1 rounded-full text-[10px] font-bold">
                      <CheckCircle2 className="w-3 h-3" /> تم العثور عليها
                    </span>
                  ) : (
                    <span className="inline-flex items-center gap-1 text-red-500 bg-red-50 px-2 py-1 rounded-full text-[10px] font-bold">
                      <AlertCircle className="w-3 h-3" /> غير موجودة بالإكسل
                    </span>
                  )}
                </td>
                <td className="p-4">
                  {v.mismatches.length > 0 ? (
                    <div className="flex flex-wrap gap-1">
                      {v.mismatches.map((m, mi) => (
                        <span key={mi} className="text-[10px] bg-amber-100 text-amber-700 px-1.5 py-0.5 rounded font-bold">{m}</span>
                      ))}
                    </div>
                  ) : v.foundInExcel ? (
                    <span className="text-[10px] text-green-600 font-bold">مطابقة تماماً</span>
                  ) : '-'}
                </td>
                <td className="p-4 text-left">
                  <button 
                    onClick={() => v.extractedData && onSelect(v.extractedData)}
                    className="p-2 hover:bg-white rounded-lg text-slate-400 hover:text-accent transition-all shadow-sm hover:shadow border border-transparent hover:border-slate-100"
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
          <thead className="bg-slate-50/50 backdrop-blur sticky top-0 z-10 border-b border-slate-100">
            <tr>
              <th className="p-4 text-xs font-black uppercase tracking-wider border-l border-slate-100 w-16 text-slate-400">م</th>
              <th className="p-4 text-xs font-black uppercase tracking-wider border-l border-slate-100 text-slate-400">التاريخ</th>
              <th className="p-4 text-xs font-black uppercase tracking-wider border-l border-slate-100 text-slate-400">رقم الفاتورة</th>
              <th className="p-4 text-xs font-black uppercase tracking-wider border-l border-slate-100 text-slate-400">اللوحة</th>
              <th className="p-4 text-xs font-black uppercase tracking-wider border-l border-slate-100 text-slate-400">العداد</th>
              <th className="p-4 text-xs font-black uppercase tracking-wider border-l border-slate-100 text-slate-400">نوع السيارة</th>
              <th className="p-4 text-xs font-black uppercase tracking-wider border-l border-slate-100 text-slate-400">الإجمالي</th>
              <th className="p-4 text-xs font-black uppercase tracking-wider text-slate-400">عرض</th>
            </tr>
          </thead>
          <tbody className="divide-y divide-primary/5">
            {results.map((res, idx) => (
              <motion.tr 
                layout
                initial={{ opacity: 0, y: 10 }}
                animate={{ opacity: 1, y: 0 }}
                key={res.id || idx} 
                className={cn(
                  "hover:bg-slate-50/80 transition-colors group relative",
                  res.isFinished && "bg-green-50/30 opacity-70",
                  selectedInvoice?.id === res.id && "bg-accent/5 ring-1 ring-inset ring-accent/20"
                )}
              >
                <td className="p-4">
                  <div className="flex items-center gap-2">
                    <button 
                      onClick={() => res.id && onToggleComplete(res.id)}
                      className={cn(
                        "w-5 h-5 rounded-full border-2 flex items-center justify-center transition-all",
                        res.isFinished ? "bg-green-500 border-green-500 text-white" : "border-slate-200 hover:border-accent"
                      )}
                    >
                      {res.isFinished && <CheckCircle2 className="w-3 h-3" />}
                    </button>
                    <span className="text-xs font-bold text-slate-400">{idx + 1}</span>
                  </div>
                </td>
                <td className="p-4 text-xs font-medium text-slate-600">{res.date}</td>
                <td className="p-4 text-xs font-black text-slate-800">{res.invoiceNumber}</td>
                <td className="p-4 text-xs font-bold text-amber-700">{res.plateNumber}</td>
                <td className="p-4 text-xs text-slate-500">{res.count}</td>
                <td className="p-4 text-xs font-medium text-slate-700 max-w-[150px] truncate">{res.carType}</td>
                <td className="p-4 text-xs font-black text-slate-900">{res.totalAmount?.toLocaleString()}</td>
                <td className="p-4 text-left">
                  <div className="flex items-center gap-1 opacity-0 group-hover:opacity-100 transition-opacity">
                    <button 
                      onClick={() => onSelect(res)}
                      className="p-2 bg-white rounded-lg text-slate-400 hover:text-accent transition-all shadow-sm border border-slate-100"
                    >
                      <Eye className="w-4 h-4" />
                    </button>
                    <button 
                      onClick={() => res.id && onDelete(res.id)}
                      className="p-2 bg-white rounded-lg text-slate-400 hover:text-red-500 transition-all shadow-sm border border-slate-100"
                    >
                      <Trash2 className="w-4 h-4" />
                    </button>
                  </div>
                </td>
              </motion.tr>
            ))}
          </tbody>
        </table>
      )}
    </div>
  );
}
