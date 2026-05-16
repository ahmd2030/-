"use client";

import React, { useState, useRef, useEffect } from 'react';
import { 
  FileUp, 
  FileSpreadsheet, 
  Play, 
  Trash2, 
  CheckCircle2, 
  Loader2, 
  FileDown,
  Download,
  XCircle,
  AlertCircle,
  Clock
} from 'lucide-react';
import { motion, AnimatePresence } from 'motion/react';
import { InvoiceData, ProcessingState, ExcelTemplate, AppMode, VerificationResult, TableTemplate, FIELD_COLORS, FIELD_NAMES } from '@/types';
import { extractTextFromPdf, pdfToImage } from '@/lib/pdf';
import { analyzeInvoiceAction } from '@/app/actions';
import { readExcelTemplate, exportToExcel } from '@/lib/excel';
import { saveInvoiceImage, getInvoiceImage, clearAllImages } from '@/lib/db';
import { clsx, type ClassValue } from 'clsx';
import { twMerge } from 'tailwind-merge';
import InvoiceTable from '@/components/InvoiceTable';
import InvoicePreviewModal from '@/components/InvoicePreviewModal';

function cn(...inputs: ClassValue[]) {
  return twMerge(clsx(inputs));
}

export default function Dashboard() {
  const [pdfs, setPdfs] = useState<File[]>([]);
  const [isDragging, setIsDragging] = useState(false);
  const [template, setTemplate] = useState<ExcelTemplate | null>(null);
  const [results, setResults] = useState<InvoiceData[]>([]);
  const [verificationResults, setVerificationResults] = useState<VerificationResult[]>([]);
  const [currentFileName, setCurrentFileName] = useState<string>('');
  const [selectedInvoice, setSelectedInvoice] = useState<InvoiceData | null>(null);
  const [editData, setEditData] = useState<InvoiceData | null>(null);
  const [previewImage, setPreviewImage] = useState<string | null>(null);
  const [isPreviewLoading, setIsPreviewLoading] = useState(false);
  const [hoveredField, setHoveredField] = useState<string | null>(null);
  
  const [lockedLayouts, setLockedLayouts] = useState<Record<string, boolean>>({});
  const [trainedLayouts, setTrainedLayouts] = useState<Record<string, Record<string, number[]>>>({});
  const [masterTemplate, setMasterTemplate] = useState<Record<string, number[]> | null>(null);

  const [openedIds, setOpenedIds] = useState<Set<string | number>>(new Set());
  const [lastWorkedOnId, setLastWorkedOnId] = useState<string | number | null>(null);

  const [state, setState] = useState<ProcessingState>({
    total: 0,
    processed: 0,
    currentBatch: 0,
    isProcessing: false,
    mode: AppMode.ANALYSIS
  });

  const pdfInputRef = useRef<HTMLInputElement>(null);
  const templateInputRef = useRef<HTMLInputElement>(null);
  const isAbortedRef = useRef(false);

  // Load persisted data
  useEffect(() => {
    if (typeof window !== 'undefined') {
      try {
        const savedLocks = localStorage.getItem('lockedLayouts');
        const savedTrained = localStorage.getItem('trainedLayouts');
        const savedMaster = localStorage.getItem('masterTemplate');
        const savedResults = localStorage.getItem('invoiceResults');
        const savedOpened = localStorage.getItem('openedInvoiceIds');
        const savedLast = localStorage.getItem('lastWorkedOnId');

        if (savedLocks) setLockedLayouts(JSON.parse(savedLocks));
        if (savedTrained) setTrainedLayouts(JSON.parse(savedTrained));
        if (savedMaster) setMasterTemplate(JSON.parse(savedMaster));
        if (savedOpened) setOpenedIds(new Set(JSON.parse(savedOpened)));
        if (savedLast) setLastWorkedOnId(savedLast);

        if (savedResults) {
          const parsed = JSON.parse(savedResults);
          if (Array.isArray(parsed) && parsed.length > 0) {
            const withIds = parsed.map((item: any) => ({
              ...item,
              id: item.id || (Math.random() + Date.now())
            }));
            setResults(withIds);
          }
        }
      } catch (e) {
        console.error("Failed to load from localStorage", e);
      }
    }
  }, []);

  // Save persisted data
  useEffect(() => {
    if (typeof window !== 'undefined') {
      localStorage.setItem('lockedLayouts', JSON.stringify(lockedLayouts));
      localStorage.setItem('trainedLayouts', JSON.stringify(trainedLayouts));
      localStorage.setItem('masterTemplate', JSON.stringify(masterTemplate));
      localStorage.setItem('openedInvoiceIds', JSON.stringify(Array.from(openedIds)));
      if (lastWorkedOnId) localStorage.setItem('lastWorkedOnId', String(lastWorkedOnId));
      if (results.length > 0) localStorage.setItem('invoiceResults', JSON.stringify(results));
    }
  }, [lockedLayouts, trainedLayouts, masterTemplate, results, openedIds, lastWorkedOnId]);

  // Preview loading
  useEffect(() => {
    const loadPreview = async () => {
      if (!selectedInvoice?.id) {
        setPreviewImage(null);
        setIsPreviewLoading(false);
        return;
      }

      // Mark as opened
      setOpenedIds(prev => new Set(prev).add(selectedInvoice.id!));

      setIsPreviewLoading(true);

      // Priority 1: Try IndexedDB (fastest, always works after processing)
      try {
        const savedImage = await getInvoiceImage(selectedInvoice.id);
        if (savedImage) {
          setPreviewImage(savedImage);
          setIsPreviewLoading(false);
          return;
        }
      } catch (e) {
        console.warn("IndexedDB read failed", e);
      }

      // Priority 2: Generate from original file (if still in memory)
      if (selectedInvoice.originalFile instanceof Blob) {
        try {
          const img = await pdfToImage(selectedInvoice.originalFile);
          const base64 = `data:image/jpeg;base64,${img}`;
          setPreviewImage(base64);
          // Save for next time
          await saveInvoiceImage(selectedInvoice.id, base64);
          setIsPreviewLoading(false);
          return;
        } catch (e) {
          console.warn("PDF render failed", e);
        }
      }

      // Nothing worked
      setPreviewImage(null);
      setIsPreviewLoading(false);
    };
    
    if (selectedInvoice) {
      setEditData({ ...selectedInvoice });
    } else {
      // When closing, if we had an edit data, mark it as last worked on
      if (editData?.id) {
        setLastWorkedOnId(editData.id);
      }
      setEditData(null);
    }
    loadPreview();
  }, [selectedInvoice]);

  // Drag and drop handlers
  const onDragOver = (e: React.DragEvent) => {
    e.preventDefault();
    setIsDragging(true);
  };
  const onDragLeave = () => setIsDragging(false);
  const onDrop = (e: React.DragEvent) => {
    e.preventDefault();
    setIsDragging(false);
    if (e.dataTransfer.files) {
      const files = Array.from(e.dataTransfer.files).filter(f => 
        f.type === 'application/pdf' || f.name.toLowerCase().endsWith('.pdf')
      );
      setPdfs(prev => [...prev, ...files]);
    }
  };

  const handlePdfUpload = (e: React.ChangeEvent<HTMLInputElement>) => {
    if (e.target.files) {
      const files = Array.from(e.target.files).filter(f => 
        f.type === 'application/pdf' || f.name.toLowerCase().endsWith('.pdf')
      );
      setPdfs(prev => [...prev, ...files]);
      e.target.value = '';
    }
  };

  const handleTemplateUpload = async (e: React.ChangeEvent<HTMLInputElement>) => {
    if (e.target.files?.[0]) {
      const file = e.target.files[0];
      try {
        const data = await readExcelTemplate(file);
        setTemplate({ ...data, file, name: file.name });
      } catch (err) {
        alert('حدث خطأ أثناء قراءة القالب. تأكد من أنه ملف Excel صالح.');
      }
    }
  };

  const startProcessing = async () => {
    if (pdfs.length === 0) return;
    isAbortedRef.current = false;
    setState(prev => ({ ...prev, total: pdfs.length, processed: 0, isProcessing: true, mode: AppMode.ANALYSIS }));

    for (const file of pdfs) {
      if (isAbortedRef.current) break;
      setCurrentFileName(file.name);
      
      // Generate ID early so we can save the image regardless of AI success
      const invoiceId = Date.now() + Math.random();
      
      try {
        // Step 1: ALWAYS convert PDF to high-res image first (for preview & local storage)
        let previewBase64: string = '';
        try {
          previewBase64 = await pdfToImage(file, 3.0, 0.8);
          // Step 1.5: ALWAYS save preview image to IndexedDB BEFORE AI processing
          if (previewBase64) {
            await saveInvoiceImage(invoiceId, `data:image/jpeg;base64,${previewBase64}`);
          }
        } catch (imgErr) {
          console.warn("Image conversion/saving failed for:", file.name, imgErr);
        }

        // Step 2: Extract text from PDF
        const text = await extractTextFromPdf(file);
        
        // Step 3: Use image for AI if needed. Generate a SMALLER image for the server payload!
        let imgForAI: string | undefined = undefined;
        try {
          // Send an image if text is less than 100 chars, or just send it anyway to be safe (Gemini handles multimodal well)
          // Scale 1.2 and quality 0.6 keeps the base64 string under Next.js 1MB/4MB limits
          imgForAI = await pdfToImage(file, 1.2, 0.6);
        } catch (e) {
          console.warn("Failed to generate AI image payload", e);
        }

        const extracted = await analyzeInvoiceAction(text, imgForAI, template?.headers || [], masterTemplate || undefined);
        
        // If the server action returned an error property, throw it here
        if (extracted.error) {
          throw new Error(extracted.error);
        }

        const carTypeBase = (extracted.carType && extracted.carType !== '#######') ? extracted.carType : '#######';
        const branchInfo = (extracted.branch && extracted.branch !== '#######') ? extracted.branch : '';

        const data: InvoiceData = {
          ...extracted,
          id: invoiceId,
          fileName: file.name,
          originalFile: file,
          invoiceNumber: extracted.invoiceNumber || '#######',
          date: extracted.date || '#######',
          plateNumber: extracted.plateNumber || '#######',
          carType: branchInfo ? `${carTypeBase} - ${branchInfo}` : carTypeBase,
          branch: branchInfo || '#######',
          totalAmount: extracted.totalAmount || 0,
          status: 'completed',
          isFinished: false
        } as InvoiceData;

        setResults(prev => [...prev, data]);
      } catch (error: any) {
        setResults(prev => [...prev, { 
          fileName: file.name, 
          invoiceNumber: 'خطأ',
          date: '#######',
          plateNumber: '#######',
          count: '',
          carType: '#######',
          branch: '#######',
          itemsDescription: '#######',
          subTotal: 0,
          taxAmount: 0,
          totalAmount: 0,
          notes: '',
          status: 'error', 
          error: error.message, 
          id: invoiceId 
        } as any]);
      } finally {
        setState(prev => ({ ...prev, processed: prev.processed + 1 }));
      }
    }
    setState(prev => ({ ...prev, isProcessing: false }));
  };

  const handleExport = () => {
    if (results.length === 0) return;
    exportToExcel(results, template || undefined);
  };

  const handleSaveEdit = () => {
    if (!editData || !selectedInvoice) return;
    const updatedData = { ...selectedInvoice, ...editData, isFinished: true };
    setResults(prev => prev.map(item => 
      item.id === selectedInvoice.id ? { ...item, ...updatedData } : item
    ));
    setSelectedInvoice(updatedData);
    setEditData(updatedData);
  };

  const handleSaveLayout = () => {
    if (!selectedInvoice || !selectedInvoice.locations) return;
    setTrainedLayouts(prev => ({ ...prev, [selectedInvoice.fileName]: selectedInvoice.locations! }));
    setMasterTemplate(selectedInvoice.locations!);
    setLockedLayouts(prev => ({ ...prev, [selectedInvoice.fileName]: true }));
  };

  const handleApplyLayoutToAll = () => {
    if (!selectedInvoice || !selectedInvoice.locations) return;
    const master = selectedInvoice.locations;
    setMasterTemplate(master);
    setResults(prev => prev.map(res => ({
      ...res,
      locations: { ...res.locations, ...master }
    })));
    // Also lock all of them to this template
    const newLocks: Record<string, boolean> = {};
    results.forEach(res => {
      newLocks[res.fileName] = true;
    });
    setLockedLayouts(prev => ({ ...prev, ...newLocks }));
    alert('تم تطبيق تنسيق المواقع على جميع الفواتير المحملة بنجاح!');
  };

  const handleClearAll = async () => {
    if (confirm('هل أنت متأكد من مسح جميع الفواتير والبدء من جديد؟')) {
      setPdfs([]);
      setResults([]);
      setVerificationResults([]);
      localStorage.removeItem('invoiceResults');
      await clearAllImages();
    }
  };

  return (
    <div className="min-h-screen p-4 md:p-8 lg:p-12">
      {/* Header */}
      <header className="max-w-7xl mx-auto mb-12 text-center">
        <motion.div initial={{ y: -20, opacity: 0 }} animate={{ y: 0, opacity: 1 }} transition={{ duration: 0.8 }}>
          <div className="flex justify-center mb-10">
            <div className="relative group">
              <div className="absolute inset-0 bg-orange-500/5 blur-[100px] rounded-full" />
              <motion.img 
                whileHover={{ scale: 1.05, rotate: 5 }}
                src="/logo.png" 
                alt="Smart Invoice Logo" 
                className="relative w-28 h-28 md:w-36 md:h-36 object-contain drop-shadow-xl" 
              />
            </div>
          </div>
          
          <div className="bg-white/40 backdrop-blur-md px-8 py-2.5 rounded-full border border-slate-200/50 mb-8 inline-flex items-center gap-4 shadow-sm">
            <span className="w-2.5 h-2.5 bg-orange-500 rounded-full animate-pulse" />
            <span className="text-[12px] font-black uppercase tracking-[0.4em] text-slate-400">نظام تحليل البيانات الذكي</span>
          </div>
          
          <h1 className="text-6xl md:text-8xl font-black mb-8 tracking-tighter text-slate-900 leading-[1] drop-shadow-sm flex flex-col md:flex-row items-center justify-center gap-4">
            <span>فاتورتي</span>
            <span className="bg-gradient-to-r from-orange-400 to-orange-600 bg-clip-text text-transparent pb-2">الذكية</span>
          </h1>
          
          <p className="text-slate-400 text-xl font-bold max-w-2xl mx-auto leading-relaxed">
            المساعد الذكي للأرشفة والتحليل المالي المدعوم بـ <span className="text-slate-900">Gemini 2.5</span>
          </p>
        </motion.div>
      </header>

      {/* Main Content */}
      <main className="max-w-7xl mx-auto grid grid-cols-1 lg:grid-cols-12 gap-6">
        {/* Sidebar */}
        <div className="lg:col-span-4 space-y-5">
          {/* Mode Switcher */}
          <div className="flex bg-slate-100/80 p-1 rounded-xl border border-slate-200/60">
            <button 
              onClick={() => setState(prev => ({ ...prev, mode: AppMode.ANALYSIS }))}
              className={cn(
                "flex-1 py-2.5 px-2 rounded-lg font-bold text-[12px] transition-all flex items-center justify-center gap-1",
                state.mode === AppMode.ANALYSIS ? "bg-white text-slate-800 shadow-sm" : "text-slate-400 hover:text-slate-600"
              )}
            >
              <FileUp className="w-3.5 h-3.5" />
              تحليل واستخراج
            </button>
            <button 
              onClick={() => setState(prev => ({ ...prev, mode: AppMode.VERIFICATION }))}
              className={cn(
                "flex-1 py-2.5 px-2 rounded-lg font-bold text-[12px] transition-all flex items-center justify-center gap-1",
                state.mode === AppMode.VERIFICATION ? "bg-white text-slate-800 shadow-sm" : "text-slate-400 hover:text-slate-600"
              )}
            >
              <CheckCircle2 className="w-3.5 h-3.5" />
              مطابقة وتدقيق
            </button>
          </div>

          {/* Upload PDFs */}
          <section className="card-premium p-6 space-y-5">
            <h2 className="font-bold text-base flex items-center gap-2">
              <FileUp className="w-5 h-5 text-accent" />
              رفع الفواتير (PDF)
            </h2>
            <div 
              onClick={() => pdfInputRef.current?.click()}
              onDragOver={onDragOver}
              onDragLeave={onDragLeave}
              onDrop={onDrop}
              className={cn(
                "border-2 border-dashed rounded-xl p-6 text-center cursor-pointer transition-all duration-200",
                isDragging 
                  ? "border-accent bg-accent/5 scale-[1.01]" 
                  : "border-slate-200 hover:border-accent/40 hover:bg-slate-50"
              )}
            >
              <input type="file" multiple accept="application/pdf,.pdf" className="hidden" ref={pdfInputRef} onChange={handlePdfUpload} />
              <FileUp className="w-8 h-8 mx-auto mb-2 text-slate-300" />
              <p className="text-sm font-medium text-slate-600">اسحب الملفات هنا أو اضغط للرفع</p>
              <p className="text-[10px] text-slate-400 mt-1">يدعم النظام حتى 300 فاتورة PDF</p>
            </div>

            {/* Uploaded File List */}
            {pdfs.length > 0 && (
              <div className="space-y-2">
                <div className="flex items-center justify-between text-sm bg-accent/5 p-2.5 rounded-lg border border-accent/10">
                  <span className="font-bold text-slate-700 text-xs">{pdfs.length} ملف تم اختياره</span>
                  <button onClick={() => setPdfs([])} className="text-red-400 hover:text-red-600 text-[10px] font-bold transition-colors">مسح الكل</button>
                </div>
                <div className="max-h-32 overflow-y-auto border border-slate-100 rounded-lg bg-slate-50/50 p-1.5 space-y-1">
                  {pdfs.map((file, idx) => (
                    <div key={idx} className="flex items-center justify-between text-[11px] text-slate-600 bg-white p-1.5 px-2.5 rounded border border-slate-100">
                      <span className="truncate flex-1 font-medium">{file.name}</span>
                      <button 
                        onClick={() => setPdfs(prev => prev.filter((_, i) => i !== idx))}
                        className="text-slate-300 hover:text-red-500 mr-2 transition-colors"
                      >
                        <Trash2 className="w-3 h-3" />
                      </button>
                    </div>
                  ))}
                </div>
              </div>
            )}
          </section>

          {/* Excel Template */}
          <section className="card-premium p-6 space-y-4">
            <h2 className="font-bold text-base flex items-center gap-2">
              <FileSpreadsheet className="w-5 h-5 text-accent" />
              ملف البيانات (قالب استخراج)
            </h2>
            <div 
              onClick={() => templateInputRef.current?.click()}
              className={cn(
                "border-2 border-dashed rounded-xl p-5 text-center cursor-pointer transition-all duration-300",
                template 
                  ? "border-green-400 bg-green-50/50" 
                  : "border-slate-200 hover:border-accent/40 hover:bg-slate-50"
              )}
            >
              <input type="file" accept=".xlsx,.xls" className="hidden" ref={templateInputRef} onChange={handleTemplateUpload} />
              {template ? (
                <div className="flex items-center justify-center gap-3 text-green-600">
                  <CheckCircle2 className="w-6 h-6 flex-shrink-0" />
                  <div className="text-right">
                    <div className="font-bold text-xs truncate max-w-[160px]">{template.name}</div>
                    <div className="text-[10px] opacity-70">يحتوي على {template.existingData.length} سجل و {template.headers.length} عمود</div>
                  </div>
                </div>
              ) : (
                <div className="flex flex-col items-center gap-1">
                  <FileSpreadsheet className="w-6 h-6 text-slate-300" />
                  <span className="text-xs font-medium text-slate-500">رفع إكسل لاستخراج بيانات مخصصة</span>
                  <span className="text-[9px] text-slate-400">اختياري - للإضافة على ملف موجود</span>
                </div>
              )}
            </div>
            {template && (
              <div className="text-[10px] text-slate-400 leading-relaxed">
                الأعمدة المكتشفة: {template.headers.slice(0, 5).join('، ')}{template.headers.length > 5 ? '...' : ''}
              </div>
            )}
          </section>

          {/* Action Buttons */}
          <div className="space-y-3">
            {state.isProcessing ? (
              <motion.div 
                initial={{ opacity: 0, y: 10 }}
                animate={{ opacity: 1, y: 0 }}
                className="bg-primary text-white p-5 rounded-2xl shadow-xl space-y-4"
              >
                <div className="flex justify-between items-center">
                  <div>
                    <h3 className="font-bold text-sm">جاري معالجة الفواتير...</h3>
                    <p className="text-[10px] text-white/60 truncate max-w-[180px] mt-0.5">
                      {currentFileName || 'بدء المعالجة...'}
                    </p>
                  </div>
                  <span className="text-2xl font-black">{Math.round((state.processed / state.total) * 100)}%</span>
                </div>
                <div className="h-2 bg-white/10 rounded-full overflow-hidden">
                  <motion.div 
                    className="h-full bg-accent rounded-full" 
                    initial={{ width: 0 }} 
                    animate={{ width: `${(state.processed / state.total) * 100}%` }}
                    transition={{ type: "spring", stiffness: 50 }}
                  />
                </div>
                <div className="flex justify-between text-[10px] font-bold text-white/70">
                  <span className="flex items-center gap-1">
                    <CheckCircle2 className="w-3 h-3" />
                    تمت: {state.processed}
                  </span>
                  <span>المتبقي: {state.total - state.processed}</span>
                </div>
                <button 
                  onClick={() => isAbortedRef.current = true} 
                  className="w-full py-2 bg-red-500/20 text-red-300 rounded-lg text-[10px] font-bold hover:bg-red-500/30 transition-colors flex items-center justify-center gap-1"
                >
                  <XCircle className="w-3 h-3" />
                  إلغاء العملية
                </button>
              </motion.div>
            ) : (
              <>
                <div className="flex gap-2">
                  <button 
                    onClick={startProcessing}
                    disabled={pdfs.length === 0}
                    className="btn-premium flex-1 disabled:opacity-40 disabled:cursor-not-allowed"
                  >
                    <Play className="w-5 h-5" />
                    ابدأ المعالجة الذكية
                  </button>
                  {(results.length > 0 || pdfs.length > 0) && (
                    <button 
                      onClick={handleClearAll}
                      className="w-12 h-12 flex items-center justify-center bg-slate-100 text-slate-400 hover:bg-red-50 hover:text-red-500 rounded-2xl transition-all border border-slate-200 flex-shrink-0"
                      title="مسح الكل والبدء من جديد"
                    >
                      <Trash2 className="w-4 h-4" />
                    </button>
                  )}
                </div>

                <button 
                  onClick={handleExport}
                  disabled={results.length === 0}
                  className="w-full flex items-center justify-center gap-2 py-3 bg-white font-bold text-sm text-slate-600 rounded-2xl border border-slate-200 hover:border-accent/40 hover:bg-accent/5 hover:text-accent transition-all disabled:opacity-40 disabled:cursor-not-allowed"
                >
                  <Download className="w-4 h-4" />
                  تحميل ملف Excel النتائج
                </button>
              </>
            )}
          </div>
        </div>

        {/* Results Area */}
        <div className="lg:col-span-8 flex flex-col gap-5">
          {/* Progress Bar (when processing) */}
          <AnimatePresence>
            {state.isProcessing && (
              <motion.div
                initial={{ opacity: 0, y: 10 }}
                animate={{ opacity: 1, y: 0 }}
                exit={{ opacity: 0, scale: 0.97 }}
                className="bg-accent/5 border border-accent/20 rounded-2xl p-4 flex items-center gap-4"
              >
                <Loader2 className="w-5 h-5 text-accent animate-spin flex-shrink-0" />
                <div className="flex-1">
                  <div className="flex justify-between text-xs font-bold text-slate-600 mb-1.5">
                    <span>جاري تحليل: {currentFileName}</span>
                    <span className="text-accent">{state.processed}/{state.total}</span>
                  </div>
                  <div className="h-1.5 bg-slate-200 rounded-full overflow-hidden">
                    <motion.div 
                      className="h-full bg-accent rounded-full" 
                      animate={{ width: `${(state.processed / state.total) * 100}%` }}
                    />
                  </div>
                </div>
              </motion.div>
            )}
          </AnimatePresence>

          {/* Results Table */}
          <section className="card-premium flex-1 overflow-hidden flex flex-col min-h-[500px]">
            <InvoiceTable 
              mode={state.mode}
              results={results}
              verificationResults={verificationResults}
              selectedInvoice={selectedInvoice}
              openedIds={Array.from(openedIds)}
              lastWorkedOnId={lastWorkedOnId}
              onSelect={setSelectedInvoice}
              onToggleComplete={(id) => setResults(prev => prev.map(r => r.id === id ? { ...r, isFinished: !r.isFinished } : r))}
              onDelete={(id) => setResults(prev => prev.filter(r => r.id !== id))}
              onExport={handleExport}
            />
          </section>
        </div>
      </main>

      {/* Invoice Preview Modal */}
      <AnimatePresence>
        {selectedInvoice && (
          <InvoicePreviewModal 
            invoice={selectedInvoice}
            editData={editData}
            previewImage={previewImage}
            isPreviewLoading={isPreviewLoading}
            hoveredField={hoveredField}
            locked={lockedLayouts[selectedInvoice.fileName] || false}
            hasChanges={JSON.stringify(editData) !== JSON.stringify(selectedInvoice)}
            onClose={() => setSelectedInvoice(null)}
            onEdit={setEditData}
            onSave={handleSaveEdit}
            onUpdateLocation={(f, b) => setSelectedInvoice({ ...selectedInvoice, locations: { ...selectedInvoice.locations, [f]: b } })}
            onSaveLayout={handleSaveLayout}
            onApplyLayoutToAll={handleApplyLayoutToAll}
            setHoveredField={setHoveredField}
          />
        )}
      </AnimatePresence>
    </div>
  );
}
