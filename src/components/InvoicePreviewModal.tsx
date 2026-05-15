"use client";

import React, { useState, useEffect } from 'react';
import { motion, AnimatePresence } from 'motion/react';
import { 
  XCircle, 
  Eye, 
  Trash2,
  Save,
  Move,
  Layout,
  FileText,
  Printer,
  ChevronRight,
  AlertCircle,
  Loader2,
  CheckCircle2
} from 'lucide-react';
import { InvoiceData, FIELD_COLORS, FIELD_NAMES } from '@/types';
import { clsx, type ClassValue } from 'clsx';
import { twMerge } from 'tailwind-merge';

function cn(...inputs: ClassValue[]) {
  return twMerge(clsx(inputs));
}

interface InvoicePreviewModalProps {
  invoice: InvoiceData;
  editData: InvoiceData | null;
  previewImage: string | null;
  isPreviewLoading: boolean;
  hoveredField: string | null;
  locked: boolean;
  hasChanges: boolean;
  onClose: () => void;
  onEdit: (data: InvoiceData) => void;
  onSave: () => void;
  onUpdateLocation: (field: string, box: number[]) => void;
  onSaveLayout: () => void;
  setHoveredField: (field: string | null) => void;
}

export default function InvoicePreviewModal({
  invoice,
  editData,
  previewImage,
  isPreviewLoading,
  hoveredField,
  locked,
  hasChanges,
  onClose,
  onEdit,
  onSave,
  onUpdateLocation,
  onSaveLayout,
  setHoveredField
}: InvoicePreviewModalProps) {
  
  if (!editData) return null;

  return (
    <div className="fixed inset-0 z-50 flex items-center justify-center p-4 md:p-8 bg-slate-900/60 backdrop-blur-sm animate-in fade-in duration-300">
      <motion.div 
        initial={{ scale: 0.9, opacity: 0 }}
        animate={{ scale: 1, opacity: 1 }}
        exit={{ scale: 0.9, opacity: 0 }}
        className="relative w-full max-w-6xl max-h-[90vh] bg-white rounded-[2.5rem] overflow-hidden shadow-2xl border border-slate-200/50 flex flex-col md:flex-row-reverse"
      >
        {/* Sidebar Info */}
        <div className="w-full md:w-[340px] bg-white p-8 border-l border-slate-100 overflow-y-auto">
          <div className="flex items-center justify-between mb-8">
            <button onClick={onClose} className="p-2 hover:bg-slate-100 rounded-full transition-colors">
              <XCircle className="w-6 h-6 text-slate-400" />
            </button>
            <div className="text-right">
              <h3 className="font-black text-xl text-slate-900">تفاصيل الفاتورة</h3>
              <p className="text-[10px] text-slate-400 font-bold uppercase tracking-widest">مراجعة وتدقيق البيانات</p>
            </div>
          </div>

          <div className="space-y-6">
            {/* Field Inputs */}
            {(Object.keys(FIELD_COLORS) as Array<keyof typeof FIELD_COLORS>).map(field => (
              <div 
                key={field} 
                className="space-y-1.5 group"
                onMouseEnter={() => setHoveredField(field as string)}
                onMouseLeave={() => setHoveredField(null)}
              >
                <label className="text-[11px] font-black text-slate-400 uppercase mr-1 flex items-center justify-between">
                  <span>{FIELD_NAMES[field] || field}</span>
                  {invoice.locations?.[field] && (
                    <span className="w-1.5 h-1.5 rounded-full bg-green-500 animate-pulse" title="موقع محدد" />
                  )}
                </label>
                <div className="relative">
                  {field === 'itemsDescription' ? (
                    <textarea 
                      value={String(editData[field] || '')}
                      onChange={(e) => onEdit({ ...editData, [field]: e.target.value })}
                      className="w-full p-3 bg-slate-50 border border-slate-200 rounded-xl text-xs font-medium focus:ring-2 focus:ring-accent/20 focus:border-accent transition-all min-h-[100px]"
                    />
                  ) : (
                    <input 
                      type="text" 
                      value={String(editData[field] || '')}
                      onChange={(e) => onEdit({ ...editData, [field]: e.target.value })}
                      className={cn(
                        "w-full p-3 bg-slate-50 border border-slate-200 rounded-xl text-xs font-bold focus:ring-2 focus:ring-accent/20 focus:border-accent transition-all",
                        hoveredField === field && "ring-2 ring-accent/30 border-accent"
                      )}
                    />
                  )}
                </div>
              </div>
            ))}
          </div>

          <div className="mt-8 pt-6 border-t border-slate-100 space-y-3">
            <button 
              onClick={onSave}
              disabled={!hasChanges}
              className={cn(
                "w-full py-4 rounded-2xl font-black text-sm flex items-center justify-center gap-2 transition-all",
                hasChanges 
                  ? "bg-slate-900 text-white shadow-lg hover:bg-black active:scale-95" 
                  : "bg-slate-100 text-slate-400 cursor-not-allowed"
              )}
            >
              <Save className="w-4 h-4" />
              حفظ التعديلات النصية
            </button>
            
            <button 
              onClick={onSaveLayout}
              className={cn(
                "w-full py-4 rounded-2xl font-black text-sm flex items-center justify-center gap-2 border-2 transition-all",
                locked 
                  ? "border-green-500 text-green-600 bg-green-50 cursor-default" 
                  : "border-slate-200 text-slate-600 hover:border-accent hover:text-accent bg-white shadow-sm"
              )}
            >
              <Move className="w-4 h-4" />
              {locked ? 'تم قفل وتدريب النموذج' : 'اعتماد وحفظ مواقع الحقول'}
            </button>
          </div>
        </div>

        {/* PDF Preview Area */}
        <div className="flex-1 bg-slate-50 p-4 md:p-8 overflow-hidden flex flex-col items-center justify-center relative">
          {isPreviewLoading ? (
            <div className="flex flex-col items-center gap-3">
              <Loader2 className="w-10 h-10 text-accent animate-spin" />
              <p className="text-slate-400 font-bold text-xs">جاري تجهيز معاينة الفاتورة...</p>
            </div>
          ) : previewImage ? (
            <div 
              className="relative shadow-2xl rounded-lg overflow-hidden bg-white max-h-full"
              style={{ aspectRatio: '1 / 1.414' }}
            >
              <img 
                src={previewImage} 
                alt="Invoice Preview" 
                className="max-h-full w-auto block select-none pointer-events-none"
              />
              
              {/* Bounding Boxes */}
              {Object.entries(FIELD_COLORS).map(([field, colors]) => {
                const box = invoice.locations?.[field];
                if (!box) return null;
                
                return (
                  <div 
                    key={field}
                    className={cn(
                      "absolute border-2 transition-all cursor-crosshair z-10",
                      colors.border,
                      hoveredField === field ? "opacity-100 ring-4 ring-white/50" : "opacity-40"
                    )}
                    style={{
                      top: `${box[0] / 10}%`,
                      left: `${box[1] / 10}%`,
                      height: `${(box[2] - box[0]) / 10}%`,
                      width: `${(box[3] - box[1]) / 10}%`,
                      backgroundColor: colors.highlight
                    }}
                    onMouseEnter={() => setHoveredField(field)}
                    onMouseLeave={() => setHoveredField(null)}
                  />
                );
              })}
            </div>
          ) : (
            <div className="text-slate-300 flex flex-col items-center gap-2">
              <AlertCircle className="w-12 h-12 opacity-30" />
              <p className="font-bold">فشل تحميل المعاينة البصرية</p>
            </div>
          )}
        </div>
      </motion.div>
    </div>
  );
}
