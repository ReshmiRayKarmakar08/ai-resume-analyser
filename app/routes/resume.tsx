import { Link, useParams } from "react-router";
import { useEffect, useState } from "react";

import { usePuterStore } from "~/lib/puter";
import { resumeStorage } from "~/lib/resumeStorage";
import Summary from "~/components/Summary";
import ATS from "~/components/ATS";
import Details from "~/components/Details";

export const meta = () => [
  { title: "Resumind | Resume Review" },
  { name: "description", content: "Detailed ATS score and resume overview" },
];

const Resume = () => {
  const puterStore = usePuterStore();
  const { id } = useParams();
  const [imageUrl, setImageUrl] = useState("");
  const [resumeUrl, setResumeUrl] = useState("");
  const [feedback, setFeedback] = useState<any>(null);
  const [loading, setLoading] = useState(true);
  const [errorMsg, setErrorMsg] = useState("");

  useEffect(() => {
    const loadResume = async () => {
      if (!id) return;
      setLoading(true);
      try {
        const res = await resumeStorage.getResume(id, puterStore);
        if (!res || !res.data) {
          setErrorMsg("Resume review not found. It may have been deleted or created on another device.");
          setLoading(false);
          return;
        }

        setImageUrl(res.imageUrl);
        setResumeUrl(res.pdfUrl);

        let fb = res.data.feedback;
        if (typeof fb === "string") {
          try {
            const cleaned = fb.replace(/```json/g, "").replace(/```/g, "").trim();
            fb = JSON.parse(cleaned);
          } catch {
            fb = null;
          }
        }
        setFeedback(fb);
      } catch (err) {
        console.error("Failed to load resume:", err);
        setErrorMsg("Failed to load resume analysis.");
      } finally {
        setLoading(false);
      }
    };

    loadResume();
  }, [id, puterStore.auth.isAuthenticated]);

  return (
    <main className="!pt-0 min-h-screen w-full overflow-x-hidden bg-gray-50/30">
      <nav className="resume-nav">
        <Link to="/" className="back-button">
          <img src="/icons/back.svg" alt="back" className="w-2.5 h-2.5" />
          <span className="text-gray-800 text-xs sm:text-sm font-semibold">Back to Homepage</span>
        </Link>
        <span className="text-xs sm:text-sm text-gray-500 font-medium truncate max-w-[180px] sm:max-w-none">
          AI Resume Analysis
        </span>
      </nav>

      <div className="flex flex-col lg:flex-row w-full max-w-7xl mx-auto items-start">
        {/* Left / Top — Resume Preview */}
        <section className="w-full lg:w-1/2 p-4 sm:p-6 lg:p-8 flex flex-col items-center justify-start lg:sticky lg:top-16 lg:h-[calc(100vh-65px)] overflow-y-auto">
          {imageUrl ? (
            <div className="animate-in fade-in duration-700 gradient-border w-full max-w-md lg:max-w-none flex items-center justify-center shadow-sm">
              <a href={resumeUrl || imageUrl} target="_blank" rel="noopener noreferrer" className="block w-full">
                <img
                  src={imageUrl}
                  className="w-full max-h-[380px] sm:max-h-[500px] lg:max-h-[75vh] object-contain rounded-xl shadow-md hover:opacity-95 transition"
                  title="Click to open full PDF"
                  alt="resume preview"
                />
              </a>
            </div>
          ) : (
            <div className="w-full h-56 sm:h-72 flex items-center justify-center bg-gray-100 rounded-2xl text-gray-400 font-medium text-sm sm:text-base">
              No Image Preview
            </div>
          )}
        </section>

        {/* Right / Bottom — AI Feedback */}
        <section className="feedback-section">
          <h1 className="!text-2xl sm:!text-3xl md:!text-4xl !text-gray-900 !text-left font-bold mb-2">
            Resume Review
          </h1>

          {loading && (
            <div className="flex flex-col items-center justify-center py-12">
              <img src="/images/resume-scan-2.gif" className="w-full max-w-xs sm:max-w-sm" alt="loading" />
            </div>
          )}

          {errorMsg && (
            <div className="p-4 sm:p-6 bg-red-50 text-red-600 rounded-2xl border border-red-200 font-medium text-sm sm:text-base">
              {errorMsg}
            </div>
          )}

          {!loading && feedback && (
            <div className="flex flex-col gap-6 sm:gap-8 animate-in fade-in duration-700 w-full">
              <Summary feedback={feedback} />
              <ATS
                score={feedback?.ATS?.score ?? 0}
                suggestions={feedback?.ATS?.tips ?? []}
              />
              <Details feedback={feedback} />
            </div>
          )}
        </section>
      </div>
    </main>
  );
};

export default Resume;