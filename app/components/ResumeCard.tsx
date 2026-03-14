import { Link } from "react-router";
import ScoreCircle from "~/components/ScoreCircle";

type Resume = {
  id: string;
  companyName: string;
  jobTitle: string;
  imagePath: string;
  feedback: {
    overallScore: number;
  };
};

type ResumeCardProps = {
  resume: Resume;
};

const ResumeCard = ({ resume }: ResumeCardProps) => {
  const { id, companyName, jobTitle, imagePath, feedback } = resume;

  return (
    <Link
      to={`/resume/${id}`}
      className="resume-card bg-white rounded-2xl shadow-md p-5 flex flex-col gap-4 animate-in fade-in duration-1000"
    >
      {/* Header */}
      <div className="flex items-center justify-between">
        <div className="flex flex-col gap-1">
          <h2 className="text-xl font-semibold text-gray-800">
            {companyName}
          </h2>

          <h3 className="text-gray-500 text-sm">
            {jobTitle}
          </h3>
        </div>

        <ScoreCircle score={feedback?.overallScore ?? 0} />
      </div>

      {/* Resume Preview */}
      <div className="gradient-border rounded-xl overflow-hidden">
        <img
          src={imagePath}
          alt="resume preview"
          className="w-full h-[300px] object-cover object-top"
        />
      </div>
    </Link>
  );
};

export default ResumeCard;