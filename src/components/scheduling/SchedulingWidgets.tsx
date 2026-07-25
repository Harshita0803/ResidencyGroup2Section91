"use client";

import type {
  ClinicLocation,
  DurationOption,
  TimeSlot,
} from "@/lib/types";
import type { AvailableDay } from "@/lib/core/scheduling/availability";

function Panel({
  title,
  children,
}: {
  title: string;
  children: React.ReactNode;
}) {
  return (
    <div className="rounded-2xl bg-white p-4 shadow-sm ring-1 ring-black/5">
      <p className="mb-3 text-sm font-medium text-ink">{title}</p>
      {children}
    </div>
  );
}

export function LocationPicker({
  locations,
  onPick,
}: {
  locations: ClinicLocation[];
  onPick: (id: string) => void;
}) {
  return (
    <Panel title="Choose a clinic location">
      <div className="grid gap-2 sm:grid-cols-2">
        {locations.map((loc) => (
          <button
            key={loc.id}
            type="button"
            onClick={() => onPick(loc.id)}
            className="rounded-xl border border-black/10 p-3 text-left transition hover:border-brand hover:bg-brand-pale/40"
          >
            <span className="block font-medium text-ink">{loc.name}</span>
            <span className="block text-xs text-ink-soft">
              {loc.address}, {loc.city}
            </span>
          </button>
        ))}
      </div>
    </Panel>
  );
}

export function DurationPicker({
  durations,
  onPick,
}: {
  durations: DurationOption[];
  onPick: (minutes: number) => void;
}) {
  return (
    <Panel title="How long do you need?">
      <div className="flex flex-wrap gap-2">
        {durations.map((d) => (
          <button
            key={d.minutes}
            type="button"
            onClick={() => onPick(d.minutes)}
            className="rounded-xl border border-black/10 px-4 py-2 text-sm font-medium text-ink transition hover:border-brand hover:bg-brand-pale/40"
          >
            {d.label}
          </button>
        ))}
      </div>
    </Panel>
  );
}

export function DatePicker({
  days,
  onPick,
}: {
  days: AvailableDay[];
  onPick: (dateKey: string) => void;
}) {
  if (days.length === 0) {
    return (
      <Panel title="Pick a date">
        <p className="text-sm text-ink-soft">
          No open dates for this combination. Try a shorter duration or another
          location.
        </p>
      </Panel>
    );
  }
  return (
    <Panel title="Pick a date (next 30 days)">
      <div className="grid grid-cols-2 gap-2 sm:grid-cols-3">
        {days.map((d) => (
          <button
            key={d.dateKey}
            type="button"
            onClick={() => onPick(d.dateKey)}
            className="rounded-xl border border-black/10 p-2.5 text-center transition hover:border-brand hover:bg-brand-pale/40"
          >
            <span className="block text-sm font-medium text-ink">{d.label}</span>
            <span className="block text-[11px] text-ink-soft">
              {d.slotCount} slot{d.slotCount === 1 ? "" : "s"}
            </span>
          </button>
        ))}
      </div>
    </Panel>
  );
}

export function TimePicker({
  slots,
  onPick,
  onBack,
}: {
  slots: TimeSlot[];
  onPick: (startsAt: string) => void;
  onBack: () => void;
}) {
  return (
    <Panel title="Pick a time">
      {slots.length === 0 ? (
        <p className="text-sm text-ink-soft">
          No open times left on this day. Please choose another date.
        </p>
      ) : (
        <div className="grid grid-cols-3 gap-2 sm:grid-cols-4">
          {slots.map((s) => (
            <button
              key={s.startsAt}
              type="button"
              onClick={() => onPick(s.startsAt)}
              className="rounded-xl border border-black/10 py-2 text-sm font-medium text-ink transition hover:border-brand hover:bg-brand-pale/40"
            >
              {s.label}
            </button>
          ))}
        </div>
      )}
      <button
        type="button"
        onClick={onBack}
        className="mt-3 text-xs font-medium text-ink-soft underline underline-offset-2"
      >
        ← Back to dates
      </button>
    </Panel>
  );
}
