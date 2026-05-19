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
import { 
  saveInvoiceImage, 
  getInvoiceImage, 
  clearAllImages, 
  saveKnowledge, 
  getAllKnowledge 
} from '@/lib/db';
import { clsx, type ClassValue } from 'clsx';
import { twMerge } from 'tailwind-merge';
import InvoiceTable from '@/components/InvoiceTable';
import InvoicePreviewModal from '@/components/InvoicePreviewModal';

function cn(...inputs: ClassValue[]) {
  return twMerge(clsx(inputs));
}

export default function Dashboard() {
  // =========================================================================
  // 1. STATE & REF DECLARATIONS
  // =========================================================================

  // Analysis Workspace State (تحليل واستخراج)
  const [analysisPdfs, setAnalysisPdfs] = useState<File[]>([]);
  const [analysisTemplate, setAnalysisTemplate] = useState<ExcelTemplate | null>(null);
  const [analysisResults, setAnalysisResults] = useState<InvoiceData[]>([]);

  // Verification Workspace State (مطابقة وتدقيق)
  const [verificationPdfs, setVerificationPdfs] = useState<File[]>([]);
  const [verificationTemplate, setVerificationTemplate] = useState<ExcelTemplate | null>(null);
  const [verificationRawResults, setVerificationRawResults] = useState<InvoiceData[]>([]);
  const [verificationResults, setVerificationResults] = useState<VerificationResult[]>([]);

  // Refs for Analysis
  const analysisPdfInputRef = useRef<HTMLInputElement>(null);
  const analysisTemplateInputRef = useRef<HTMLInputElement>(null);

  // Refs for Verification
  const verificationPdfInputRef = useRef<HTMLInputElement>(null);
  const verificationTemplateInputRef = useRef<HTMLInputElement>(null);

  // Shared UI/UX States
  const [isDragging, setIsDragging] = useState(false);
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

  const isAbortedRef = useRef(false);

  // Computed Workspace Getters (for shared callback triggers)
  const pdfs = state.mode === AppMode.ANALYSIS ? analysisPdfs : verificationPdfs;
  const template = state.mode === AppMode.ANALYSIS ? analysisTemplate : verificationTemplate;
  const results = state.mode === AppMode.ANALYSIS ? analysisResults : verificationRawResults;

  // =========================================================================
  // 2. PERSISTENCE (LOCAL STORAGE)
  // =========================================================================

  // Load persisted data
  useEffect(() => {
    if (typeof window !== 'undefined') {
      try {
        const savedLocks = localStorage.getItem('lockedLayouts');
        const savedTrained = localStorage.getItem('trainedLayouts');
        const savedMaster = localStorage.getItem('masterTemplate');
        const savedAnalysisResults = localStorage.getItem('analysisResults');
        const savedVerificationRawResults = localStorage.getItem('verificationRawResults');
        const savedOpened = localStorage.getItem('openedInvoiceIds');
        const savedLast = localStorage.getItem('lastWorkedOnId');

        if (savedLocks) setLockedLayouts(JSON.parse(savedLocks));
        if (savedTrained) setTrainedLayouts(JSON.parse(savedTrained));
        if (savedMaster) setMasterTemplate(JSON.parse(savedMaster));
        if (savedOpened) setOpenedIds(new Set(JSON.parse(savedOpened)));
        if (savedLast) setLastWorkedOnId(savedLast);

        if (savedAnalysisResults) {
          const parsed = JSON.parse(savedAnalysisResults);
          if (Array.isArray(parsed)) setAnalysisResults(parsed);
        }
        if (savedVerificationRawResults) {
          const parsed = JSON.parse(savedVerificationRawResults);
          if (Array.isArray(parsed)) setVerificationRawResults(parsed);
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
      localStorage.setItem('analysisResults', JSON.stringify(analysisResults));
      localStorage.setItem('verificationRawResults', JSON.stringify(verificationRawResults));
    }
  }, [lockedLayouts, trainedLayouts, masterTemplate, analysisResults, verificationRawResults, openedIds, lastWorkedOnId]);

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

      // Priority 1: Try IndexedDB
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

      // Priority 2: Generate from original file
      if (selectedInvoice.originalFile instanceof Blob) {
        try {
          const img = await pdfToImage(selectedInvoice.originalFile);
          const base64 = `data:image/jpeg;base64,${img}`;
          setPreviewImage(base64);
          await saveInvoiceImage(selectedInvoice.id, base64);
          setIsPreviewLoading(false);
          return;
        } catch (e) {
          console.warn("PDF render failed", e);
        }
      }

      setPreviewImage(null);
      setIsPreviewLoading(false);
    };
    
    if (selectedInvoice) {
      setEditData({ ...selectedInvoice });
    } else {
      if (editData?.id) {
        setLastWorkedOnId(editData.id);
      }
      setEditData(null);
    }
    loadPreview();
  }, [selectedInvoice]);

  // =========================================================================
  // 3. COMPARATIVE AUDITING EFFECT HOOK
  // =========================================================================

  useEffect(() => {
    if (verificationRawResults.length === 0) {
      setVerificationResults([]);
      return;
    }

    if (!verificationTemplate || !verificationTemplate.existingData || verificationTemplate.existingData.length === 0) {
      setVerificationResults(verificationRawResults.map(res => ({
        fileName: res.fileName,
        invoiceNumber: res.invoiceNumber || '#######',
        foundInExcel: false,
        mismatches: ['لم يتم رفع ملف إكسل للمطابقة'],
        extractedData: res
      })));
      return;
    }

    const newVerificationResults = verificationRawResults.map(res => {
      const invoiceNum = String(res.invoiceNumber || '').trim();
      
      if (invoiceNum === '' || invoiceNum === '#######' || invoiceNum === 'خطأ') {
        return {
          fileName: res.fileName,
          invoiceNumber: invoiceNum,
          foundInExcel: false,
          mismatches: ['رقم الفاتورة غير صالح للاستخراج'],
          extractedData: res
        };
      }

      // Find the row in Excel
      const excelRow = verificationTemplate.existingData.find(row => {
        if (!row || typeof row !== 'object') return false;
        const keys = Object.keys(row);
        const invoiceKey = keys.find(k => {
          const hk = k.trim().replace(/أ/g, 'ا').replace(/إ/g, 'ا');
          return hk === 'رقم الفاتورة' || 
                 hk === 'رقم فاتورة' || 
                 hk.toLowerCase().includes('invoice') || 
                 hk.toLowerCase() === 'inv';
        });

        if (!invoiceKey) return false;
        
        const valExcel = String(row[invoiceKey] || '').trim();
        return valExcel !== '' && valExcel === invoiceNum;
      });

      if (!excelRow) {
        return {
          fileName: res.fileName,
          invoiceNumber: invoiceNum,
          foundInExcel: false,
          mismatches: ['الفاتورة غير موجودة في ملف الإكسل'],
          extractedData: res
        };
      }

      const mismatches: string[] = [];
      const originalData: any = {};
      const excelKeys = Object.keys(excelRow);

      // 1. Compare Date
      const dateKey = excelKeys.find(k => {
        const hk = k.trim().replace(/أ/g, 'ا').replace(/إ/g, 'ا');
        return hk === 'التاريخ' || hk.toLowerCase().includes('date');
      });

      if (dateKey) {
        let excelDateVal = String(excelRow[dateKey] || '').trim();
        
        if (/^\d+$/.test(excelDateVal)) {
          const serial = parseInt(excelDateVal, 10);
          const utc_days = Math.floor(serial - 25569);
          const utc_value = utc_days * 86400;
          const date_info = new Date(utc_value * 1000);
          excelDateVal = date_info.toISOString().split('T')[0];
        }

        let pdfDate = String(res.date || '').trim();
        const cleanDate = (d: string) => d.replace(/[\/\.]/g, '-');
        excelDateVal = cleanDate(excelDateVal);
        pdfDate = cleanDate(pdfDate);

        if (excelDateVal && pdfDate && excelDateVal !== '#######' && pdfDate !== '#######' && excelDateVal !== pdfDate) {
          mismatches.push('التاريخ غير متطابق');
          originalData['date'] = excelDateVal;
        }
      }

      // 2. Compare Total Amount
      const totalKey = excelKeys.find(k => {
        const hk = k.trim().replace(/أ/g, 'ا').replace(/إ/g, 'ا');
        return hk === 'الاجمالي' || hk === 'الإجمالي' || hk === 'الاجمالي بعد الضريبة' || hk === 'المبلغ النهائي' || hk.toLowerCase().includes('total');
      });

      if (totalKey) {
        const excelTotalVal = parseFloat(String(excelRow[totalKey] || '0').replace(/[^0-9.-]/g, ''));
        const pdfTotalVal = parseFloat(String(res.totalAmount || '0'));
        
        if (excelTotalVal !== pdfTotalVal) {
          mismatches.push('السعر (الإجمالي) غير متطابق');
          originalData['totalAmount'] = excelTotalVal;
        }
      }

      // 3. Compare Plate Number
      const plateKey = excelKeys.find(k => {
        const hk = k.trim().replace(/أ/g, 'ا').replace(/إ/g, 'ا');
        return hk === 'رقم اللوحة' || hk === 'اللوحة' || hk.toLowerCase().includes('plate');
      });

      if (plateKey) {
        const excelPlateVal = String(excelRow[plateKey] || '').trim();
        const pdfPlate = String(res.plateNumber || '').trim();
        if (excelPlateVal && pdfPlate && excelPlateVal !== '#######' && pdfPlate !== '#######' && excelPlateVal !== pdfPlate) {
          mismatches.push('رقم اللوحة غير متطابق');
          originalData['plateNumber'] = excelPlateVal;
        }
      }

      // 4. Compare Car Type
      const carKey = excelKeys.find(k => {
        const hk = k.trim().replace(/أ/g, 'ا').replace(/إ/g, 'ا');
        return hk === 'نوع السيارة' || hk.toLowerCase().includes('car');
      });

      if (carKey) {
        const excelCarVal = String(excelRow[carKey] || '').trim();
        const pdfCar = String(res.carType || '').trim();
        if (excelCarVal && pdfCar && excelCarVal !== '#######' && pdfCar !== '#######' && excelCarVal !== pdfCar) {
          mismatches.push('نوع السيارة غير متطابق');
          originalData['carType'] = excelCarVal;
        }
      }

      // 5. Compare itemsDescription
      const notesKey = excelKeys.find(k => {
        const hk = k.trim();
        return hk === 'ملاحظات' || hk.toLowerCase().includes('note');
      });

      const excelNotes = notesKey ? String(excelRow[notesKey] || '').trim() : '';
      const pdfTotal = parseFloat(String(res.totalAmount || '0'));
      const excelTotal = totalKey ? parseFloat(String(excelRow[totalKey] || '0').replace(/[^0-9.-]/g, '')) : 0;
      
      const isReturned = pdfTotal < 0 || excelTotal < 0 || 
                         excelNotes.includes('مردود') || excelNotes.includes('مرتجع') || excelNotes.includes('مسترجع') ||
                         String(res.notes || '').includes('مردود') || String(res.notes || '').includes('مرتجع') || String(res.notes || '').includes('مسترجع');
      if (isReturned) {
        mismatches.push('الفاتورة مردودة');
      }

      return {
        fileName: res.fileName,
        invoiceNumber: invoiceNum,
        foundInExcel: true,
        mismatches,
        originalData: excelRow,
        extractedData: res
      };
    });

    setVerificationResults(newVerificationResults);
  }, [verificationRawResults, verificationTemplate]);

  // =========================================================================
  // 4. DEDICATED WORKSPACE HANDLERS & PROCESSING
  // =========================================================================

  // Drag over drop states
  const onDragOver = (e: React.DragEvent) => {
    e.preventDefault();
    setIsDragging(true);
  };
  const onDragLeave = () => setIsDragging(false);

  // --- ANALYSIS HANDLERS ---
  const handleAnalysisPdfUpload = (e: React.ChangeEvent<HTMLInputElement>) => {
    if (e.target.files) {
      const files = Array.from(e.target.files).filter(f => 
        f.type === 'application/pdf' || f.name.toLowerCase().endsWith('.pdf')
      );
      setAnalysisPdfs(prev => [...prev, ...files]);
      e.target.value = '';
    }
  };

  const handleAnalysisTemplateUpload = async (e: React.ChangeEvent<HTMLInputElement>) => {
    if (e.target.files?.[0]) {
      const file = e.target.files[0];
      try {
        const data = await readExcelTemplate(file);
        setAnalysisTemplate({ ...data, file, name: file.name });
      } catch (err) {
        alert('حدث خطأ أثناء قراءة القالب. تأكد من أنه ملف Excel صالح.');
      }
    }
  };

  const startAnalysisProcessing = async () => {
    if (analysisPdfs.length === 0) return;
    isAbortedRef.current = false;
    setState(prev => ({ ...prev, total: analysisPdfs.length, processed: 0, isProcessing: true }));
    const knowledge = await getAllKnowledge();

    for (const file of analysisPdfs) {
      if (isAbortedRef.current) break;
      setCurrentFileName(file.name);
      const invoiceId = Date.now() + Math.random();
      
      try {
        let previewBase64 = '';
        try {
          previewBase64 = await pdfToImage(file, 3.0, 0.8);
          if (previewBase64) {
            await saveInvoiceImage(invoiceId, `data:image/jpeg;base64,${previewBase64}`);
          }
        } catch (imgErr) {
          console.warn("Image conversion failed:", imgErr);
        }

        const text = await extractTextFromPdf(file);
        let imgForAI: string | undefined = undefined;
        try {
          imgForAI = await pdfToImage(file, 1.2, 0.6);
        } catch (e) {
          console.warn("Failed to generate AI image", e);
        }

        const extracted = await analyzeInvoiceAction(text, imgForAI, analysisTemplate?.headers || [], masterTemplate || undefined, knowledge);
        
        if (!extracted || extracted.error) {
          throw new Error(extracted?.error || "فشل في استخراج البيانات");
        }

        let carTypeBase = (extracted.carType && extracted.carType !== '#######') ? extracted.carType : '#######';
        let branchInfo = (extracted.branch && extracted.branch !== '#######') ? extracted.branch : '';

        if (branchInfo === '' || branchInfo === '#######') {
          const separators = [' - ', ' / ', '-', '/'];
          for (const sep of separators) {
            if (carTypeBase.includes(sep)) {
              const parts = carTypeBase.split(sep);
              carTypeBase = parts[0].trim();
              branchInfo = parts[parts.length - 1].trim();
              break;
            }
          }
        }

        const data: InvoiceData = {
          ...extracted,
          id: invoiceId,
          fileName: file.name,
          originalFile: file,
          invoiceNumber: extracted.invoiceNumber || '#######',
          date: extracted.date || '#######',
          plateNumber: extracted.plateNumber || '#######',
          carType: carTypeBase,
          branch: branchInfo || '#######',
          totalAmount: extracted.totalAmount || 0,
          status: 'completed',
          isFinished: false
        } as InvoiceData;

        setAnalysisResults(prev => [...prev, data]);
      } catch (error: any) {
        setAnalysisResults(prev => [...prev, { 
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

  const handleAnalysisExport = () => {
    if (analysisResults.length === 0) return;
    exportToExcel(analysisResults, analysisTemplate || undefined);
  };

  const handleAnalysisClearAll = async () => {
    if (confirm('هل أنت متأكد من مسح فواتير التحليل والبدء من جديد؟')) {
      setAnalysisPdfs([]);
      setAnalysisResults([]);
      await clearAllImages();
    }
  };

  // --- VERIFICATION HANDLERS ---
  const handleVerificationPdfUpload = (e: React.ChangeEvent<HTMLInputElement>) => {
    if (e.target.files) {
      const files = Array.from(e.target.files).filter(f => 
        f.type === 'application/pdf' || f.name.toLowerCase().endsWith('.pdf')
      );
      setVerificationPdfs(prev => [...prev, ...files]);
      e.target.value = '';
    }
  };

  const handleVerificationTemplateUpload = async (e: React.ChangeEvent<HTMLInputElement>) => {
    if (e.target.files?.[0]) {
      const file = e.target.files[0];
      try {
        const data = await readExcelTemplate(file);
        setVerificationTemplate({ ...data, file, name: file.name });
      } catch (err) {
        alert('حدث خطأ أثناء قراءة ملف التدقيق. تأكد من أنه ملف Excel صالح.');
      }
    }
  };

  const startVerificationProcessing = async () => {
    if (verificationPdfs.length === 0) return;
    isAbortedRef.current = false;
    setState(prev => ({ ...prev, total: verificationPdfs.length, processed: 0, isProcessing: true }));
    const knowledge = await getAllKnowledge();

    for (const file of verificationPdfs) {
      if (isAbortedRef.current) break;
      setCurrentFileName(file.name);
      const invoiceId = Date.now() + Math.random();
      
      try {
        let previewBase64 = '';
        try {
          previewBase64 = await pdfToImage(file, 3.0, 0.8);
          if (previewBase64) {
            await saveInvoiceImage(invoiceId, `data:image/jpeg;base64,${previewBase64}`);
          }
        } catch (imgErr) {
          console.warn("Image conversion failed:", imgErr);
        }

        const text = await extractTextFromPdf(file);
        let imgForAI: string | undefined = undefined;
        try {
          imgForAI = await pdfToImage(file, 1.2, 0.6);
        } catch (e) {
          console.warn("Failed to generate AI image", e);
        }

        const extracted = await analyzeInvoiceAction(text, imgForAI, verificationTemplate?.headers || [], masterTemplate || undefined, knowledge);
        
        if (!extracted || extracted.error) {
          throw new Error(extracted?.error || "فشل في استخراج البيانات");
        }

        let carTypeBase = (extracted.carType && extracted.carType !== '#######') ? extracted.carType : '#######';
        let branchInfo = (extracted.branch && extracted.branch !== '#######') ? extracted.branch : '';

        if (branchInfo === '' || branchInfo === '#######') {
          const separators = [' - ', ' / ', '-', '/'];
          for (const sep of separators) {
            if (carTypeBase.includes(sep)) {
              const parts = carTypeBase.split(sep);
              carTypeBase = parts[0].trim();
              branchInfo = parts[parts.length - 1].trim();
              break;
            }
          }
        }

        const data: InvoiceData = {
          ...extracted,
          id: invoiceId,
          fileName: file.name,
          originalFile: file,
          invoiceNumber: extracted.invoiceNumber || '#######',
          date: extracted.date || '#######',
          plateNumber: extracted.plateNumber || '#######',
          carType: carTypeBase,
          branch: branchInfo || '#######',
          totalAmount: extracted.totalAmount || 0,
          status: 'completed',
          isFinished: false
        } as InvoiceData;

        setVerificationRawResults(prev => [...prev, data]);
      } catch (error: any) {
        setVerificationRawResults(prev => [...prev, { 
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

  const handleVerificationExport = () => {
    if (verificationRawResults.length === 0) return;
    exportToExcel(verificationRawResults, verificationTemplate || undefined);
  };

  const handleVerificationClearAll = async () => {
    if (confirm('هل أنت متأكد من مسح فواتير التدقيق والبدء من جديد؟')) {
      setVerificationPdfs([]);
      setVerificationRawResults([]);
      setVerificationResults([]);
      await clearAllImages();
    }
  };

  // --- GENERAL ROW MODIFIERS ---
  const handleToggleComplete = (id: string | number) => {
    if (state.mode === AppMode.ANALYSIS) {
      setAnalysisResults(prev => prev.map(r => r.id === id ? { ...r, isFinished: !r.isFinished } : r));
    } else {
      setVerificationRawResults(prev => prev.map(r => r.id === id ? { ...r, isFinished: !r.isFinished } : r));
    }
  };

  const handleDelete = (id: string | number) => {
    if (state.mode === AppMode.ANALYSIS) {
      setAnalysisResults(prev => prev.filter(r => r.id !== id));
    } else {
      setVerificationRawResults(prev => prev.filter(r => r.id !== id));
    }
    if (selectedInvoice?.id === id) {
      setSelectedInvoice(null);
    }
  };

  const handleSaveEdit = async () => {
    if (!editData || !selectedInvoice) return;
    
    const fieldsToLearn = ['branch', 'carType', 'itemsDescription'];
    for (const field of fieldsToLearn) {
      const oldVal = (selectedInvoice as any)[field];
      const newVal = (editData as any)[field];
      if (newVal && newVal !== oldVal && newVal !== '#######') {
        const existing = await getAllKnowledge();
        const examples = existing[field] || [];
        if (!examples.includes(newVal)) {
          await saveKnowledge(field, [...examples, newVal].slice(-20));
        }
      }
    }

    const updatedData = { ...selectedInvoice, ...editData, isFinished: true };
    if (state.mode === AppMode.ANALYSIS) {
      setAnalysisResults(prev => prev.map(item => item.id === selectedInvoice.id ? { ...item, ...updatedData } : item));
    } else {
      setVerificationRawResults(prev => prev.map(item => item.id === selectedInvoice.id ? { ...item, ...updatedData } : item));
    }
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
    if (state.mode === AppMode.ANALYSIS) {
      setAnalysisResults(prev => prev.map(res => ({
        ...res,
        locations: { ...res.locations, ...master }
      })));
    } else {
      setVerificationRawResults(prev => prev.map(res => ({
        ...res,
        locations: { ...res.locations, ...master }
      })));
    }
    const newLocks: Record<string, boolean> = {};
    results.forEach(res => {
      newLocks[res.fileName] = true;
    });
    setLockedLayouts(prev => ({ ...prev, ...newLocks }));
    alert('تم تطبيق تنسيق المواقع على جميع الفواتير المحملة بنجاح!');
  };

  // =========================================================================
  // 5. JSX RENDER BLOCK
  // =========================================================================

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

      {/* Main Workspaces Switcher Layouts */}
      <main className="max-w-7xl mx-auto">
        {state.mode === AppMode.ANALYSIS ? (
          // =========================================================================
          // [WORKSPACE A]: ANALYSIS & EXTRACTION (تحليل واستخراج)
          // =========================================================================
          <div className="grid grid-cols-1 lg:grid-cols-12 gap-6" key="analysis-workspace">
            {/* Sidebar A */}
            <div className="lg:col-span-4 space-y-5">
              {/* Tab Switcher */}
              <div className="flex bg-slate-100/80 p-1 rounded-xl border border-slate-200/60">
                <button 
                  onClick={() => setState(prev => ({ ...prev, mode: AppMode.ANALYSIS }))}
                  className="flex-1 py-2.5 px-2 rounded-lg font-bold text-[12px] transition-all flex items-center justify-center gap-1 bg-white text-slate-800 shadow-sm"
                >
                  <FileUp className="w-3.5 h-3.5" />
                  تحليل واستخراج
                </button>
                <button 
                  onClick={() => setState(prev => ({ ...prev, mode: AppMode.VERIFICATION }))}
                  className="flex-1 py-2.5 px-2 rounded-lg font-bold text-[12px] transition-all flex items-center justify-center gap-1 text-slate-400 hover:text-slate-600"
                >
                  <CheckCircle2 className="w-3.5 h-3.5" />
                  مطابقة وتدقيق
                </button>
              </div>

              {/* Upload Panel A */}
              <section className="card-premium p-6 space-y-5">
                <h2 className="font-bold text-base flex items-center gap-2">
                  <FileUp className="w-5 h-5 text-accent" />
                  رفع فواتير الاستخراج (PDF)
                </h2>
                <div 
                  onClick={() => analysisPdfInputRef.current?.click()}
                  onDragOver={onDragOver}
                  onDragLeave={onDragLeave}
                  onDrop={(e) => {
                    e.preventDefault();
                    setIsDragging(false);
                    if (e.dataTransfer.files) {
                      const files = Array.from(e.dataTransfer.files).filter(f => 
                        f.type === 'application/pdf' || f.name.toLowerCase().endsWith('.pdf')
                      );
                      setAnalysisPdfs(prev => [...prev, ...files]);
                    }
                  }}
                  className={cn(
                    "border-2 border-dashed rounded-xl p-6 text-center cursor-pointer transition-all duration-200",
                    isDragging ? "border-accent bg-accent/5 scale-[1.01]" : "border-slate-200 hover:border-accent/40 hover:bg-slate-50"
                  )}
                >
                  <input type="file" multiple accept="application/pdf,.pdf" className="hidden" ref={analysisPdfInputRef} onChange={handleAnalysisPdfUpload} />
                  <FileUp className="w-8 h-8 mx-auto mb-2 text-slate-300" />
                  <p className="text-sm font-medium text-slate-600">اسحب الفواتير للاستخراج أو اضغط للرفع</p>
                  <p className="text-[10px] text-slate-400 mt-1">يدعم النظام حتى 300 فاتورة PDF</p>
                </div>

                {/* File List A */}
                {analysisPdfs.length > 0 && (
                  <div className="space-y-2">
                    <div className="flex items-center justify-between text-sm bg-accent/5 p-2.5 rounded-lg border border-accent/10">
                      <span className="font-bold text-slate-700 text-xs">{analysisPdfs.length} ملف تم اختياره للاستخراج</span>
                      <button onClick={() => setAnalysisPdfs([])} className="text-red-400 hover:text-red-600 text-[10px] font-bold transition-colors">مسح الكل</button>
                    </div>
                    <div className="max-h-32 overflow-y-auto border border-slate-100 rounded-lg bg-slate-50/50 p-1.5 space-y-1">
                      {analysisPdfs.map((file, idx) => (
                        <div key={idx} className="flex items-center justify-between text-[11px] text-slate-600 bg-white p-1.5 px-2.5 rounded border border-slate-100">
                          <span className="truncate flex-1 font-medium">{file.name}</span>
                          <button 
                            onClick={() => setAnalysisPdfs(prev => prev.filter((_, i) => i !== idx))}
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

              {/* Template Panel A */}
              <section className="card-premium p-6 space-y-4">
                <h2 className="font-bold text-base flex items-center gap-2">
                  <FileSpreadsheet className="w-5 h-5 text-accent" />
                  ملف البيانات (قالب استخراج اختياري)
                </h2>
                <div 
                  onClick={() => analysisTemplateInputRef.current?.click()}
                  className={cn(
                    "border-2 border-dashed rounded-xl p-5 text-center cursor-pointer transition-all duration-300",
                    analysisTemplate ? "border-green-400 bg-green-50/50" : "border-slate-200 hover:border-accent/40 hover:bg-slate-50"
                  )}
                >
                  <input type="file" accept=".xlsx,.xls" className="hidden" ref={analysisTemplateInputRef} onChange={handleAnalysisTemplateUpload} />
                  {analysisTemplate ? (
                    <div className="flex items-center justify-center gap-3 text-green-600">
                      <CheckCircle2 className="w-6 h-6 flex-shrink-0" />
                      <div className="text-right">
                        <div className="font-bold text-xs truncate max-w-[160px]">{analysisTemplate.name}</div>
                        <div className="text-[10px] opacity-70">يحتوي على {analysisTemplate.existingData.length} سجل و {analysisTemplate.headers.length} عمود</div>
                      </div>
                    </div>
                  ) : (
                    <div className="flex flex-col items-center gap-1">
                      <FileSpreadsheet className="w-6 h-6 text-slate-300" />
                      <span className="text-xs font-medium text-slate-500">رفع إكسل للإضافة على ملف موجود</span>
                      <span className="text-[9px] text-slate-400">سوف يتم دمج النتائج الجديدة داخله</span>
                    </div>
                  )}
                </div>
              </section>

              {/* Action Buttons A */}
              <div className="space-y-3">
                {state.isProcessing ? (
                  // Progress Card
                  <motion.div initial={{ opacity: 0, y: 10 }} animate={{ opacity: 1, y: 0 }} className="bg-primary text-white p-5 rounded-2xl shadow-xl space-y-4">
                    <div className="flex justify-between items-center">
                      <div>
                        <h3 className="font-bold text-sm">جاري تحليل واستخراج الفواتير...</h3>
                        <p className="text-[10px] text-white/60 truncate max-w-[180px] mt-0.5">{currentFileName || 'بدء...'}</p>
                      </div>
                      <span className="text-2xl font-black">{Math.round((state.processed / state.total) * 100)}%</span>
                    </div>
                    <div className="h-2 bg-white/10 rounded-full overflow-hidden">
                      <motion.div className="h-full bg-accent rounded-full" initial={{ width: 0 }} animate={{ width: `${(state.processed / state.total) * 100}%` }} transition={{ type: "spring", stiffness: 50 }} />
                    </div>
                    <div className="flex justify-between text-[10px] font-bold text-white/70">
                      <span>تمت: {state.processed}</span>
                      <span>المتبقي: {state.total - state.processed}</span>
                    </div>
                    <button onClick={() => isAbortedRef.current = true} className="w-full py-2 bg-red-500/20 text-red-300 rounded-lg text-[10px] font-bold hover:bg-red-500/30 transition-colors flex items-center justify-center gap-1">
                      <XCircle className="w-3.5 h-3.5" /> إلغاء العملية
                    </button>
                  </motion.div>
                ) : (
                  <>
                    <div className="flex gap-2">
                      <button 
                        onClick={startAnalysisProcessing}
                        disabled={analysisPdfs.length === 0}
                        className="btn-premium flex-1 disabled:opacity-40 disabled:cursor-not-allowed"
                      >
                        <Play className="w-5 h-5" />
                        ابدأ استخراج البيانات
                      </button>
                      {(analysisResults.length > 0 || analysisPdfs.length > 0) && (
                        <button 
                          onClick={handleAnalysisClearAll}
                          className="w-12 h-12 flex items-center justify-center bg-slate-100 text-slate-400 hover:bg-red-50 hover:text-red-500 rounded-2xl transition-all border border-slate-200 flex-shrink-0"
                          title="مسح قائمة الاستخراج"
                        >
                          <Trash2 className="w-4 h-4" />
                        </button>
                      )}
                    </div>
                    <button 
                      onClick={handleAnalysisExport}
                      disabled={analysisResults.length === 0}
                      className="w-full flex items-center justify-center gap-2 py-3 bg-white font-bold text-sm text-slate-600 rounded-2xl border border-slate-200 hover:border-accent/40 hover:bg-accent/5 hover:text-accent transition-all disabled:opacity-40"
                    >
                      <Download className="w-4 h-4" />
                      تحميل ملف Excel النتائج
                    </button>
                  </>
                )}
              </div>
            </div>

            {/* Table Area A */}
            <div className="lg:col-span-8 flex flex-col">
              <section className="card-premium flex-1 overflow-hidden flex flex-col min-h-[500px]">
                <InvoiceTable 
                  mode={AppMode.ANALYSIS}
                  results={analysisResults}
                  verificationResults={[]}
                  selectedInvoice={selectedInvoice}
                  openedIds={Array.from(openedIds)}
                  lastWorkedOnId={lastWorkedOnId}
                  onSelect={setSelectedInvoice}
                  onToggleComplete={handleToggleComplete}
                  onDelete={handleDelete}
                  onExport={handleAnalysisExport}
                />
              </section>
            </div>
          </div>
        ) : (
          // =========================================================================
          // [WORKSPACE B]: AUDITING & MATCHING (مطابقة وتدقيق)
          // =========================================================================
          <div className="grid grid-cols-1 lg:grid-cols-12 gap-6" key="verification-workspace">
            {/* Sidebar B */}
            <div className="lg:col-span-4 space-y-5">
              {/* Tab Switcher */}
              <div className="flex bg-slate-100/80 p-1 rounded-xl border border-slate-200/60">
                <button 
                  onClick={() => setState(prev => ({ ...prev, mode: AppMode.ANALYSIS }))}
                  className="flex-1 py-2.5 px-2 rounded-lg font-bold text-[12px] transition-all flex items-center justify-center gap-1 text-slate-400 hover:text-slate-600"
                >
                  <FileUp className="w-3.5 h-3.5" />
                  تحليل واستخراج
                </button>
                <button 
                  onClick={() => setState(prev => ({ ...prev, mode: AppMode.VERIFICATION }))}
                  className="flex-1 py-2.5 px-2 rounded-lg font-bold text-[12px] transition-all flex items-center justify-center gap-1 bg-white text-slate-800 shadow-sm"
                >
                  <CheckCircle2 className="w-3.5 h-3.5" />
                  مطابقة وتدقيق
                </button>
              </div>

              {/* Upload Panel B */}
              <section className="card-premium p-6 space-y-5">
                <h2 className="font-bold text-base flex items-center gap-2">
                  <FileUp className="w-5 h-5 text-accent" />
                  رفع فواتير المطابقة والتدقيق (PDF)
                </h2>
                <div 
                  onClick={() => verificationPdfInputRef.current?.click()}
                  onDragOver={onDragOver}
                  onDragLeave={onDragLeave}
                  onDrop={(e) => {
                    e.preventDefault();
                    setIsDragging(false);
                    if (e.dataTransfer.files) {
                      const files = Array.from(e.dataTransfer.files).filter(f => 
                        f.type === 'application/pdf' || f.name.toLowerCase().endsWith('.pdf')
                      );
                      setVerificationPdfs(prev => [...prev, ...files]);
                    }
                  }}
                  className={cn(
                    "border-2 border-dashed rounded-xl p-6 text-center cursor-pointer transition-all duration-200",
                    isDragging ? "border-accent bg-accent/5 scale-[1.01]" : "border-slate-200 hover:border-accent/40 hover:bg-slate-50"
                  )}
                >
                  <input type="file" multiple accept="application/pdf,.pdf" className="hidden" ref={verificationPdfInputRef} onChange={handleVerificationPdfUpload} />
                  <FileUp className="w-8 h-8 mx-auto mb-2 text-slate-300" />
                  <p className="text-sm font-medium text-slate-600">اسحب الفواتير للتدقيق والمطابقة أو اضغط للرفع</p>
                  <p className="text-[10px] text-slate-400 mt-1">يدعم النظام حتى 300 فاتورة PDF</p>
                </div>

                {/* File List B */}
                {verificationPdfs.length > 0 && (
                  <div className="space-y-2">
                    <div className="flex items-center justify-between text-sm bg-accent/5 p-2.5 rounded-lg border border-accent/10">
                      <span className="font-bold text-slate-700 text-xs">{verificationPdfs.length} ملف تم اختياره للتدقيق</span>
                      <button onClick={() => setVerificationPdfs([])} className="text-red-400 hover:text-red-600 text-[10px] font-bold transition-colors">مسح الكل</button>
                    </div>
                    <div className="max-h-32 overflow-y-auto border border-slate-100 rounded-lg bg-slate-50/50 p-1.5 space-y-1">
                      {verificationPdfs.map((file, idx) => (
                        <div key={idx} className="flex items-center justify-between text-[11px] text-slate-600 bg-white p-1.5 px-2.5 rounded border border-slate-100">
                          <span className="truncate flex-1 font-medium">{file.name}</span>
                          <button 
                            onClick={() => setVerificationPdfs(prev => prev.filter((_, i) => i !== idx))}
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

              {/* Excel Table Panel B */}
              <section className="card-premium p-6 space-y-4">
                <h2 className="font-bold text-base flex items-center gap-2">
                  <FileSpreadsheet className="w-5 h-5 text-accent" />
                  ملف الإكسل للمطابقة والتدقيق
                </h2>
                <div 
                  onClick={() => verificationTemplateInputRef.current?.click()}
                  className={cn(
                    "border-2 border-dashed rounded-xl p-5 text-center cursor-pointer transition-all duration-300",
                    verificationTemplate ? "border-green-400 bg-green-50/50" : "border-slate-200 hover:border-accent/40 hover:bg-slate-50"
                  )}
                >
                  <input type="file" accept=".xlsx,.xls" className="hidden" ref={verificationTemplateInputRef} onChange={handleVerificationTemplateUpload} />
                  {verificationTemplate ? (
                    <div className="flex items-center justify-center gap-3 text-green-600">
                      <CheckCircle2 className="w-6 h-6 flex-shrink-0" />
                      <div className="text-right">
                        <div className="font-bold text-xs truncate max-w-[160px]">{verificationTemplate.name}</div>
                        <div className="text-[10px] opacity-70">يحتوي على {verificationTemplate.existingData.length} سجل ومستعد للمطابقة</div>
                      </div>
                    </div>
                  ) : (
                    <div className="flex flex-col items-center gap-1">
                      <FileSpreadsheet className="w-6 h-6 text-slate-300" />
                      <span className="text-xs font-medium text-slate-500">رفع ملف الإكسل المطلوب تدقيقه ومطابقته</span>
                      <span className="text-[9px] text-red-500 font-bold">إجباري - لمقارنة ومطابقة الفواتير بالجدول</span>
                    </div>
                  )}
                </div>
              </section>

              {/* Action Buttons B */}
              <div className="space-y-3">
                {state.isProcessing ? (
                  // Progress Card
                  <motion.div initial={{ opacity: 0, y: 10 }} animate={{ opacity: 1, y: 0 }} className="bg-primary text-white p-5 rounded-2xl shadow-xl space-y-4">
                    <div className="flex justify-between items-center">
                      <div>
                        <h3 className="font-bold text-sm">جاري مطابقة وتدقيق الفواتير...</h3>
                        <p className="text-[10px] text-white/60 truncate max-w-[180px] mt-0.5">{currentFileName || 'بدء...'}</p>
                      </div>
                      <span className="text-2xl font-black">{Math.round((state.processed / state.total) * 100)}%</span>
                    </div>
                    <div className="h-2 bg-white/10 rounded-full overflow-hidden">
                      <motion.div className="h-full bg-accent rounded-full" initial={{ width: 0 }} animate={{ width: `${(state.processed / state.total) * 100}%` }} transition={{ type: "spring", stiffness: 50 }} />
                    </div>
                    <div className="flex justify-between text-[10px] font-bold text-white/70">
                      <span>تمت: {state.processed}</span>
                      <span>المتبقي: {state.total - state.processed}</span>
                    </div>
                    <button onClick={() => isAbortedRef.current = true} className="w-full py-2 bg-red-500/20 text-red-300 rounded-lg text-[10px] font-bold hover:bg-red-500/30 transition-colors flex items-center justify-center gap-1">
                      <XCircle className="w-3.5 h-3.5" /> إلغاء العملية
                    </button>
                  </motion.div>
                ) : (
                  <>
                    <div className="flex gap-2">
                      <button 
                        onClick={startVerificationProcessing}
                        disabled={verificationPdfs.length === 0}
                        className="btn-premium flex-1 disabled:opacity-40 disabled:cursor-not-allowed"
                      >
                        <Play className="w-5 h-5" />
                        ابدأ المطابقة والتدقيق
                      </button>
                      {(verificationRawResults.length > 0 || verificationPdfs.length > 0) && (
                        <button 
                          onClick={handleVerificationClearAll}
                          className="w-12 h-12 flex items-center justify-center bg-slate-100 text-slate-400 hover:bg-red-50 hover:text-red-500 rounded-2xl transition-all border border-slate-200 flex-shrink-0"
                          title="مسح قائمة المطابقة"
                        >
                          <Trash2 className="w-4 h-4" />
                        </button>
                      )}
                    </div>
                    <button 
                      onClick={handleVerificationExport}
                      disabled={verificationRawResults.length === 0}
                      className="w-full flex items-center justify-center gap-2 py-3 bg-white font-bold text-sm text-slate-600 rounded-2xl border border-slate-200 hover:border-accent/40 hover:bg-accent/5 hover:text-accent transition-all disabled:opacity-40"
                    >
                      <Download className="w-4 h-4" />
                      تصدير تقرير المطابقة والتدقيق
                    </button>
                  </>
                )}
              </div>
            </div>

            {/* Table Area B */}
            <div className="lg:col-span-8 flex flex-col">
              <section className="card-premium flex-1 overflow-hidden flex flex-col min-h-[500px]">
                <InvoiceTable 
                  mode={AppMode.VERIFICATION}
                  results={verificationRawResults}
                  verificationResults={verificationResults}
                  selectedInvoice={selectedInvoice}
                  openedIds={Array.from(openedIds)}
                  lastWorkedOnId={lastWorkedOnId}
                  onSelect={setSelectedInvoice}
                  onToggleComplete={handleToggleComplete}
                  onDelete={handleDelete}
                  onExport={handleVerificationExport}
                />
              </section>
            </div>
          </div>
        )}
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
            verificationResult={state.mode === AppMode.VERIFICATION ? verificationResults.find(v => v.fileName === selectedInvoice.fileName) : undefined}
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
