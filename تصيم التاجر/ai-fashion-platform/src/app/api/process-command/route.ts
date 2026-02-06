import { NextResponse } from "next/server";
import { getGeminiModel } from "@/lib/gemini";

export async function POST(req: Request) {
    try {
        const { command, currentDesign, profile } = await req.json();
        const model = getGeminiModel();

        const prompt = `
      Merchant: ${profile.name} from ${profile.region}.
      Design State: ${JSON.stringify(currentDesign)}.
      User Command: "${command}".
      
      Task: Update the design state based on the command and local taste.
      Example: If user says "Make it luxurious", and region is Riyadh, change fabric to 'Velvet' or color to 'Black'.
      
      Output JSON: 
      { 
        "updates": { "color": "...", "fabric": "..." }, 
        "reply": "Reply to merchant in Arabic" 
      }
    `;

        const result = await model.generateContent(prompt);
        return NextResponse.json(JSON.parse(result.response.text()));
    } catch (error) {
        console.error("Gemini API Error:", error);
        return NextResponse.json({ error: "Failed to process command" }, { status: 500 });
    }
}
