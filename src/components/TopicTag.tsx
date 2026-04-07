import { getTopicLabel } from "@/data/topics";

interface TopicTagProps {
  topicId: string;
  score?: number; // 0-100
}

export default function TopicTag({ topicId, score }: TopicTagProps) {
  const label = getTopicLabel(topicId);

  let colorClass = "bg-slate-700 text-slate-300";
  if (score !== undefined) {
    if (score >= 80) colorClass = "bg-green-500/15 text-green-400";
    else if (score >= 50) colorClass = "bg-yellow-500/15 text-yellow-400";
    else colorClass = "bg-red-500/15 text-red-400";
  }

  return (
    <span className={`inline-block text-xs px-2 py-0.5 rounded ${colorClass}`}>
      {label}
      {score !== undefined && ` ${score}%`}
    </span>
  );
}
