// Core domain types for the deterministic (no-AI) health-check scheduler.

export type SpecialtyId = string;

export interface Specialty {
  id: SpecialtyId;
  label: string;
  blurb: string;
}

/** One symptom from the derived vocabulary. */
export interface SymptomEntry {
  name: string;
  /** specialtyId -> share of disease-instances (0..1) that point at that specialty. */
  weights: Record<SpecialtyId, number>;
  /** how many disease instances exhibit this symptom (relative frequency). */
  prevalence: number;
}

export interface RoutingData {
  generatedAt: string;
  source: string;
  stats: {
    rows: number;
    symptomCount: number;
    diseaseCount: number;
    specialtyDiseaseCounts: Record<string, number>;
  };
  specialties: Specialty[];
  symptoms: SymptomEntry[];
  specialtySymptoms: Record<SpecialtyId, string[]>;
}

export type ConversationStage =
  | "welcome"
  | "collecting_symptoms"
  | "asking_follow_ups"
  | "recommending_specialist"
  | "selecting_location"
  | "selecting_duration"
  | "selecting_date"
  | "selecting_time"
  | "reviewing_appointment"
  | "confirmed"
  | "urgent_exit";

export type Confidence = "high" | "medium" | "fallback";

export interface Recommendation {
  specialtyId: SpecialtyId;
  specialtyLabel: string;
  confidence: Confidence;
  /** Ordered scored specialties for transparency. */
  scores: { specialtyId: SpecialtyId; label: string; score: number }[];
  /** Symptoms (normalized names) that most drove this result. */
  drivingSymptoms: string[];
  rationale: string;
}

export interface RedFlagHit {
  category: string;
  message: string;
  matchedPhrase: string;
}

// ----- Scheduling -----

export interface Specialist {
  id: string;
  name: string;
  credentials: string;
  specialtyId: SpecialtyId;
  focus: string;
}

export interface ClinicLocation {
  id: string;
  name: string;
  address: string;
  city: string;
}

export interface DurationOption {
  minutes: number;
  label: string;
}

export interface TimeSlot {
  /** ISO date-time (local) for the slot start. */
  startsAt: string;
  label: string; // e.g. "9:30 AM"
}

export interface Appointment {
  id: string;
  confirmationCode: string;
  patientDisplayName: string;
  contactEmail?: string;
  specialtyId: SpecialtyId;
  specialtyLabel: string;
  specialistId: string;
  specialistName: string;
  locationId: string;
  locationName: string;
  durationMinutes: number;
  startsAt: string; // ISO local
  dateLabel: string;
  timeLabel: string;
  timezone: string;
  status: "confirmed" | "cancelled";
  createdAt: string;
}

// ----- Chat transcript -----

export type MessageRole = "assistant" | "user" | "system";

export interface ChatMessage {
  id: string;
  role: MessageRole;
  text: string;
  createdAt: string;
}
