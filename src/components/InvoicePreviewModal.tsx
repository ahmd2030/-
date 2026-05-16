"use client";

import React, { useState, useEffect, useRef } from 'react';
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
  CheckCircle2,
  Lock,
  Unlock,
  Settings2,
  Expand
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
  onApplyLayoutToAll: () => void;
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
  onApplyLayoutToAll,
  setHoveredField
}: InvoicePreviewModalProps) {
  
  const [isTrainingMode, setIsTrainingMode] = useState(false);
  const [activeDragField, setActiveDragField] = useState<string | null>(null);
  const containerRef = useRef<HTMLDivElement>(null);
  const imgRef = useRef<HTMLImageElement>(null);
  
  if (!editData) return null;

  const handleMouseDown = (e: React.MouseEvent, field: string) => {
    if (!isTrainingMode) return;
    e.stopPropagation();
    setActiveDragField(field);
    setHoveredField(field);
  };

  const handleMouseMove = (e: React.MouseEvent) => {
    if (!isTrainingMode || !activeDragField || !imgRef.current) return;

    const rect = imgRef.current.getBoundingClientRect();
    const x = ((e.clientX - rect.left) / rect.width) * 1000;
    const y = ((e.clientY - rect.top) / rect.height) * 1000;

    const currentBox = invoice.locations?.[activeDragField] || [y, x, y + 50, x + 150];
    const width = currentBox[3] - currentBox[1];
    const height = currentBox[2] - currentBox[0];

    // Update box while keeping dimensions
    const newBox = [
      Math.max(0, Math.min(1000 - height, y - height / 2)),
      Math.max(0, Math.min(1000 - width, x - width / 2)),
      Math.max(height, Math.min(1000, y + height / 2)),
      Math.max(width, Math.min(1000, x + width / 2)),
    ];

    onUpdateLocation(activeDragField, newBox);
  };

  const handleMouseUp = () => {
    setActiveDragField(null);
  };

  return (
    <div className="fixed inset-0 z-50 flex items-center justify-center p-2 md:p-6 bg-slate-900/70 backdrop-blur-md animate-in fade-in duration-300">
      <motion.div 
        initial={{ scale: 0.95, opacity: 0 }}
        animate={{ scale: 1, opacity: 1 }}
        exit={{ scale: 0.95, opacity: 0 }}
        className="relative w-full max-w-[95vw] h-[95vh] bg-white rounded-[2rem] overflow-hidden shadow-2xl border border-white/20 flex flex-col md:flex-row-reverse"
      >
        {/* Sidebar Info */}
        <div className="w-full md:w-[380px] bg-white p-6 border-l border-slate-100 overflow-y-auto flex flex-col shadow-[-10px_0_30px_rgba(0,0,0,0.02)]">
          <div className="flex items-center justify-between mb-6">
            <button onClick={onClose} className="p-2.5 hover:bg-slate-100 rounded-full transition-colors group">
              <XCircle className="w-6 h-6 text-slate-300 group-hover:text-red-500 transition-colors" />
            </button>
            <div className="text-right">
              <h3 className="font-black text-xl text-slate-900">تفاصيل الفاتورة</h3>
              <p className="text-[10px] text-slate-400 font-bold uppercase tracking-widest">مراجعة وتدقيق البيانات</p>
            </div>
          </div>

          {invoice.status === 'error' && invoice.error && (
            <div className="mb-6 p-4 bg-red-50 border border-red-100 rounded-2xl flex flex-col gap-2">
              <div className="flex items-center justify-end gap-2 text-red-600">
                <span className="font-bold text-xs">سبب فشل الذكاء الاصطناعي:</span>
                <AlertCircle className="w-4 h-4" />
              </div>
              <p className="text-[10px] text-red-400 font-medium text-right leading-relaxed italic" dir="ltr">
                {invoice.error}
              </p>
            </div>
          )}

          <div className="flex-1 space-y-5">
            {/* Field Inputs */}
            {(Object.keys(FIELD_COLORS) as Array<keyof typeof FIELD_COLORS>).map(field => (
              <div 
                key={field} 
                className={cn(
                  "space-y-1.5 p-3 rounded-2xl transition-all border",
                  hoveredField === field ? "bg-accent/5 border-accent/20 ring-1 ring-accent/10" : "bg-transparent border-transparent"
                )}
                onMouseEnter={() => setHoveredField(field as string)}
                onMouseLeave={() => setHoveredField(null)}
              >
                <label className="text-[10px] font-black text-slate-400 uppercase mr-1 flex items-center justify-between">
                  <span>{FIELD_NAMES[field] || field}</span>
                  {invoice.locations?.[field] && (
                    <span className="w-1.5 h-1.5 rounded-full bg-green-500 shadow-[0_0_8px_rgba(34,197,94,0.5)]" />
                  )}
                </label>
                <div className="relative">
                  {field === 'itemsDescription' ? (
                    <textarea 
                      value={String(editData[field] || '')}
                      onChange={(e) => onEdit({ ...editData, [field]: e.target.value })}
                      className="w-full p-3.5 bg-slate-50 border border-slate-200 rounded-xl text-[12px] font-medium focus:ring-2 focus:ring-accent/20 focus:border-accent transition-all min-h-[120px] leading-relaxed"
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

          <div className="mt-6 pt-6 border-t border-slate-100 space-y-3">
            <button 
              onClick={onSave}
              disabled={!hasChanges}
              className={cn(
                "w-full py-4 rounded-2xl font-black text-sm flex items-center justify-center gap-2 transition-all",
                hasChanges 
                  ? "bg-slate-900 text-white shadow-lg hover:bg-black active:scale-[0.98]" 
                  : "bg-slate-100 text-slate-400 cursor-not-allowed"
              )}
            >
              <Save className="w-4 h-4" />
              حفظ التعديلات النصية
            </button>
          </div>
        </div>

        {/* PDF Preview Area */}
        <div className="flex-1 bg-slate-50 overflow-hidden flex flex-col relative group">
          {/* Top Control Bar */}
          <div className="absolute top-4 left-1/2 -translate-x-1/2 z-40 bg-white/80 backdrop-blur-md px-6 py-2.5 rounded-full border border-slate-200 shadow-xl flex items-center gap-6 transition-all group-hover:top-6">
            <button 
              onClick={() => setIsTrainingMode(!isTrainingMode)}
              className={cn(
                "flex items-center gap-2 px-4 py-1.5 rounded-lg text-[11px] font-black transition-all",
                isTrainingMode 
                  ? "bg-accent text-white shadow-[0_4px_12px_rgba(var(--accent-rgb),0.3)]" 
                  : "bg-slate-100 text-slate-600 hover:bg-slate-200"
              )}
            >
              {isTrainingMode ? <Lock className="w-3.5 h-3.5" /> : <Unlock className="w-3.5 h-3.5" />}
              {isTrainingMode ? 'قفل وحفظ المواقع' : 'فتح وضع تحريك المربعات'}
            </button>
            
            <div className="h-4 w-[1px] bg-slate-200" />
            
            <button 
              onClick={onApplyLayoutToAll}
              className="flex items-center gap-2 text-slate-600 hover:text-accent transition-colors text-[11px] font-black"
            >
              <Settings2 className="w-3.5 h-3.5" />
              تطبيق الموقع على الكل
            </button>
          </div>

          {/* Scrollable Container */}
          <div 
            className="flex-1 overflow-auto p-8 pt-20 flex justify-center bg-[#f8fafc] custom-scrollbar"
            onMouseMove={handleMouseMove}
            onMouseUp={handleMouseUp}
            onMouseLeave={handleMouseUp}
          >
            {isPreviewLoading ? (
              <div className="flex flex-col items-center justify-center gap-4 h-full">
                <Loader2 className="w-12 h-12 text-accent animate-spin" />
                <p className="text-slate-400 font-black text-sm tracking-wider">جاري معالجة المعاينة...</p>
              </div>
            ) : previewImage ? (
              <div 
                ref={containerRef}
                className="relative shadow-[0_30px_60px_-15px_rgba(0,0,0,0.2)] rounded-sm overflow-hidden bg-white min-w-[900px] mb-20 origin-top transform transition-transform"
                style={{ aspectRatio: '1 / 1.414' }}
              >
                <img 
                  ref={imgRef}
                  src={previewImage} 
                  alt="Invoice Preview" 
                  className="w-full h-auto block select-none pointer-events-none"
                />
                
                {/* Interactive Bounding Boxes */}
                {Object.entries(FIELD_COLORS).map(([field, colors]) => {
                  const box = invoice.locations?.[field];
                  if (!box) return null;
                  
                  return (
                    <motion.div 
                      key={field}
                      initial={false}
                      className={cn(
                        "absolute border-2 transition-opacity z-10",
                        colors.border,
                        hoveredField === field ? "opacity-100 ring-2 ring-white" : "opacity-30",
                        isTrainingMode ? "cursor-move border-dashed" : "pointer-events-none"
                      )}
                      style={{
                        top: `${box[0] / 10}%`,
                        left: `${box[1] / 10}%`,
                        height: `${(box[2] - box[0]) / 10}%`,
                        width: `${(box[3] - box[1]) / 10}%`,
                        backgroundColor: colors.highlight
                      }}
                      onMouseDown={(e) => handleMouseDown(e, field)}
                      onMouseEnter={() => !activeDragField && setHoveredField(field)}
                      onMouseLeave={() => !activeDragField && setHoveredField(null)}
                    >
                      {isTrainingMode && hoveredField === field && (
                        <div className="absolute -top-6 right-0 bg-slate-900 text-white text-[9px] px-2 py-0.5 rounded font-black whitespace-nowrap shadow-lg">
                          {FIELD_NAMES[field] || field}
                        </div>
                      )}
                    </motion.div>
                  );
                })}
              </div>
            ) : (
              <div className="flex-1 flex flex-col items-center justify-center text-slate-400 gap-6 text-center max-w-sm mx-auto">
                <div className="w-24 h-24 bg-slate-100 rounded-3xl flex items-center justify-center rotate-3 border border-slate-200">
                  <AlertCircle className="w-12 h-12 opacity-10" />
                </div>
                <div className="space-y-2">
                  <p className="font-black text-slate-900 text-xl">المعاينة غير متاحة</p>
                  <p className="text-xs font-bold leading-relaxed text-slate-500">لأسباب تتعلق بالخصوصية، يرجى إعادة رفع الملف لمشاهدة المعاينة والتدريب.</p>
                </div>
              </div>
            )}
          </div>
          
          {/* Bottom Zoom Info */}
          <div className="absolute bottom-6 left-6 flex items-center gap-3 bg-white/90 backdrop-blur px-4 py-2 rounded-xl border border-slate-200 shadow-sm text-[10px] font-black text-slate-400 uppercase tracking-widest">
            <Expand className="w-3 h-3" />
            نمط عرض مكبر 1.5x
          </div>
        </div>
      </motion.div>
    </div>
  );
}
