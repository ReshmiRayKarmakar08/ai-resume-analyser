import { Link } from "react-router";
import ScoreCircle from "~/components/ScoreCircle";
import { useEffect, useState } from "react";
import { usePuterStore } from "~/lib/puter";

const ResumeCard = ({ resume }: { resume: Resume }) => {
  const { id, companyName, jobTitle, feedback, imagePath, imageDataUrl } = resume;
  const { fs } = usePuterStore();
  const [resumeUrl, setResumeUrl] = useState<string>(imageDataUrl || "");

  useEffect(() => {
    if (imageDataUrl) {
      setResumeUrl(imageDataUrl);
      return;
    }

    if (!imagePath) return;

    let isMounted = true;
    const loadResume = async () => {
      try {
        const blob = await fs.read(imagePath);
        if (!blob || !isMounted) return;
        const url = URL.createObjectURL(blob);
        setResumeUrl(url);
      } catch (e) {
        console.warn("Could not load image preview from Puter FS:", e);
      }
    };

    loadResume();
    return () => {
      isMounted = false;
    };
  }, [imagePath, imageDataUrl]);

  return (
    <Link
      to={`/resume/${id}`}
      className="resume-card group animate-in fade-in duration-500 hover:-translate-y-1"
    >
      <div className="resume-card-header">
        <div className="flex flex-col gap-1 min-w-0 flex-1 pr-2">
          <h2
            className="!text-gray-900 !text-left text-lg sm:text-xl font-bold truncate tracking-tight"
            title={companyName || "Resume"}
          >
            {companyName || "Resume"}
          </h2>
          <h3
            className="text-sm sm:text-base text-gray-500 truncate"
            title={jobTitle || "Role feedback"}
          >
            {jobTitle || "Role feedback"}
          </h3>
        </div>
        <div className="shrink-0">
          <ScoreCircle score={feedback?.overallScore ?? 0} />
        </div>
      </div>

      <div className="gradient-border overflow-hidden rounded-xl w-full flex items-center justify-center bg-gray-50/50">
        {resumeUrl ? (
          <img
            src={resumeUrl}
            alt="resume preview"
            className="w-full h-[260px] sm:h-[300px] md:h-[340px] object-cover object-top rounded-lg group-hover:scale-[1.02] transition-transform duration-300"
          />
        ) : (
          <div className="w-full h-[260px] sm:h-[300px] md:h-[340px] flex items-center justify-center text-gray-400 text-sm font-medium">
            No preview available
          </div>
        )}
      </div>
    </Link>
  );
};

export default ResumeCard;