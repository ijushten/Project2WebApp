import { GoogleGenAI } from "@google/genai";

class LessonAiApiError extends Error {
  constructor(message, statusCode = 500) {
    super(message);
    this.name = "LessonAiApiError";
    this.statusCode = statusCode;
    this.isUserFacing = true;
  }
}

const TRY_AGAIN_MESSAGE = "The AI is busy right now. Please try again in a minute.";
const GENERAL_ERROR_MESSAGE = "The lesson could not be generated right now. Please try again.";

function clean(value) {
  return String(value || "").trim();
}

function sleep(ms) {
  return new Promise((resolve) => setTimeout(resolve, ms));
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

function readStatusCode(error) {
  const directCode = error?.status || error?.statusCode || error?.code;

  if (typeof directCode === "number") {
    return directCode;
  }

  const text = `${error?.message || ""} ${error?.cause?.message || ""}`;
  const match = text.match(/"code"\s*:\s*(\d{3})|\b(\d{3})\b/);

  if (match) {
    return Number(match[1] || match[2]);
  }

  return null;
}

function readErrorText(error) {
  return `${error?.message || ""} ${error?.cause?.message || ""}`.toLowerCase();
}

function isRetryableGeminiError(error) {
  const statusCode = readStatusCode(error);
  const text = readErrorText(error);

  return (
    statusCode === 429 ||
    statusCode === 500 ||
    statusCode === 502 ||
    statusCode === 503 ||
    statusCode === 504 ||
    text.includes("unavailable") ||
    text.includes("overloaded") ||
    text.includes("high demand") ||
    text.includes("resource exhausted")
  );
}

function makeFriendlyGeminiError(error) {
  const statusCode = readStatusCode(error);
  const text = readErrorText(error);

  if (
    statusCode === 429 ||
    statusCode === 500 ||
    statusCode === 502 ||
    statusCode === 503 ||
    statusCode === 504 ||
    text.includes("unavailable") ||
    text.includes("overloaded") ||
    text.includes("high demand") ||
    text.includes("resource exhausted") ||
    text.includes("quota")
  ) {
    return new LessonAiApiError(TRY_AGAIN_MESSAGE, statusCode || 503);
  }

  return new LessonAiApiError(GENERAL_ERROR_MESSAGE, statusCode || 500);
}

function getModelChoices() {
  const primaryModel = process.env.GEMINI_MODEL || "gemini-2.5-flash-lite";
  const fallbackModel = process.env.GEMINI_FALLBACK_MODEL || "gemini-2.5-flash-lite";

  return [...new Set([primaryModel, fallbackModel])];
}

async function generateWithModel(ai, model, prompt) {
  const maxAttempts = 3;

  for (let attempt = 1; attempt <= maxAttempts; attempt++) {
    try {
      const response = await ai.models.generateContent({ model, contents: prompt });
      const text = response.text || "";

      if (!text.trim()) {
        throw new LessonAiApiError(GENERAL_ERROR_MESSAGE, 500);
      }

      return text.trim();
    } catch (error) {
      if (error instanceof LessonAiApiError) {
        throw error;
      }

      const shouldRetry = isRetryableGeminiError(error);
      const isLastAttempt = attempt === maxAttempts;

      if (!shouldRetry || isLastAttempt) {
        throw error;
      }

      await sleep(attempt * 1500);
    }
  }
}

export async function generateLessonPlan(details) {
  const apiKey = process.env.GEMINI_API_KEY;

  if (!apiKey) {
    throw new LessonAiApiError(GENERAL_ERROR_MESSAGE, 500);
  }

  const ai = new GoogleGenAI({ apiKey });
  const prompt = buildPrompt(details);
  const models = getModelChoices();
  let lastError;

  for (const model of models) {
    try {
      return await generateWithModel(ai, model, prompt);
    } catch (error) {
      lastError = error;

      if (!isRetryableGeminiError(error)) {
        break;
      }
    }
  }

  throw makeFriendlyGeminiError(lastError);
}
