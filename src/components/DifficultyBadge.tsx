import { DIFFICULTY_LABEL, DIFFICULTY_RANK, type Difficulty } from "@/lib/types";

export function DifficultyTicks({ difficulty }: { difficulty: Difficulty }) {
  const level = DIFFICULTY_RANK[difficulty];
  return (
    <span className="diff__ticks" aria-hidden="true">
      {[0, 1, 2].map((i) => (
        <i key={i} data-on={i <= level ? "" : undefined} />
      ))}
    </span>
  );
}

export function DifficultyBadge({ difficulty }: { difficulty: Difficulty }) {
  return (
    <span className={`diff diff--${difficulty}`}>
      <DifficultyTicks difficulty={difficulty} />
      {DIFFICULTY_LABEL[difficulty]}
    </span>
  );
}
