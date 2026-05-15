/**
 * @license
 * SPDX-License-Identifier: Apache-2.0
 */

import React, { useState, useRef, useEffect } from 'react';
import { 
  FileUp, 
  FileSpreadsheet, 
  Play, 
  Download, 
  Trash2, 
  CheckCircle2, 
  Loader2, 
  AlertCircle,
  Clock,
  ChevronRight,
  FileText,
  FileDown,
  XCircle,
  Eye,
  Layout,
  Palette,
  Printer,
  Move,
  Save
} from 'lucide-react';
import { motion, AnimatePresence } from 'motion/react';
import { InvoiceData, ProcessingState, ExcelTemplate, AppMode, VerificationResult, TableTemplate } from './types';
import { extractTextFromPdf, pdfToImage } from './lib/pdf';
import { analyzeInvoice } from './lib/gemini';
import { readExcelTemplate, exportToExcel } from './lib/excel';
import { clsx, type ClassValue } from 'clsx';
import { twMerge } from 'tailwind-merge';

function cn(...inputs: ClassValue[]) {
  return twMerge(clsx(inputs));
}

const FIELD_COLORS: Record<string, { bg: string, border: string, text: string, highlight: string, solid: string }> = {
  invoiceNumber: { bg: 'bg-indigo-100', border: 'border-indigo-500', text: 'text-indigo-900', highlight: 'rgba(79, 70, 229, 0.5)', solid: '#4F46E5' },
  date: { bg: 'bg-blue-100', border: 'border-blue-500', text: 'text-blue-900', highlight: 'rgba(37, 99, 235, 0.5)', solid: '#2563EB' },
  plateNumber: { bg: 'bg-amber-100', border: 'border-amber-500', text: 'text-amber-900', highlight: 'rgba(217, 119, 6, 0.5)', solid: '#D97706' },
  count: { bg: 'bg-emerald-100', border: 'border-emerald-500', text: 'text-emerald-900', highlight: 'rgba(5, 150, 105, 0.5)', solid: '#059669' },
  carType: { bg: 'bg-fuchsia-100', border: 'border-fuchsia-500', text: 'text-fuchsia-900', highlight: 'rgba(192, 38, 211, 0.5)', solid: '#C026D3' },
  branch: { bg: 'bg-rose-100', border: 'border-rose-500', text: 'text-rose-900', highlight: 'rgba(225, 29, 72, 0.5)', solid: '#E11D48' },
  itemsDescription: { bg: 'bg-slate-100', border: 'border-slate-500', text: 'text-slate-900', highlight: 'rgba(71, 85, 105, 0.5)', solid: '#475569' },
  totalAmount: { bg: 'bg-violet-100', border: 'border-violet-500', text: 'text-violet-900', highlight: 'rgba(124, 58, 237, 0.5)', solid: '#7C3AED' },
};

