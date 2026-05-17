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
  
  const finalHeaders = template?.headers && template.headers.length > 0 
    ? template.headers 
    : ['م', 'التاريخ', 'رقم الفاتورة', 'اللوحة', 'العدد', 'نوع السيارة', 'الفرع', 'إسم الأصناف', 'الإجمالي', 'الضريبة', 'الاجمالي بعد الضريبة', 'ملاحظات'];

  const previousRows = template?.existingData || [];
  const nextId = previousRows.length > 0 ? previousRows.length + 1 : 1;

  const newRows = newData.map((item, index) => {
    const row: any = {};
    finalHeaders.forEach(header => {
      const h = header.trim();
      if (h === 'م') row[h] = nextId + index;
      else if (h === 'التاريخ' || h.toLowerCase().includes('date')) row[h] = item.date || placeholder;
      else if (h === 'رقم الفاتورة' || h.toLowerCase().includes('invoice')) row[h] = item.invoiceNumber || placeholder;
      else if (h === 'اللوحة' || h.includes('plate')) row[h] = item.plateNumber || placeholder;
      else if (h === 'العدد' || h.includes('count') || h.includes('عداد')) row[h] = item.count || '';
      else if (h === 'نوع السيارة' || h.includes('car')) row[h] = item.carType || placeholder;
      else if (h === 'الفرع' || h.includes('branch')) row[h] = item.branch || placeholder;
      else if (h.replace(/أ/g, 'ا') === 'اسم الاصناف' || h.includes('item') || h.includes('صنف') || h.includes('اصناف')) {
        const raw = item.itemsDescription || (item as any)[h] || placeholder;
        // Clean up and ensure 1-, 2-, 3- format if it's a list
        const lines = raw.split(/\n|;/).filter((l: string) => l.trim() !== '');
        const formatted = lines.map((line: string, i: number) => {
          const clean = line.replace(/^\d+[-.)\s]*/, '').trim();
          // Use RLM (\u200F) to ensure the number and dash stay on the right (start of line in RTL)
          return `\u200F${i + 1}- ${clean}`;
        }).join('\n');
        row[h] = formatted || placeholder;
      }
      else if (h === 'الإجمالي' || h === 'subtotal') row[h] = item.subTotal || placeholder;
      else if (h === 'الضريبة' || h.includes('tax')) row[h] = item.taxAmount || placeholder;
      else if (h === 'الاجمالي بعد الضريبة' || h === 'total') row[h] = item.totalAmount || placeholder;
      else if (h === 'ملاحظات' || h.includes('note')) row[h] = ''; 
      else row[h] = (item as any)[h] || placeholder;
    });
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
  const worksheet = XLSX.utils.json_to_sheet(combinedRows, { header: finalHeaders });

  // 1. Set Right-to-Left Direction
  if (!worksheet['!views']) worksheet['!views'] = [];
  worksheet['!views'] = [{ RTL: true }];

  // 2. Calculate column widths (Auto-size)
  const colWidths = finalHeaders.map(col => {
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
