"use client";

import type { RedFlagResult } from "@/lib/core/safety/redflags";

export function UrgentCard({
  redFlag,
  onRestart,
}: {
  redFlag: RedFlagResult;
  onRestart: () => void;
}) {
  return (
    <div
      role="alert"
      className="rounded-2xl bg-danger-pale p-5 shadow-sm ring-1 ring-danger/30"
    >
      <div className="mb-2 flex items-center gap-2">
        <span aria-hidden className="text-2xl">🚨</span>
        <h3 className="text-lg font-semibold text-danger">
          Please seek emergency care now
        </h3>
      </div>
      <p className="text-sm font-medium text-danger">{redFlag.category}</p>
      <p className="mt-1 text-sm leading-relaxed text-ink">{redFlag.message}</p>
      <p className="mt-3 rounded-xl bg-white/70 p-3 text-sm text-ink">
        Call your local emergency number (for example <strong>911</strong> in the
        US) or go to the nearest emergency department right away. If you are
        having thoughts of self-harm, you can also reach the{" "}
        <strong>988</strong> Suicide &amp; Crisis Lifeline (US).
      </p>
      <p className="mt-3 text-xs text-ink-soft">
        This demo cannot safely continue routine scheduling after a possible
        emergency sign. It does not provide diagnosis or medical advice.
      </p>
      <button
        type="button"
        onClick={onRestart}
        className="mt-4 rounded-xl px-4 py-2.5 text-sm font-medium text-ink ring-1 ring-black/15 transition hover:bg-white"
      >
        Start a new conversation
      </button>
    </div>
  );
}
