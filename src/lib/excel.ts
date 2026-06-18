/**
 * @license
 * SPDX-License-Identifier: Apache-2.0
 */

import XLSX from 'xlsx-js-style';
import { InvoiceData } from '../types';

export interface ExcelTemplateData {
  headers: string[];
  existingData: any[];
}

export async function readExcelTemplate(file: File): Promise<ExcelTemplateData> {
  return new Promise((resolve, reject) => {
    const reader = new FileReader();
    reader.onload = (e) => {
      try {
        const data = new Uint8Array(e.target?.result as ArrayBuffer);
        const workbook = XLSX.read(data, { type: 'array' });
        const firstSheetName = workbook.SheetNames[0];
        const worksheet = workbook.Sheets[firstSheetName];
        
        const jsonData = XLSX.utils.sheet_to_json(worksheet, { header: 1 });
        const headers = (jsonData[0] as string[]) || [];
        const existingData = XLSX.utils.sheet_to_json(worksheet);
        
        resolve({ headers, existingData });
      } catch (err) {
        reject(err);
      }
    };
    reader.readAsArrayBuffer(file);
  });
}

export function exportToExcel(newData: InvoiceData[], template?: ExcelTemplateData) {
  const placeholder = '#######';
  
  // Default headers exactly as the user's Excel schema
  const defaultHeaders = [
    'م', 'التاريخ 1', 'رقم الفاتورة', 'اللوحة', 'العداد', 'نوع السيارة',
    'زيت', 'الكمية', 'السعر',
    'فلتر زيت', 'الكمية', 'السعر',
    'فلتر هواء', 'الكمية', 'السعر',
    'فلتر مكيف', 'الكمية', 'السعر',
    'فلتر ديزل', 'الكمية', 'السعر',
    'كفرات', 'الكمية', 'السعر',
    'مساحة', 'الكمية', 'السعر',
    'بطاريات', 'الكمية', 'السعر',
    'خدمات', 'الكمية', 'السعر',
    'قطع غيار', 'الكمية', 'السعر',
    'الفرع', 'الاجمالي', 'الضريبة', 'الي بعد الض', 'ملاحظات'
  ];

  const finalHeaders = template?.headers && template.headers.length > 0 
    ? template.headers 
    : defaultHeaders;

  const previousRows = template?.existingData || [];
  const nextId = previousRows.length > 0 ? previousRows.length + 1 : 1;
  
  // Deduplicate headers to match XLSX behavior (e.g., الكمية, الكمية_1, الكمية_2)
  const headerCounts: Record<string, number> = {};
  const deduplicatedHeaders = finalHeaders.map(h => {
    const trimmed = h.trim();
    if (headerCounts[trimmed] === undefined) {
      headerCounts[trimmed] = 0;
      return trimmed;
    } else {
      headerCounts[trimmed]++;
      return `${trimmed}_${headerCounts[trimmed]}`;
    }
  });

  const newRows = newData.map((item, index) => {
    const row: any = {};
    let currentCategory = ''; 

    finalHeaders.forEach((header, idx) => {
      const h = header.trim();
      const dedupKey = template && previousRows.length > 0
        ? Object.keys(previousRows[0] || {}).find(k => k === deduplicatedHeaders[idx] || k.startsWith(h)) || deduplicatedHeaders[idx]
        : deduplicatedHeaders[idx];

      if (h === 'م') row[dedupKey] = nextId + index;
      else if (h === 'التاريخ 1' || h === 'التاريخ' || h.toLowerCase().includes('date')) row[dedupKey] = item.date || placeholder;
      else if (h === 'رقم الفاتورة' || h.toLowerCase().includes('invoice')) row[dedupKey] = item.invoiceNumber || placeholder;
      else if (h === 'اللوحة' || h.includes('plate')) row[dedupKey] = item.plateNumber || placeholder;
      else if (h === 'العداد' || h === 'العدد' || h.includes('count')) row[dedupKey] = item.count || '';
      else if (h === 'نوع السيارة' || h.includes('car')) row[dedupKey] = item.carType || placeholder;
      else if (h === 'الفرع' || h.includes('branch')) row[dedupKey] = item.branch || placeholder;
      else if (h === 'الاجمالي' || h === 'الإجمالي' || h === 'subtotal') row[dedupKey] = item.subTotal || placeholder;
      else if (h === 'الضريبة' || h.includes('tax')) row[dedupKey] = item.taxAmount || placeholder;
      else if (h === 'الي بعد الض' || h === 'الاجمالي بعد الضريبة' || h === 'total') row[dedupKey] = item.totalAmount || placeholder;
      else if (h === 'ملاحظات' || h.includes('note')) row[dedupKey] = ''; 
      
      // Categories
      else if (h === 'زيت') { currentCategory = 'oil'; row[dedupKey] = item.oilName || placeholder; }
      else if (h === 'فلتر زيت') { currentCategory = 'oilFilter'; row[dedupKey] = item.oilFilterName || placeholder; }
      else if (h === 'فلتر هواء') { currentCategory = 'airFilter'; row[dedupKey] = item.airFilterName || placeholder; }
      else if (h === 'فلتر مكيف') { currentCategory = 'acFilter'; row[dedupKey] = item.acFilterName || placeholder; }
      else if (h === 'فلتر ديزل') { currentCategory = 'dieselFilter'; row[dedupKey] = item.dieselFilterName || placeholder; }
      else if (h === 'كفرات') { currentCategory = 'tires'; row[dedupKey] = item.tiresName || placeholder; }
      else if (h === 'مساحة' || h === 'مساحات') { currentCategory = 'wipers'; row[dedupKey] = item.wipersName || placeholder; }
      else if (h === 'بطاريات') { currentCategory = 'batteries'; row[dedupKey] = item.batteriesName || placeholder; }
      else if (h === 'خدمات') { currentCategory = 'services'; row[dedupKey] = item.servicesName || placeholder; }
      else if (h === 'قطع غيار') { currentCategory = 'spareParts'; row[dedupKey] = item.sparePartsName || placeholder; }
      
      // Qty and Price mapping based on currentCategory context
      else if (h === 'الكمية' && currentCategory) {
        row[dedupKey] = (item as any)[`${currentCategory}Qty`] || placeholder;
      }
      else if (h === 'السعر' && currentCategory) {
        row[dedupKey] = (item as any)[`${currentCategory}Price`] || placeholder;
      }
      else row[dedupKey] = (item as any)[h] || placeholder;
    });
    
    // To handle JS Object keys deduplication if `template` isn't used, 
    // XLSX json_to_sheet will automatically map an array of arrays perfectly.
    // However, since we return an array of objects, if defaultHeaders has duplicates, 
    // Object.keys will overwrite. So if NO template is used, we must use an Array of Arrays for the sheet!
    return row;
  });

  // Merge logic: If a new row matches an existing row (by invoice number), replace it. 
  // Otherwise, append it.
  const combinedRows = [...previousRows];
  
  newRows.forEach(newRow => {
    const newInvoice = String(newRow['رقم الفاتورة'] || newRow['invoice'] || '').trim();
    
    // Try to find a match in existing rows
    const matchIndex = combinedRows.findIndex(oldRow => {
      const oldInvoice = String(oldRow['رقم الفاتورة'] || oldRow['invoice'] || '').trim();
      return oldInvoice !== '' && oldInvoice === newInvoice && newInvoice !== placeholder;
    });

    if (matchIndex >= 0) {
      // Update existing row with new values while preserving fields not in extraction
      combinedRows[matchIndex] = { ...combinedRows[matchIndex], ...newRow };
    } else {
      // No match, just append
      combinedRows.push(newRow);
    }
  });
  
  // Create spreadsheet content
  // Create spreadsheet content using the deduplicated keys so data aligns correctly
  const worksheet = XLSX.utils.json_to_sheet(combinedRows, { header: deduplicatedHeaders });

  // 1. Set Right-to-Left Direction
  if (!worksheet['!views']) worksheet['!views'] = [];
  worksheet['!views'] = [{ RTL: true }];

  // 2. Calculate column widths (Auto-size)
  const colWidths = deduplicatedHeaders.map(col => {
    let maxLen = col.length + 2; // Start with header length
    combinedRows.forEach(row => {
      const val = row[col] ? String(row[col]) : '';
      if (val.length > maxLen) maxLen = val.length;
    });
    // Add extra padding and limit width
    return { wch: Math.min(Math.max(maxLen, 10), 50) };
  });
  worksheet['!cols'] = colWidths;

  // 3. Styling the Headers and Cells
  const range = XLSX.utils.decode_range(worksheet['!ref'] || 'A1:M100');
  
  for (let R = range.s.r; R <= range.e.r; ++R) {
    for (let C = range.s.c; C <= range.e.c; ++C) {
      const cellRef = XLSX.utils.encode_cell({ c: C, r: R });
      const cell = worksheet[cellRef];
      if (!cell) continue;

      // Restore original header name (remove _1, _2 suffixes)
      if (R === 0 && finalHeaders[C]) {
        cell.v = finalHeaders[C];
      }

      // Base style for all cells
      cell.s = {
        font: { name: 'Arial', sz: 12 },
        alignment: { vertical: 'center', horizontal: 'center', wrapText: true },
        border: {
          top: { style: 'thin', color: { rgb: "E2E8F0" } },
          bottom: { style: 'thin', color: { rgb: "E2E8F0" } },
          left: { style: 'thin', color: { rgb: "E2E8F0" } },
          right: { style: 'thin', color: { rgb: "E2E8F0" } }
        }
      };

      // Header style (First row)
      if (R === 0) {
        cell.s = {
          ...cell.s,
          font: { bold: true, color: { rgb: "FFFFFF" }, sz: 14, name: 'Arial' },
          fill: { fgColor: { rgb: "1E293B" } }, // Dark Slate (Matches app design)
          alignment: { vertical: 'center', horizontal: 'center', wrapText: false }
        };
      } else {
        // Alternating row background
        if (R % 2 === 0) {
          cell.s.fill = { fgColor: { rgb: "F8FAFC" } };
        }
        
        // Highlight placeholder if present
        if (cell.v === placeholder) {
          cell.s.font.color = { rgb: "94A3B8" }; // Slate-400
        }
      }
    }
  }

  const workbook = XLSX.utils.book_new();
  XLSX.utils.book_append_sheet(workbook, worksheet, "فواتير المعالجة");
  
  XLSX.writeFile(workbook, `Invoices_Styled_Export_${new Date().toISOString().split('T')[0]}.xlsx`);
}
