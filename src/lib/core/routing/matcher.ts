// Deterministic free-text -> symptom matching. No AI: synonyms + substring +
// significant-token overlap against the derived symptom vocabulary.

import { SYMPTOMS } from "@/lib/data";

const STOPWORDS = new Set([
  "of", "the", "or", "and", "a", "an", "in", "on", "to", "with", "my", "i",
  "have", "having", "feel", "feeling", "am", "is", "are", "been", "for",
  "at", "it", "this", "that", "some", "really", "very", "bit", "little",
  "been", "getting", "got", "keep", "keeps", "been",
]);

/** Lay phrase -> canonical symptom name(s) that exist in the vocabulary. */
const RAW_SYNONYMS: Record<string, string[]> = {
  "cant breathe": ["shortness of breath"],
  "can't breathe": ["shortness of breath"],
  "cannot breathe": ["shortness of breath"],
  "hard to breathe": ["shortness of breath"],
  "trouble breathing": ["difficulty breathing"],
  "out of breath": ["shortness of breath"],
  breathless: ["shortness of breath"],
  winded: ["shortness of breath"],
  "throwing up": ["vomiting"],
  "throw up": ["vomiting"],
  "threw up": ["vomiting"],
  puking: ["vomiting"],
  puke: ["vomiting"],
  queasy: ["nausea"],
  "feel sick": ["nausea"],
  nauseous: ["nausea"],
  dizzy: ["dizziness"],
  lightheaded: ["dizziness"],
  "light headed": ["dizziness"],
  "light-headed": ["dizziness"],
  tired: ["fatigue"],
  exhausted: ["fatigue"],
  "no energy": ["fatigue"],
  "worn out": ["fatigue"],
  "runny nose": ["coryza"],
  "running nose": ["coryza"],
  "stuffy nose": ["nasal congestion"],
  "blocked nose": ["nasal congestion"],
  congested: ["nasal congestion"],
  "chest pain": ["sharp chest pain"],
  "pain in chest": ["sharp chest pain"],
  "chest hurts": ["sharp chest pain"],
  "tight chest": ["chest tightness"],
  "stomach ache": ["sharp abdominal pain"],
  "stomach pain": ["sharp abdominal pain"],
  "stomach hurts": ["sharp abdominal pain"],
  "belly pain": ["sharp abdominal pain"],
  "belly ache": ["sharp abdominal pain"],
  "tummy ache": ["sharp abdominal pain"],
  "tummy pain": ["sharp abdominal pain"],
  "abdominal pain": ["sharp abdominal pain"],
  "lower belly": ["lower abdominal pain"],
  "cant sleep": ["insomnia"],
  "can't sleep": ["insomnia"],
  "cannot sleep": ["insomnia"],
  "trouble sleeping": ["insomnia"],
  sleepless: ["insomnia"],
  sad: ["depression"],
  hopeless: ["depression"],
  "feeling down": ["depression"],
  depressed: ["depression"],
  anxious: ["anxiety and nervousness"],
  nervous: ["anxiety and nervousness"],
  worried: ["anxiety and nervousness"],
  panicky: ["anxiety and nervousness"],
  "panic attack": ["anxiety and nervousness"],
  rash: ["skin rash"],
  itchy: ["itching of skin"],
  itching: ["itching of skin"],
  "itchy skin": ["itching of skin"],
  temperature: ["fever"],
  feverish: ["fever"],
  migraine: ["headache"],
  "head ache": ["headache"],
  "racing heart": ["palpitations"],
  "heart racing": ["palpitations"],
  "heart pounding": ["palpitations"],
  "peeing a lot": ["frequent urination"],
  "urinating often": ["frequent urination"],
  "burning pee": ["painful urination"],
  "burning when i pee": ["painful urination"],
  "painful pee": ["painful urination"],
  "loose stool": ["diarrhea"],
  "loose stools": ["diarrhea"],
  "blurry vision": ["diminished vision"],
  "blurred vision": ["diminished vision"],
  "cant see": ["diminished vision"],
  numbness: ["loss of sensation"],
  numb: ["loss of sensation"],
  tingling: ["loss of sensation"],
  "pins and needles": ["loss of sensation"],
  "pain when i pee": ["painful urination"],
  "hurts when i pee": ["painful urination"],
  "burns when i pee": ["painful urination"],
  "painful to pee": ["painful urination"],
};

// Lay verbs that mean "pain" so "my knee hurts" matches "knee pain".
// (Deliberately excludes "sore"/"ache" to avoid breaking "sore throat" and
// "ache all over", which are their own symptom names.)
const TOKEN_SYNONYMS: Record<string, string> = {
  hurts: "pain",
  hurt: "pain",
  hurting: "pain",
  aching: "pain",
  painful: "pain",
};

// Generic modifier tokens that must not, on their own, anchor a match.
const GENERIC_TOKENS = new Set([
  "pain", "ache", "aches", "sharp", "burning", "chronic", "acute", "severe",
  "feeling", "problems", "problem", "abnormal", "discomfort", "symptoms",
  "lower", "upper", "left", "right",
]);

const VOCAB = new Set(SYMPTOMS.map((s) => s.name));
// Keep only synonyms whose targets actually exist in the vocabulary.
const SYNONYMS: Record<string, string[]> = {};
for (const [phrase, targets] of Object.entries(RAW_SYNONYMS)) {
  const valid = targets.filter((t) => VOCAB.has(t));
  if (valid.length) SYNONYMS[phrase] = valid;
}

function normalize(text: string): string {
  return text
    .toLowerCase()
    .replace(/[^a-z0-9\s]/g, " ")
    .replace(/\s+/g, " ")
    .trim();
}

function significantTokens(text: string): string[] {
  return normalize(text)
    .split(" ")
    .filter((w) => w.length > 1 && !STOPWORDS.has(w))
    .map((w) => TOKEN_SYNONYMS[w] ?? w);
}

// Precompute significant tokens per symptom name.
const SYMPTOM_TOKENS: { name: string; tokens: string[] }[] = SYMPTOMS.map(
  (s) => ({ name: s.name, tokens: significantTokens(s.name) })
);

/**
 * Extract canonical symptom names from free text.
 * Returns a de-duplicated list, ordered by match confidence.
 */
export function matchSymptoms(text: string): string[] {
  const norm = normalize(text);
  if (!norm) return [];
  const userTokens = new Set(significantTokens(text));
  const found = new Map<string, number>(); // name -> score

  const add = (name: string, score: number) => {
    found.set(name, Math.max(found.get(name) ?? 0, score));
  };

  // 1) Synonyms (highest confidence).
  for (const [phrase, targets] of Object.entries(SYNONYMS)) {
    if (norm.includes(phrase)) targets.forEach((t) => add(t, 3));
  }

  // 2) Full symptom-name substring.
  for (const s of SYMPTOMS) {
    if (s.name.length >= 4 && norm.includes(s.name)) add(s.name, 3);
  }

  // 3) Significant-token overlap (for short, distinctive names).
  for (const { name, tokens } of SYMPTOM_TOKENS) {
    if (tokens.length === 0 || tokens.length > 4) continue;
    let hit = 0;
    let anchored = false; // matched a specific (non-generic) token
    for (const t of tokens) {
      if (userTokens.has(t)) {
        hit++;
        if (t.length >= 4 && !GENERIC_TOKENS.has(t)) anchored = true;
      }
    }
    const ratio = hit / tokens.length;
    if (ratio >= 0.6 && anchored) add(name, 1 + ratio);
  }

  return [...found.entries()].sort((a, b) => b[1] - a[1]).map(([name]) => name);
}
