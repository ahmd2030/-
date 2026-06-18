/**
 * @license
 * SPDX-License-Identifier: Apache-2.0
 */

import { GoogleGenAI, Type } from "@google/genai";
import { InvoiceData } from "../types";

const ai = new GoogleGenAI({ apiKey: process.env.GEMINI_API_KEY });

const INVOICE_SCHEMA = {
  type: Type.OBJECT,
  properties: {
    invoiceNumber: { type: Type.STRING, description: "رقم الفاتورة" },
    date: { type: Type.STRING, description: "تاريخ الفاتورة بتنسيق YYYY-MM-DD" },
    plateNumber: { type: Type.STRING, description: "رقم لوحة السيارة (استخرجه بالترتيب البصري المحض من اليمين لليسار، مثال: أ ب ج 123)" },
    count: { type: Type.STRING, description: "العدد أو العداد المعروض في الفاتورة" },
    carType: { type: Type.STRING, description: "نوع السيارة أو موديلها" },
    branch: { type: Type.STRING, description: "اسم المنطقة أو الفرع (مثل الدمام، جدة، الخبر، الرياض، الخ)" },
    oilName: { type: Type.STRING, description: "اسم أو نوع الزيت (مثل 15W40، 5W30)" },
    oilQty: { type: Type.STRING, description: "كمية الزيت" },
    oilPrice: { type: Type.STRING, description: "سعر الزيت الإجمالي" },
    oilFilterName: { type: Type.STRING, description: "اسم فلتر الزيت وكوده" },
    oilFilterQty: { type: Type.STRING, description: "كمية فلتر الزيت" },
    oilFilterPrice: { type: Type.STRING, description: "سعر فلتر الزيت" },
    airFilterName: { type: Type.STRING, description: "اسم فلتر الهواء" },
    airFilterQty: { type: Type.STRING, description: "كمية فلتر الهواء" },
    airFilterPrice: { type: Type.STRING, description: "سعر فلتر الهواء" },
    acFilterName: { type: Type.STRING, description: "اسم فلتر المكيف" },
    acFilterQty: { type: Type.STRING, description: "كمية فلتر المكيف" },
    acFilterPrice: { type: Type.STRING, description: "سعر فلتر المكيف" },
    dieselFilterName: { type: Type.STRING, description: "اسم فلتر الديزل" },
    dieselFilterQty: { type: Type.STRING, description: "كمية فلتر الديزل" },
    dieselFilterPrice: { type: Type.STRING, description: "سعر فلتر الديزل" },
    tiresName: { type: Type.STRING, description: "وصف أو نوع الكفرات" },
    tiresQty: { type: Type.STRING, description: "كمية الكفرات" },
    tiresPrice: { type: Type.STRING, description: "سعر الكفرات" },
    wipersName: { type: Type.STRING, description: "وصف المساحات" },
    wipersQty: { type: Type.STRING, description: "كمية المساحات" },
    wipersPrice: { type: Type.STRING, description: "سعر المساحات" },
    batteriesName: { type: Type.STRING, description: "وصف البطاريات" },
    batteriesQty: { type: Type.STRING, description: "كمية البطاريات" },
    batteriesPrice: { type: Type.STRING, description: "سعر البطاريات" },
    servicesName: { type: Type.STRING, description: "وصف الخدمات كأجور اليد أو الصيانة" },
    servicesQty: { type: Type.STRING, description: "كمية الخدمات" },
    servicesPrice: { type: Type.STRING, description: "سعر الخدمات" },
    sparePartsName: { type: Type.STRING, description: "وصف قطع الغيار الأخرى غير الفلاتر والزيوت" },
    sparePartsQty: { type: Type.STRING, description: "كمية قطع الغيار" },
    sparePartsPrice: { type: Type.STRING, description: "سعر قطع الغيار" },
    subTotal: { type: Type.NUMBER, description: "المبلغ الإجمالي قبل الضريبة" },
    taxAmount: { type: Type.NUMBER, description: "مبلغ الضريبة (VAT)" },
    totalAmount: { type: Type.NUMBER, description: "المبلغ الإجمالي النهائي شامل الضريبة" },
    notes: { type: Type.STRING, description: "أي ملاحظات إضافية هامة" }
  },
  required: ["invoiceNumber", "date", "totalAmount"],
};

