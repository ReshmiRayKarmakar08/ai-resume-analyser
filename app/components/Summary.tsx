import ScoreGauge from "~/components/ScoreGauge";

const ScoreBadge = ({ score }: { score: number }) => {
  const badgeColor =
    score > 69
      ? "bg-badge-green"
      : score > 49
      ? "bg-badge-yellow"
      : "bg-badge-red";
  const textColor =
    score > 69
      ? "text-green-700"
      : score > 49
      ? "text-yellow-700"
      : "text-red-700";
  const badgeText =
    score > 69 ? "Strong" : score > 49 ? "Good Start" : "Needs Work";

  return (
    <div className={`score-badge ${badgeColor}`}>
      <p className={`text-xs ${textColor} font-semibold`}>{badgeText}</p>
    </div>
  );
};

const Category = ({ title, score }: { title: string; score: number }) => {
  const textColor =
    score > 69
      ? "text-green-600"
      : score > 49
      ? "text-yellow-600"
      : "text-red-600";

  return (
    <div className="resume-summary">
      <div className="category">
        <div className="flex flex-row gap-2 items-center flex-wrap">
          <p className="text-base sm:text-lg md:text-xl font-medium text-gray-800">{title}</p>
          <ScoreBadge score={score} />
        </div>
        <p className="text-base sm:text-lg md:text-xl font-semibold whitespace-nowrap">
          <span className={textColor}>{score}</span>/100
        </p>
      </div>
    </div>
  );
};

const Summary = ({ feedback }: { feedback: Feedback }) => {
  return (
    <div className="bg-white rounded-2xl shadow-md w-full p-4 sm:p-6 border border-gray-100">
      <div className="flex flex-col sm:flex-row items-center p-2 sm:p-4 gap-4 sm:gap-8 text-center sm:text-left">
        <ScoreGauge score={feedback.overallScore} />
        <div className="flex flex-col gap-1 sm:gap-2">
          <h2 className="text-xl sm:text-2xl font-bold !text-gray-900 !text-left">Your Resume Score</h2>
          <p className="text-xs sm:text-sm text-gray-500 !text-left">
            This score is calculated based on the variables listed below.
          </p>
        </div>
      </div>
      <div className="flex flex-col gap-1 sm:gap-2 mt-2">
        <Category title="Tone & Style" score={feedback.toneAndStyle.score} />
        <Category title="Content" score={feedback.content.score} />
        <Category title="Structure" score={feedback.structure.score} />
        <Category title="Skills" score={feedback.skills.score} />
      </div>
    </div>
  );
};

export default Summary;