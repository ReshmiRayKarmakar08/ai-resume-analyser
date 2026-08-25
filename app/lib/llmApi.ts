import { GoogleGenerativeAI } from "@google/generative-ai";
import OpenAI from "openai";

export type LLMProvider = "groq" | "google" | "openai" | "openrouter" | "ollama";

export interface EngineConfig {
  engineMode: "puter" | "standalone";
  provider: LLMProvider;
  modelName: string;
}

export function getEnvApiKey(provider: LLMProvider): string {
  if (typeof import.meta !== "undefined" && import.meta.env) {
    if (provider === "groq") return import.meta.env.VITE_GROQ_API_KEY || "";
    if (provider === "google") return import.meta.env.VITE_GEMINI_API_KEY || "";
    if (provider === "openai") return import.meta.env.VITE_OPENAI_API_KEY || "";
    if (provider === "openrouter") return import.meta.env.VITE_OPENROUTER_API_KEY || "";
  }
  return "";
}

export function getEngineConfig(): EngineConfig {
  const provider = ((typeof import.meta !== "undefined" && import.meta.env?.VITE_DEFAULT_PROVIDER) as LLMProvider) || "groq";
  let defaultModel = "qwen/qwen3.6-27b";
  if (provider === "google") defaultModel = "gemini-1.5-flash";
  if (provider === "openai") defaultModel = "gpt-4o-mini";
  if (provider === "openrouter") defaultModel = "google/gemini-2.0-flash-lite-preview-02-05:free";
  if (provider === "ollama") defaultModel = "llama3";

  return {
    engineMode: "standalone",
    provider,
    modelName: defaultModel,
  };
}

const SYSTEM_PROMPT = `You are an expert ATS (Applicant Tracking System) and career coach.
Analyze this resume for the target Job Title and Job Description.

IMPORTANT: Do NOT use thinking tags. Do NOT include any preamble, markdown, or explanatory text.
Your ENTIRE response must be ONLY the JSON object below and nothing else.

{
  "overallScore": <number 0-100>,
  "ATS": {
    "score": <number 0-100>,
    "tips": [
      { "type": "good" | "improve", "tip": "<short title>", "explanation": "<detailed explanation>" }
    ]
  },
  "toneAndStyle": {
    "score": <number 0-100>,
    "tips": [
      { "type": "good" | "improve", "tip": "<short title>", "explanation": "<detailed explanation>" }
    ]
  },
  "content": {
    "score": <number 0-100>,
    "tips": [
      { "type": "good" | "improve", "tip": "<short title>", "explanation": "<detailed explanation>" }
    ]
  },
  "structure": {
    "score": <number 0-100>,
    "tips": [
      { "type": "good" | "improve", "tip": "<short title>", "explanation": "<detailed explanation>" }
    ]
  },
  "skills": {
    "score": <number 0-100>,
    "tips": [
      { "type": "good" | "improve", "tip": "<short title>", "explanation": "<detailed explanation>" }
    ]
  }
}`;

/**
 * Extract pure JSON from LLM response that may contain thinking tags,
 * markdown fences, or other surrounding text.
 */
function extractJSON(raw: string): string {
  // Step 1: Strip everything between <think> and </think> (including tags)
  // Use a character-class approach to avoid HTML escaping issues in builds
  let cleaned = raw;
  const thinkOpenIdx = cleaned.indexOf("<think>");
  if (thinkOpenIdx !== -1) {
    const thinkCloseIdx = cleaned.indexOf("</think>", thinkOpenIdx);
    if (thinkCloseIdx !== -1) {
      cleaned = cleaned.substring(0, thinkOpenIdx) + cleaned.substring(thinkCloseIdx + 8);
    } else {
      // No closing tag — remove everything from <think> to end, then nothing useful before it
      cleaned = cleaned.substring(0, thinkOpenIdx);
    }
  }

  // Step 2: Remove markdown code fences
  cleaned = cleaned.replace(/```json/gi, "").replace(/```/g, "");

  // Step 3: Find the outermost JSON object by matching braces
  cleaned = cleaned.trim();
  const startIdx = cleaned.indexOf("{");
  if (startIdx === -1) return cleaned;

  let depth = 0;
  let endIdx = -1;
  for (let i = startIdx; i < cleaned.length; i++) {
    if (cleaned[i] === "{") depth++;
    else if (cleaned[i] === "}") {
      depth--;
      if (depth === 0) {
        endIdx = i;
        break;
      }
    }
  }

  if (endIdx !== -1) {
    return cleaned.substring(startIdx, endIdx + 1);
  }

  // Fallback: just grab from first { to last }
  const lastBrace = cleaned.lastIndexOf("}");
  if (lastBrace > startIdx) {
    return cleaned.substring(startIdx, lastBrace + 1);
  }

  return cleaned;
}

async function callGroqAPI(apiKey: string, promptContent: string, modelName: string) {
  const client = new OpenAI({
    apiKey,
    baseURL: "https://api.groq.com/openai/v1",
    dangerouslyAllowBrowser: true,
  });
  const response = await client.chat.completions.create({
    model: modelName || "qwen/qwen3.6-27b",
    messages: [
      { role: "system", content: SYSTEM_PROMPT },
      { role: "user", content: promptContent },
    ],
  });
  return response.choices[0]?.message?.content || "";
}

async function callGoogleAPI(apiKey: string, promptContent: string, modelName: string) {
  const genAI = new GoogleGenerativeAI(apiKey);
  const model = genAI.getGenerativeModel({
    model: modelName || "gemini-1.5-flash",
    generationConfig: { responseMimeType: "application/json" },
  });
  const result = await model.generateContent([SYSTEM_PROMPT, promptContent]);
  return result.response.text();
}

export async function analyzeResumeWithLLM({
  resumeText,
  jobTitle,
  jobDescription,
  config,
}: {
  resumeText: string;
  jobTitle: string;
  jobDescription: string;
  config: EngineConfig;
}): Promise<any> {
  const promptContent = `Target Job Title: "${jobTitle}"

Target Job Description:
${jobDescription}

Resume Extracted Text:
${resumeText}`;

  let rawResponseText = "";
  let lastError: any = null;

  // 1. Try Groq Primary API
  const groqKey = getEnvApiKey("groq");
  if (groqKey) {
    try {
      rawResponseText = await callGroqAPI(groqKey, promptContent, "qwen/qwen3.6-27b");
    } catch (err) {
      console.warn("Groq API error, attempting fallback to Gemini:", err);
      lastError = err;
    }
  }

  // 2. Fallback to Google Gemini API if Groq wasn't run or failed
  if (!rawResponseText) {
    const geminiKey = getEnvApiKey("google");
    if (geminiKey) {
      try {
        rawResponseText = await callGoogleAPI(geminiKey, promptContent, "gemini-1.5-flash");
      } catch (err) {
        console.error("Gemini API error:", err);
        lastError = err;
      }
    }
  }

  if (!rawResponseText) {
    throw new Error(
      lastError?.message || "AI Analysis service is currently busy. Please check your API keys or try again."
    );
  }

  // Extract clean JSON from potentially messy LLM output
  const jsonString = extractJSON(rawResponseText);

  try {
    return JSON.parse(jsonString);
  } catch (err) {
    console.error("Failed to parse LLM response JSON. Extracted:", jsonString);
    console.error("Original raw response:", rawResponseText);
    throw new Error("Invalid response format received from AI service.");
  }
}
