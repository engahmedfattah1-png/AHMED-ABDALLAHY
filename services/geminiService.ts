import { GoogleGenAI } from "@google/genai";
import { NetworkSegment } from "../types";

export const getProjectInsights = async (segments: NetworkSegment[]) => {
  // Safer API Key initialization
  const apiKey = process.env.API_KEY;
  if (!apiKey || apiKey.length === 0) {
    console.warn("Gemini API Key is missing in environment variables.");
    return "خدمة التحليل الذكي غير متوفرة حالياً (مفتاح API غير مضبوط).";
  }

  const ai = new GoogleGenAI({ apiKey });
  
  const dataSummary = segments.map(s => ({
    name: s.name,
    type: s.type,
    status: s.status,
    progress: s.completionPercentage,
    length: s.length
  }));

  const prompt = `بصفتك مهندس بنية تحتية خبير، حلل البيانات التالية لمشروع شبكات مياه وصرف صحي وقدم تقريراً مختصراً باللغة العربية يشمل:
  1. حالة الإنجاز العامة.
  2. تحديد المعوقات المحتملة بناءً على الحالة.
  3. توصيات لتحسين معدلات التنفيذ.
  
  البيانات: ${JSON.stringify(dataSummary)}`;

  try {
    const response = await ai.models.generateContent({
      model: 'gemini-3-flash-preview',
      contents: prompt,
      config: {
        thinkingConfig: { thinkingBudget: 0 }
      }
    });
    return response.text || "لم يتم استلام رد نصي من النموذج.";
  } catch (error) {
    console.error("Gemini Error:", error);
    return "عذراً، لم نتمكن من تحليل البيانات حالياً. يرجى المحاولة لاحقاً.";
  }
};