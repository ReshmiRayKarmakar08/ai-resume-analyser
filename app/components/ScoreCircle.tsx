import { useId } from "react";

const ScoreCircle = ({ score = 75 }: { score: number }) => {
  const gradientId = useId();
  const radius = 40;
  const stroke = 8;
  const normalizedRadius = radius - stroke / 2;
  const circumference = 2 * Math.PI * normalizedRadius;
  const safeScore = Math.min(Math.max(score, 0), 100);
  const progress = safeScore / 100;
  const strokeDashoffset = circumference * (1 - progress);

  return (
    <div className="relative w-[70px] h-[70px] sm:w-[82px] sm:h-[82px] shrink-0">
      <svg
        height="100%"
        width="100%"
        viewBox="0 0 100 100"
        className="transform -rotate-90"
      >
        {/* Background circle */}
        <circle
          cx="50"
          cy="50"
          r={normalizedRadius}
          stroke="#f1f5f9"
          strokeWidth={stroke}
          fill="transparent"
        />
        {/* Partial circle with gradient */}
        <defs>
          <linearGradient id={gradientId} x1="1" y1="0" x2="0" y2="1">
            <stop offset="0%" stopColor="#FF97AD" />
            <stop offset="100%" stopColor="#5171FF" />
          </linearGradient>
        </defs>
        <circle
          cx="50"
          cy="50"
          r={normalizedRadius}
          stroke={`url(#${gradientId})`}
          strokeWidth={stroke}
          fill="transparent"
          strokeDasharray={circumference}
          strokeDashoffset={strokeDashoffset}
          strokeLinecap="round"
        />
      </svg>

      {/* Score and issues */}
      <div className="absolute inset-0 flex flex-col items-center justify-center">
        <span className="font-bold text-xs sm:text-sm text-gray-800">{`${score}/100`}</span>
      </div>
    </div>
  );
};

export default ScoreCircle;