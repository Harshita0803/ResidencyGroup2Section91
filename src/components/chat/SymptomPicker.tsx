"use client";

import { useMemo, useState } from "react";
import { SYMPTOMS_BY_PREVALENCE } from "@/lib/data";

const COMMON_COUNT = 14;

export function SymptomPicker({
  selected,
  onToggle,
  onContinue,
}: {
  selected: string[];
  onToggle: (name: string) => void;
  onContinue: () => void;
}) {
  const [query, setQuery] = useState("");
  const selectedSet = useMemo(() => new Set(selected), [selected]);

  const suggestions = useMemo(() => {
    const q = query.trim().toLowerCase();
    if (!q) return SYMPTOMS_BY_PREVALENCE.slice(0, COMMON_COUNT);
    return SYMPTOMS_BY_PREVALENCE.filter((s) =>
      s.name.toLowerCase().includes(q)
    ).slice(0, 24);
  }, [query]);

  return (
    <div className="rounded-2xl bg-white p-4 shadow-sm ring-1 ring-black/5">
      <p className="mb-2 text-sm font-medium text-ink">
        Your symptoms{" "}
        <span className="text-ink-soft">({selected.length} selected)</span>
      </p>

      {selected.length > 0 ? (
        <div className="mb-3 flex flex-wrap gap-1.5">
          {selected.map((name) => (
            <button
              key={name}
              type="button"
              onClick={() => onToggle(name)}
              className="group inline-flex items-center gap-1 rounded-full bg-brand-pale px-3 py-1 text-sm text-brand-dark ring-1 ring-brand/20 transition hover:bg-brand hover:text-white"
              aria-label={`Remove ${name}`}
            >
              {name}
              <span aria-hidden className="text-xs opacity-70 group-hover:opacity-100">✕</span>
            </button>
          ))}
        </div>
      ) : (
        <p className="mb-3 text-sm text-ink-soft">
          Type above to describe how you feel, or search and tap symptoms below.
        </p>
      )}

      <input
        type="text"
        value={query}
        onChange={(e) => setQuery(e.target.value)}
        placeholder="Search symptoms (e.g. cough, chest pain, dizziness)…"
        aria-label="Search symptoms"
        className="mb-2 w-full rounded-xl border border-black/10 px-3 py-2 text-sm outline-none placeholder:text-ink-soft/60"
      />

      <div className="mb-3 flex flex-wrap gap-1.5">
        {!query && (
          <span className="w-full pb-1 text-xs font-medium uppercase tracking-wide text-ink-soft/70">
            Common symptoms
          </span>
        )}
        {suggestions.map((s) => {
          const active = selectedSet.has(s.name);
          return (
            <button
              key={s.name}
              type="button"
              onClick={() => onToggle(s.name)}
              className={`rounded-full px-3 py-1 text-sm ring-1 transition ${
                active
                  ? "bg-brand text-white ring-brand"
                  : "bg-white text-ink ring-black/10 hover:bg-brand-pale hover:ring-brand/30"
              }`}
            >
              {active ? "✓ " : "+ "}
              {s.name}
            </button>
          );
        })}
        {query && suggestions.length === 0 && (
          <span className="text-sm text-ink-soft">
            No matching symptom in the catalog. Try another word.
          </span>
        )}
      </div>

      <button
        type="button"
        disabled={selected.length === 0}
        onClick={onContinue}
        className="w-full rounded-xl bg-brand py-2.5 font-medium text-white transition hover:bg-brand-dark disabled:cursor-not-allowed disabled:opacity-40"
      >
        Continue
      </button>
    </div>
  );
}