export default function App() {
  const [pdfs, setPdfs] = useState<File[]>([]);
  const [isDragging, setIsDragging] = useState(false);
  const [template, setTemplate] = useState<ExcelTemplate | null>(null);
  const [results, setResults] = useState<InvoiceData[]>([]);
  const [verificationResults, setVerificationResults] = useState<VerificationResult[]>([]);
  const [currentFileName, setCurrentFileName] = useState<string>('');
  const [selectedInvoice, setSelectedInvoice] = useState<InvoiceData | null>(null);
  const [editData, setEditData] = useState<InvoiceData | null>(null);
  const [currentTemplate, setCurrentTemplate] = useState<TableTemplate>(TableTemplate.MODERN);
  const [previewUrl, setPreviewUrl] = useState<string | null>(null);
  const [previewImage, setPreviewImage] = useState<string | null>(null);
  const [isPreviewLoading, setIsPreviewLoading] = useState(false);
  const [hoveredField, setHoveredField] = useState<string | null>(null);
  const [verifiedFields, setVerifiedFields] = useState<Record<string, boolean>>({});
  const [lockedLayouts, setLockedLayouts] = useState<Record<string, boolean>>(() => {
    const saved = localStorage.getItem('lockedLayouts');
    return saved ? JSON.parse(saved) : {};
  });

  const [trainedLayouts, setTrainedLayouts] = useState<Record<string, Record<string, number[]>>>(() => {
    const saved = localStorage.getItem('trainedLayouts');
    return saved ? JSON.parse(saved) : {};
  });

  const [masterTemplate, setMasterTemplate] = useState<Record<string, number[]> | null>(() => {
    const saved = localStorage.getItem('masterTemplate');
    if (saved) {
      try {
        return JSON.parse(saved);
      } catch (e) {
        return null;
      }
    }
    return null;
  });

  // Load results from localStorage if they exist to remember "training"
  useEffect(() => {
    const savedResults = localStorage.getItem('invoiceResults');
    if (savedResults) {
      try {
        const parsed = JSON.parse(savedResults);
        if (Array.isArray(parsed) && parsed.length > 0) {
          // Ensure every item has a unique ID for reliable editing
          const withIds = parsed.map((item: any) => ({
            ...item,
            id: item.id || (Math.random() + Date.now() + Math.random())
          }));
          setResults(prev => prev.length === 0 ? withIds : prev);
        }
      } catch (e) {
        console.error("Failed to load saved training results", e);
      }
    }
  }, []);

  // Persist templates and training data
  useEffect(() => {
    localStorage.setItem('lockedLayouts', JSON.stringify(lockedLayouts));
    localStorage.setItem('trainedLayouts', JSON.stringify(trainedLayouts));
    localStorage.setItem('masterTemplate', JSON.stringify(masterTemplate));
    if (results.length > 0) {
      localStorage.setItem('invoiceResults', JSON.stringify(results));
    }
  }, [lockedLayouts, trainedLayouts, masterTemplate, results]);
  const [state, setState] = useState<ProcessingState>({
    total: 0,
    processed: 0,
    currentBatch: 0,
    isProcessing: false,
    mode: AppMode.ANALYSIS
  });
  const imageContainerRef = useRef<HTMLDivElement>(null);

  const pdfInputRef = useRef<HTMLInputElement>(null);
  const templateInputRef = useRef<HTMLInputElement>(null);
  const isAbortedRef = useRef(false);

  useEffect(() => {
    let activeUrl: string | null = null;
    setEditData(selectedInvoice);

    const loadPreview = async () => {
      if (selectedInvoice?.originalFile instanceof Blob) {
        setIsPreviewLoading(true);
        try {
          const url = URL.createObjectURL(selectedInvoice.originalFile);
          activeUrl = url;
          setPreviewUrl(url);
          
          const img = await pdfToImage(selectedInvoice.originalFile);
          setPreviewImage(`data:image/jpeg;base64,${img}`);
        } catch (e) {
          console.error("Failed to generate image preview", e);
          setPreviewImage(null);
          setPreviewUrl(null);
        } finally {
          setIsPreviewLoading(false);
        }
      } else {
        setPreviewUrl(null);
        setPreviewImage(null);
        setIsPreviewLoading(false);
      }
    };
    
    loadPreview();

    return () => {
      if (activeUrl) {
        URL.revokeObjectURL(activeUrl);
      }
    };
  }, [selectedInvoice]);

  const hasChanges = selectedInvoice && editData && (
    editData.invoiceNumber !== selectedInvoice.invoiceNumber ||
    editData.date !== selectedInvoice.date ||
    editData.plateNumber !== selectedInvoice.plateNumber ||
    editData.count !== selectedInvoice.count ||
    editData.carType !== selectedInvoice.carType ||
    editData.branch !== selectedInvoice.branch ||
    editData.itemsDescription !== selectedInvoice.itemsDescription ||
    editData.totalAmount !== selectedInvoice.totalAmount ||
    editData.taxAmount !== selectedInvoice.taxAmount ||
    editData.subTotal !== selectedInvoice.subTotal
  );

  const handleSaveEdit = () => {
    if (!editData || !selectedInvoice) return;

    // Auto-verify fields that were edited
    setVerifiedFields(prev => ({ ...prev, [selectedInvoice.fileName]: true }));

    const updatedData = { 
      ...selectedInvoice, 
      ...editData, 
      isFinished: true 
    } as InvoiceData;

    // 1. Update results array
    setResults(prev => {
      const updated = prev.map(item => {
        const isIdMatch = item.id && item.id === selectedInvoice.id;
        const isInfoMatch = item.fileName === selectedInvoice.fileName && item.invoiceNumber === selectedInvoice.invoiceNumber;
        
        if (isIdMatch || isInfoMatch) {
          return { ...item, ...updatedData };
        }
        return item;
      });
      return updated;
    });

    // 2. Update verification results
    setVerificationResults(prev => prev.map(item => 
      (item.fileName === selectedInvoice.fileName)
        ? { ...item, extractedData: updatedData }
        : item
    ));

    setSelectedInvoice(updatedData);
    setEditData(updatedData);
  };

  const toggleRowCompletion = (id: string | number) => {
    setResults(prev => prev.map(item => 
      (item.id === id)
        ? { ...item, isFinished: !item.isFinished }
        : item
    ));
    
    // Also update verification results if we are in that mode
    setVerificationResults(prev => prev.map(item => 
      (item.extractedData?.id === id)
        ? { ...item, extractedData: { ...item.extractedData, isFinished: !item.extractedData.isFinished } }
        : item
    ));
  };

  const handleUpdateLocation = (field: string, newBox: number[]) => {
    if (!selectedInvoice || lockedLayouts[selectedInvoice.fileName]) return;
    
    setResults(prev => prev.map(res => {
      if (res.fileName === selectedInvoice.fileName) {
        const updated = {
          ...res,
          locations: {
            ...(res.locations || {}),
            [field]: newBox
          }
        };
        setSelectedInvoice(updated);
        return updated;
      }
      return res;
    }));
  };

  const handleSaveLayout = () => {
    if (!selectedInvoice || !selectedInvoice.locations) return;
    
    // IF there are pending text changes, save them too
    if (hasChanges) {
      handleSaveEdit();
    }
    
    // Save to permanent training dictionary
    setTrainedLayouts(prev => ({
      ...prev,
      [selectedInvoice.fileName]: selectedInvoice.locations
    }));
    
    // Also set as the Master Template for future files
    setMasterTemplate(selectedInvoice.locations);
    
    // Lock the layout
    setLockedLayouts(prev => ({ ...prev, [selectedInvoice.fileName]: true }));
    console.log("Training complete and set as Master Template for:", selectedInvoice.fileName);
  };

  const applyMasterToAll = () => {
    if (!masterTemplate) return;
    setResults(prev => prev.map(res => ({
      ...res,
      locations: { ...res.locations, ...masterTemplate }
    })));
    // Also lock all of them
    const newLocks: Record<string, boolean> = {};
    results.forEach(res => {
      newLocks[res.fileName] = true;
    });
    setLockedLayouts(prev => ({ ...prev, ...newLocks }));
  };

  const processFiles = (files: FileList | File[]) => {
    const pdfFiles = Array.from(files).filter(file => 
      file.type === 'application/pdf' || file.name.toLowerCase().endsWith('.pdf')
    );
    
    if (pdfFiles.length === 0 && files.length > 0) {
      alert('يرجى اختيار ملفات PDF فقط.');
      return;
    }
    
    setPdfs(prev => [...prev, ...pdfFiles]);
  };

  const handlePdfUpload = (e: React.ChangeEvent<HTMLInputElement>) => {
    if (e.target.files) {
      processFiles(e.target.files);
      e.target.value = '';
    }
  };

  const onDragOver = (e: React.DragEvent) => {
    e.preventDefault();
    setIsDragging(true);
  };

  const onDragLeave = () => {
    setIsDragging(false);
  };

  const onDrop = (e: React.DragEvent) => {
    e.preventDefault();
    setIsDragging(false);
    if (e.dataTransfer.files) {
      processFiles(e.dataTransfer.files);
    }
  };

  const handleTemplateUpload = async (e: React.ChangeEvent<HTMLInputElement>) => {
    if (e.target.files?.[0]) {
      const file = e.target.files[0];
      try {
        const data = await readExcelTemplate(file);
        setTemplate({ ...data, file });
      } catch (err) {
        alert('حدث خطأ أثناء قراءة القالب. تأكد من أنه ملف Excel صالح وتحقق من البيانات الموجودة.');
      }
    }
  };

  const stopProcessing = () => {
    isAbortedRef.current = true;
  };

  const startProcessing = async () => {
    if (pdfs.length === 0) return;
    
    isAbortedRef.current = false;
    setState({
      total: pdfs.length,
      processed: 0,
      currentBatch: 1,
      isProcessing: true,
      mode: AppMode.ANALYSIS
    });
    setResults([]);

    const CONCURRENCY_LIMIT = 2; // Reduced from 15 to avoid 429 errors
    const queue = [...pdfs];
    let index = 0;

    const processNext = async (): Promise<void> => {
      if (queue.length === 0 || isAbortedRef.current) return;
      
      const file = queue.shift()!;
      setCurrentFileName(file.name);
      const currentIndex = index++;

      try {
        const text = await extractTextFromPdf(file);
        let imgBase64 = undefined;
        if (text.length < 100) {
          imgBase64 = await pdfToImage(file);
        }

        const extracted = await analyzeInvoice(text, imgBase64, template?.headers || [], masterTemplate || undefined);
        
        // APPLY TRAINING: 
        // 1. Try file-specific training first
        // 2. Try Global Master Template second
        const savedTraining = trainedLayouts[file.name] || masterTemplate;
        const finalLocations = savedTraining ? { ...extracted.locations, ...savedTraining } : extracted.locations;

        const carTypeBase = (extracted.carType && extracted.carType !== '#######') ? extracted.carType : '#######';
        const branchInfo = (extracted.branch && extracted.branch !== '#######') ? extracted.branch : '';

        const data: InvoiceData = {
          ...extracted,
          id: Date.now() + Math.random(),
          locations: finalLocations,
          fileName: file.name,
          originalFile: file,
          invoiceNumber: (extracted.invoiceNumber && extracted.invoiceNumber !== '#######') ? extracted.invoiceNumber : '#######',
          date: (extracted.date && extracted.date !== '#######') ? extracted.date : '#######',
          plateNumber: (extracted.plateNumber && extracted.plateNumber !== '#######') ? extracted.plateNumber : '#######',
          count: (extracted.count && extracted.count !== '#######') ? extracted.count : '',
          carType: branchInfo ? `${carTypeBase} - ${branchInfo}` : carTypeBase,
          branch: branchInfo || '#######',
          itemsDescription: (extracted.itemsDescription && extracted.itemsDescription !== '#######') ? extracted.itemsDescription : '#######',
          subTotal: extracted.subTotal || 0,
          taxAmount: extracted.taxAmount || 0,
          totalAmount: extracted.totalAmount || 0,
          notes: '', // Always empty as per user request
          status: 'completed',
        };

        setResults(prev => [...prev, data]);
      } catch (error: any) {
        const errorData: InvoiceData = {
          fileName: file.name,
          invoiceNumber: 'خطأ',
          date: '#######',
          plateNumber: '#######',
          count: '#######',
          carType: '#######',
          branch: '#######',
          itemsDescription: '#######',
          subTotal: 0,
          taxAmount: 0,
          totalAmount: 0,
          notes: '',
          status: 'error',
          error: error.message || String(error)
        };
        setResults(prev => [...prev, errorData]);
      } finally {
        setState(prev => ({ 
          ...prev, 
          processed: prev.processed + 1,
        }));
        await processNext();
      }
    };

    const workers = Array(Math.min(CONCURRENCY_LIMIT, pdfs.length))
      .fill(null)
      .map(() => processNext());

    await Promise.all(workers);
    setState(prev => ({ ...prev, isProcessing: false }));
  };

  const startVerification = async () => {
    if (pdfs.length === 0 || !template) return;
    
    isAbortedRef.current = false;
    setState(prev => ({
      ...prev,
      total: pdfs.length,
      processed: 0,
      currentBatch: 1,
      isProcessing: true,
      mode: AppMode.VERIFICATION
    }));
    setVerificationResults([]);

    const CONCURRENCY_LIMIT = 2; // Reduced from 15 to avoid 429 errors
    const queue = [...pdfs];
    let index = 0;

    const processNext = async (): Promise<void> => {
      if (queue.length === 0 || isAbortedRef.current) return;
      
      const file = queue.shift()!;
      setCurrentFileName(file.name);
      const currentIndex = index++;

      try {
        const text = await extractTextFromPdf(file);
        let imgBase64 = undefined;
        if (text.length < 100) imgBase64 = await pdfToImage(file);

        const extracted = await analyzeInvoice(text, imgBase64, template.headers);
        
        // Try to find in Excel
        const match = template.existingData.find(row => {
          const invoiceVal = String(row['رقم الفاتورة'] || row['invoice'] || '').trim();
          const extractedInvoice = String(extracted.invoiceNumber || '').trim();
          return invoiceVal === extractedInvoice && extractedInvoice !== '#######';
        });

        const mismatches: string[] = [];
        if (match) {
          // Check essential fields
          const extractedTotal = Number(extracted.totalAmount);
          const excelTotal = Number(match['الاجمالي بعد الضريبة'] || match['total'] || 0);
          if (Math.abs(extractedTotal - excelTotal) > 0.1) mismatches.push('المبلغ الإجمالي');

          const extractedDate = String(extracted.date);
          const excelDate = String(match['التاريخ'] || match['date'] || '');
          if (extractedDate !== excelDate && excelDate !== '') mismatches.push('التاريخ');
          
          const extractedPlate = String(extracted.plateNumber);
          const excelPlate = String(match['اللوحة'] || match['plate'] || '');
          if (extractedPlate !== excelPlate && excelPlate !== '') mismatches.push('رقم اللوحة');
        }

        const carTypeBase = (extracted.carType && extracted.carType !== '#######') ? extracted.carType : '#######';
        const branchInfo = (extracted.branch && extracted.branch !== '#######') ? extracted.branch : '#######';

        const extractedData: InvoiceData = { 
          ...(extracted as InvoiceData), 
          id: Date.now() + Math.random(),
          originalFile: file,
          fileName: file.name,
          carType: carTypeBase,
          branch: branchInfo,
          count: (extracted.count && extracted.count !== '#######') ? extracted.count : '',
          isFinished: false
        };

        const vResult: VerificationResult = {
          fileName: file.name,
          invoiceNumber: extracted.invoiceNumber || '#######',
          foundInExcel: !!match,
          mismatches,
          originalData: match,
          extractedData: extractedData
        };

        setVerificationResults(prev => [...prev, vResult]);
        // ALSO update results so it can be exported and viewed in Analysis mode
        setResults(prev => [...prev, extractedData]);
      } catch (error: any) {
        // Silently skip or handle error in UI results
        const errorData: InvoiceData = { 
          id: Date.now() + Math.random(),
          fileName: file.name,
          invoiceNumber: 'خطأ',
          date: '#######',
          plateNumber: '#######',
          count: '#######',
          carType: '#######',
          branch: '#######',
          itemsDescription: '#######',
          subTotal: 0,
          taxAmount: 0,
          totalAmount: 0,
          notes: '',
          status: 'error',
          error: error.message || String(error)
        };
        const vResult: VerificationResult = {
          fileName: file.name,
          invoiceNumber: 'خطأ',
          foundInExcel: false,
          mismatches: ['فشل في تحليل الملف'],
          extractedData: errorData
        };
        setVerificationResults(prev => [...prev, vResult]);
        setResults(prev => [...prev, errorData]);
      } finally {
        setState(prev => ({ 
          ...prev, 
          processed: prev.processed + 1,
        }));
        await processNext();
      }
    };

    const workers = Array(Math.min(CONCURRENCY_LIMIT, pdfs.length))
      .fill(null)
      .map(() => processNext());

    await Promise.all(workers);
    setState(prev => ({ ...prev, isProcessing: false }));
  };

  const handleExport = () => {
    if (results.length === 0) return;
    
    // Auto-save if there are pending edits in the current view
    if (selectedInvoice && hasChanges) {
      handleSaveEdit();
    }
    
    console.log("Exporting with results:", results);
    exportToExcel(results, template || undefined);
  };

  return (
    <div className="min-h-screen p-4 md:p-12 transition-all duration-700">
      <header className="max-w-7xl mx-auto mb-16 text-center">
        <motion.div
          initial={{ y: -30, opacity: 0 }}
          animate={{ y: 0, opacity: 1 }}
          className="inline-block"
        >
          <div className="bg-white/30 backdrop-blur-md px-6 py-2 rounded-full border border-white/20 mb-6 inline-flex items-center gap-2 shadow-sm">
            <span className="w-2 h-2 bg-accent rounded-full animate-pulse" />
            <span className="text-[11px] font-black uppercase tracking-[0.3em] text-slate-500">نظام تحليل البيانات المتقدم</span>
          </div>
          <h1 className="text-5xl md:text-8xl font-black mb-6 tracking-tighter text-slate-900 leading-[1.1]">
            فاتورتي <span className="text-gradient">الذكية</span>
          </h1>
          <p className="text-slate-500 text-xl font-medium max-w-2xl mx-auto leading-relaxed">
            أتمتة تحليل الفواتير بدقة فائقة باستخدام الذكاء الاصطناعي، مصمم لرفع كفاءة أعمالك المالية.
          </p>
        </motion.div>
      </header>

      <main className="max-w-7xl mx-auto grid grid-cols-1 lg:grid-cols-12 gap-8">
        {/* Sidebar Controls */}
        <div className="lg:col-span-4 space-y-6">
          {/* Mode Switcher */}
          <div className="flex bg-slate-100 p-1 rounded-xl border border-slate-200 shadow-sm print:hidden">
            <button 
              onClick={() => setState(prev => ({ ...prev, mode: AppMode.ANALYSIS }))}
              className={cn(
                "flex-1 py-3 px-2 rounded-lg font-bold text-[13px] transition-all flex items-center justify-center gap-1",
                state.mode === AppMode.ANALYSIS ? "bg-white text-slate-800 shadow-sm" : "text-slate-500 hover:bg-slate-200"
              )}
            >
              <FileUp className="w-3.5 h-3.5" />
              تحليل واستخراج
            </button>
            <button 
              onClick={() => setState(prev => ({ ...prev, mode: AppMode.VERIFICATION }))}
              className={cn(
                "flex-1 py-3 px-2 rounded-lg font-bold text-[13px] transition-all flex items-center justify-center gap-1",
                state.mode === AppMode.VERIFICATION ? "bg-white text-slate-800 shadow-sm" : "text-slate-500 hover:bg-slate-200"
              )}
            >
              <CheckCircle2 className="w-3.5 h-3.5" />
              مطابقة وتدقيق
            </button>
            <button 
              onClick={() => setState(prev => ({ ...prev, mode: AppMode.REPORT }))}
              className={cn(
                "flex-1 py-3 px-2 rounded-lg font-bold text-[13px] transition-all flex items-center justify-center gap-1",
                state.mode === AppMode.REPORT ? "bg-white text-slate-800 shadow-sm" : "text-slate-500 hover:bg-slate-200"
              )}
            >
              <Layout className="w-3.5 h-3.5" />
              ترتيب الجدول
            </button>
          </div>

          {state.mode === AppMode.REPORT ? (
            <motion.section 
              initial={{ opacity: 0, scale: 0.95 }}
              animate={{ opacity: 1, scale: 1 }}
              className="card-premium p-8 space-y-6"
            >
              <div className="space-y-4 text-right">
                <div className="bg-slate-900 p-5 rounded-2xl flex items-center gap-3 mb-2 shadow-lg">
                  <div className="w-12 h-12 bg-accent rounded-xl flex items-center justify-center text-white shadow-inner">
                    <Layout className="w-7 h-7" />
                  </div>
                  <div>
                    <h2 className="font-black text-xl text-white leading-tight">تنسيق التقرير</h2>
                    <p className="text-[10px] text-slate-400 font-bold tracking-widest uppercase">تجهيز الجدول النهائي للإرسال</p>
                  </div>
                </div>
                
                <div className="p-4 bg-slate-50 rounded-xl border border-slate-100 space-y-4">
                  {/* Step 1: Excel Integration */}
                  <div className="space-y-2">
                    <label className="text-[11px] font-black text-slate-400 uppercase flex items-center gap-1 mr-1">
                      <FileSpreadsheet className="w-3 h-3" /> 1. دمج مع إكسل سابق (اختياري)
                    </label>
                    <div 
                      onClick={() => templateInputRef.current?.click()}
                      className={cn(
                        "group border-2 border-dashed rounded-xl p-4 text-center cursor-pointer transition-all duration-300",
                        template 
                          ? "border-green-500 bg-green-50/50" 
                          : "border-slate-200 hover:border-accent/40 bg-white"
                      )}
                    >
                      <input 
                        type="file" 
                        accept=".xlsx,.xls" 
                        className="hidden" 
                        ref={templateInputRef}
                        onChange={handleTemplateUpload}
                      />
                      {template ? (
                        <div className="flex items-center justify-center gap-3 text-green-600">
                          <CheckCircle2 className="w-6 h-6 flex-shrink-0" />
                          <div className="text-right truncate">
                            <div className="font-bold text-xs truncate max-w-[150px]">{template.name}</div>
                            <div className="text-[9px] opacity-70">تم التوافق مع {template.existingData.length} سجل</div>
                          </div>
                        </div>
                      ) : (
                        <div className="flex flex-col items-center gap-1">
                          <FileSpreadsheet className="w-5 h-5 text-slate-300 group-hover:text-accent transition-colors" />
                          <span className="text-[10px] font-bold text-slate-500">اختر الملف للإلحاق بالنتائج</span>
                        </div>
                      )}
                    </div>
                  </div>

                  {/* Step 2: Template Selection */}
                  <div className="space-y-2">
                    <label className="text-[11px] font-black text-slate-400 uppercase flex items-center gap-1 mr-1">
                      <Palette className="w-3 h-3" /> 2. مظهر الجدول (القوالب)
                    </label>
                    <div className="grid grid-cols-1 gap-2">
                      {[
                        { id: TableTemplate.MODERN, name: 'التصميم العصري', desc: 'نظيف | ألوان حيوية' },
                        { id: TableTemplate.CLASSIC, name: 'التصميم الكلاسيكي', desc: 'رسمي | طباعة واضحة' },
                        { id: TableTemplate.CORPORATE, name: 'تصميم الشركات', desc: 'فخم | تفاصيل مكتملة' },
                      ].map(tmpl => (
                        <button
                          key={tmpl.id}
                          onClick={() => setCurrentTemplate(tmpl.id)}
                          className={cn(
                            "p-3 rounded-xl border-2 text-right transition-all flex items-center justify-between",
                            currentTemplate === tmpl.id 
                              ? "border-accent bg-white shadow-md ring-1 ring-accent/20" 
                              : "border-transparent bg-slate-200/30 hover:bg-slate-200/50"
                          )}
                        >
                          <div>
                            <div className={cn(
                              "font-bold text-xs",
                              currentTemplate === tmpl.id ? "text-accent" : "text-slate-700"
                            )}>{tmpl.name}</div>
                            <div className="text-[9px] text-slate-500">{tmpl.desc}</div>
                          </div>
                          {currentTemplate === tmpl.id && <CheckCircle2 className="w-4 h-4 text-accent" />}
                        </button>
                      ))}
                    </div>
                  </div>
                </div>
              </div>
              
              <div className="space-y-3">
                <button 
                  onClick={() => {
                    if (results.length > 0) {
                      // Finalization effect
                      const btn = document.getElementById('finalize-btn');
                      if (btn) {
                        const originalText = btn.innerHTML;
                        btn.innerHTML = '<span class="animate-pulse">جاري الاستخراج...</span>';
                        setTimeout(() => {
                          handleExport();
                          btn.innerHTML = originalText;
                        }, 1500);
                      } else {
                        handleExport();
                      }
                    } else {
                      alert('يرجى معالجة بعض الفواتير أولاً للحصول على نتائج');
                    }
                  }}
                  id="finalize-btn"
                  disabled={results.length === 0}
                  className="w-full relative overflow-hidden group flex items-center justify-center gap-3 p-5 bg-accent text-white rounded-2xl font-black text-xl hover:bg-accent/90 transition-all shadow-2xl shadow-accent/30 hover:scale-[1.02] active:scale-95 disabled:opacity-50 disabled:grayscale"
                >
                  <div className="absolute inset-0 bg-white/20 translate-x-[-100%] group-hover:translate-x-[100%] transition-transform duration-700 skew-x-[45deg]" />
                  <FileDown className="w-7 h-7" />
                  <span>ابدأ الآن واستخرج النتائج</span>
                </button>
                
                <button 
                  onClick={() => window.print()}
                  className="w-full flex items-center justify-center gap-2 py-3 text-slate-400 font-bold text-sm hover:text-slate-600 transition-colors border-t border-slate-100 mt-2"
                >
                  <Printer className="w-4 h-4" />
                  معاينة الطباعة (PDF)
                </button>
              </div>
            </motion.section>
          ) : (
            <>
              {/* Upload PDFs */}
              <section className="card-premium p-8 space-y-6">
            <h2 className="font-bold text-xl flex items-center gap-2">
              <FileUp className="w-5 h-5 text-accent" />
              رفع الفواتير (PDF)
            </h2>
            <div 
              onClick={() => pdfInputRef.current?.click()}
              onDragOver={onDragOver}
              onDragLeave={onDragLeave}
              onDrop={onDrop}
              className={cn(
                "border-2 border-dashed rounded-lg p-8 text-center cursor-pointer transition-all duration-200",
                isDragging 
                  ? "border-accent bg-accent/10 scale-[1.02]" 
                  : "border-primary/20 hover:bg-black/5"
              )}
            >
              <input 
                type="file" 
                multiple 
                accept="application/pdf,.pdf" 
                className="hidden" 
                ref={pdfInputRef}
                onChange={handlePdfUpload}
              />
              <FileUp className="w-10 h-10 mx-auto mb-2 text-gray-400" />
              <p className="text-sm font-medium">اسحب الملفات هنا أو اضغط للرفع</p>
              <p className="text-xs text-gray-500 mt-1">يمكنك رفع حتى 300 فاتورة</p>
            </div>
            {pdfs.length > 0 && (
              <div className="space-y-2">
                <div className="flex items-center justify-between text-sm bg-accent/5 p-2 rounded border border-accent/10">
                  <span className="font-bold">{pdfs.length} ملف تم اختياره</span>
                  <button onClick={() => setPdfs([])} className="text-red-400 hover:text-red-600 text-xs font-bold transition-colors">مسح الكل</button>
                </div>
                <div className="max-h-40 overflow-y-auto border border-primary/5 rounded bg-gray-50/50 p-2 space-y-1">
                  {pdfs.map((file, idx) => (
                    <div key={idx} className="flex items-center justify-between text-[11px] text-gray-600 bg-white p-1 px-2 rounded border border-primary/5">
                      <span className="truncate flex-1">{file.name}</span>
                      <button 
                        onClick={() => setPdfs(prev => prev.filter((_, i) => i !== idx))}
                        className="text-gray-400 hover:text-red-500 mr-2"
                      >
                        <Trash2 className="w-3 h-3" />
                      </button>
                    </div>
                  ))}
                </div>
              </div>
            )}
          </section>

          {/* Upload Template */}
      <section className="card-premium p-8 space-y-6">
            <h2 className="font-bold text-xl flex items-center gap-2">
              <FileSpreadsheet className="w-5 h-5 text-accent" />
              ملف البيانات السابق (إضافة)
            </h2>
            <div 
              onClick={() => templateInputRef.current?.click()}
              className={cn(
                "border-2 border-dashed rounded-lg p-4 text-center cursor-pointer transition-colors",
                template ? "border-green-500 bg-green-50" : "border-primary/20 hover:bg-black/5"
              )}
            >
              <input 
                type="file" 
                accept=".xlsx,.xls" 
                className="hidden" 
                ref={templateInputRef}
                onChange={handleTemplateUpload}
              />
              {template ? (
                <div className="flex items-center justify-center gap-2 text-green-700">
                  <CheckCircle2 className="w-5 h-5" />
                  <div className="text-right">
                    <div className="font-bold">تم رفع الملف</div>
                    <div className="text-[10px] opacity-70">يحتوي على {template.existingData.length} سجل سابق</div>
                  </div>
                </div>
              ) : (
                <p className="text-sm">اضغط لرفع ملف Excel موجود للإضافة عليه</p>
              )}
            </div>
            {template && (
              <div className="text-xs text-gray-500">
                الأعمدة المكتشفة: {template.headers.slice(0, 5).join('، ')}...
              </div>
            )}
          </section>

          {/* Action Buttons */}
          <div className="space-y-3">
            {!state.isProcessing ? (
              <div className="flex gap-2">
                <button 
                  onClick={state.mode === AppMode.ANALYSIS ? startProcessing : startVerification}
                  disabled={pdfs.length === 0 || (state.mode === AppMode.VERIFICATION && !template)}
                  className="btn-premium flex-1"
                >
                  <Play className="w-5 h-5" />
                  {state.mode === AppMode.ANALYSIS ? 'ابدأ المعالجة الذكية' : 'ابدأ المطابقة والتدقيق'}
                </button>
                {(results.length > 0 || pdfs.length > 0) && (
                  <button 
                    onClick={() => {
                      setResults([]);
                      setPdfs([]);
                      setVerificationResults([]);
                    }}
                    className="w-14 h-14 flex items-center justify-center bg-slate-100 text-slate-400 hover:bg-red-50 hover:text-red-500 rounded-2xl transition-all border border-slate-200"
                    title="مسح الكل"
                  >
                    <Trash2 className="w-5 h-5" />
                  </button>
                )}
              </div>
            ) : (
              <button 
                onClick={stopProcessing}
                className="card-brutal w-full flex items-center justify-center gap-2 h-14 font-bold bg-white text-red-500 border-red-200 hover:bg-red-50 animate-pulse"
              >
                <XCircle className="w-5 h-5" />
                إلغاء المعالجة
              </button>
            )}
            
            <button 
              onClick={handleExport}
              disabled={results.length === 0 || state.isProcessing}
              className="card-brutal w-full flex items-center justify-center gap-2 h-14 font-bold disabled:opacity-50"
            >
              <Download className="w-5 h-5" />
              تحميل ملف Excel النتائج
            </button>
          </div>

          {/* Billing & Limits Section */}
          <section className="glass-morphic p-8 border-dashed border-accent/30 space-y-4">
            <div className="flex items-center gap-2 text-accent font-bold">
              <Clock className="w-5 h-5" />
              <span>الحدود والاشتراك</span>
            </div>
            <p className="text-xs text-gray-600 leading-relaxed">
              لمعالجة أكثر من 15 فاتورة في الدقيقة وبدقة عالية، يرجى التأكد من تفعيل الدفع حسب الاستخدام (Pay-as-you-go).
            </p>
            <a 
              href="https://console.cloud.google.com/billing/01B742-F60ACF-47E72F/payment?hl=en" 
              target="_blank" 
              rel="noreferrer"
              className="flex items-center justify-center gap-2 w-full p-3 bg-white border border-accent text-accent rounded font-bold hover:bg-accent hover:text-white transition-all text-sm"
            >
              <Download className="w-4 h-4 rotate-180" />
              إضافة رصيد / شحن المحفظة
            </a>
          </section>
        </>
      )}
    </div>

        {/* Results Area */}
        <div className="lg:col-span-8 flex flex-col gap-6">
          {/* Progress Section */}
          <AnimatePresence>
            {state.isProcessing && (
              <motion.section 
                initial={{ opacity: 0, y: 20 }}
                animate={{ opacity: 1, y: 0 }}
                exit={{ opacity: 0, scale: 0.95 }}
                className="bg-primary text-white rounded-2xl p-6 shadow-lg border border-primary/20"
              >
                <div className="flex justify-between items-center mb-4">
                  <div className="space-y-1">
                    <h3 className="font-bold text-lg text-white">جاري معالجة الفواتير...</h3>
                    <p className="text-xs text-white/70 font-mono truncate max-w-[200px]">
                      بانتظار: {currentFileName || 'بدء المعالجة...'}
                    </p>
                  </div>
                  <div className="text-right">
                    <span className="text-2xl font-black text-white">{Math.round((state.processed / state.total) * 100)}%</span>
                    <p className="text-[10px] uppercase opacity-50 text-white/70">التقدم الإجمالي</p>
                  </div>
                </div>
                
                <div className="relative w-full bg-white/10 h-3 rounded-full overflow-hidden backdrop-blur-sm border border-white/5">
                  <motion.div 
                    className="bg-white h-full"
                    initial={{ width: 0 }}
                    animate={{ width: `${(state.processed / state.total) * 100}%` }}
                    transition={{ type: "spring", stiffness: 50 }}
                  />
                </div>
                
                <div className="flex justify-between mt-3 text-[11px] font-bold text-white/80">
                  <span className="flex items-center gap-1">
                    <CheckCircle2 className="w-3 h-3 text-white" />
                    تمت معالجة {state.processed} فاتورة
                  </span>
                  <span>المتبقي: {state.total - state.processed} فاتورة</span>
                </div>
              </motion.section>
            )}
          </AnimatePresence>

          {/* Results Table */}
          <section className={cn(
            "card-premium flex-1 overflow-hidden flex flex-col transition-all duration-500",
            state.mode === AppMode.REPORT && "shadow-2xl border-slate-200"
          )}>
            <div className="p-4 border-b border-slate-100 bg-slate-50/50 flex justify-between items-center print:hidden">
              <h3 className="font-bold text-slate-700">
                {state.mode === AppMode.ANALYSIS ? 'نتائج التحليل' : 
                 state.mode === AppMode.VERIFICATION ? 'نتائج المطابقة والتدقيق' : 'معاينة التقرير النهائي'}
              </h3>
              {state.mode === AppMode.ANALYSIS ? (
                <div className="text-sm font-mono flex gap-4">
                  <span className="flex items-center gap-1"><CheckCircle2 className="w-4 h-4 text-green-500"/> {results.filter(r => r.status === 'completed').length}</span>
                  <span className="flex items-center gap-1"><AlertCircle className="w-4 h-4 text-red-500"/> {results.filter(r => r.status === 'error').length}</span>
                </div>
              ) : state.mode === AppMode.VERIFICATION ? (
                <div className="text-sm font-mono flex gap-4">
                  <span className="flex items-center gap-1 text-green-600 font-bold">متطابق: {verificationResults.filter(r => r.foundInExcel && r.mismatches.length === 0).length}</span>
                  <span className="flex items-center gap-1 text-red-600 font-bold">أخطاء: {verificationResults.filter(r => r.mismatches.length > 0).length}</span>
                  <span className="flex items-center gap-1 text-orange-600 font-bold">غير موجود: {verificationResults.filter(r => !r.foundInExcel).length}</span>
                </div>
              ) : (
                <div className="flex items-center gap-2 text-xs font-bold text-accent px-3 py-1 bg-accent/5 rounded-full">
                  <Layout className="w-3 h-3" />
                  قالب النشط: {currentTemplate}
                </div>
              )}
            </div>
            
            <div className="overflow-auto flex-1 max-h-[700px] bg-white">
              {state.mode === AppMode.REPORT ? (
                <div className={cn(
                  "p-8 transition-all w-fit min-w-full",
                  currentTemplate === TableTemplate.MODERN && "bg-white",
                  currentTemplate === TableTemplate.CLASSIC && "bg-slate-50",
                  currentTemplate === TableTemplate.CORPORATE && "bg-white"
                )}>
                  {/* Report Header (Business Context) */}
                  <div className="mb-12 flex justify-between items-start border-b-4 border-slate-900 pb-8">
                    <div className="text-right">
                      <h2 className="text-4xl font-black text-slate-900 mb-2">كشف استخراج الفواتير التفصيلي</h2>
                      <p className="text-lg text-slate-500 font-medium">نظام "فاتورتي الذكية" - تقرير العمليات المنفذة</p>
                      <div className="mt-6 flex gap-8 text-sm text-slate-400 font-bold">
                        <div className="flex flex-col">
                          <span className="text-[10px] text-slate-300 uppercase">تاريخ التقرير</span>
                          <span>{new Date().toLocaleDateString('ar-SA')}</span>
                        </div>
                        <div className="flex flex-col border-r pr-8">
                          <span className="text-[10px] text-slate-300 uppercase">إجمالي المستندات</span>
                          <span>{results.length} فاتورة</span>
                        </div>
                      </div>
                    </div>
                    <div className="flex flex-col items-center gap-2">
                       <div className="w-24 h-24 bg-accent rounded-3xl flex items-center justify-center text-white font-black text-4xl shadow-2xl shadow-accent/30 transform rotate-3">
                        ف
                      </div>
                      <span className="text-[10px] font-black text-accent tracking-[0.2em]">SMART SCAN</span>
                    </div>
                  </div>

                  <table className={cn(
                    "w-full text-right transition-all border-collapse table-auto",
                    currentTemplate === TableTemplate.MODERN && "text-slate-700",
                    currentTemplate === TableTemplate.CLASSIC && "border-2 border-slate-800",
                    currentTemplate === TableTemplate.CORPORATE && "shadow-2xl border border-slate-200"
                  )}>
                    <thead className={cn(
                      currentTemplate === TableTemplate.MODERN && "bg-slate-900 text-white",
                      currentTemplate === TableTemplate.CLASSIC && "bg-slate-800 text-white border-2 border-slate-800",
                      currentTemplate === TableTemplate.CORPORATE && "bg-slate-50 text-slate-900 border-b-2 border-slate-200"
                    )}>
                      <tr>
                        <th className="p-5 text-sm font-black uppercase tracking-wider border-l border-white/10 w-16 text-center">م</th>
                        <th className="p-5 text-sm font-black uppercase tracking-wider border-l border-white/10 whitespace-nowrap">تاريخ الفاتورة</th>
                        <th className="p-5 text-sm font-black uppercase tracking-wider border-l border-white/10 whitespace-nowrap">رقم الفاتورة</th>
                        <th className="p-5 text-sm font-black uppercase tracking-wider border-l border-white/10 whitespace-nowrap">رقم اللوحة</th>
                        <th className="p-5 text-sm font-black uppercase tracking-wider border-l border-white/10 whitespace-nowrap">قراءة العداد</th>
                        <th className="p-5 text-sm font-black uppercase tracking-wider border-l border-white/10">نوع السيارة والموديل</th>
                        <th className="p-5 text-sm font-black uppercase tracking-wider whitespace-nowrap">المبلغ شامل الضريبة</th>
                      </tr>
                    </thead>
                    <tbody className={cn(
                      currentTemplate === TableTemplate.MODERN && "divide-y-2 divide-slate-100",
                      currentTemplate === TableTemplate.CLASSIC && "divide-y divide-slate-800",
                      currentTemplate === TableTemplate.CORPORATE && "divide-y divide-slate-100"
                    )}>
                      {results.length === 0 ? (
                        <tr>
                          <td colSpan={7} className="p-32 text-center text-slate-300">
                             <div className="flex flex-col items-center gap-4">
                               <FileText className="w-16 h-16 opacity-10" />
                               <p className="text-xl font-bold italic">في انتظار معالجة البيانات للعرض...</p>
                             </div>
                          </td>
                        </tr>
                      ) : (
                        results.map((item, idx) => (
                          <tr 
                            key={idx}
                            className={cn(
                              "transition-all",
                              currentTemplate === TableTemplate.MODERN && "hover:bg-accent/5",
                              currentTemplate === TableTemplate.CLASSIC && idx % 2 === 0 ? "bg-white" : "bg-slate-200/30",
                              currentTemplate === TableTemplate.CORPORATE && "odd:bg-white even:bg-slate-50/50 hover:bg-slate-100"
                            )}
                          >
                            <td className="p-5 text-sm font-black font-mono text-center border-l border-slate-100 opacity-40">{idx + 1}</td>
                            <td className="p-5 text-base font-bold whitespace-nowrap">{item.date}</td>
                            <td className="p-5 text-base font-black font-mono text-accent tracking-tighter whitespace-nowrap">{item.invoiceNumber}</td>
                            <td className="p-5 text-base font-bold whitespace-nowrap">{item.plateNumber}</td>
                            <td className="p-5 text-base font-bold whitespace-nowrap font-mono">{item.count}</td>
                            <td className="p-5 text-base leading-relaxed font-semibold min-w-[250px]">{item.carType}</td>
                            <td className={cn(
                              "p-5 text-lg font-black whitespace-nowrap text-left",
                              currentTemplate === TableTemplate.CORPORATE ? "bg-slate-900 text-white rounded-l-lg" : "text-slate-900 border-r border-slate-100"
                            )}>
                              {item.totalAmount} <span className="text-[10px] font-bold opacity-60 mr-1">ر.س</span>
                            </td>
                          </tr>
                        ))
                      )}
                    </tbody>
                  </table>
                  
                  {/* Summary Footer */}
                  <div className="mt-12 flex justify-end items-center gap-16 text-right">
                    <div className="bg-slate-50 p-6 rounded-2xl border border-slate-100">
                      <p className="text-xs text-slate-400 font-black uppercase mb-1">صافي القيمة المستخرجة</p>
                      <p className="text-3xl font-black text-slate-900">
                        {results.reduce((acc, curr) => acc + (Number(curr.subTotal) || 0), 0).toFixed(2)}
                        <span className="text-sm font-bold text-slate-400 mr-2">ر.س</span>
                      </p>
                    </div>
                    <div className="bg-slate-50 p-6 rounded-2xl border border-slate-100">
                       <p className="text-xs text-slate-400 font-black uppercase mb-1">إجمالي ضريبة القيمة المضافة</p>
                       <p className="text-3xl font-black text-slate-600">
                        {results.reduce((acc, curr) => acc + (Number(curr.taxAmount) || 0), 0).toFixed(2)}
                        <span className="text-sm font-bold text-slate-400 mr-2">ر.س</span>
                      </p>
                    </div>
                    <div className="bg-accent p-8 rounded-3xl shadow-2xl shadow-accent/40 transform -rotate-1">
                      <p className="text-xs text-white/70 font-black uppercase mb-1">الإجمالي الكلي النهائي</p>
                      <p className="text-4xl font-black text-white">
                        {results.reduce((acc, curr) => acc + (Number(curr.totalAmount) || 0), 0).toFixed(2)}
                        <span className="text-base font-bold text-white/60 mr-2">ريال سعودي</span>
                      </p>
                    </div>
                  </div>

                  <div className="mt-20 pt-10 border-t border-slate-100 flex justify-between text-[10px] text-slate-300 font-bold uppercase tracking-widest">
                    <span>مركز الحلول الذكية - جميع الحقوق محفوظة</span>
                    <span>نسخة التقرير رقم: {Math.random().toString(36).substring(7).toUpperCase()}</span>
                    <span>برمجية أتمتة الذكاء الاصطناعي</span>
                  </div>
                </div>
              ) : state.mode === AppMode.ANALYSIS ? (
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
                  {results.length === 0 ? (
                    <tr>
                      <td colSpan={7} className="p-12 text-center text-gray-400">
                        <FileText className="w-12 h-12 mx-auto mb-4 opacity-10" />
                        لا توجد نتائج حتى الآن. ابدأ برفع الملفات.
                      </td>
                    </tr>
                  ) : (
                    results.map((item, idx) => (
                      <motion.tr 
                        initial={{ opacity: 0 }}
                        animate={{ opacity: 1 }}
                        key={idx} 
                        className={cn(
                          "hover:bg-primary/5 transition-colors cursor-default transition-all duration-200",
                          item.status === 'error' && "bg-red-50",
                          item.isFinished && "bg-green-100/50 hover:bg-green-100/80"
                        )}
                        title={item.error}
                        onDoubleClick={() => toggleRowCompletion(item.id || item.fileName)}
                      >
                        <td className="p-3 text-sm font-mono border-l border-primary/5">
                          <div className="flex flex-col gap-0.5">
                            <span>{idx + 1}</span>
                            {trainedLayouts[item.fileName] && (
                              <span className="text-[7px] font-black bg-green-100 text-green-600 px-1 rounded-sm w-fit">تدريب</span>
                            )}
                          </div>
                        </td>
                        <td className="p-3 text-sm border-l border-primary/5">{item.date}</td>
                        <td className="p-3 text-sm font-mono border-l border-primary/5">{item.invoiceNumber}</td>
                        <td className="p-3 text-sm border-l border-primary/5">{item.plateNumber}</td>
                        <td className="p-3 text-sm border-l border-primary/5">{item.count}</td>
                        <td className="p-3 text-sm border-l border-primary/5">{item.carType}</td>
                        <td className="p-3 text-sm font-bold border-l border-primary/5">{item.totalAmount}</td>
                        <td className="p-3 text-sm">
                          <button 
                            onClick={() => setSelectedInvoice(item)}
                            className="p-1 hover:bg-primary hover:text-white rounded transition-colors"
                          >
                            <Eye className="w-4 h-4" />
                          </button>
                        </td>
                      </motion.tr>
                    ))
                  )}
                </tbody>
              </table>
              ) : (
                <table className="w-full text-right">
                <thead className="bg-slate-50 sticky top-0 z-10 border-b border-slate-100">
                  <tr>
                    <th className="p-3 text-xs font-bold uppercase tracking-wider border-l border-slate-100 text-slate-500">الملف</th>
                    <th className="p-3 text-xs font-bold uppercase tracking-wider border-l border-slate-100 text-slate-500">الحالة</th>
                    <th className="p-3 text-xs font-bold uppercase tracking-wider border-l border-slate-100 text-slate-500">رقم الفاتورة</th>
                    <th className="p-3 text-xs font-bold uppercase tracking-wider border-l border-slate-100 text-slate-500">الاختلافات المكتشفة</th>
                    <th className="p-3 text-xs font-bold uppercase tracking-wider text-slate-500">عرض</th>
                  </tr>
                </thead>
                <tbody className="divide-y divide-primary/5">
                  {verificationResults.length === 0 ? (
                    <tr>
                      <td colSpan={5} className="p-12 text-center text-gray-400">
                        <FileText className="w-12 h-12 mx-auto mb-4 opacity-10" />
                        قم برفع الإكسل والفواتير ثم اضغط "ابدأ المطابقة".
                      </td>
                    </tr>
                  ) : (
                    verificationResults.map((item, idx) => (
                      <motion.tr 
                        initial={{ opacity: 0 }}
                        animate={{ opacity: 1 }}
                        key={idx} 
                        className={cn(
                          "hover:bg-gray-50 transition-colors cursor-default",
                          item.extractedData?.isFinished ? "bg-green-100/50 hover:bg-green-100/80" : (!item.foundInExcel ? "bg-orange-50" : (item.mismatches.length > 0 ? "bg-red-50" : "bg-green-50/30"))
                        )}
                        title={item.extractedData?.error}
                        onDoubleClick={() => toggleRowCompletion(item.extractedData?.id || item.fileName)}
                      >
                        <td className="p-3 text-sm border-l border-primary/5 truncate max-w-[200px]">{item.fileName}</td>
                        <td className="p-3 text-sm border-l border-primary/5">
                          {!item.foundInExcel ? (
                            <span className="text-orange-600 font-bold flex items-center gap-1"><AlertCircle className="w-3 h-3"/> غير موجود في الإكسل</span>
                          ) : item.mismatches.length > 0 ? (
                            <span className="text-red-600 font-bold flex items-center gap-1"><XCircle className="w-3 h-3"/> يوجد اختلاف</span>
                          ) : (
                            <span className="text-green-600 font-bold flex items-center gap-1"><CheckCircle2 className="w-3 h-3"/> متطابق تماماً</span>
                          )}
                        </td>
                        <td className="p-3 text-sm font-mono border-l border-primary/5">{item.invoiceNumber}</td>
                        <td className="p-3 text-sm font-bold text-red-500 border-l border-primary/5">
                          {item.mismatches.length > 0 ? item.mismatches.join('، ') : '—'}
                        </td>
                        <td className="p-3 text-sm">
                          <button 
                            onClick={() => setSelectedInvoice(item.extractedData || null)}
                            className="p-1 hover:bg-primary hover:text-white rounded transition-colors"
                          >
                            <Eye className="w-4 h-4" />
                          </button>
                        </td>
                      </motion.tr>
                    ))
                  )}
                </tbody>
              </table>
              )}
            </div>
          </section>
        </div>
      </main>

      <footer className="mt-12 text-center text-gray-400 text-sm pb-8">
        <p>تم التطوير لضمان أقصى درجات الخصوصية والأداء. يتم تحليل البيانات لحظياً ولا تُخزن في أي قواعد بيانات خارجية.</p>
      </footer>

      {/* Preview Modal */}
      <AnimatePresence>
        {selectedInvoice && (
          <div className="fixed inset-0 z-50 flex items-center justify-center p-4">
            <motion.div 
              initial={{ opacity: 0 }}
              animate={{ opacity: 1 }}
              exit={{ opacity: 0 }}
              onClick={() => setSelectedInvoice(null)}
              className="absolute inset-0 bg-black/60 backdrop-blur-sm"
            />
            <motion.div 
              initial={{ scale: 0.9, opacity: 0 }}
              animate={{ scale: 1, opacity: 1 }}
              exit={{ scale: 0.9, opacity: 0 }}
              className="relative w-full max-w-6xl max-h-[90vh] bg-white rounded-[2.5rem] overflow-hidden card-premium flex flex-col md:flex-row-reverse"
            >
              {/* Sidebar Info */}
              <div className="w-full md:w-[340px] bg-white p-8 border-l border-slate-100 overflow-y-auto">
                <div className="flex justify-between items-center mb-6">
                  <h3 className="font-bold text-xl text-slate-800">بيانات الفاتورة</h3>
                  <div className="flex gap-2">
                    {hasChanges && (
                      <motion.button 
                        initial={{ scale: 0, opacity: 0 }}
                        animate={{ scale: 1, opacity: 1 }}
                        onClick={handleSaveEdit}
                        className="p-1 bg-green-500 text-white rounded-full hover:bg-green-600 transition-colors shadow-lg shadow-green-200"
                        title="حفظ التغييرات"
                      >
                        <CheckCircle2 className="w-5 h-5" />
                      </motion.button>
                    )}
                    <button onClick={() => { setSelectedInvoice(null); }} className="p-1 hover:bg-gray-100 rounded text-gray-400 transition-colors">
                      <XCircle className="w-6 h-6" />
                    </button>
                  </div>
                </div>

                <div className="space-y-4 text-right">
                  {Object.entries(FIELD_COLORS).map(([field, colors]) => {
                    if (field === 'totalAmount') return null;
                    const label = field === 'invoiceNumber' ? 'رقم الفاتورة' :
                                field === 'date' ? 'التاريخ' :
                                field === 'plateNumber' ? 'رقم اللوحة' :
                                field === 'count' ? 'العداد' :
                                field === 'carType' ? 'نوع السيارة' :
                                field === 'branch' ? 'المنطقة / الفرع' : 'الأصناف';
                    
                    const value = field === 'itemsDescription' ? editData?.itemsDescription : (editData as any)?.[field];
                    const isVerified = verifiedFields[`${selectedInvoice.fileName}-${field}`];
                    const isSuspicious = value === '#######' || !value;

                    return (
                      <div 
                        key={field}
                        onMouseEnter={() => setHoveredField(field)}
                        onMouseLeave={() => setHoveredField(null)}
                        className={`p-3 ${colors.bg} border ${colors.border} rounded-xl shadow-sm transition-all hover:shadow-md group relative ${hoveredField === field ? 'ring-2 ring-offset-2 ring-transparent' : ''} ${isSuspicious ? 'border-red-400 bg-red-50' : ''}`}
                        style={{ ringColor: colors.solid }}
                      >
                        <div className="flex justify-between items-center mb-1">
                          <p className={`text-[10px] ${isSuspicious ? 'text-red-500' : colors.text} uppercase font-black tracking-widest`}>{label}</p>
                          <div className="flex items-center gap-2">
                            {hoveredField === field && selectedInvoice.locations?.[field] && (
                              <motion.div 
                                initial={{ opacity: 0, x: 20 }}
                                animate={{ opacity: 1, x: 0 }}
                                className="absolute right-[calc(100%+1.5rem)] top-0 z-50 w-64 h-40 rounded-2xl border-4 border-white shadow-[0_20px_50px_rgba(0,0,0,0.3)] overflow-hidden bg-white pointer-events-none hidden lg:block ring-1 ring-black/10"
                              >
                                <div className="absolute top-2 right-2 z-20 bg-black/60 backdrop-blur px-2 py-0.5 rounded text-[8px] text-white font-bold">
                                  معاينة مجهرية
                                </div>
                                <div className="absolute inset-0 z-10 border border-black/5 pointer-events-none" />
                                <div 
                                  className="absolute w-full h-full"
                                  style={{
                                    overflow: 'hidden'
                                  }}
                                >
                                  {previewImage && (
                                    <img 
                                      src={previewImage} 
                                      alt="Zoom"
                                      className="absolute max-w-none"
                                      style={{
                                        width: '800%', // 8x zoom level
                                        height: 'auto',
                                        left: `${-(selectedInvoice.locations[field][1] + (selectedInvoice.locations[field][3] - selectedInvoice.locations[field][1])/2) / 10 * 8 + 50}%`,
                                        top: `${-(selectedInvoice.locations[field][0] + (selectedInvoice.locations[field][2] - selectedInvoice.locations[field][0])/2) / 10 * 8 + 50}%`,
                                        transform: 'translate(-50%, -50%)',
                                        filter: 'contrast(1.1) brightness(1.05)'
                                      }}
                                    />
                                  )}
                                </div>
                                <div className="absolute inset-0 flex items-center justify-center pointer-events-none z-20">
                                  <div className="w-24 h-12 border-2 border-dashed border-red-500 shadow-[0_0_0_9999px_rgba(255,255,255,0.4)] rounded-lg" />
                                </div>
                              </motion.div>
                            )}
                            <button 
                              onClick={(e) => {
                                e.stopPropagation();
                                setVerifiedFields(prev => ({ 
                                  ...prev, 
                                  [`${selectedInvoice.fileName}-${field}`]: !isVerified 
                                }));
                              }}
                              className={cn(
                                "transition-all duration-300",
                                isVerified ? "text-green-500 scale-110" : "text-slate-300 hover:text-slate-400"
                              )}
                            >
                              <CheckCircle2 className={cn("w-4 h-4", isVerified ? "fill-green-50" : "")} />
                            </button>
                          </div>
                        </div>
                        {field === 'itemsDescription' ? (
                          <textarea 
                            value={value || ''} 
                            onChange={(e) => setEditData(prev => prev ? { ...prev, itemsDescription: e.target.value } : null)}
                            className={`w-full text-xs font-bold leading-relaxed ${isSuspicious ? 'text-red-600' : colors.text} bg-transparent outline-none transition-colors text-right min-h-[120px] resize-y`}
                            placeholder="لم يتم العثور على البيانات..."
                          />
                        ) : (
                          <input 
                            type="text" 
                            value={value || ''} 
                            onChange={(e) => {
                              let val = e.target.value;
                              if (field === 'date') {
                                // Strip time if present: e.g. 2024-05-08 10:30 -> 2024-05-08
                                val = val.split(' ')[0];
                              }
                              setEditData(prev => prev ? { ...prev, [field]: val } : null);
                            }}
                            className={`w-full font-black ${isSuspicious ? 'text-red-700' : colors.text} bg-transparent outline-none transition-colors text-right ${field === 'invoiceNumber' ? 'font-mono' : ''}`}
                            placeholder="قيمة مفقودة"
                          />
                        )}
                        {isSuspicious && (
                          <div className="mt-1 flex items-center gap-1 text-[8px] text-red-500 font-bold">
                            <AlertCircle className="w-2 h-2" />
                            تنبيه: البيانات غير مؤكدة
                          </div>
                        )}
                      </div>
                    );
                  })}
                  
                  <div 
                    onMouseEnter={() => setHoveredField('totalAmount')}
                    onMouseLeave={() => setHoveredField(null)}
                    className="p-5 bg-slate-900 text-white rounded-2xl shadow-xl shadow-slate-900/20 transition-all hover:bg-slate-800"
                  >
                    <div className="flex justify-between items-center mb-1">
                      <span className="text-[10px] text-slate-400 font-black tracking-widest uppercase">الإجمالي النهائي</span>
                      <div className="flex items-center gap-1">
                        <input 
                          type="number" 
                          value={editData?.totalAmount || 0} 
                          onChange={(e) => setEditData(prev => prev ? { ...prev, totalAmount: Number(e.target.value) } : null)}
                          className="w-32 text-2xl font-black bg-transparent text-white border-b border-accent outline-none text-left"
                        />
                         <span className="text-accent font-black text-sm">ر.س</span>
                      </div>
                    </div>
                    <div className="flex justify-between items-center text-[10px] text-slate-500 mt-2">
                      <span className="flex items-center gap-1">
                        الضريبة: 
                        <input 
                          type="number" 
                          value={editData?.taxAmount || 0} 
                          onChange={(e) => setEditData(prev => prev ? { ...prev, taxAmount: Number(e.target.value) } : null)}
                          className="w-16 bg-transparent text-white border-b border-white/10 outline-none inline-block text-[10px] text-center"
                        />
                      </span>
                      <span className="flex items-center gap-1">
                        قبل الضريبة: 
                        <input 
                          type="number" 
                          value={editData?.subTotal || 0} 
                          onChange={(e) => setEditData(prev => prev ? { ...prev, subTotal: Number(e.target.value) } : null)}
                          className="w-16 bg-transparent text-white border-b border-white/10 outline-none inline-block text-[10px] text-center"
                        />
                      </span>
                    </div>
                  </div>
                </div>
              </div>

              {/* Document View */}
              <div className="flex-1 bg-gray-200 p-4 overflow-hidden flex flex-col">
                <div className="bg-white/80 backdrop-blur p-2 rounded-t-lg border-x border-t border-black/5 flex justify-between items-center px-4">
                  <div className="flex items-center gap-3">
                    <span className="text-xs font-bold text-gray-500 truncate max-w-[200px]">{selectedInvoice.fileName}</span>
                    {lockedLayouts[selectedInvoice.fileName] ? (
                      <span className="flex items-center gap-1 bg-green-100 text-green-700 px-2 py-0.5 rounded-full text-[9px] font-black animate-pulse">
                        <CheckCircle2 className="w-2 h-2" />
                        تم تدريب النظام
                      </span>
                    ) : masterTemplate && (
                      <span className="flex items-center gap-1 bg-blue-100 text-blue-700 px-2 py-0.5 rounded-full text-[9px] font-black">
                        <Layout className="w-2 h-2" />
                        يستخدم القالب العام
                      </span>
                    )}
                  </div>
                  <div className="flex gap-2">
                    {masterTemplate && !lockedLayouts[selectedInvoice.fileName] && (
                       <button 
                         onClick={applyMasterToAll}
                         className="flex items-center gap-1 text-[10px] bg-blue-600 text-white px-3 py-1 rounded-lg hover:bg-blue-700 transition-all font-black shadow-lg shadow-blue-200"
                       >
                         <Layout className="w-3 h-3" />
                         تطبيق القالب على الكل
                       </button>
                    )}
                    {lockedLayouts[selectedInvoice.fileName] ? (
                      <button 
                        onClick={() => {
                          setLockedLayouts(prev => {
                            const next = { ...prev };
                            delete next[selectedInvoice.fileName];
                            return next;
                          });
                          // Also remove from training dictionary to allow AI to take over again
                          setTrainedLayouts(prev => {
                            const next = { ...prev };
                            delete next[selectedInvoice.fileName];
                            return next;
                          });
                        }}
                        className="text-[10px] bg-red-100 text-red-600 px-3 py-1 rounded-lg hover:bg-red-200 transition-all font-black"
                      >
                        إلغاء القفل والتدريب
                      </button>
                    ) : (
                      <button 
                        onClick={handleSaveLayout}
                        className="flex items-center gap-1 text-[10px] bg-green-600 text-white px-3 py-1 rounded-lg hover:bg-green-700 transition-all font-black shadow-lg shadow-green-200"
                      >
                        <Save className="w-3 h-3" />
                        حفظ التدريب وقفل المربعات
                      </button>
                    )}
                    <button 
                      onClick={() => previewUrl && window.open(previewUrl, '_blank')}
                      className="text-[10px] bg-accent text-white px-2 py-1 rounded hover:bg-opacity-90 transition-all font-bold"
                    >
                      فتح في نافذة جديدة
                    </button>
                    {selectedInvoice.originalFile && (
                      <a 
                        href={previewUrl || '#'} 
                        download={selectedInvoice.fileName}
                        className="text-[10px] bg-primary text-white px-2 py-1 rounded hover:bg-opacity-90 transition-all font-bold"
                      >
                        تحميل الملف
                      </a>
                    )}
                  </div>
                </div>
                <div className="flex-1 bg-white rounded-b-lg overflow-y-auto relative p-4 bg-gray-100 flex flex-col items-center">
                  {isPreviewLoading ? (
                    <div className="flex flex-col items-center justify-center h-full text-primary">
                      <Loader2 className="w-12 h-12 animate-spin mb-4" />
                      <p className="font-bold">جاري تجهيز معاينة الفاتورة...</p>
                    </div>
                  ) : previewImage ? (
                    <div className="relative inline-block mx-auto" ref={imageContainerRef}>
                      <img 
                        src={previewImage} 
                        alt="Invoice Preview" 
                        className="block max-w-[900px] w-full shadow-2xl border border-black/10 transition-transform duration-300 pointer-events-none"
                      />
                      {selectedInvoice.locations && (
                        <div className="absolute inset-0 z-20">
                          {(Object.entries(selectedInvoice.locations) as [string, number[]][]).map(([field, box]) => {
                            if (!box || box.length !== 4) return null;
                            const [ymin, xmin, ymax, xmax] = box;
                            const isHovered = hoveredField === field;
                            const isLocked = lockedLayouts[selectedInvoice.fileName];
                            const fieldColor = FIELD_COLORS[field];
                            if (!fieldColor) return null;

                            return (
                              <motion.div
                                key={field}
                                drag={!isLocked}
                                dragMomentum={false}
                                dragConstraints={imageContainerRef}
                                onDragEnd={(_, info) => {
                                  if (!imageContainerRef.current) return;
                                  const rect = imageContainerRef.current.getBoundingClientRect();
                                  
                                  // Current visual position in percentage (0-100)
                                  const currentVisualXPercent = xmin / 10;
                                  const currentVisualYPercent = ymin / 10;
                                  
                                  // Movement in screen pixels converted to percentage of image width/height
                                  const deltaXPercent = (info.offset.x / rect.width) * 100;
                                  const deltaYPercent = (info.offset.y / rect.height) * 100;
                                  
                                  const newXminPercent = currentVisualXPercent + deltaXPercent;
                                  const newYminPercent = currentVisualYPercent + deltaYPercent;
                                  
                                  const width = xmax - xmin;
                                  const height = ymax - ymin;
                                  
                                  // Convert back to 0-1000 scale
                                  const finalXmin = Math.max(0, Math.min(1000 - width, newXminPercent * 10));
                                  const finalYmin = Math.max(0, Math.min(1000 - height, newYminPercent * 10));
                                  
                                  handleUpdateLocation(field, [
                                    Math.round(finalYmin),
                                    Math.round(finalXmin),
                                    Math.round(finalYmin + height),
                                    Math.round(finalXmin + width)
                                  ]);
                                }}
                                onMouseEnter={() => setHoveredField(field)}
                                onMouseLeave={() => setHoveredField(null)}
                                initial={{ opacity: 0 }}
                                animate={{ 
                                  opacity: isHovered ? 1 : (hoveredField ? 0.02 : 0.45),
                                  scale: isHovered ? 1.05 : 1,
                                  zIndex: isHovered ? 50 : 10,
                                  borderWidth: isHovered ? '4px' : '2px',
                                  cursor: 'grab'
                                }}
                                whileDrag={{ cursor: 'grabbing', scale: 1.1, zIndex: 60 }}
                                transition={{ type: 'spring', stiffness: 300, damping: 30 }}
                                className="pointer-events-auto"
                                style={{
                                  position: 'absolute',
                                  top: `${ymin / 10}%`,
                                  left: `${xmin / 10}%`,
                                  height: `${(ymax - ymin) / 10}%`,
                                  width: `${(xmax - xmin) / 10}%`,
                                  backgroundColor: isHovered ? fieldColor.highlight.replace('0.5', '0.35') : 'transparent',
                                  borderColor: isHovered ? 'white' : fieldColor.solid,
                                  boxShadow: isHovered 
                                    ? `0 0 0 4px ${fieldColor.solid}, 0 0 40px ${fieldColor.solid}/60` 
                                    : `inset 0 0 0 1px ${fieldColor.solid}/30`,
                                  borderRadius: '2px',
                                }}
                              >
                                {isHovered && (
                                  <motion.div 
                                    initial={{ y: 10, opacity: 0 }}
                                    animate={{ y: 0, opacity: 1 }}
                                    className="absolute -top-10 left-1/2 -translate-x-1/2 px-3 py-1.5 rounded-lg text-[10px] font-black text-white whitespace-nowrap shadow-2xl flex items-center gap-2 ring-2 ring-white select-none"
                                    style={{ backgroundColor: fieldColor.solid }}
                                  >
                                    {isLocked ? (
                                      <Save className="w-3 h-3 text-white/80" />
                                    ) : (
                                      <Move className="w-3 h-3" />
                                    )}
                                    {field === 'invoiceNumber' && 'رقم الفاتورة'}
                                    {field === 'date' && 'التاريخ'}
                                    {field === 'plateNumber' && 'رقم اللوحة'}
                                    {field === 'count' && 'العداد'}
                                    {field === 'carType' && 'نوع السيارة'}
                                    {field === 'branch' && 'الفرع'}
                                    {field === 'itemsDescription' && 'الأصناف'}
                                    {field === 'totalAmount' && 'الإجمالي'}
                                  </motion.div>
                                )}
                              </motion.div>
                            );
                          })}
                        </div>
                      )}
                    </div>
                  ) : previewUrl ? (
                    <object
                      data={previewUrl ? `${previewUrl}#view=FitH` : undefined}
                      type="application/pdf"
                      className="w-full h-full border-none"
                    >
                      <div className="flex flex-col items-center justify-center h-full p-8 text-center text-gray-500">
                        <FileText className="w-12 h-12 mb-4 opacity-10" />
                        <p className="mb-4">متصفحك لا يدعم عرض الـ PDF المدمج.</p>
                        <button 
                          onClick={() => window.open(previewUrl, '_blank')}
                          className="btn-primary py-2 px-4 text-sm"
                        >
                          انقر هنا لفتح الفاتورة
                        </button>
                      </div>
                    </object>
                  ) : (
                    <div className="flex flex-col items-center justify-center h-full text-gray-400">
                      <FileText className="w-16 h-16 mb-4 opacity-10" />
                      <p>الملف غير متاح للعرض</p>
                    </div>
                  )}
                </div>
              </div>
            </motion.div>
          </div>
        )}
      </AnimatePresence>
    </div>
  );
}
