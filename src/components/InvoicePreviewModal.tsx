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
  GripHorizontal,
  Plus,
  Minus,
  Maximize2
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
  const [zoom, setZoom] = useState(1);
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
    <div className="fixed inset-0 z-50 flex items-center justify-center p-0 md:p-4 bg-slate-950/90 backdrop-blur-2xl animate-in fade-in duration-300">
      <motion.div 
        initial={{ scale: 1.02, opacity: 0 }}
        animate={{ scale: 1, opacity: 1 }}
        exit={{ scale: 1.02, opacity: 0 }}
        className="relative w-full h-full md:max-w-[98vw] md:h-[96vh] bg-white md:rounded-[3rem] overflow-hidden shadow-[0_0_120px_rgba(0,0,0,0.6)] flex flex-col md:flex-row-reverse"
      >
        {/* Sidebar Info */}
        <div className="w-full md:w-[440px] bg-white p-8 border-l border-slate-100 flex flex-col shadow-[-30px_0_60px_rgba(0,0,0,0.04)] z-20">
          <div className="flex items-center justify-between mb-8">
            <button onClick={onClose} className="p-3 hover:bg-red-50 rounded-full transition-all group">
              <XCircle className="w-8 h-8 text-slate-200 group-hover:text-red-500 transition-colors" />
            </button>
            <div className="text-right">
              <h3 className="font-black text-2xl text-slate-900 tracking-tight">تفاصيل الفاتورة</h3>
              <p className="text-[11px] text-slate-400 font-bold uppercase tracking-[0.25em] mt-1">المراجعة والتدقيق اللحظي</p>
            </div>
          </div>

          <div className="flex-1 overflow-y-auto pr-2 space-y-5 custom-scrollbar pb-10">
            {/* Field Inputs */}
            {(Object.keys(FIELD_COLORS) as Array<keyof typeof FIELD_COLORS>).map(field => (
              <div 
                key={field} 
                className={cn(
                  "space-y-1.5 p-5 rounded-[2rem] transition-all border-2",
                  hoveredField === field 
                    ? "bg-white shadow-2xl ring-8 ring-slate-100 scale-[1.03] border-slate-900" 
                    : "bg-slate-50 border-transparent hover:bg-slate-100/50"
                )}
                onMouseEnter={() => setHoveredField(field as string)}
                onMouseLeave={() => setHoveredField(null)}
              >
                <div className="flex items-center justify-between mb-2">
                  <div className="flex items-center gap-3">
                    <span className={cn("w-4 h-4 rounded-full shadow-sm", FIELD_COLORS[field].border.replace('border-', 'bg-'))} />
                    <label className="text-[11px] font-black text-slate-600 uppercase tracking-widest">
                      {FIELD_NAMES[field] || field}
                    </label>
                  </div>
                </div>
                
                <div className="relative">
                  {field === 'itemsDescription' ? (
                    <textarea 
                      value={String(editData[field] || '')}
                      onChange={(e) => onEdit({ ...editData, [field]: e.target.value })}
                      className={cn(
                        "w-full p-5 bg-white border-2 border-slate-200/60 rounded-3xl text-lg font-black focus:border-slate-900 transition-all min-h-[160px] leading-relaxed shadow-sm",
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
                        "w-full p-5 bg-white border-2 border-slate-200/60 rounded-3xl text-xl font-black focus:border-slate-900 transition-all shadow-sm",
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
          <div className="mt-8 pt-8 border-t border-slate-100 bg-white">
            <button 
              onClick={onSave}
              disabled={!hasChanges}
              className={cn(
                "w-full py-6 rounded-[2.5rem] font-black text-lg flex items-center justify-center gap-4 transition-all transform",
                hasChanges 
                  ? "bg-gradient-to-r from-accent to-accent-light text-white shadow-[0_20px_40px_rgba(var(--accent-rgb),0.5)] hover:scale-[1.02] active:scale-[0.98]" 
                  : "bg-slate-100 text-slate-400 cursor-not-allowed"
              )}
            >
              <CheckCircle2 className="w-7 h-7" />
              اعتماد وحفظ البيانات النهائية
            </button>
            <p className="text-[11px] text-center text-slate-400 mt-5 font-bold uppercase tracking-widest italic">سيتم تحديث سجلات الإكسل فور الحفظ</p>
          </div>
        </div>

        {/* PDF Preview Area */}
        <div className="flex-1 bg-[#0f172a] overflow-hidden flex flex-col relative">
          {/* Top Control Bar */}
          <div className="absolute top-10 left-1/2 -translate-x-1/2 z-40 bg-slate-900/95 backdrop-blur-2xl px-12 py-5 rounded-[2.5rem] border border-white/20 shadow-[0_40px_100px_-20px_rgba(0,0,0,0.8)] flex items-center gap-12">
            <div className="flex items-center gap-6">
              <button 
                onClick={() => setZoom(z => Math.max(0.5, z - 0.1))}
                className="w-10 h-10 flex items-center justify-center bg-white/10 hover:bg-white/20 rounded-xl text-white transition-all shadow-lg"
              >
                <Minus className="w-5 h-5" />
              </button>
              <span className="text-white font-black text-sm min-w-[70px] text-center tracking-widest">
                {Math.round(zoom * 100)}%
              </span>
              <button 
                onClick={() => setZoom(z => Math.min(3, z + 0.1))}
                className="w-10 h-10 flex items-center justify-center bg-white/10 hover:bg-white/20 rounded-xl text-white transition-all shadow-lg"
              >
                <Plus className="w-5 h-5" />
              </button>
            </div>

            <div className="h-10 w-[1px] bg-white/10" />

            <button 
              onClick={() => setIsTrainingMode(!isTrainingMode)}
              className={cn(
                "flex items-center gap-4 px-10 py-3 rounded-2xl text-sm font-black transition-all border-2",
                isTrainingMode 
                  ? "bg-orange-500 text-white border-orange-400 shadow-[0_0_50px_rgba(249,115,22,0.6)] scale-105" 
                  : "bg-white/5 text-white border-white/10 hover:bg-white/10"
              )}
            >
              {isTrainingMode ? <Lock className="w-6 h-6" /> : <Unlock className="w-6 h-6" />}
              {isTrainingMode ? 'قفل وحفظ المربعات' : 'تحريك المربعات'}
            </button>
            
            <div className="h-10 w-[1px] bg-white/10" />
            
            <button 
              onClick={onApplyLayoutToAll}
              className="flex items-center gap-4 text-white hover:text-orange-400 transition-all text-sm font-black group"
            >
              <div className="w-10 h-10 flex items-center justify-center bg-white/5 group-hover:bg-orange-400/20 rounded-xl transition-all">
                <Settings2 className="w-6 h-6" />
              </div>
              تطبيق على الكل
            </button>

            <div className="h-10 w-[1px] bg-white/10 ml-4" />

            <button 
              onClick={onClose}
              className="w-12 h-12 flex items-center justify-center bg-red-500/10 hover:bg-red-500 text-white rounded-xl transition-all group shadow-lg"
            >
              <X className="w-6 h-6 group-hover:scale-110 transition-transform" />
            </button>
          </div>

          {/* Scrollable Container */}
          <div 
            className="flex-1 overflow-auto p-20 pt-40 flex flex-col items-center bg-[#070b14] custom-scrollbar"
            onMouseMove={handleMouseMove}
            onMouseUp={handleMouseUp}
            onMouseLeave={handleMouseUp}
          >
            {isPreviewLoading ? (
              <div className="flex flex-col items-center justify-center gap-8 h-full py-60">
                <div className="relative">
                  <Loader2 className="w-20 h-20 text-accent animate-spin" />
                  <div className="absolute inset-0 blur-3xl bg-accent/30 animate-pulse" />
                </div>
                <p className="text-white/30 font-black text-xl tracking-[0.3em] uppercase">جاري القراءة البصرية المتقدمة...</p>
              </div>
            ) : previewImage ? (
              <div 
                ref={containerRef}
                className="relative shadow-[0_60px_120px_-30px_rgba(0,0,0,0.8)] rounded-xl overflow-visible bg-white transition-transform duration-200 origin-top"
                style={{ 
                  width: '900px',
                  transform: `scale(${zoom})`,
                  marginBottom: `${(zoom > 1 ? 40 * zoom : 40)}vh`
                }}
              >
                <img 
                  ref={imgRef}
                  src={previewImage} 
                  alt="Invoice Preview" 
                  className="w-full h-auto block select-none rounded-xl"
                  style={{ opacity: isTrainingMode ? 0.6 : 1 }}
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
                        hoveredField === field ? "opacity-100 ring-[8px] ring-white z-30 shadow-[0_0_50px_rgba(0,0,0,0.5)]" : "opacity-50",
                        isTrainingMode ? "cursor-move border-dashed shadow-2xl" : "pointer-events-none"
                      )}
                      style={{
                        top: `${box[0] / 10}%`,
                        left: `${box[1] / 10}%`,
                        height: `${Math.max(40, (box[2] - box[0])) / 10}%`,
                        width: `${Math.max(80, (box[3] - box[1])) / 10}%`,
                        backgroundColor: colors.highlight
                      }}
                      onMouseDown={(e) => handleMouseDown(e, field)}
                      onMouseEnter={() => !activeDragField && setHoveredField(field)}
                      onMouseLeave={() => !activeDragField && setHoveredField(null)}
                    >
                      {isTrainingMode && (
                        <div className="absolute inset-0 flex items-center justify-center opacity-40">
                          <GripHorizontal className="w-10 h-10 text-slate-900" />
                        </div>
                      )}
                      
                      {isTrainingMode && hoveredField === field && (
                        <div className="absolute -top-12 left-1/2 -translate-x-1/2 bg-slate-900 text-white text-[12px] px-6 py-2.5 rounded-full font-black whitespace-nowrap shadow-[0_10px_30px_rgba(0,0,0,0.5)] z-40 border-2 border-white/20 uppercase tracking-widest">
                          {FIELD_NAMES[field] || field}
                        </div>
                      )}
                    </motion.div>
                  );
                })}
              </div>
            ) : (
              <div className="flex-1 flex flex-col items-center justify-center text-white/10 gap-10 text-center max-w-xl mx-auto py-60">
                <div className="w-40 h-40 bg-white/5 rounded-[4rem] flex items-center justify-center rotate-12 border border-white/10">
                  <AlertCircle className="w-20 h-20 opacity-10" />
                </div>
                <div className="space-y-5">
                  <p className="font-black text-white text-3xl tracking-tight">المعاينة البصرية مقفلة</p>
                  <p className="text-base font-bold leading-relaxed text-white/30">يرجى إعادة رفع الفاتورة لتفعيل المعاينة والبدء في وضع التدريب التفاعلي للمربعات.</p>
                </div>
              </div>
            )}
          </div>
          
          {/* Bottom Controls Info */}
          <div className="absolute bottom-10 left-10 flex items-center gap-6 bg-white/5 backdrop-blur-2xl px-8 py-4 rounded-[2rem] border border-white/10 shadow-2xl">
            <div className="flex items-center gap-3 text-[12px] font-black text-white/40 uppercase tracking-[0.4em]">
              <Maximize2 className="w-5 h-5" />
              التحكم الكامل بالمعاينة
            </div>
            <div className="h-4 w-[1px] bg-white/10" />
            <button onClick={() => setZoom(1)} className="text-[10px] font-black text-accent hover:text-white transition-colors">إعادة الضبط</button>
          </div>
        </div>
      </motion.div>
    </div>
  );
}
