"use client";

import { useState } from "react";

export interface ReviewDraft {
  specialtyLabel: string;
  specialistName: string;
  locationName: string;
  locationAddress: string;
  dateLabel: string;
  timeLabel: string;
  durationMinutes: number;
  timezone: string;
}

function Row({ label, value }: { label: string; value: string }) {
  return (
    <div className="flex justify-between gap-4 py-1.5 text-sm">
      <span className="text-ink-soft">{label}</span>
      <span className="text-right font-medium text-ink">{value}</span>
    </div>
  );
}

export function ReviewCard({
  draft,
  onConfirm,
  onChangeTime,
  error,
}: {
  draft: ReviewDraft;
  onConfirm: (name: string, email: string) => void;
  onChangeTime: () => void;
  error?: string | null;
}) {
  const [name, setName] = useState("");
  const [email, setEmail] = useState("");
  const [touched, setTouched] = useState(false);

  const nameValid = name.trim().length > 0;

  return (
    <div className="rounded-2xl bg-white p-5 shadow-sm ring-1 ring-black/5">
      <h3 className="mb-3 text-lg font-semibold text-ink">
        Review your appointment
      </h3>

      <div className="divide-y divide-black/5 rounded-xl bg-black/[0.02] px-3">
        <Row label="Specialty" value={draft.specialtyLabel} />
        <Row label="Clinician" value={draft.specialistName} />
        <Row
          label="Location"
          value={`${draft.locationName} — ${draft.locationAddress}`}
        />
        <Row label="Date" value={draft.dateLabel} />
        <Row label="Time" value={`${draft.timeLabel} (${draft.timezone})`} />
        <Row label="Duration" value={`${draft.durationMinutes} minutes`} />
      </div>

      <div className="mt-4 space-y-3">
        <div>
          <label className="mb-1 block text-sm font-medium text-ink" htmlFor="rc-name">
            Your name <span className="text-danger">*</span>
          </label>
          <input
            id="rc-name"
            value={name}
            onChange={(e) => setName(e.target.value)}
            onBlur={() => setTouched(true)}
            placeholder="Name for the booking"
            className="w-full rounded-xl border border-black/10 px-3 py-2 text-sm outline-none"
          />
          {touched && !nameValid && (
            <p className="mt-1 text-xs text-danger">A name is required to confirm.</p>
          )}
        </div>
        <div>
          <label className="mb-1 block text-sm font-medium text-ink" htmlFor="rc-email">
            Email <span className="text-ink-soft">(optional)</span>
          </label>
          <input
            id="rc-email"
            type="email"
            value={email}
            onChange={(e) => setEmail(e.target.value)}
            placeholder="Stored locally only"
            className="w-full rounded-xl border border-black/10 px-3 py-2 text-sm outline-none"
          />
          <p className="mt-1 text-xs text-ink-soft">
            No email is sent. This is a local demo reservation only.
          </p>
        </div>
      </div>

      {error && (
        <p className="mt-3 rounded-xl bg-danger-pale px-3 py-2 text-sm text-danger">
          {error}
        </p>
      )}

      <div className="mt-4 flex flex-col gap-2 sm:flex-row">
        <button
          type="button"
          onClick={() => {
            setTouched(true);
            if (nameValid) onConfirm(name.trim(), email.trim());
          }}
          className="flex-1 rounded-xl bg-brand py-2.5 font-medium text-white transition hover:bg-brand-dark"
        >
          Confirm appointment
        </button>
        <button
          type="button"
          onClick={onChangeTime}
          className="rounded-xl px-4 py-2.5 text-sm font-medium text-ink-soft ring-1 ring-black/10 transition hover:bg-black/[0.03]"
        >
          Change time
        </button>
      </div>
    </div>
  );
}
