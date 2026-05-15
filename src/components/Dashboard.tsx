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
  Layout,
  Printer
} from 'lucide-react';
import { motion, AnimatePresence } from 'motion/react';
import { InvoiceData, ProcessingState, ExcelTemplate, AppMode, VerificationResult, TableTemplate, FIELD_COLORS, FIELD_NAMES } from '@/types';
import { extractTextFromPdf, pdfToImage } from '@/lib/pdf';
import { analyzeInvoiceAction } from '@/app/actions';
import { readExcelTemplate, exportToExcel } from '@/lib/excel';
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
  const [currentTemplate, setCurrentTemplate] = useState<TableTemplate>(TableTemplate.MODERN);
  const [previewImage, setPreviewImage] = useState<string | null>(null);
  const [isPreviewLoading, setIsPreviewLoading] = useState(false);
  const [hoveredField, setHoveredField] = useState<string | null>(null);
  
  const [lockedLayouts, setLockedLayouts] = useState<Record<string, boolean>>({});
  const [trainedLayouts, setTrainedLayouts] = useState<Record<string, Record<string, number[]>>>( {});
  const [masterTemplate, setMasterTemplate] = useState<Record<string, number[]> | null>(null);

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

  useEffect(() => {
    if (typeof window !== 'undefined') {
      const savedLocks = localStorage.getItem('lockedLayouts');
      const savedTrained = localStorage.getItem('trainedLayouts');
      const savedMaster = localStorage.getItem('masterTemplate');
      const savedResults = localStorage.getItem('invoiceResults');

      if (savedLocks) setLockedLayouts(JSON.parse(savedLocks));
      if (savedTrained) setTrainedLayouts(JSON.parse(savedTrained));
      if (savedMaster) setMasterTemplate(JSON.parse(savedMaster));
      if (savedResults) setResults(JSON.parse(savedResults));
    }
  }, []);

  useEffect(() => {
    if (typeof window !== 'undefined') {
      localStorage.setItem('lockedLayouts', JSON.stringify(lockedLayouts));
      localStorage.setItem('trainedLayouts', JSON.stringify(trainedLayouts));
      localStorage.setItem('masterTemplate', JSON.stringify(masterTemplate));
      if (results.length > 0) localStorage.setItem('invoiceResults', JSON.stringify(results));
    }
  }, [lockedLayouts, trainedLayouts, masterTemplate, results]);

  useEffect(() => {
    const loadPreview = async () => {
      if (selectedInvoice?.originalFile instanceof Blob) {
        setIsPreviewLoading(true);
        try {
          const img = await pdfToImage(selectedInvoice.originalFile);
          setPreviewImage(`data:image/jpeg;base64,${img}`);
        } catch (e) {
          console.error("Failed to generate image preview", e);
          setPreviewImage(null);
        } finally {
          setIsPreviewLoading(false);
        }
      } else {
        // If file is missing (e.g. from localStorage), we can't show preview
        setPreviewImage(null);
        setIsPreviewLoading(false);
      }
    };
    
    // Ensure we clones the invoice data to editData to avoid direct mutation
    if (selectedInvoice) {
      setEditData({ ...selectedInvoice });
    } else {
      setEditData(null);
    }
    
    loadPreview();
  }, [selectedInvoice]);

  const handlePdfUpload = (e: React.ChangeEvent<HTMLInputElement>) => {
    if (e.target.files) {
      const files = Array.from(e.target.files).filter(f => f.type === 'application/pdf' || f.name.toLowerCase().endsWith('.pdf'));
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
        alert('حدث خطأ أثناء قراءة القالب.');
      }
    }
  };

  const startProcessing = async () => {
    if (pdfs.length === 0) return;
    isAbortedRef.current = false;
    setState(prev => ({ ...prev, total: pdfs.length, processed: 0, isProcessing: true }));
    
    // Don't clear results, just append or update
    // setResults([]); 

    for (const file of pdfs) {
      if (isAbortedRef.current) break;
      setCurrentFileName(file.name);
      
      try {
        const text = await extractTextFromPdf(file);
        let imgBase64 = undefined;
        if (text.length < 100) imgBase64 = await pdfToImage(file);

        const extracted = await analyzeInvoiceAction(text, imgBase64, template?.headers || [], masterTemplate || undefined);
        
        const carTypeBase = (extracted.carType && extracted.carType !== '#######') ? extracted.carType : '#######';
        const branchInfo = (extracted.branch && extracted.branch !== '#######') ? extracted.branch : '';

        const data: InvoiceData = {
          ...extracted,
          id: Date.now() + Math.random(),
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
        setResults(prev => [...prev, { fileName: file.name, status: 'error', error: error.message, id: Date.now() + Math.random() } as any]);
      } finally {
        setState(prev => ({ ...prev, processed: prev.processed + 1 }));
      }
    }
    setState(prev => ({ ...prev, isProcessing: false }));
  };

  const handleSaveEdit = () => {
    if (!editData || !selectedInvoice) return;
    setResults(prev => prev.map(item => item.id === selectedInvoice.id ? { ...item, ...editData, isFinished: true } : item));
    setSelectedInvoice({ ...selectedInvoice, ...editData, isFinished: true });
  };

  const handleSaveLayout = () => {
    if (!selectedInvoice || !selectedInvoice.locations) return;
    setTrainedLayouts(prev => ({ ...prev, [selectedInvoice.fileName]: selectedInvoice.locations! }));
    setMasterTemplate(selectedInvoice.locations!);
    setLockedLayouts(prev => ({ ...prev, [selectedInvoice.fileName]: true }));
  };

  return (
    <div className="min-h-screen p-4 md:p-12">
      <header className="max-w-7xl mx-auto mb-16 text-center">
        <motion.div initial={{ y: -30, opacity: 0 }} animate={{ y: 0, opacity: 1 }}>
          <div className="bg-white/30 backdrop-blur-md px-6 py-2 rounded-full border border-white/20 mb-6 inline-flex items-center gap-2 shadow-sm">
            <span className="w-2 h-2 bg-accent rounded-full animate-pulse" />
            <span className="text-[11px] font-black uppercase tracking-[0.3em] text-slate-500">نظام تحليل البيانات المتقدم (Next.js)</span>
          </div>
          <h1 className="text-5xl md:text-8xl font-black mb-6 tracking-tighter text-slate-900 leading-[1.1]">
            فاتورتي <span className="text-gradient">الذكية</span>
          </h1>
          <p className="text-slate-500 text-xl font-medium max-w-2xl mx-auto leading-relaxed">
            نسخة مطورة تعمل بتقنيات Next.js لضمان أقصى درجات الأمان والسرعة.
          </p>
        </motion.div>
      </header>

      <main className="max-w-7xl mx-auto grid grid-cols-1 lg:grid-cols-12 gap-8">
        <div className="lg:col-span-4 space-y-6">
          <div className="flex bg-slate-100 p-1 rounded-xl border border-slate-200">
            <button 
              onClick={() => setState(prev => ({ ...prev, mode: AppMode.ANALYSIS }))}
              className={cn("flex-1 py-3 px-2 rounded-lg font-bold text-[13px] transition-all", state.mode === AppMode.ANALYSIS ? "bg-white text-slate-800 shadow-sm" : "text-slate-500")}
            >تحليل واستخراج</button>
            <button 
              onClick={() => setState(prev => ({ ...prev, mode: AppMode.VERIFICATION }))}
              className={cn("flex-1 py-3 px-2 rounded-lg font-bold text-[13px] transition-all", state.mode === AppMode.VERIFICATION ? "bg-white text-slate-800 shadow-sm" : "text-slate-500")}
            >مطابقة وتدقيق</button>
            <button 
              onClick={() => setState(prev => ({ ...prev, mode: AppMode.REPORT }))}
              className={cn("flex-1 py-3 px-2 rounded-lg font-bold text-[13px] transition-all", state.mode === AppMode.REPORT ? "bg-white text-slate-800 shadow-sm" : "text-slate-500")}
            >ترتيب الجدول</button>
          </div>

          <section className="card-premium p-8 space-y-6">
            <h2 className="font-bold text-xl flex items-center gap-2">
              <FileUp className="w-5 h-5 text-accent" />
              رفع الفواتير (PDF)
            </h2>
            <div 
              onClick={() => pdfInputRef.current?.click()}
              className="border-2 border-dashed rounded-lg p-8 text-center cursor-pointer border-primary/20 hover:bg-black/5"
            >
              <input type="file" multiple accept=".pdf" className="hidden" ref={pdfInputRef} onChange={handlePdfUpload} />
              <FileUp className="w-10 h-10 mx-auto mb-2 text-gray-400" />
              <p className="text-sm font-medium">اضغط لرفع ملفات الـ PDF</p>
            </div>

            {state.isProcessing && (
              <div className="bg-slate-900 text-white p-6 rounded-2xl space-y-4 shadow-xl">
                <div className="flex justify-between items-center">
                  <span className="text-[10px] font-black uppercase tracking-widest text-slate-400">جاري المعالجة...</span>
                  <span className="text-xs font-bold text-accent">{Math.round((state.processed / state.total) * 100)}%</span>
                </div>
                <div className="h-1.5 bg-white/10 rounded-full overflow-hidden">
                  <motion.div className="h-full bg-accent" initial={{ width: 0 }} animate={{ width: `${(state.processed / state.total) * 100}%` }} />
                </div>
                <div className="flex items-center gap-2 text-[10px] font-bold text-slate-300">
                  <Loader2 className="w-3 h-3 animate-spin" />
                  <span>معالجة: {currentFileName}</span>
                </div>
                <button onClick={() => isAbortedRef.current = true} className="w-full py-2 bg-red-500/20 text-red-400 rounded-lg text-[10px] font-bold hover:bg-red-500/30 transition-colors">إلغاء العملية</button>
              </div>
            )}

            {!state.isProcessing && pdfs.length > 0 && (
              <button 
                onClick={startProcessing}
                className="btn-premium w-full"
              >
                <Play className="w-5 h-5" />
                ابدأ المعالجة
              </button>
            )}
          </section>
        </div>

        <div className="lg:col-span-8 space-y-6">
          <section className="card-premium flex-1 overflow-hidden flex flex-col min-h-[600px]">
            <InvoiceTable 
              mode={state.mode}
              results={results}
              verificationResults={verificationResults}
              selectedInvoice={selectedInvoice}
              onSelect={setSelectedInvoice}
              onToggleComplete={(id) => setResults(prev => prev.map(r => r.id === id ? { ...r, isFinished: !r.isFinished } : r))}
              onDelete={(id) => setResults(prev => prev.filter(r => r.id !== id))}
            />
          </section>
        </div>
      </main>

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
            setHoveredField={setHoveredField}
          />
        )}
      </AnimatePresence>
    </div>
  );
}
