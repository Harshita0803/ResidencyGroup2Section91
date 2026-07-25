"use client";

/**
 * A single deterministic follow-up round: given the current leading specialty,
 * offer its most-associated symptoms so the user can confirm additional ones.
 * These toggles feed straight back into routing.
 */
export function FollowUpChips({
  options,
  selected,
  onToggle,
  onDone,
}: {
  options: string[];
  selected: string[];
  onToggle: (name: string) => void;
  onDone: () => void;
}) {
  const selectedSet = new Set(selected);
  return (
    <div className="rounded-2xl bg-white p-4 shadow-sm ring-1 ring-black/5">
      <p className="mb-1 text-sm font-medium text-ink">
        A few of these often go together. Are you also experiencing any?
      </p>
      <p className="mb-3 text-xs text-ink-soft">Optional — tap any that apply.</p>
      <div className="mb-3 flex flex-wrap gap-1.5">
        {options.map((name) => {
          const active = selectedSet.has(name);
          return (
            <button
              key={name}
              type="button"
              onClick={() => onToggle(name)}
              className={`rounded-full px-3 py-1 text-sm ring-1 transition ${
                active
                  ? "bg-brand text-white ring-brand"
                  : "bg-white text-ink ring-black/10 hover:bg-brand-pale hover:ring-brand/30"
              }`}
            >
              {active ? "✓ " : "+ "}
              {name}
            </button>
          );
        })}
      </div>
      <button
        type="button"
        onClick={onDone}
        className="w-full rounded-xl bg-brand py-2.5 font-medium text-white transition hover:bg-brand-dark"
      >
        Get my recommendation
      </button>
    </div>
  );
}
