// Typed access to the generated routing data (built from the CSV by
// scripts/generate-data.mjs). Bundled at build time (~55 KB).

import raw from "@/data/routing-data.json";
import type { RoutingData, SymptomEntry, Specialty, SpecialtyId } from "./types";

export const routingData = raw as unknown as RoutingData;

export const SPECIALTIES: Specialty[] = routingData.specialties;

const specialtyById = new Map<SpecialtyId, Specialty>(
  SPECIALTIES.map((s) => [s.id, s])
);

export function getSpecialty(id: SpecialtyId): Specialty | undefined {
  return specialtyById.get(id);
}

export function specialtyLabel(id: SpecialtyId): string {
  return specialtyById.get(id)?.label ?? id;
}

export const SYMPTOMS: SymptomEntry[] = routingData.symptoms;

const symptomByName = new Map<string, SymptomEntry>(
  SYMPTOMS.map((s) => [s.name, s])
);

export function getSymptom(name: string): SymptomEntry | undefined {
  return symptomByName.get(name);
}

/** All symptom names sorted most-common-first (useful for the picker). */
export const SYMPTOMS_BY_PREVALENCE: SymptomEntry[] = [...SYMPTOMS].sort(
  (a, b) => b.prevalence - a.prevalence
);

export const specialtySymptoms = routingData.specialtySymptoms;
