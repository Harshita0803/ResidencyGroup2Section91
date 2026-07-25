// Seeded, fictional scheduling catalog: specialists, clinic locations, and
// appointment durations. All demo data — no real clinicians or clinics.

import { SPECIALTIES } from "@/lib/data";
import type {
  Specialist,
  ClinicLocation,
  DurationOption,
  SpecialtyId,
} from "@/lib/types";

export const LOCATIONS: ClinicLocation[] = [
  { id: "loc_north", name: "North Valley Medical Center", address: "100 Cedar Ave", city: "Springfield" },
  { id: "loc_river", name: "Riverside Health Clinic", address: "42 River Road", city: "Springfield" },
  { id: "loc_downtown", name: "Downtown Care Center", address: "8 Main Street", city: "Springfield" },
  { id: "loc_lakeside", name: "Lakeside Family Practice", address: "210 Lake Drive", city: "Springfield" },
];

export const DURATIONS: DurationOption[] = [
  { minutes: 20, label: "Quick follow-up · 20 min" },
  { minutes: 30, label: "Standard visit · 30 min" },
  { minutes: 45, label: "Extended consult · 45 min" },
];

// Deterministic fictional name pools.
const FIRST = [
  "Amara", "Ravi", "Elena", "Marcus", "Priya", "Daniel", "Sofia", "Ken",
  "Grace", "Omar", "Nadia", "Leo", "Maya", "Ivan", "Chloe", "Hassan",
  "Yara", "Theo", "Lena", "Noah", "Iris", "Sam", "Zoe", "Adar",
];
const LAST = [
  "Okafor", "Menon", "Rossi", "Bauer", "Sharma", "Cole", "Fernández", "Tanaka",
  "Bennett", "Haddad", "Petrov", "Nguyen", "Silva", "Novak", "Reyes", "Ali",
  "Kaur", "Larsen", "Moreau", "Park", "Weiss", "Diaz", "Fischer", "Bright",
];

function buildSpecialists(): Specialist[] {
  const out: Specialist[] = [];
  SPECIALTIES.forEach((sp, i) => {
    for (let k = 0; k < 2; k++) {
      const fi = (i * 2 + k) % FIRST.length;
      const li = (i * 3 + k * 7) % LAST.length;
      out.push({
        id: `${sp.id}_${k + 1}`,
        name: `Dr. ${FIRST[fi]} ${LAST[li]}`,
        credentials: "MD",
        specialtyId: sp.id,
        focus: sp.blurb,
      });
    }
  });
  return out;
}

export const SPECIALISTS: Specialist[] = buildSpecialists();

export function specialistsFor(specialtyId: SpecialtyId): Specialist[] {
  return SPECIALISTS.filter((s) => s.specialtyId === specialtyId);
}

export function getSpecialist(id: string): Specialist | undefined {
  return SPECIALISTS.find((s) => s.id === id);
}

export function getLocation(id: string): ClinicLocation | undefined {
  return LOCATIONS.find((l) => l.id === id);
}
