"use server";

import { GoogleGenerativeAI, SchemaType } from "@google/generative-ai";
import { InvoiceData } from "@/types";

// Clean the API key dynamically at runtime inside the server action to support overrides.


const INVOICE_SCHEMA = {
  type: SchemaType.OBJECT,
  properties: {
    invoiceNumber: { type: SchemaType.STRING, description: "رقم الفاتورة" },
    date: { type: SchemaType.STRING, description: "تاريخ الفاتورة بتنسيق YYYY-MM-DD" },
    plateNumber: { type: SchemaType.STRING, description: "رقم لوحة السيارة (استخرجه بالترتيب البصري المحض من اليمين لليسار، مثال: أ ب ج 123)" },
    count: { type: SchemaType.STRING, description: "العدد أو العداد المعروض في الفاتورة" },
    carType: { type: SchemaType.STRING, description: "نوع السيارة أو موديلها" },
    branch: { type: SchemaType.STRING, description: "اسم المنطقة أو الفرع (مثل الدمام، جدة، الخبر، الرياض، الخ)" },
    itemsDescription: { type: SchemaType.STRING, description: "وصف موجز للأصناف المباعة أو الخدمات المقدمة" },
    subTotal: { type: SchemaType.NUMBER, description: "المبلغ الإجمالي قبل الضريبة" },
    taxAmount: { type: SchemaType.NUMBER, description: "مبلغ الضريبة (VAT)" },
    totalAmount: { type: SchemaType.NUMBER, description: "المبلغ الإجمالي النهائي شامل الضريبة" },
    notes: { type: SchemaType.STRING, description: "أي ملاحظات إضافية هامة" },
    locations: {
      type: SchemaType.OBJECT,
      description: "إحداثيات المربعات المحيطة لكل حقل كـ [ymin, xmin, ymax, xmax] (قيم بين 0-1000)",
      properties: {
        invoiceNumber: { type: SchemaType.ARRAY, items: { type: SchemaType.NUMBER }, description: "[ymin, xmin, ymax, xmax]" },
        date: { type: SchemaType.ARRAY, items: { type: SchemaType.NUMBER } },
        plateNumber: { type: SchemaType.ARRAY, items: { type: SchemaType.NUMBER } },
        count: { type: SchemaType.ARRAY, items: { type: SchemaType.NUMBER } },
        carType: { type: SchemaType.ARRAY, items: { type: SchemaType.NUMBER } },
        branch: { type: SchemaType.ARRAY, items: { type: SchemaType.NUMBER } },
        itemsDescription: { type: SchemaType.ARRAY, items: { type: SchemaType.NUMBER } },
        totalAmount: { type: SchemaType.ARRAY, items: { type: SchemaType.NUMBER } },
      }
    }
  },
  required: [],
};

export async function analyzeInvoiceAction(
  text: string, 
  base64Image?: string,
  extraFields: string[] = [],
  hintLocations?: Record<string, number[]>,
  knowledge?: Record<string, string[]>, // Past corrections
  customApiKey?: string
): Promise<Partial<InvoiceData> & { error?: string }> {
  
  const rawKey = customApiKey || process.env.GEMINI_API_KEY || "";
  const apiKey = rawKey.replace(/[^\x20-\x7E]/g, '').trim();

  if (!apiKey) {
    return { error: "مفتاح API الخاص بـ Gemini (GEMINI_API_KEY) غير متاح. يرجى تهيئة مفتاح API في الإعدادات أو ملف .env للبدء." };
  }

  const genAI = new GoogleGenerativeAI(apiKey);

  const dynamicProps: any = { ...INVOICE_SCHEMA.properties };
  extraFields.forEach(field => {
    if (field && !dynamicProps[field]) {
      dynamicProps[field] = { type: SchemaType.STRING, description: `استخرج قيمة الحقل: ${field}` };
    }
  });

  const hintSnippet = hintLocations ? `
    تنبيه فائق الأهمية (التدريب اليدوي): تم تحديد مواقع الحقول التالية يدوياً من قبل المستخدم. استخدم هذه الإحداثيات كمناطق بحث أساسية لاستخراج النص الصحيح:
    ${Object.entries(hintLocations).map(([field, box]) => `- ${field}: [${box.join(', ')}]`).join('\n')}
    ` : '';

  const knowledgeSnippet = knowledge ? `
    ذاكرة التعلم من المستخدم (تصحيحات سابقة): لقد قام المستخدم سابقاً بتصحيح قيم معينة، تعلم منها لتجنب تكرار الخطأ:
    ${Object.entries(knowledge).map(([field, examples]) => `- للحقل "${field}": يفضل المستخدم قيماً مثل [${examples.slice(-5).join(', ')}]`).join('\n')}
    ` : '';

  const prompt = `
    أنت محلل مالي دقيق جداً وخبير في تحديد المواقع البصرية. قم باستخراج البيانات من هذه الفاتورة المرفقة.
    
    ${hintSnippet}
    ${knowledgeSnippet}
    
    قواعد التصنيف الهامة:
    1. حقل "branch" (الفرع/المنطقة): هذا الحقل يجب أن يستخرج حصراً من سطر وصف السيارة إذا وجد فاصل (/) أو من خانة الموقع داخل الجدول.
    2. حقل "carType" (نوع السيارة): استخرج اسم وموديل السيارة فقط.
    3. حقل "plateNumber" (رقم اللوحة): استخرج الحروف بالترتيب البصري من اليمين لليسار.
    4. حقل "itemsDescription" (وصف الأصناف): استخرج كل صنف في سطر مستقل، واكتبه بصيغة "الكمية - اسم الصنف" (مثال: 8- زيت، 1- فلتر ديزل). إذا لم تكن الكمية مكتوبة، افترض أنها 1 واكتب "1- اسم الصنف". تأكد من وضع رقم الكمية في بداية السطر دائماً.
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
    const model = genAI.getGenerativeModel({
      model: "gemini-2.5-flash",
      generationConfig: {
        responseMimeType: "application/json",
        responseSchema: {
          type: SchemaType.OBJECT,
          properties: dynamicProps,
        },
      }
    });

    const result = await model.generateContent(parts);
    const response = await result.response;
    const rawText = response.text() || "{}";
    console.log("Gemini 2.5-flash raw response:", rawText.substring(0, 200));
    const parsed = JSON.parse(rawText);
    return parsed;
  } catch (firstError: any) {
    console.warn("Gemini 2.5-flash failed, attempting automatic fallback to gemini-3.5-flash...", firstError?.message || firstError);
    try {
      const fallbackModel = genAI.getGenerativeModel({
        model: "gemini-3.5-flash",
        generationConfig: {
          responseMimeType: "application/json",
          responseSchema: {
            type: SchemaType.OBJECT,
            properties: dynamicProps,
          },
        }
      });
      const result = await fallbackModel.generateContent(parts);
      const response = await result.response;
      const rawText = response.text() || "{}";
      console.log("Gemini 3.5-flash fallback raw response:", rawText.substring(0, 200));
      const parsed = JSON.parse(rawText);
      return parsed;
    } catch (secondError: any) {
      console.error("Gemini 3.5-flash fallback also failed:", secondError?.message || secondError);
      console.error("Full error:", JSON.stringify(secondError, null, 2));
      return { error: `فشل في تحليل الفاتورة: ${secondError?.message || 'خطأ غير معروف'}` };
    }
  }
}
