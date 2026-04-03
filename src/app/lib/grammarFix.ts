import { GoogleGenerativeAI } from "@google/generative-ai";

const genAI = new GoogleGenerativeAI(process.env.EXPO_PUBLIC_GEMINI_KEY!);

export const fixGrammar = async (text: string): Promise<string> => {
  const model = genAI.getGenerativeModel({ model: "gemini-2.5-flash" });
  const result = await model.generateContent(
    `Fix the grammar and spelling of this message. Return ONLY the corrected text, nothing else, no explanation:\n\n"${text}"`
  );
  return result.response.text().trim();
};
//const model = genAI.getGenerativeModel({ model: "" });