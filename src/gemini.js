import { GoogleGenAI } from "@google/genai";

function clean(value) {
  return String(value || "").trim();
}

function buildPrompt(details) {
  return `You are helping a teacher create a clear classroom lesson plan.

Create a complete lesson plan using this information:

Subject: ${clean(details.subject)}
Topic: ${clean(details.topic)}
Grade level: ${clean(details.gradeLevel)}
Lesson length: ${clean(details.lessonLength)}
Learning goal: ${clean(details.learningGoal)}
Teaching style: ${clean(details.lessonStyle)}

Format the answer with these exact section headings:
1. Lesson Title
2. Objective
3. Materials
4. Warm-Up
5. Direct Instruction
6. Guided Practice
7. Independent Practice
8. Assessment
9. Differentiation
10. Exit Ticket

Keep it practical, classroom-friendly, and easy for a student teacher to explain.`;
}

export async function generateLessonPlan(details) {
  const apiKey = process.env.GEMINI_API_KEY;
  const model = process.env.GEMINI_MODEL || "gemini-2.5-flash";

  if (!apiKey) {
    throw new Error("GEMINI_API_KEY is missing. Add it to your .env file or Render environment variables.");
  }

  const ai = new GoogleGenAI({ apiKey });
  const prompt = buildPrompt(details);
  const response = await ai.models.generateContent({ model, contents: prompt });
  const text = response.text || "";

  if (!text.trim()) {
    throw new Error("Gemini returned an empty lesson plan. Try again with a more specific topic.");
  }

  return text.trim();
}
