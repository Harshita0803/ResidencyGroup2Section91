// Browser-local persistence for demo appointments. Versioned keys, defensive
// parsing, and safe reset if stored data is corrupt. No secrets, no PHI.

import type { Appointment } from "@/lib/types";

const APPTS_KEY = "hcs.appointments.v1";

function safeParse<T>(raw: string | null, fallback: T): T {
  if (!raw) return fallback;
  try {
    return JSON.parse(raw) as T;
  } catch {
    return fallback;
  }
}

export function loadAppointments(): Appointment[] {
  if (typeof window === "undefined") return [];
  try {
    const list = safeParse<Appointment[]>(localStorage.getItem(APPTS_KEY), []);
    return Array.isArray(list) ? list.filter(isAppointment) : [];
  } catch {
    return [];
  }
}

export function saveAppointments(list: Appointment[]): void {
  if (typeof window === "undefined") return;
  try {
    localStorage.setItem(APPTS_KEY, JSON.stringify(list));
  } catch {
    /* storage unavailable — session continues in memory */
  }
}

export function addAppointment(appt: Appointment): Appointment[] {
  const list = loadAppointments();
  list.push(appt);
  saveAppointments(list);
  return list;
}

export function clearAppointments(): void {
  if (typeof window === "undefined") return;
  try {
    localStorage.removeItem(APPTS_KEY);
  } catch {
    /* ignore */
  }
}

function isAppointment(x: unknown): x is Appointment {
  if (!x || typeof x !== "object") return false;
  const a = x as Record<string, unknown>;
  return (
    typeof a.id === "string" &&
    typeof a.confirmationCode === "string" &&
    typeof a.startsAt === "string" &&
    typeof a.specialistId === "string"
  );
}

// ----- Confirmation code -----

const CODE_ALPHABET = "ABCDEFGHJKLMNPQRSTUVWXYZ23456789"; // no ambiguous chars

export function generateConfirmationCode(): string {
  let body = "";
  const bytes =
    typeof crypto !== "undefined" && crypto.getRandomValues
      ? crypto.getRandomValues(new Uint8Array(6))
      : Array.from({ length: 6 }, () => Math.floor(Math.random() * 256));
  for (let i = 0; i < 6; i++) {
    body += CODE_ALPHABET[bytes[i] % CODE_ALPHABET.length];
  }
  return `HCS-${body}`;
}

export function generateId(prefix = "appt"): string {
  const rand = Math.random().toString(36).slice(2, 10);
  return `${prefix}_${Date.now().toString(36)}_${rand}`;
}
