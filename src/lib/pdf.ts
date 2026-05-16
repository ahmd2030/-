/**
 * @license
 * SPDX-License-Identifier: Apache-2.0
 */

import * as pdfjsLib from 'pdfjs-dist';

// Configure worker - using local file to prevent CDN blocking issues (CORS, Adblockers)
if (typeof window !== 'undefined' && !pdfjsLib.GlobalWorkerOptions.workerSrc) {
  pdfjsLib.GlobalWorkerOptions.workerSrc = '/pdf.worker.min.mjs';
}

export async function extractTextFromPdf(file: File): Promise<string> {
  try {
    const arrayBuffer = await file.arrayBuffer();
    const loadingTask = pdfjsLib.getDocument({ 
      data: arrayBuffer,
      useSystemFonts: true,
    } as any);
    
    const pdf = await loadingTask.promise;
    let fullText = '';

    for (let i = 1; i <= pdf.numPages; i++) {
      const page = await pdf.getPage(i);
      const textContent = await page.getTextContent();
      const pageText = textContent.items
        .map((item: any) => item.str)
        .join(' ');
      fullText += `--- Page ${i} ---\n${pageText}\n\n`;
    }

    return fullText;
  } catch (error: any) {
    console.error('PDF Extraction Error:', error);
    throw new Error('تعذر قراءة ملف PDF. قد يكون الملف محمياً أو تالفاً.');
  }
}

/**
 * Converts the first page of a PDF to a base64 image
 * @param scale The resolution scale (default: 3.0 for high-res previews)
 * @param quality The JPEG quality (default: 0.8)
 */
export async function pdfToImage(file: File, scale: number = 3.0, quality: number = 0.8): Promise<string> {
  const arrayBuffer = await file.arrayBuffer();
  const pdf = await pdfjsLib.getDocument({ data: arrayBuffer }).promise;
  const page = await pdf.getPage(1);
  
  const viewport = page.getViewport({ scale });
  const canvas = document.createElement('canvas');
  const context = canvas.getContext('2d', { alpha: false });
  
  if (!context) throw new Error('Could not create canvas context');
  
  // Fill white background just in case
  context.fillStyle = '#ffffff';
  context.fillRect(0, 0, canvas.width, canvas.height);
  
  canvas.height = viewport.height;
  canvas.width = viewport.width;
  
  await page.render({
    canvasContext: context,
    viewport: viewport,
    ...( ({} as any).canvas ? { canvas: canvas } : {} )
  } as any).promise;
  
  return canvas.toDataURL('image/jpeg', quality).split(',')[1];
}
