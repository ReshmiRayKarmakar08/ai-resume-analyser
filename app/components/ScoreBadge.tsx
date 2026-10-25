import type { FC } from "react";

interface ScoreBadgeProps {
  score: number;
}

const ScoreBadge: FC<ScoreBadgeProps> = ({ score }) => {
  let badgeColor = '';
  let badgeText = '';

  if (score > 70) {
    badgeColor = 'bg-badge-green text-green-700';
    badgeText = 'Strong';
  } else if (score > 49) {
    badgeColor = 'bg-badge-yellow text-yellow-700';
    badgeText = 'Good Start';
  } else {
    badgeColor = 'bg-badge-red text-red-700';
    badgeText = 'Needs Work';
  }

  return (
    <div className={`px-2.5 py-0.5 sm:px-3 sm:py-1 rounded-full ${badgeColor}`}>
      <p className="text-xs sm:text-sm font-medium">{badgeText}</p>
    </div>
  );
};

export default ScoreBadge;