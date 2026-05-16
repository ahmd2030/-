"use server";

import { GoogleGenAI, Type } from "@google/genai";
import { InvoiceData } from "@/types";

// Clean the API key to remove any accidental invisible/Arabic characters pasted from Vercel
const cleanApiKey = (process.env.GEMINI_API_KEY || "").replace(/[^\x20-\x7E]/g, '');
const ai = new GoogleGenAI({ apiKey: cleanApiKey, httpOptions: { apiVersion: 'v1' } } as any);

const INVOICE_SCHEMA = {
  type: Type.OBJECT,
  properties: {
    invoiceNumber: { type: Type.STRING, description: "رقم الفاتورة" },
    date: { type: Type.STRING, description: "تاريخ الفاتورة بتنسيق YYYY-MM-DD" },
    plateNumber: { type: Type.STRING, description: "رقم لوحة السيارة (استخرجه بالترتيب البصري المحض من اليمين لليسار، مثال: أ ب ج 123)" },
    count: { type: Type.STRING, description: "العدد أو العداد المعروض في الفاتورة" },
    carType: { type: Type.STRING, description: "نوع السيارة أو موديلها" },
    branch: { type: Type.STRING, description: "اسم المنطقة أو الفرع (مثل الدمام، جدة، الخبر، الرياض، الخ)" },
    itemsDescription: { type: Type.STRING, description: "وصف موجز للأصناف المباعة أو الخدمات المقدمة" },
    subTotal: { type: Type.NUMBER, description: "المبلغ الإجمالي قبل الضريبة" },
    taxAmount: { type: Type.NUMBER, description: "مبلغ الضريبة (VAT)" },
    totalAmount: { type: Type.NUMBER, description: "المبلغ الإجمالي النهائي شامل الضريبة" },
    notes: { type: Type.STRING, description: "أي ملاحظات إضافية هامة" },
    locations: {
      type: Type.OBJECT,
      description: "إحداثيات المربعات المحيطة لكل حقل كـ [ymin, xmin, ymax, xmax] (قيم بين 0-1000)",
      properties: {
        invoiceNumber: { type: Type.ARRAY, items: { type: Type.NUMBER }, description: "[ymin, xmin, ymax, xmax]" },
        date: { type: Type.ARRAY, items: { type: Type.NUMBER } },
        plateNumber: { type: Type.ARRAY, items: { type: Type.NUMBER } },
        count: { type: Type.ARRAY, items: { type: Type.NUMBER } },
        carType: { type: Type.ARRAY, items: { type: Type.NUMBER } },
        branch: { type: Type.ARRAY, items: { type: Type.NUMBER } },
        itemsDescription: { type: Type.ARRAY, items: { type: Type.NUMBER } },
        totalAmount: { type: Type.ARRAY, items: { type: Type.NUMBER } },
      }
    }
  },
  required: ["invoiceNumber", "date", "totalAmount"],
};

export async function analyzeInvoiceAction(
  text: string, 
  base64Image?: string,
  extraFields: string[] = [],
  hintLocations?: Record<string, number[]>
): Promise<Partial<InvoiceData> & { error?: string }> {
  
  const dynamicProps: any = { ...INVOICE_SCHEMA.properties };
  extraFields.forEach(field => {
    if (field && !dynamicProps[field]) {
      dynamicProps[field] = { type: Type.STRING, description: `استخرج قيمة الحقل: ${field}` };
    }
  });

  const hintSnippet = hintLocations ? `
    تنبيه فائق الأهمية (التدريب اليدوي): تم تحديد مواقع الحقول التالية يدوياً من قبل المستخدم. استخدم هذه الإحداثيات كمناطق بحث أساسية لاستخراج النص الصحيح:
    ${Object.entries(hintLocations).map(([field, box]) => `- ${field}: [${box.join(', ')}]`).join('\n')}
    ` : '';

  const prompt = `
    أنت محلل مالي دقيق جداً وخبير في تحديد المواقع البصرية. قم باستخراج البيانات من هذه الفاتورة المرفقة.
    
    ${hintSnippet}

    قواعد التصنيف الهامة:
    1. حقل "branch" (الفرع/المنطقة): هذا الحقل يجب أن يستخرج حصراً من سطر وصف السيارة إذا وجد فاصل (/) أو من خانة الموقع داخل الجدول.
    2. حقل "carType" (نوع السيارة): استخرج اسم وموديل السيارة فقط.
    3. حقل "plateNumber" (رقم اللوحة): استخرج الحروف بالترتيب البصري من اليمين لليسار.
    4. حقل "itemsDescription" (وصف الأصناف): استخرج الأصناف على شكل قائمة مرقمة.
    5. منع التصحيح التلقائي للأسماء.
    6. قاعدة التاريخ: رقمين مثل "26" تعني 2026.
    
    يجب أن تكون النتيجة بتنسيق JSON مطابق للمخطط الموفر.
  `;

  const parts: any[] = [{ text: prompt }];
  if (base64Image) {
    parts.push({
      inlineData: {
        mimeType: "image/jpeg",
        data: base64Image
      }
    });
  }
  parts.push({ text: `محتوى النص المستخرج:\n${text}` });

  try {
    const response = await ai.models.generateContent({
      model: "gemini-1.5-flash",
      contents: [
        {
          role: "user",
          parts: parts
        }
      ],
      config: {
        responseMimeType: "application/json",
        responseSchema: {
          type: Type.OBJECT,
          properties: dynamicProps,
        },
      },
    });

    const rawText = response.text || "{}";
    console.log("Gemini raw response:", rawText.substring(0, 200));
    const result = JSON.parse(rawText);
    return result;
  } catch (error: any) {
    console.error("Gemini Server Action Error:", error?.message || error);
    console.error("Full error:", JSON.stringify(error, null, 2));
    return { error: `فشل في تحليل الفاتورة: ${error?.message || 'خطأ غير معروف'}` };
  }
}
