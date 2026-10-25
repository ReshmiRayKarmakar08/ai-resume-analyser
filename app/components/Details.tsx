import { cn } from "~/lib/utils";
import {
  Accordion,
  AccordionContent,
  AccordionHeader,
  AccordionItem,
} from "./Accordion";

const ScoreBadge = ({ score }: { score: number }) => {
  return (
    <div
      className={cn(
        "flex flex-row gap-1 items-center px-2 py-0.5 rounded-[96px]",
        score > 69
          ? "bg-badge-green"
          : score > 39
          ? "bg-badge-yellow"
          : "bg-badge-red"
      )}
    >
      <img
        src={score > 69 ? "/icons/check.svg" : "/icons/warning.svg"}
        alt="score"
        className="size-3.5 sm:size-4 shrink-0"
      />
      <p
        className={cn(
          "text-xs sm:text-sm font-medium",
          score > 69
            ? "text-badge-green-text"
            : score > 39
            ? "text-badge-yellow-text"
            : "text-badge-red-text"
        )}
      >
        {score}/100
      </p>
    </div>
  );
};

const CategoryHeader = ({
  title,
  categoryScore,
}: {
  title: string;
  categoryScore: number;
}) => {
  return (
    <div className="flex flex-row gap-2 sm:gap-4 items-center py-1 flex-wrap sm:flex-nowrap">
      <p className="text-base sm:text-lg md:text-xl font-semibold text-gray-900">{title}</p>
      <ScoreBadge score={categoryScore} />
    </div>
  );
};

const CategoryContent = ({
  tips,
}: {
  tips: { type: "good" | "improve"; tip: string; explanation: string }[];
}) => {
  return (
    <div className="flex flex-col gap-3 sm:gap-4 items-center w-full">
      <div className="bg-gray-50 w-full rounded-xl p-3 sm:px-5 sm:py-4 grid grid-cols-1 sm:grid-cols-2 gap-2.5 sm:gap-4">
        {tips.map((tip, index) => (
          <div className="flex flex-row gap-2 items-center" key={index}>
            <img
              src={tip.type === "good" ? "/icons/check.svg" : "/icons/warning.svg"}
              alt="status"
              className="size-4 sm:size-5 shrink-0"
            />
            <p className="text-xs sm:text-sm md:text-base text-gray-600 truncate">{tip.tip}</p>
          </div>
        ))}
      </div>
      <div className="flex flex-col gap-3 sm:gap-4 w-full">
        {tips.map((tip, index) => (
          <div
            key={index + tip.tip}
            className={cn(
              "flex flex-col gap-1.5 sm:gap-2 rounded-xl sm:rounded-2xl p-3.5 sm:p-4 text-left",
              tip.type === "good"
                ? "bg-green-50 border border-green-200 text-green-900"
                : "bg-yellow-50 border border-yellow-200 text-yellow-900"
            )}
          >
            <div className="flex flex-row gap-2 items-center">
              <img
                src={tip.type === "good" ? "/icons/check.svg" : "/icons/warning.svg"}
                alt="status"
                className="size-4 sm:size-5 shrink-0"
              />
              <p className="text-sm sm:text-base font-semibold">{tip.tip}</p>
            </div>
            <p className="text-xs sm:text-sm text-gray-700 leading-relaxed pl-6">{tip.explanation}</p>
          </div>
        ))}
      </div>
    </div>
  );
};

const Details = ({ feedback }: { feedback: Feedback }) => {
  return (
    <div className="flex flex-col gap-4 w-full bg-white rounded-2xl p-2 sm:p-4 shadow-md border border-gray-100">
      <Accordion>
        <AccordionItem id="tone-style">
          <AccordionHeader itemId="tone-style">
            <CategoryHeader
              title="Tone & Style"
              categoryScore={feedback.toneAndStyle.score}
            />
          </AccordionHeader>
          <AccordionContent itemId="tone-style">
            <CategoryContent tips={feedback.toneAndStyle.tips} />
          </AccordionContent>
        </AccordionItem>
        <AccordionItem id="content">
          <AccordionHeader itemId="content">
            <CategoryHeader
              title="Content"
              categoryScore={feedback.content.score}
            />
          </AccordionHeader>
          <AccordionContent itemId="content">
            <CategoryContent tips={feedback.content.tips} />
          </AccordionContent>
        </AccordionItem>
        <AccordionItem id="structure">
          <AccordionHeader itemId="structure">
            <CategoryHeader
              title="Structure"
              categoryScore={feedback.structure.score}
            />
          </AccordionHeader>
          <AccordionContent itemId="structure">
            <CategoryContent tips={feedback.structure.tips} />
          </AccordionContent>
        </AccordionItem>
        <AccordionItem id="skills">
          <AccordionHeader itemId="skills">
            <CategoryHeader
              title="Skills"
              categoryScore={feedback.skills.score}
            />
          </AccordionHeader>
          <AccordionContent itemId="skills">
            <CategoryContent tips={feedback.skills.tips} />
          </AccordionContent>
        </AccordionItem>
      </Accordion>
    </div>
  );
};

export default Details;