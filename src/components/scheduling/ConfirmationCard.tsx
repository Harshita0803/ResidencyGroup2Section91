"use client";

import type { Appointment } from "@/lib/types";

function Row({ label, value }: { label: string; value: string }) {
  return (
    <div className="flex justify-between gap-4 py-1.5 text-sm">
      <span className="text-ink-soft">{label}</span>
      <span className="text-right font-medium text-ink">{value}</span>
    </div>
  );
}

export function ConfirmationCard({
  appointment,
  onNew,
}: {
  appointment: Appointment;
  onNew: () => void;
}) {
  return (
    <div className="rounded-2xl bg-white p-5 shadow-sm ring-1 ring-brand/20">
      <div className="mb-3 flex items-center gap-2">
        <span aria-hidden className="text-2xl">✅</span>
        <h3 className="text-lg font-semibold text-brand-dark">
          Appointment confirmed
        </h3>
      </div>

      <div className="mb-4 rounded-xl bg-brand-pale p-4 text-center">
        <p className="text-xs uppercase tracking-wide text-brand-dark/70">
          Confirmation code
        </p>
        <p className="mt-1 text-2xl font-bold tracking-widest text-brand-dark">
          {appointment.confirmationCode}
        </p>
      </div>

      <div className="divide-y divide-black/5 rounded-xl bg-black/[0.02] px-3">
        <Row label="Name" value={appointment.patientDisplayName} />
        <Row label="Specialty" value={appointment.specialtyLabel} />
        <Row label="Clinician" value={appointment.specialistName} />
        <Row label="Location" value={appointment.locationName} />
        <Row label="Date" value={appointment.dateLabel} />
        <Row
          label="Time"
          value={`${appointment.timeLabel} (${appointment.timezone})`}
        />
        <Row label="Duration" value={`${appointment.durationMinutes} minutes`} />
        {appointment.contactEmail && (
          <Row label="Email" value={appointment.contactEmail} />
        )}
      </div>

      <p className="mt-3 text-xs text-ink-soft">
        This is a demo reservation saved only in this browser. No real clinic was
        contacted and no notification was sent.
      </p>

      <button
        type="button"
        onClick={onNew}
        className="mt-4 w-full rounded-xl bg-brand py-2.5 font-medium text-white transition hover:bg-brand-dark"
      >
        Start a new conversation
      </button>
    </div>
  );
}
