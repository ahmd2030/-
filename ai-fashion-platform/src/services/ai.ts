
import { GoogleGenerativeAI } from "@google/generative-ai";
import { DesignState } from "@/store/merchantStore";

const apiKey = process.env.NEXT_PUBLIC_GEMINI_API_KEY || "YOUR_API_KEY";
const genAI = new GoogleGenerativeAI(apiKey);

const model = genAI.getGenerativeModel({
  model: "gemini-1.5-flash",
  systemInstruction: `
    You are an expert local fashion designer assistant for Saudi Arabia and the Gulf.
    Your role is to interpret natural language commands from a merchant and convert them into structured design updates.
    
    The output must be a valid JSON object with the following schema:
    {
      "reply": "A friendly, short response in Saudi dialect (Najdi/Hejazi) confirming the action.",
      "updates": {
        "baseColor": "hex code or null",
        "fabric": "fabric name or null",
        "neckType": "neck style or null (e.g., V-Neck, Square, Round)",
        "sleeveType": "sleeve style or null (e.g., Long, Puff, Loose, Sleeveless)",
        "type": "item type or null (e.g., Abaya, Dress)"
      }
    }
    
    Context:
    - "واسع" usually means "Loose" or "Butterfly" fit.
    - "فخم" implies colors like Royal Black, Burgundy, or materials like Velvet/Silk.
    - "رسمي" implies "Blazer" or "Classic Abaya".
    - "جدة" implies lighter fabrics (Linen/Chiffon) and colorful designs.
    - "الرياض" implies classic, darker, or modest cuts.

    Example User: "أبي لون كحلي وقماش بارد عشان الصيف"
    Example Output:
    {
      "reply": "أبشري، اخترت لك الكحلي مع قماش كتان بارد ومناسب لأجوائنا.",
      "updates": { "baseColor": "#1A365D", "fabric": "كتان (Linen)" }
    }
  `,
});

export async function processVoiceCommand(transcript: string, currentDesign: DesignState) {
  try {
    const chat = model.startChat({
      history: [
        {
          role: "user",
          parts: [{ text: `Current Design State: ${JSON.stringify(currentDesign)}` }],
        },
      ],
    });

    const result = await chat.sendMessage(transcript);
    const responseText = result.response.text();

    // Clean up potential markdown code blocks from response
    const jsonString = responseText.replace(/```json/g, '').replace(/```/g, '').trim();

    return JSON.parse(jsonString);
  } catch (error) {
    console.error("AI Service Error:", error);
    return {
      reply: "عذراً، ما فهمت عليك زين. ممكن تعيد؟",
      updates: {}
    };
  }
}

export async function generateFashionVariants(region: string, currentDesign: DesignState) {
  const prompt = `
    作为 خبير أزياء محلي (Local Fashion Expert) for ${region}, generate 4 distinct, creative fashion variants based on the current trend.
    
    Current State: ${JSON.stringify(currentDesign)}
    
    Requirements:
    1. Variant 1: "Trend" (The most popular style currently in ${region}).
    2. Variant 2: "Luxury" (High-end fabrics like Silk/Velvet, royal colors).
    3. Variant 3: "Casual" (Daily wear, comfortable fabrics like Linen/Cotton).
    4. Variant 4: "Heritage" (Traditional touch, authentic colors).

    Output JSON Schema:
    {
      "variants": [
        {
          "title": "Short catchy Arabic title (e.g., فخامة نجدية)",
          "color": "Hex code",
          "fabric": "Fabric Name",
          "description": "Short reasoning"
        }
      ]
    }
    `;

  try {
    const result = await model.generateContent(prompt);
    const responseText = result.response.text();
    const jsonString = responseText.replace(/```json/g, '').replace(/```/g, '').trim();
    return JSON.parse(jsonString);
  } catch (error) {
    console.error("AI Generation Error:", error);
    // Fallback data if AI fails
    return {
      variants: [
        { title: "كلاسيك فخم", color: "#000000", fabric: "حرير", description: "خيار آمن وأنيق" },
        { title: "ترند الموسم", color: "#F5F5DC", fabric: "كتان", description: "لإطلالة عصرية" },
        { title: "لمسة تراثية", color: "#800020", fabric: "مخمل", description: "عودة للجذور" },
        { title: "أزرق ملكي", color: "#1A365D", fabric: "شيفون", description: "مناسب للسهرات" }
      ]
    };
  }
}