export async function analyzeInvoice(
  text: string, 
  base64Image?: string,
  extraFields: string[] = [],
  hintLocations?: Record<string, number[]>
): Promise<Partial<InvoiceData>> {
  
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
       - "قاعدة ذهبية": إذا رأيت في الجدول "جي ام سي / الصفر الدولي"، سجل "الصفر الدولي" في حقل الـ branch، وسجل "جي ام سي" في حقل الـ carType.
       - لا تستخدم اسم المركز الرئيسي (مثل مركز الدانة) كفرع إذا كان هناك فرع محدد مسجل في سطر وصف السيارة.
    2. حقل "carType" (نوع السيارة): استخرج اسم وموديل السيارة فقط (مثل: جي ام سي جراند 2014).
       - "تنبيه صارم": إذا قمت باستخراج اسم الفرع (مثل "الصفر الدولي") ووضعه في حقل branch، فيجب "حذفه تماماً" من حقل carType. لا تكرر اسم الفرع بجانب نوع السيارة في الاكسل.
    3. حقل "plateNumber" (رقم اللوحة): هذا الحقل فائق الحساسية. في اللوحات السعودية، تظهر الحروف أولاً من جهة اليمين ثم الأرقام. 
       - القاعدة الذهبية: استخرج الحروف بالترتيب الذي تراه عيناك من اليمين إلى اليسار (مثال: إذا رأيت "أ ل ب" سجلها "أ ل ب").
       - "تحذير": لا تقم بعكس الحروف. إذا كانت اللوحة "أ ل ب 123" لا تسجلها "ب ل أ 123". التزم بالترتيب البصري الذي تراه عيناك من اليمين.
    4. استخراج الأصناف (قاعدة هامة جداً): قم بتصنيف الأصناف الموجودة في الفاتورة ووضعها في الحقول المخصصة لها بدقة.
       - الزيوت: ضع نوع الزيت في oilName، وكميته في oilQty وسعره في oilPrice.
       - فلتر الزيت: ضع الكود في oilFilterName، وكميته في oilFilterQty وسعره في oilFilterPrice.
       - وبالمثل لباقي الفلاتر (هواء، مكيف، ديزل) والكفرات والمساحات والبطاريات.
       - أي أجور يد أو صيانة ضعها في خدمات (servicesName/Qty/Price).
       - أي قطع غيار أخرى لا تنتمي للفئات السابقة ضعها في قطع غيار (sparePartsName/Qty/Price).
       - إذا كان هناك أكثر من صنف في نفس الفئة (مثلاً قطعتي غيار مختلفتين)، اجمع أسمائهم بفاصلة (+) واجمع كمياتهم أو أسعارهم بنفس الطريقة (مثال: Name: "بوجي + قماش"، Qty: "4 + 1"، Price: "100 + 150").
       - "تنبيه فائق الأهمية": يمنع استخراج أرقام الحسابات أو الأكواد الطويلة (8 أرقام).
    5. منع التصحيح التلقائي للأسماء: لا تقم بتصحيح الكلمات التي تبدو كأسماء علامات تجارية. 
       - مثال: كلمة "صني" تُكتب كما هي.
    6. قاعدة التاريخ: إذا رأيت العام مكتوباً برقمين مثل "26"، فالمقصود هو "2026".
    7. تنبيه صارم: لا تخلط بين اسم الفرع ونوع السيارة.
    
    أماكن الحقول المتوقعة للأهمية:
    - رقم الفاتورة (invoiceNumber): الرقم الموجود أمام أو تحت "رقم الفاتورة".
    - التاريخ (date): القيمة الزمنية بجانب "التاريخ".
    - رقم اللوحة (plateNumber): النص في عمود "رقم اللوحة".
    - العداد (count): الرقم في عمود "عداد السيارة".
    - نوع السيارة (carType): النص الكامل في عمود "نوع السيارة" بالجدول.
    - الفرع (branch): النص في الترويسة تحت "مركز / فرع".
    - الإجمالي (totalAmount): الرقم الكبير أسفل الجدول جهة اليسار.
    
    قائمة الفروع المعتمدة (يجب مطابقة الاسم مع أحد هذه الخيارات إذا وجد، وإذا لم يوجد استخرج الاسم بدقة):
    - المنطقة الشرقية: الدانة، مركز الدانة، الدمام، العنود، بقيق، الجبيل 1، الخبر الدولي، القطيف، الخفجي، رأس تنورة – جبل العر، الخضرية، الشعلة، أبو حدرية، أبو حدرية مشالن، الصفر الدولي.
    - الرياض: الرياض الحمراء، الرياض الملقا، الرياض، خريم.
    - مكة: مكة، مكة القمة.
    - القصيم / حائل / الجنوب: حائل، نضير الغد – حائل، خميس مشيط – البوابة، أبهاء / أبها.
    - الأحساء: الأحساء، الأحساء جولدن.
    - مناطق أخرى: الخير، حفر الباطن.

    قائمة السيارات المعتمدة (يجب مطابقة الاسم مع أحد هذه الخيارات إذا وجد):
    ايسوزو بك اب، جي ام سي ميكروباص، شانجان، كيا سيراتو، جي ام سي بك اب، ايسوزو بكب، كيا اوبتيما، تويوتا بيك اب، ايسوزو دماكس، جي ام سي جراند، جي ام سي فيجوس، هافال، تويوتا فورشنر، كيا تيلورايد، هونداي توسان، تويوتا يارس، كيا، هونداي اكسنت، سايك موتور ام بي، فوتون ميني باص، سوزوكي ديزاير، كيا بيجاس، ميتسوبشي بيك اب، شيفروليه تاهو، كيا سبورتاج، هونداي ستاريا، جينغما كوستر، سايك موتور جي، ام جي سايك موتور، تويوتا فان، فورد تورس، فوتون ميكروباص، جي ام سي شاصية، نيسان بترول، هونداي النترا، هافال جوليان، تويوتا كورولا، نيسان اورفان، تويوتا كامري، كيا سورينتو، لينك كو، كيا كرنفال، هونداي ستار جيزر، ايسوزو دينة ثلاجة، فنغون اي اكس فايف، كيا كارنس، جيتور اكس، نيسان كيكس، رينو دوستر، جي ام سي فان، هافال H6، شفروليه كابتيفا، كامري، جيلي كول راي، تويوتا هايس، تويوتا هيلكس، فورد اكسبلورر، كيا سونت، تويوتا راف فور، شانجان يوني في، نيسان اكستيرا، هونداي حافلة، تورس سيدان، نيسان باص، نيسان باترول، جريت وول غمارتين، تويوتا لاندكروزر، فورد تيريتوري، اشوك لي لاند حافلة، هونداي ستارجيزر، ايسوزو ديماكس، كيا سلتوس، كيا كي فور، نيسان X‑Trail.
    - إذا وجدت سيارة غير مذكورة في القائمة أعلاه، اكتب الاسم بدقة كما هو ظاهر في الفاتورة.

    قواعد هامة للإخراج:
    1. إذا كانت البيانات غير واضحة، غير موجودة، أو هناك شك فيها، استبدل القيمة دائماً بـ "#######" ولا تضع إحداثيات لها.
    2. التاريخ: استخرجه بتنسيق YYYY-MM-DD (مثل 2024-05-12).
    3. الأعمدة المطلوبة في الإكسل هي: ${extraFields.join(' | ')}. تأكد من مطابقة هذه الحقول.
    4. اترك حقل الملاحظات (notes) فارغاً تماماً "".
    5. استخرج رقم اللوحة بدقة "اللوحة".
    
    يجب أن تكون النتيجة بتنسيق JSON مطابق للمخطط الموفر.
  `;

  const contents: any[] = [{ text: prompt }];
  if (base64Image) {
    contents.push({
      inlineData: {
        mimeType: "image/jpeg",
        data: base64Image
      }
    });
  }
  contents.push({ text: `محتوى النص المستخرج:\n${text}` });

  let lastError;
  const maxRetries = 5;
  const baseDelay = 5000; // 5 seconds

  for (let attempt = 0; attempt < maxRetries; attempt++) {
    try {
      const response = await ai.models.generateContent({
        model: "gemini-3-flash-preview",
        contents: { parts: contents.map(c => typeof c === 'string' ? { text: c } : c) },
        config: {
          responseMimeType: "application/json",
          responseSchema: {
            type: Type.OBJECT,
            properties: dynamicProps,
          },
        },
      });

      const result = JSON.parse(response.text || "{}");
      return result;
    } catch (error: any) {
      lastError = error;
      const errorMsg = error?.message || "";
      const isRateLimit = errorMsg.includes("429") || 
                          errorMsg.toLowerCase().includes("quota") || 
                          errorMsg.toLowerCase().includes("rate limit") ||
                          errorMsg.toLowerCase().includes("resource_exhausted");
      
      if (isRateLimit && attempt < maxRetries - 1) {
        // Exponential backoff with jitter
        const delay = (baseDelay * Math.pow(2, attempt)) + (Math.random() * 1000);
        console.warn(`Gemini rate limit hit. Retrying in ${Math.round(delay)}ms... (Attempt ${attempt + 1}/${maxRetries})`);
        await new Promise(resolve => setTimeout(resolve, delay));
        continue;
      }
      
      console.error("Gemini Analysis Error:", error);
      if (isRateLimit) {
        throw new Error("عذراً، تم تجاوز حدود الطلبات المسموحة حالياً. يرجى الانتظار لمدة 60 ثانية قبل محاولة معالجة المزيد من الملفات.");
      }
      throw new Error("فشل في تحليل الفاتورة. تأكد من وضوح الملف.");
    }
  }
  throw lastError;
}
