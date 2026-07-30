import { type FormEvent, useState } from "react";
import Navbar from "~/components/Navbar";
import FileUploader from "~/components/FileUploader";
import { usePuterStore } from "~/lib/puter";
import { useNavigate } from "react-router";
import { generateUUID } from "~/lib/utils";
import { convertPdfToImage, extractPdfText, type PdfConversionResult } from "~/lib/pdf2img";
import {
  getEngineConfig,
  analyzeResumeWithLLM,
  getEnvApiKey,
} from "~/lib/llmApi";
import { resumeStorage, fileToDataUrl } from "~/lib/resumeStorage";

type FSItem = {
  path: string;
};

type AIResponse = {
  message: {
    content: any;
  };
};

const prepareInstructions = ({
  jobTitle,
  jobDescription,
}: {
  jobTitle: string;
  jobDescription: string;
}) => {
  return `You are an expert ATS (Applicant Tracking System) and career coach. Analyze this resume for the role of "${jobTitle}".

Job Description:
${jobDescription}

You MUST respond with ONLY a valid JSON object. No extra text, no markdown, no backticks, no explanation before or after. Just the raw JSON using this EXACT structure:
{
  "overallScore": <number 0-100>,
  "ATS": {
    "score": <number 0-100>,
    "tips": [
      { "type": "good", "tip": "<short title>", "explanation": "<detailed explanation>" },
      { "type": "improve", "tip": "<short title>", "explanation": "<detailed explanation>" }
    ]
  },
  "toneAndStyle": {
    "score": <number 0-100>,
    "tips": [
      { "type": "good", "tip": "<short title>", "explanation": "<detailed explanation>" },
      { "type": "improve", "tip": "<short title>", "explanation": "<detailed explanation>" }
    ]
  },
  "content": {
    "score": <number 0-100>,
    "tips": [
      { "type": "good", "tip": "<short title>", "explanation": "<detailed explanation>" },
      { "type": "improve", "tip": "<short title>", "explanation": "<detailed explanation>" }
    ]
  },
  "structure": {
    "score": <number 0-100>,
    "tips": [
      { "type": "good", "tip": "<short title>", "explanation": "<detailed explanation>" },
      { "type": "improve", "tip": "<short title>", "explanation": "<detailed explanation>" }
    ]
  },
  "skills": {
    "score": <number 0-100>,
    "tips": [
      { "type": "good", "tip": "<short title>", "explanation": "<detailed explanation>" },
      { "type": "improve", "tip": "<short title>", "explanation": "<detailed explanation>" }
    ]
  }
}`;
};

