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
  let defaultModel = "openai/gpt-oss-20b";
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

You MUST respond with ONLY a valid JSON object. No markdown, no backticks, no intro text.
JSON Structure:
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

async function callGroqAPI(apiKey: string, promptContent: string, modelName: string) {
  const client = new OpenAI({
    apiKey,
    baseURL: "https://api.groq.com/openai/v1",
    dangerouslyAllowBrowser: true,
  });
  const response = await client.chat.completions.create({
    model: modelName,
    messages: [
      { role: "system", content: SYSTEM_PROMPT },
      { role: "user", content: promptContent },
    ],
    response_format: { type: "json_object" },
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

  // 1. Try Groq Primary API with GPT-OSS-20B (supports strict JSON mode)
  const groqKey = getEnvApiKey("groq");
  if (groqKey) {
    try {
      rawResponseText = await callGroqAPI(groqKey, promptContent, "openai/gpt-oss-20b");
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

  // Clean the response: strip markdown fences and isolate JSON
  let cleaned = rawResponseText
    .replace(/```json/gi, "")
    .replace(/```/g, "")
    .trim();

  // Extract JSON object by finding first { and matching closing }
  const startIdx = cleaned.indexOf("{");
  if (startIdx !== -1) {
    let depth = 0;
    let endIdx = -1;
    for (let i = startIdx; i < cleaned.length; i++) {
      if (cleaned[i] === "{") depth++;
      else if (cleaned[i] === "}") {
        depth--;
        if (depth === 0) { endIdx = i; break; }
      }
    }
    if (endIdx !== -1) {
      cleaned = cleaned.substring(startIdx, endIdx + 1);
    }
  }

  try {
    return JSON.parse(cleaned);
  } catch (err) {
    console.error("Failed to parse LLM JSON. Cleaned:", cleaned);
    console.error("Original raw:", rawResponseText);
    throw new Error("Invalid response format received from AI service.");
  }
}
