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
    <main className="!pt-0 min-h-screen">
      <nav className="resume-nav">
        <Link to="/" className="back-button">
          <img src="/icons/back.svg" alt="back" className="w-2.5 h-2.5" />
          <span className="text-gray-800 text-sm font-semibold">Back to Homepage</span>
        </Link>
      </nav>

      <div className="flex flex-row w-full max-lg:flex-col-reverse">
        {/* Left — Resume Preview */}
        <section className="feedback-section bg-[url('/images/bg-small.svg')] bg-cover h-[100vh] sticky top-0 items-center justify-center">
          {imageUrl ? (
            <div className="animate-in fade-in duration-1000 gradient-border max-sm:m-0 h-[90%] max-wxl:h-fit w-fit">
              <a href={resumeUrl || imageUrl} target="_blank" rel="noopener noreferrer">
                <img
                  src={imageUrl}
                  className="w-full h-full object-contain rounded-2xl shadow-lg"
                  title="Click to open full PDF"
                  alt="resume preview"
                />
              </a>
            </div>
          ) : (
            <div className="text-gray-400 font-medium">No Image Preview</div>
          )}
        </section>

        {/* Right — AI Feedback */}
        <section className="feedback-section">
          <h2 className="text-4xl !text-black font-bold mb-4">Resume Review</h2>

          {loading && (
            <div className="flex flex-col items-center justify-center py-12">
              <img src="/images/resume-scan-2.gif" className="w-full max-w-sm" alt="loading" />
            </div>
          )}

          {errorMsg && (
            <div className="p-6 bg-red-50 text-red-600 rounded-2xl border border-red-200 font-medium">
              {errorMsg}
            </div>
          )}

          {!loading && feedback && (
            <div className="flex flex-col gap-8 animate-in fade-in duration-1000">
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