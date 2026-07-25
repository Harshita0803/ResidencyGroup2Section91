"use client";

import type { Recommendation } from "@/lib/types";

const CONFIDENCE_STYLE: Record<
  Recommendation["confidence"],
  { label: string; cls: string }
> = {
  high: { label: "Strong match", cls: "bg-brand-pale text-brand-dark ring-brand/20" },
  medium: { label: "Likely match", cls: "bg-amber-50 text-amber-700 ring-amber-200" },
  fallback: { label: "General starting point", cls: "bg-sky-50 text-sky-700 ring-sky-200" },
};

export function RecommendationCard({
  recommendation,
  onAccept,
  onRestart,
}: {
  recommendation: Recommendation;
  onAccept: () => void;
  onRestart: () => void;
}) {
  const c = CONFIDENCE_STYLE[recommendation.confidence];
  const maxScore = recommendation.scores[0]?.score || 1;

  return (
    <div className="rounded-2xl bg-white p-5 shadow-sm ring-1 ring-black/5">
      <div className="mb-3 flex items-center justify-between gap-2">
        <span
          className={`rounded-full px-2.5 py-0.5 text-xs font-medium ring-1 ${c.cls}`}
        >
          {c.label}
        </span>
        <span className="text-xs text-ink-soft">Suggested specialty</span>
      </div>

      <h3 className="text-xl font-semibold text-ink">
        {recommendation.specialtyLabel}
      </h3>
      <p className="mt-1.5 text-sm leading-relaxed text-ink-soft">
        {recommendation.rationale}
      </p>

      <details className="mt-3 rounded-xl bg-black/[0.03] p-3">
        <summary className="cursor-pointer text-xs font-medium text-ink-soft">
          How this was scored (top specialties)
        </summary>
        <ul className="mt-2 space-y-1.5">
          {recommendation.scores.map((s) => (
            <li key={s.specialtyId} className="text-xs">
              <div className="mb-0.5 flex justify-between">
                <span className="text-ink">{s.label}</span>
                <span className="text-ink-soft">{s.score.toFixed(2)}</span>
              </div>
              <div className="h-1.5 w-full overflow-hidden rounded-full bg-black/5">
                <div
                  className="h-full rounded-full bg-brand"
                  style={{ width: `${Math.min(100, (s.score / maxScore) * 100)}%` }}
                />
              </div>
            </li>
          ))}
        </ul>
      </details>

      <div className="mt-4 flex flex-col gap-2 sm:flex-row">
        <button
          type="button"
          onClick={onAccept}
          className="flex-1 rounded-xl bg-brand py-2.5 font-medium text-white transition hover:bg-brand-dark"
        >
          Book with {recommendation.specialtyLabel}
        </button>
        <button
          type="button"
          onClick={onRestart}
          className="rounded-xl px-4 py-2.5 text-sm font-medium text-ink-soft ring-1 ring-black/10 transition hover:bg-black/[0.03]"
        >
          Edit symptoms
        </button>
      </div>
    </div>
  );
}
