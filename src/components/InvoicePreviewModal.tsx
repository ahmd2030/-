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
  Expand,
  GripHorizontal
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
    <div className="fixed inset-0 z-50 flex items-center justify-center p-2 md:p-4 bg-slate-900/80 backdrop-blur-xl animate-in fade-in duration-300">
      <motion.div 
        initial={{ scale: 0.98, opacity: 0, y: 10 }}
        animate={{ scale: 1, opacity: 1, y: 0 }}
        exit={{ scale: 0.98, opacity: 0, y: 10 }}
        className="relative w-full max-w-[98vw] h-[98vh] bg-white rounded-[2.5rem] overflow-hidden shadow-[0_0_100px_rgba(0,0,0,0.5)] border border-white/20 flex flex-col md:flex-row-reverse"
      >
        {/* Sidebar Info */}
        <div className="w-full md:w-[420px] bg-white p-6 border-l border-slate-100 flex flex-col shadow-[-20px_0_40px_rgba(0,0,0,0.03)] z-20">
          <div className="flex items-center justify-between mb-8">
            <button onClick={onClose} className="p-3 hover:bg-red-50 rounded-full transition-all group">
              <XCircle className="w-7 h-7 text-slate-200 group-hover:text-red-500 transition-colors" />
            </button>
            <div className="text-right">
              <h3 className="font-black text-2xl text-slate-900 tracking-tight">تفاصيل الفاتورة</h3>
              <p className="text-[11px] text-slate-400 font-bold uppercase tracking-[0.2em] mt-1">المراجعة والتدقيق اللحظي</p>
            </div>
          </div>

          <div className="flex-1 overflow-y-auto pr-1 space-y-4 custom-scrollbar">
            {/* Field Inputs */}
            {(Object.keys(FIELD_COLORS) as Array<keyof typeof FIELD_COLORS>).map(field => (
              <div 
                key={field} 
                className={cn(
                  "space-y-1.5 p-4 rounded-[1.5rem] transition-all border-2",
                  hoveredField === field 
                    ? "bg-white shadow-xl ring-4 ring-slate-100 scale-[1.02] border-slate-900" 
                    : "bg-slate-50/50 border-transparent"
                )}
                onMouseEnter={() => setHoveredField(field as string)}
                onMouseLeave={() => setHoveredField(null)}
              >
                <div className="flex items-center justify-between mb-1">
                  <div className="flex items-center gap-2">
                    <span className={cn("w-3 h-3 rounded-full", FIELD_COLORS[field].border.replace('border-', 'bg-'))} />
                    <label className="text-[10px] font-black text-slate-500 uppercase tracking-wider">
                      {FIELD_NAMES[field] || field}
                    </label>
                  </div>
                  {invoice.locations?.[field] && (
                    <span className="text-[9px] font-bold text-green-500 bg-green-50 px-2 py-0.5 rounded-full border border-green-100">محدد بصرياً</span>
                  )}
                </div>
                
                <div className="relative">
                  {field === 'itemsDescription' ? (
                    <textarea 
                      value={String(editData[field] || '')}
                      onChange={(e) => onEdit({ ...editData, [field]: e.target.value })}
                      className={cn(
                        "w-full p-4 bg-white border-2 border-slate-100 rounded-2xl text-[13px] font-medium focus:border-slate-900 transition-all min-h-[140px] leading-relaxed shadow-inner",
                        hoveredField === field && "border-slate-900"
                      )}
                      style={{ backgroundColor: hoveredField === field ? FIELD_COLORS[field].highlight : undefined }}
                    />
                  ) : (
                    <input 
                      type="text" 
                      value={String(editData[field] || '')}
                      onChange={(e) => onEdit({ ...editData, [field]: e.target.value })}
                      className={cn(
                        "w-full p-4 bg-white border-2 border-slate-100 rounded-2xl text-[13px] font-black focus:border-slate-900 transition-all shadow-inner",
                        hoveredField === field && "border-slate-900"
                      )}
                      style={{ backgroundColor: hoveredField === field ? FIELD_COLORS[field].highlight : undefined }}
                    />
                  )}
                </div>
              </div>
            ))}
          </div>

          {/* Action Footer */}
          <div className="mt-6 pt-6 border-t border-slate-100">
            <button 
              onClick={onSave}
              disabled={!hasChanges}
              className={cn(
                "w-full py-5 rounded-[2rem] font-black text-base flex items-center justify-center gap-3 transition-all transform",
                hasChanges 
                  ? "bg-gradient-to-r from-accent to-accent-light text-white shadow-[0_15px_35px_rgba(var(--accent-rgb),0.4)] hover:scale-[1.02] active:scale-[0.98]" 
                  : "bg-slate-100 text-slate-400 cursor-not-allowed"
              )}
            >
              <CheckCircle2 className="w-6 h-6" />
              اعتماد وحفظ البيانات النهائية
            </button>
            <p className="text-[10px] text-center text-slate-400 mt-4 font-bold uppercase tracking-widest">سيتم تحديث سجلات الإكسل فور الحفظ</p>
          </div>
        </div>

        {/* PDF Preview Area */}
        <div className="flex-1 bg-[#0f172a] overflow-hidden flex flex-col relative group">
          {/* Top Control Bar */}
          <div className="absolute top-6 left-1/2 -translate-x-1/2 z-40 bg-white/10 backdrop-blur-2xl px-8 py-3 rounded-full border border-white/10 shadow-[0_20px_50px_rgba(0,0,0,0.5)] flex items-center gap-8 transition-all hover:bg-white/20">
            <button 
              onClick={() => setIsTrainingMode(!isTrainingMode)}
              className={cn(
                "flex items-center gap-3 px-6 py-2 rounded-xl text-xs font-black transition-all border-2",
                isTrainingMode 
                  ? "bg-white text-slate-900 border-white shadow-[0_0_30px_rgba(255,255,255,0.4)]" 
                  : "bg-white/5 text-white border-white/20 hover:bg-white/10"
              )}
            >
              {isTrainingMode ? <Lock className="w-4 h-4" /> : <Unlock className="w-4 h-4" />}
              {isTrainingMode ? 'قفل وحفظ المواقع' : 'فتح وضع تحريك المربعات'}
            </button>
            
            <div className="h-5 w-[1px] bg-white/20" />
            
            <button 
              onClick={onApplyLayoutToAll}
              className="flex items-center gap-3 text-white/70 hover:text-white transition-all text-xs font-black"
            >
              <Settings2 className="w-4 h-4" />
              تطبيق الموقع على الكل
            </button>
          </div>

          {/* Scrollable Container */}
          <div 
            className="flex-1 overflow-y-auto overflow-x-auto p-12 pt-28 flex flex-col items-center bg-[#0f172a] custom-scrollbar"
            onMouseMove={handleMouseMove}
            onMouseUp={handleMouseUp}
            onMouseLeave={handleMouseUp}
          >
            {isPreviewLoading ? (
              <div className="flex flex-col items-center justify-center gap-6 h-full py-40">
                <div className="relative">
                  <Loader2 className="w-16 h-16 text-accent animate-spin" />
                  <div className="absolute inset-0 blur-xl bg-accent/20 animate-pulse" />
                </div>
                <p className="text-white/40 font-black text-lg tracking-[0.2em] uppercase">جاري المعالجة البصرية...</p>
              </div>
            ) : previewImage ? (
              <div 
                ref={containerRef}
                className="relative shadow-[0_50px_100px_-20px_rgba(0,0,0,0.7)] rounded-xl overflow-hidden bg-white min-w-[1000px] mb-40 border border-white/10"
              >
                <img 
                  ref={imgRef}
                  src={previewImage} 
                  alt="Invoice Preview" 
                  className="w-full h-auto block select-none"
                  style={{ opacity: isTrainingMode ? 0.7 : 1 }}
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
                        "absolute border-4 transition-all z-10 flex items-center justify-center",
                        colors.border,
                        hoveredField === field ? "opacity-100 ring-4 ring-white z-30" : "opacity-40",
                        isTrainingMode ? "cursor-move border-dashed shadow-2xl" : "pointer-events-none"
                      )}
                      style={{
                        top: `${box[0] / 10}%`,
                        left: `${box[1] / 10}%`,
                        height: `${Math.max(30, (box[2] - box[0])) / 10}%`, // Min height for visibility
                        width: `${Math.max(50, (box[3] - box[1])) / 10}%`,  // Min width for visibility
                        backgroundColor: colors.highlight
                      }}
                      onMouseDown={(e) => handleMouseDown(e, field)}
                      onMouseEnter={() => !activeDragField && setHoveredField(field)}
                      onMouseLeave={() => !activeDragField && setHoveredField(null)}
                    >
                      {isTrainingMode && (
                        <div className="absolute inset-0 flex items-center justify-center opacity-30">
                          <GripHorizontal className="w-6 h-6 text-slate-900" />
                        </div>
                      )}
                      
                      {isTrainingMode && hoveredField === field && (
                        <div className="absolute -top-10 left-1/2 -translate-x-1/2 bg-slate-900 text-white text-[10px] px-4 py-1.5 rounded-full font-black whitespace-nowrap shadow-2xl z-40 border border-white/20">
                          {FIELD_NAMES[field] || field}
                        </div>
                      )}
                    </motion.div>
                  );
                })}
              </div>
            ) : (
              <div className="flex-1 flex flex-col items-center justify-center text-white/20 gap-8 text-center max-w-md mx-auto py-40">
                <div className="w-32 h-32 bg-white/5 rounded-[3rem] flex items-center justify-center rotate-6 border border-white/10">
                  <AlertCircle className="w-16 h-16 opacity-10" />
                </div>
                <div className="space-y-4">
                  <p className="font-black text-white text-2xl tracking-tight">المعاينة غير متاحة حالياً</p>
                  <p className="text-sm font-bold leading-relaxed text-white/40">يرجى إعادة رفع الملف لمشاهدة المعاينة البصرية والبدء في التدريب اليدوي.</p>
                </div>
              </div>
            )}
          </div>
          
          {/* Bottom Zoom Info */}
          <div className="absolute bottom-8 left-8 flex items-center gap-4 bg-white/10 backdrop-blur-xl px-6 py-3 rounded-2xl border border-white/10 shadow-2xl text-[11px] font-black text-white/60 uppercase tracking-[0.3em]">
            <Expand className="w-4 h-4" />
            وضع المعاينة الفائقة
          </div>
        </div>
      </motion.div>
    </div>
  );
}

