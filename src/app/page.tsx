"use client";

import { useEffect, useMemo, useRef, useState } from "react";
import type {
  Appointment,
  ChatMessage,
  ConversationStage,
  Recommendation,
} from "@/lib/types";
import { matchSymptoms } from "@/lib/core/routing/matcher";
import { recommendSpecialty } from "@/lib/core/routing/router";
import { screenForRedFlags, type RedFlagResult } from "@/lib/core/safety/redflags";
import {
  LOCATIONS,
  DURATIONS,
  specialistsFor,
  getSpecialist,
  getLocation,
} from "@/lib/core/scheduling/catalog";
import {
  availableDays,
  slotsForDate,
  isSlotStillValid,
  longDateLabel,
  formatTimeLabel,
} from "@/lib/core/scheduling/availability";
import { specialtySymptoms } from "@/lib/data";
import {
  loadAppointments,
  addAppointment,
  generateConfirmationCode,
  generateId,
} from "@/lib/persistence/storage";

import { MessageBubble } from "@/components/chat/MessageBubble";
import { Composer } from "@/components/chat/Composer";
import { SymptomPicker } from "@/components/chat/SymptomPicker";
import { FollowUpChips } from "@/components/chat/FollowUpChips";
import { RecommendationCard } from "@/components/chat/RecommendationCard";
import { UrgentCard } from "@/components/chat/UrgentCard";
import {
  LocationPicker,
  DurationPicker,
  DatePicker,
  TimePicker,
} from "@/components/scheduling/SchedulingWidgets";
import { ReviewCard } from "@/components/scheduling/ReviewCard";
import { ConfirmationCard } from "@/components/scheduling/ConfirmationCard";

const WELCOME =
  "Hi! I'm a demo health assistant. Tell me what's bothering you — in your own words — and I'll suggest which kind of specialist may be the best fit, then help you book a demo appointment.\n\nFor example: \"I've had a sore throat and a cough for three days.\"";

let msgSeq = 0;
function newMessage(role: ChatMessage["role"], text: string): ChatMessage {
  msgSeq += 1;
  return {
    id: `m_${msgSeq}_${Math.random().toString(36).slice(2, 7)}`,
    role,
    text,
    createdAt: new Date().toISOString(),
  };
}

function listPhrase(items: string[]): string {
  if (items.length === 0) return "";
  if (items.length === 1) return items[0];
  if (items.length === 2) return `${items[0]} and ${items[1]}`;
  return `${items.slice(0, -1).join(", ")}, and ${items[items.length - 1]}`;
}