const Upload = () => {
  const puterStore = usePuterStore();
  const { fs, ai, auth } = puterStore;
  const navigate = useNavigate();

  const [isProcessing, setIsProcessing] = useState(false);
  const [statusText, setStatusText] = useState("");
  const [file, setFile] = useState<File | null>(null);

  const handleFileSelect = (file: File | null) => {
    setFile(file);
  };

  const handleAnalyze = async ({
    companyName,
    jobTitle,
    jobDescription,
    file,
  }: {
    companyName: string;
    jobTitle: string;
    jobDescription: string;
    file: File | null;
  }) => {
    try {
      if (!file) return;

      const engineConfig = getEngineConfig();
      const envKey = getEnvApiKey(engineConfig.provider);
      const uuid = generateUUID();

      setIsProcessing(true);

      // ==============================================================
      // PATH A: Use Puter if running inside Puter / signed in
      // ==============================================================
      if (!envKey && auth.isAuthenticated) {
        setStatusText("Uploading PDF to Puter Cloud...");
        const uploadedFile: FSItem | undefined = await fs.upload([file]);
        if (!uploadedFile) {
          setStatusText("Error: Failed to upload file");
          setIsProcessing(false);
          return;
        }

        setStatusText("Converting PDF to image...");
        const imageFile: PdfConversionResult = await convertPdfToImage(file);
        if (!imageFile.file) {
          setStatusText("Error: Failed to convert PDF to image");
          setIsProcessing(false);
          return;
        }

        setStatusText("Uploading preview image...");
        const uploadedImage: FSItem | undefined = await fs.upload([imageFile.file]);
        if (!uploadedImage) {
          setStatusText("Error: Failed to upload image");
          setIsProcessing(false);
          return;
        }

        setStatusText("Analyzing resume with AI...");
        let feedback: AIResponse | undefined;

        try {
          feedback = await (ai as any).chat(
            prepareInstructions({ jobTitle, jobDescription }),
            imageFile.file,
            { model: "gpt-4o" }
          );
        } catch (err: any) {
          setStatusText("AI Error: " + (err?.message || "Analysis failed"));
          setIsProcessing(false);
          return;
        }

        if (!feedback) {
          setStatusText("Error: Empty response from AI");
          setIsProcessing(false);
          return;
        }

        let feedbackText = "";
        if (typeof feedback === "string") feedbackText = feedback;
        else if (typeof feedback?.message?.content === "string") feedbackText = feedback.message.content;
        else if (Array.isArray(feedback?.message?.content)) {
          feedbackText = feedback.message.content.map((b: any) => b?.text || "").join("\n");
        }

        const cleaned = feedbackText.replace(/```json/g, "").replace(/```/g, "").trim();
        const parsedFeedback = JSON.parse(cleaned);

        const data = {
          id: uuid,
          resumePath: uploadedFile.path,
          imagePath: uploadedImage.path,
          companyName,
          jobTitle,
          jobDescription,
          feedback: parsedFeedback,
          createdAt: Date.now(),
          engineUsed: "puter" as const,
        };

        await resumeStorage.saveResume(data, puterStore, true);
        setStatusText("Analysis complete! Redirecting...");
        navigate(`/resume/${uuid}`);
        return;
      }

      // ==============================================================
      // PATH B: Standalone API Call (Using .env API key)
      // ==============================================================
      setStatusText("Extracting text and rendering preview...");

      const [pdfText, imageResult] = await Promise.all([
        extractPdfText(file),
        convertPdfToImage(file),
      ]);

      if (!pdfText.trim()) {
        setStatusText("Error: Could not extract text from PDF file.");
        setIsProcessing(false);
        return;
      }

      const [resumeDataUrl, imageDataUrl] = await Promise.all([
        fileToDataUrl(file),
        imageResult.file ? fileToDataUrl(imageResult.file) : Promise.resolve(""),
      ]);

      setStatusText("Analyzing resume with AI...");

      let parsedFeedback;
      try {
        parsedFeedback = await analyzeResumeWithLLM({
          resumeText: pdfText,
          jobTitle,
          jobDescription,
          config: engineConfig,
        });
      } catch (e: any) {
        console.error("LLM Error:", e);
        setStatusText(e.message || "Failed to analyze resume.");
        setIsProcessing(false);
        return;
      }

      const data = {
        id: uuid,
        resumeDataUrl,
        imageDataUrl,
        companyName,
        jobTitle,
        jobDescription,
        feedback: parsedFeedback,
        createdAt: Date.now(),
        engineUsed: "standalone" as const,
      };

      await resumeStorage.saveResume(data, puterStore, false);
      setStatusText("Analysis complete! Redirecting...");
      navigate(`/resume/${uuid}`);

    } catch (err) {
      console.error("Upload error:", err);
      setStatusText("Something went wrong. Please try again.");
      setIsProcessing(false);
    }
  };

  const handleSubmit = (e: FormEvent<HTMLFormElement>): void => {
    e.preventDefault();
    const form = e.currentTarget;
    const formData = new FormData(form);

    const companyName = formData.get("company-name") as string;
    const jobTitle = formData.get("job-title") as string;
    const jobDescription = formData.get("job-description") as string;

    if (!file) return;
    handleAnalyze({ companyName, jobTitle, jobDescription, file });
  };

  return (
    <main className="bg-[url('/images/bg-main.svg')] bg-cover min-h-screen">
      <Navbar />

      <section className="main-section">
        <div className="page-heading py-12">
          <h1>Smart feedback for your dream job</h1>

          {isProcessing ? (
            <div className="mt-8 flex flex-col items-center">
              <h2 className="text-xl font-semibold text-gray-800 mb-4">{statusText}</h2>
              <img
                src="/images/resume-scan.gif"
                className="w-full max-w-md rounded-2xl shadow-lg"
                alt="resume scanning"
              />
            </div>
          ) : (
            <h2>Drop your resume for an ATS score and improvement tips</h2>
          )}

          {!isProcessing && (
            <form onSubmit={handleSubmit} className="flex flex-col gap-6 mt-6 max-w-2xl mx-auto">
              <input
                name="company-name"
                placeholder="Company Name"
                required
              />
              <input
                name="job-title"
                placeholder="Job Title"
                required
              />
              <textarea
                name="job-description"
                placeholder="Job Description"
                required
                rows={5}
              />
              <FileUploader onFileSelect={handleFileSelect} />
              <button className="primary-button" type="submit">
                Analyze Resume
              </button>
            </form>
          )}
        </div>
      </section>
    </main>
  );
};

export default Upload;