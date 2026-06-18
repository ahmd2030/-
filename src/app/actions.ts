"use server";

import { GoogleGenerativeAI, SchemaType } from "@google/generative-ai";
import { InvoiceData } from "@/types";

// Clean the API key dynamically at runtime inside the server action to support overrides.


const INVOICE_SCHEMA = {
  type: SchemaType.OBJECT,
  properties: {
    invoiceNumber: { type: SchemaType.STRING, description: "رقم الفاتورة" },
    date: { type: SchemaType.STRING, description: "تاريخ الفاتورة بتنسيق YYYY-MM-DD" },
    plateNumber: { type: SchemaType.STRING, description: "رقم لوحة السيارة" },
    count: { type: SchemaType.STRING, description: "العداد أو الكمية" },
    carType: { type: SchemaType.STRING, description: "نوع السيارة" },
    branch: { type: SchemaType.STRING, description: "الفرع" },
    oilName: { type: SchemaType.STRING, description: "اسم أو نوع الزيت (مثل 15W40، 5W30)" },
    oilQty: { type: SchemaType.STRING, description: "كمية الزيت" },
    oilPrice: { type: SchemaType.STRING, description: "سعر الزيت الإجمالي" },
    oilFilterName: { type: SchemaType.STRING, description: "اسم فلتر الزيت وكوده" },
    oilFilterQty: { type: SchemaType.STRING, description: "كمية فلتر الزيت" },
    oilFilterPrice: { type: SchemaType.STRING, description: "سعر فلتر الزيت" },
    airFilterName: { type: SchemaType.STRING, description: "اسم فلتر الهواء" },
    airFilterQty: { type: SchemaType.STRING, description: "كمية فلتر الهواء" },
    airFilterPrice: { type: SchemaType.STRING, description: "سعر فلتر الهواء" },
    acFilterName: { type: SchemaType.STRING, description: "اسم فلتر المكيف" },
    acFilterQty: { type: SchemaType.STRING, description: "كمية فلتر المكيف" },
    acFilterPrice: { type: SchemaType.STRING, description: "سعر فلتر المكيف" },
    dieselFilterName: { type: SchemaType.STRING, description: "اسم فلتر الديزل" },
    dieselFilterQty: { type: SchemaType.STRING, description: "كمية فلتر الديزل" },
    dieselFilterPrice: { type: SchemaType.STRING, description: "سعر فلتر الديزل" },
    tiresName: { type: SchemaType.STRING, description: "وصف أو نوع الكفرات (مثل هانكوك، يوكوهاما)" },
    tiresQty: { type: SchemaType.STRING, description: "كمية الكفرات" },
    tiresPrice: { type: SchemaType.STRING, description: "سعر الكفرات" },
    wipersName: { type: SchemaType.STRING, description: "وصف المساحات" },
    wipersQty: { type: SchemaType.STRING, description: "كمية المساحات" },
    wipersPrice: { type: SchemaType.STRING, description: "سعر المساحات" },
    batteriesName: { type: SchemaType.STRING, description: "وصف البطاريات (مثل هانكوك، باناسونيك، اسيديلكو)" },
    batteriesQty: { type: SchemaType.STRING, description: "كمية البطاريات" },
    batteriesPrice: { type: SchemaType.STRING, description: "سعر البطاريات" },
    servicesName: { type: SchemaType.STRING, description: "أجور يد أو صيانة (مثل أجور تغيير، فحص)" },
    servicesQty: { type: SchemaType.STRING, description: "كمية الخدمات" },
    servicesPrice: { type: SchemaType.STRING, description: "سعر الخدمات" },
    sparePartsName: { type: SchemaType.STRING, description: "قطع غيار أخرى (مثل فحمات، بواجي، قماش)" },
    sparePartsQty: { type: SchemaType.STRING, description: "كمية قطع الغيار" },
    sparePartsPrice: { type: SchemaType.STRING, description: "سعر قطع الغيار" },
    subTotal: { type: SchemaType.NUMBER, description: "المبلغ الإجمالي قبل الضريبة" },
    taxAmount: { type: SchemaType.NUMBER, description: "مبلغ الضريبة" },
    totalAmount: { type: SchemaType.NUMBER, description: "الإجمالي بعد الضريبة" },
    notes: { type: SchemaType.STRING, description: "ملاحظات" }
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
    أنت محلل مالي دقيق جداً وخبير في تصنيف الأصناف لقطع الغيار والصيانة. استخرج البيانات من الفاتورة بدقة.
    
    ${hintSnippet}
    ${knowledgeSnippet}
    
    قواعد التصنيف الهامة جداً (الرجاء الالتزام بها حرفياً):
    1. حقل "branch": استخرجه من أعلى الفاتورة (مثل الرياض، الدمام).
    2. حقل "carType": نوع وموديل السيارة فقط.
    3. الزيوت (oilName, oilQty, oilPrice): أي شيء يحتوي على 15W40, 5W30, زيت, Oil. مثال: "زيت سوبر جي تي".
    4. فلاتر الزيت (oilFilterName, ...): أي فلتر يخص الزيت أو الماكينة (Oil Filter, سيفون).
    5. فلاتر الهواء (airFilterName, ...): فلتر هواء الماكينة.
    6. فلاتر المكيف (acFilterName, ...): فلتر مكيف الغمارة.
    7. فلاتر الديزل (dieselFilterName, ...): صفاية ديزل، فلتر ديزل.
    8. الكفرات (tiresName, ...): إطارات، كفر، هانكوك، دنلوب، يوكوهاما.
    9. المساحات (wipersName, ...): مساحة زجاج، ربل مساحة.
    10. البطاريات (batteriesName, ...): بطارية، اسيديلكو، هانكوك (إذا كتب بجانبها امبير أو بطارية).
    11. الخدمات (servicesName, ...): أجور يد، شغل يد، تغيير، فحص، صيانة، ميزان.
    12. قطع الغيار (sparePartsName, ...): أي صنف آخر غير مذكور أعلاه (مثل فحمات، هوبات، قماش، بواجي، سير).
    
    لجميع الأصناف، استخرج الاسم (Name) والكمية (Qty) والسعر الإجمالي للصنف (Price). إذا لم توجد كمية، ضع "1".
    يجب أن تكون النتيجة بتنسيق JSON حصراً.
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
    if (Array.isArray(parsed.itemsDescription)) {
      parsed.itemsDescription = parsed.itemsDescription.join('\n');
    }
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
      if (Array.isArray(parsed.itemsDescription)) {
        parsed.itemsDescription = parsed.itemsDescription.join('\n');
      }
      return parsed;
    } catch (secondError: any) {
      console.error("Gemini 3.5-flash fallback also failed:", secondError?.message || secondError);
      console.error("Full error:", JSON.stringify(secondError, null, 2));
      return { error: `فشل في تحليل الفاتورة: ${secondError?.message || 'خطأ غير معروف'}` };
    }
  }
}