export default function Page() {
  const [mounted, setMounted] = useState(false);
  const [stage, setStage] = useState<ConversationStage>("collecting_symptoms");
  const [messages, setMessages] = useState<ChatMessage[]>([]);
  const [selected, setSelected] = useState<string[]>([]);
  const [followUps, setFollowUps] = useState<string[]>([]);
  const [recommendation, setRecommendation] = useState<Recommendation | null>(null);
  const [redFlag, setRedFlag] = useState<RedFlagResult | null>(null);

  const [specialistId, setSpecialistId] = useState<string | null>(null);
  const [locationId, setLocationId] = useState<string | null>(null);
  const [durationMinutes, setDurationMinutes] = useState<number | null>(null);
  const [dateKey, setDateKey] = useState<string | null>(null);
  const [startsAt, setStartsAt] = useState<string | null>(null);
  const [slotError, setSlotError] = useState<string | null>(null);

  const [appointments, setAppointments] = useState<Appointment[]>([]);
  const [confirmed, setConfirmed] = useState<Appointment | null>(null);
  const [announce, setAnnounce] = useState("");

  const scrollRef = useRef<HTMLDivElement>(null);
  const timezone = useMemo(
    () => Intl.DateTimeFormat().resolvedOptions().timeZone || "local time",
    []
  );

  // Client-only init (avoids SSR hydration mismatch with random ids/timestamps).
  useEffect(() => {
    setMounted(true);
    setAppointments(loadAppointments());
    setMessages([newMessage("assistant", WELCOME)]);
  }, []);

  useEffect(() => {
    scrollRef.current?.scrollTo({ top: scrollRef.current.scrollHeight, behavior: "smooth" });
  }, [messages, stage]);

  function push(role: ChatMessage["role"], text: string) {
    setMessages((prev) => [...prev, newMessage(role, text)]);
  }

  // ---- symptom collection ----
  function handleSend(text: string) {
    if (stage !== "collecting_symptoms") return;
    const flag = screenForRedFlags(text);
    push("user", text);
    if (flag) {
      setRedFlag(flag);
      setStage("urgent_exit");
      setAnnounce(`Urgent warning detected: ${flag.category}. Emergency guidance shown.`);
      return;
    }
    const matched = matchSymptoms(text);
    const fresh = matched.filter((m) => !selected.includes(m));
    if (matched.length > 0) {
      setSelected((prev) => Array.from(new Set([...prev, ...matched])));
      const noted = fresh.length > 0 ? fresh : matched;
      push(
        "assistant",
        `Got it — I've noted ${listPhrase(noted)}. Add or remove anything below, then tap Continue when your list looks right.`
      );
    } else {
      push(
        "assistant",
        "I couldn't match that to a specific symptom in my catalog. Try describing it another way, or search and tap symptoms in the panel below."
      );
    }
  }

  function toggleSymptom(name: string) {
    setSelected((prev) =>
      prev.includes(name) ? prev.filter((s) => s !== name) : [...prev, name]
    );
  }

  function continueFromSymptoms() {
    if (selected.length === 0) return;
    push("user", `My symptoms: ${listPhrase(selected)}.`);
    const prelim = recommendSpecialty(selected);
    const opts = (specialtySymptoms[prelim.specialtyId] || [])
      .filter((s) => !selected.includes(s))
      .slice(0, 8);
    if (opts.length === 0) {
      finishFollowUps(selected);
      return;
    }
    setFollowUps(opts);
    setStage("asking_follow_ups");
    push(
      "assistant",
      "Thanks. A few quick follow-ups can sharpen the recommendation."
    );
  }

  function finishFollowUps(symptomList: string[]) {
    const rec = recommendSpecialty(symptomList);
    setRecommendation(rec);
    setStage("recommending_specialist");
    push(
      "assistant",
      "Here's my suggestion based on everything you've shared. Remember: this is a demo, not a diagnosis."
    );
  }

  // ---- scheduling ----
  function acceptRecommendation() {
    if (!recommendation) return;
    const docs = specialistsFor(recommendation.specialtyId);
    const doc = docs[0];
    setSpecialistId(doc?.id ?? null);
    // reset dependent selections
    setLocationId(null);
    setDurationMinutes(null);
    setDateKey(null);
    setStartsAt(null);
    push("user", `Let's book ${recommendation.specialtyLabel}.`);
    push(
      "assistant",
      `Great. You'll be booked with ${doc?.name ?? "an available clinician"} (${recommendation.specialtyLabel}). First, choose a clinic location.`
    );
    setStage("selecting_location");
  }

  function pickLocation(id: string) {
    setLocationId(id);
    setDurationMinutes(null);
    setDateKey(null);
    setStartsAt(null);
    push("user", getLocation(id)?.name ?? "Selected location");
    push("assistant", "How long should we reserve for your visit?");
    setStage("selecting_duration");
  }

  function pickDuration(min: number) {
    setDurationMinutes(min);
    setDateKey(null);
    setStartsAt(null);
    push("user", DURATIONS.find((d) => d.minutes === min)?.label ?? `${min} min`);
    push("assistant", "Pick a date that works for you.");
    setStage("selecting_date");
  }

  function pickDate(key: string) {
    setDateKey(key);
    setStartsAt(null);
    const [y, mo, d] = key.split("-").map(Number);
    push("user", longDateLabel(new Date(y, mo - 1, d)));
    push("assistant", "And a time?");
    setStage("selecting_time");
  }

  function pickTime(iso: string) {
    setStartsAt(iso);
    push("user", formatTimeLabel(new Date(iso)));
    push("assistant", "Here's your appointment summary. Add your name to confirm.");
    setStage("reviewing_appointment");
  }

  function confirmAppointment(name: string, email: string) {
    if (!recommendation || !specialistId || !locationId || !durationMinutes || !startsAt) {
      return;
    }
    if (!isSlotStillValid(startsAt, durationMinutes, specialistId, appointments)) {
      setSlotError("That time is no longer available — please choose another.");
      push("system", "The selected time was just taken. Please pick another time.");
      setStage("selecting_time");
      return;
    }
    setSlotError(null);
    const doc = getSpecialist(specialistId);
    const loc = getLocation(locationId);
    const start = new Date(startsAt);
    const appt: Appointment = {
      id: generateId(),
      confirmationCode: generateConfirmationCode(),
      patientDisplayName: name,
      contactEmail: email || undefined,
      specialtyId: recommendation.specialtyId,
      specialtyLabel: recommendation.specialtyLabel,
      specialistId,
      specialistName: doc?.name ?? "Clinician",
      locationId,
      locationName: loc?.name ?? "Clinic",
      durationMinutes,
      startsAt,
      dateLabel: longDateLabel(start),
      timeLabel: formatTimeLabel(start),
      timezone,
      status: "confirmed",
      createdAt: new Date().toISOString(),
    };
    const updated = addAppointment(appt);
    setAppointments(updated);
    setConfirmed(appt);
    setStage("confirmed");
    setAnnounce(
      `Appointment confirmed with ${appt.specialistName} on ${appt.dateLabel} at ${appt.timeLabel}. Confirmation code ${appt.confirmationCode}.`
    );
    push(
      "assistant",
      `You're all set! Your confirmation code is ${appt.confirmationCode}.`
    );
  }

  function resetConversation() {
    setStage("collecting_symptoms");
    setSelected([]);
    setFollowUps([]);
    setRecommendation(null);
    setRedFlag(null);
    setSpecialistId(null);
    setLocationId(null);
    setDurationMinutes(null);
    setDateKey(null);
    setStartsAt(null);
    setSlotError(null);
    setConfirmed(null);
    setMessages([newMessage("assistant", WELCOME)]);
    setAnnounce("Started a new conversation.");
  }

  // ---- derived scheduling data ----
  const days = useMemo(() => {
    if (!durationMinutes || !specialistId) return [];
    return availableDays(durationMinutes, specialistId, appointments);
  }, [durationMinutes, specialistId, appointments]);

  const slots = useMemo(() => {
    if (!dateKey || !durationMinutes || !specialistId) return [];
    return slotsForDate(dateKey, durationMinutes, specialistId, appointments);
  }, [dateKey, durationMinutes, specialistId, appointments]);

  const composerEnabled = stage === "collecting_symptoms";

  return (
    <div className="mx-auto flex h-[100dvh] max-w-2xl flex-col">
      {/* Header */}
      <header className="flex items-center justify-between gap-2 border-b border-black/5 bg-white/80 px-4 py-3 backdrop-blur">
        <div className="flex items-center gap-2">
          <span aria-hidden className="grid h-8 w-8 place-items-center rounded-lg bg-brand text-white">✚</span>
          <div>
            <h1 className="text-sm font-semibold leading-tight text-ink">
              Health Check Scheduler
            </h1>
            <span className="inline-flex items-center gap-1 text-[11px] text-ink-soft">
              <span className="h-1.5 w-1.5 rounded-full bg-brand" />
              Local rules mode · no AI
            </span>
          </div>
        </div>
        <button
          type="button"
          onClick={resetConversation}
          className="rounded-lg px-3 py-1.5 text-xs font-medium text-ink-soft ring-1 ring-black/10 transition hover:bg-black/[0.03]"
        >
          New conversation
        </button>
      </header>

      {/* Live region for accessibility */}
      <div aria-live="polite" className="sr-only">
        {announce}
      </div>

      {/* Transcript */}
      <div ref={scrollRef} className="scroll-thin flex-1 space-y-3 overflow-y-auto px-4 py-4">
        {!mounted ? (
          <p className="text-center text-sm text-ink-soft">Loading…</p>
        ) : (
          <>
            <div className="mx-auto max-w-[92%] rounded-xl bg-white/70 px-3 py-2 text-center text-xs text-ink-soft ring-1 ring-black/5">
              ⚕️ Demo only — this is not a diagnosis or medical advice. In an
              emergency, call your local emergency number.
            </div>

            {messages.map((m) => (
              <MessageBubble key={m.id} message={m} />
            ))}

            {/* Inline stage widgets */}
            {stage === "collecting_symptoms" && (
              <SymptomPicker
                selected={selected}
                onToggle={toggleSymptom}
                onContinue={continueFromSymptoms}
              />
            )}

            {stage === "asking_follow_ups" && (
              <FollowUpChips
                options={followUps}
                selected={selected}
                onToggle={toggleSymptom}
                onDone={() => finishFollowUps(selected)}
              />
            )}

            {stage === "recommending_specialist" && recommendation && (
              <RecommendationCard
                recommendation={recommendation}
                onAccept={acceptRecommendation}
                onRestart={() => {
                  setStage("collecting_symptoms");
                  push("assistant", "No problem — adjust your symptoms below.");
                }}
              />
            )}

            {stage === "selecting_location" && (
              <LocationPicker locations={LOCATIONS} onPick={pickLocation} />
            )}

            {stage === "selecting_duration" && (
              <DurationPicker durations={DURATIONS} onPick={pickDuration} />
            )}

            {stage === "selecting_date" && (
              <DatePicker days={days} onPick={pickDate} />
            )}

            {stage === "selecting_time" && (
              <TimePicker
                slots={slots}
                onPick={pickTime}
                onBack={() => setStage("selecting_date")}
              />
            )}

            {stage === "reviewing_appointment" &&
              recommendation &&
              specialistId &&
              locationId &&
              durationMinutes &&
              startsAt && (
                <ReviewCard
                  error={slotError}
                  draft={{
                    specialtyLabel: recommendation.specialtyLabel,
                    specialistName: getSpecialist(specialistId)?.name ?? "Clinician",
                    locationName: getLocation(locationId)?.name ?? "Clinic",
                    locationAddress: getLocation(locationId)?.address ?? "",
                    dateLabel: longDateLabel(new Date(startsAt)),
                    timeLabel: formatTimeLabel(new Date(startsAt)),
                    durationMinutes,
                    timezone,
                  }}
                  onConfirm={confirmAppointment}
                  onChangeTime={() => setStage("selecting_time")}
                />
              )}

            {stage === "confirmed" && confirmed && (
              <ConfirmationCard appointment={confirmed} onNew={resetConversation} />
            )}

            {stage === "urgent_exit" && redFlag && (
              <UrgentCard redFlag={redFlag} onRestart={resetConversation} />
            )}
          </>
        )}
      </div>

      {/* Composer */}
      <div className="border-t border-black/5 bg-white/80 px-4 py-3 backdrop-blur">
        <Composer
          disabled={!composerEnabled}
          placeholder="Describe your symptoms…"
          onSend={handleSend}
        />
        <p className="mt-1.5 text-center text-[11px] text-ink-soft">
          Appointments are demo reservations stored only in this browser.
        </p>
      </div>
    </div>
  );
}
