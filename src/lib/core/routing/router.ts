// Deterministic specialist routing. Given a set of selected symptom names,
// sum the derived symptom->specialty weights and pick the best specialty,
// with a primary-care fallback for weak / ambiguous evidence.

import { getSymptom, getSpecialty, specialtyLabel } from "@/lib/data";
import type { Recommendation, SpecialtyId } from "@/lib/types";

const FALLBACK: SpecialtyId = "primary_care";

export function recommendSpecialty(selectedSymptoms: string[]): Recommendation {
  const scoreMap = new Map<SpecialtyId, number>();

  for (const name of selectedSymptoms) {
    const entry = getSymptom(name);
    if (!entry) continue;
    for (const [spId, weight] of Object.entries(entry.weights)) {
      scoreMap.set(spId, (scoreMap.get(spId) ?? 0) + weight);
    }
  }

  const scores = [...scoreMap.entries()]
    .map(([specialtyId, score]) => ({
      specialtyId,
      label: specialtyLabel(specialtyId),
      score: Math.round(score * 1000) / 1000,
    }))
    .sort((a, b) => b.score - a.score);

  const total = scores.reduce((sum, s) => sum + s.score, 0);

  // Best non-fallback candidate.
  const bestNonFallback = scores.find((s) => s.specialtyId !== FALLBACK);
  const top = scores[0];

  let chosenId: SpecialtyId;
  let confidence: Recommendation["confidence"];

  if (selectedSymptoms.length === 0 || total <= 0 || !bestNonFallback) {
    chosenId = FALLBACK;
    confidence = "fallback";
  } else {
    const topShare = bestNonFallback.score / total;
    const second = scores.find(
      (s) => s.specialtyId !== bestNonFallback.specialtyId && s.specialtyId !== FALLBACK
    );
    const margin = topShare - (second ? second.score / total : 0);

    if (topShare < 0.22) {
      // Evidence is too diffuse to name a specialty confidently.
      chosenId = FALLBACK;
      confidence = "fallback";
    } else {
      chosenId = bestNonFallback.specialtyId;
      confidence =
        topShare >= 0.45 && margin >= 0.12 ? "high" : "medium";
      // If the fallback actually outscores the best specialty by a lot,
      // prefer primary care.
      if (top.specialtyId === FALLBACK && top.score > bestNonFallback.score * 1.5) {
        chosenId = FALLBACK;
        confidence = "fallback";
      }
    }
  }

  const chosen = getSpecialty(chosenId);
  const chosenLabel = chosen?.label ?? chosenId;

  // Which selected symptoms most drove this specialty.
  const drivingSymptoms = selectedSymptoms
    .map((name) => ({ name, w: getSymptom(name)?.weights[chosenId] ?? 0 }))
    .filter((x) => x.w > 0)
    .sort((a, b) => b.w - a.w)
    .slice(0, 3)
    .map((x) => x.name);

  const rationale = buildRationale(
    chosenId,
    chosenLabel,
    confidence,
    drivingSymptoms,
    chosen?.blurb ?? ""
  );

  return {
    specialtyId: chosenId,
    specialtyLabel: chosenLabel,
    confidence,
    scores: scores.slice(0, 6),
    drivingSymptoms,
    rationale,
  };
}

function joinList(items: string[]): string {
  if (items.length === 0) return "your symptoms";
  if (items.length === 1) return items[0];
  if (items.length === 2) return `${items[0]} and ${items[1]}`;
  return `${items.slice(0, -1).join(", ")}, and ${items[items.length - 1]}`;
}

function buildRationale(
  specialtyId: SpecialtyId,
  label: string,
  confidence: Recommendation["confidence"],
  driving: string[],
  blurb: string
): string {
  if (confidence === "fallback") {
    return `Your symptoms don't point clearly to a single specialty, so the safest first step is ${label}. A primary care clinician can evaluate ${joinList(
      driving
    )} and refer you onward if needed. ${blurb}`.trim();
  }
  const hedge = confidence === "high" ? "most closely align with" : "appear to align with";
  return `Based on ${joinList(
    driving
  )}, your symptoms ${hedge} ${label}. ${blurb}`.trim();
}
