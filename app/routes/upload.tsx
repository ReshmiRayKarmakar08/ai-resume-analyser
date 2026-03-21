import { type FormEvent, useState, useEffect } from "react";
import Navbar from "~/components/Navbar";
import FileUploader from "~/components/FileUploader";
import { usePuterStore } from "~/lib/puter";
import { useNavigate } from "react-router";
import { generateUUID } from "~/lib/utils";
import { convertPdfToImage, type PdfConversionResult } from "~/lib/pdf2img";

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
  const { fs, ai, kv, auth } = usePuterStore();
  const navigate = useNavigate();

  const [isProcessing, setIsProcessing] = useState(false);
  const [statusText, setStatusText] = useState("");
  const [file, setFile] = useState<File | null>(null);

  // ✅ Sign in as soon as page loads
  useEffect(() => {
    if (!auth.isAuthenticated) {
      auth.signIn();
    }
  }, []);

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

      if (!auth.isAuthenticated) {
        setStatusText("Please sign in first and try again.");
        return;
      }

      setIsProcessing(true);

      // 🔹 Upload PDF
      setStatusText("Uploading the file...");
      const uploadedFile: FSItem | undefined = await fs.upload([file]);
      if (!uploadedFile) {
        setStatusText("Error: Failed to upload file");
        setIsProcessing(false);
        return;
      }

      // 🔹 Convert PDF → Image
      setStatusText("Converting to image...");
      const imageFile: PdfConversionResult = await convertPdfToImage(file);
      if (!imageFile.file) {
        setStatusText("Error: Failed to convert PDF to image");
        setIsProcessing(false);
        return;
      }

      // 🔹 Upload image
      setStatusText("Uploading the image...");
      const uploadedImage: FSItem | undefined = await fs.upload([imageFile.file]);
      if (!uploadedImage) {
        setStatusText("Error: Failed to upload image");
        setIsProcessing(false);
        return;
      }

      // 🔹 Prepare data
      setStatusText("Preparing data...");
      const uuid = generateUUID();

      const data: {
        id: string;
        resumePath: string;
        imagePath: string;
        companyName: string;
        jobTitle: string;
        jobDescription: string;
        feedback: any;
      } = {
        id: uuid,
        resumePath: uploadedFile.path,
        imagePath: uploadedImage.path,
        companyName,
        jobTitle,
        jobDescription,
        feedback: null,
      };

      await kv.set(`resume:${uuid}`, JSON.stringify(data));

      // 🔹 AI ANALYSIS
      setStatusText("Analyzing resume with AI...");

      let feedback: AIResponse | undefined;

      try {
        feedback = await (ai as any).chat(
          prepareInstructions({ jobTitle, jobDescription }),
          imageFile.file,
          { model: "gpt-4o" }
        );

        console.log("RAW FEEDBACK:", JSON.stringify(feedback));
        console.log("FEEDBACK TYPE:", typeof feedback);

      } catch (err: any) {
        console.error("AI ERROR MESSAGE:", err?.message);
        console.error("AI ERROR CODE:", err?.code ?? err?.status);
        console.error("AI ERROR FULL:", JSON.stringify(err));
        setStatusText("Error: AI analysis failed — " + (err?.message ?? JSON.stringify(err)));
        setIsProcessing(false);
        return;
      }

      if (!feedback) {
        setStatusText("Error: No response from AI");
        setIsProcessing(false);
        return;
      }

      // 🔹 Extract raw text from response
      let feedbackText = "";

      if (typeof feedback === "string") {
        feedbackText = feedback;
      } else if (typeof feedback?.message?.content === "string") {
        feedbackText = feedback.message.content;
      } else if (Array.isArray(feedback?.message?.content)) {
        feedbackText = feedback.message.content
          .map((block: any) => block?.text ?? "")
          .join("\n");
      }

      console.log("EXTRACTED FEEDBACK TEXT:", feedbackText);

      if (!feedbackText) {
        setStatusText("Error: Empty AI response");
        setIsProcessing(false);
        return;
      }

      // ✅ Clean and parse JSON
      let parsedFeedback;
      try {
        const cleaned = feedbackText
          .replace(/```json/g, "")
          .replace(/```/g, "")
          .trim();
        parsedFeedback = JSON.parse(cleaned);
      } catch (parseErr) {
        console.error("JSON PARSE ERROR:", parseErr);
        console.error("RAW TEXT WAS:", feedbackText);
        setStatusText("Error: Failed to parse AI response");
        setIsProcessing(false);
        return;
      }

      data.feedback = parsedFeedback;
      await kv.set(`resume:${uuid}`, JSON.stringify(data));

      console.log("NAVIGATING TO:", `/resume/${uuid}`);
      console.log("FINAL DATA:", JSON.stringify(data));

      setStatusText("Analysis complete! Redirecting...");
      navigate(`/resume/${uuid}`);

    } catch (err) {
      console.error("FULL ERROR:", err);
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
    <main className="bg-[url('/images/bg-main.svg')] bg-cover">
      <Navbar />

      <section className="main-section">
        <div className="page-heading py-16">
          <h1>Smart feedback for your dream job</h1>

          {isProcessing ? (
            <>
              <h2>{statusText}</h2>
              <img
                src="/images/resume-scan.gif"
                className="w-full"
                alt="resume scanning"
              />
            </>
          ) : (
            <h2>Drop your resume for an ATS score and improvement tips</h2>
          )}

          {!isProcessing && (
            <form
              onSubmit={handleSubmit}
              className="flex flex-col gap-6 mt-6"
            >
              <input name="company-name" placeholder="Company Name" />
              <input name="job-title" placeholder="Job Title" />
              <textarea
                name="job-description"
                placeholder="Job Description"
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