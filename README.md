# Health Check Scheduler — Phase 1

A self-contained chatbot that suggests a medical **specialty** from a person's
symptoms and books a **local demo appointment**. It is fully deterministic —
**no AI model, no API keys, no external services**. Everything runs in the
browser using rules and data derived from a bundled symptom dataset.

> ⚕️ Demo only. This is **not** a diagnostic tool or medical advice. In an
> emergency, call your local emergency number.

## Quick start

```bash
npm install
npm run dev        # http://localhost:3000
```

Production build:

```bash
npm run build
npm run start
```

## What it does (Phase 1 scope)

1. Collects symptoms in plain language (free text **or** a searchable picker).
2. Screens every message for emergency red flags before anything else.
3. Asks one round of relevant follow-up symptoms.
4. Recommends **one** specialty with a plain-language rationale and a
   transparent score breakdown.
5. Guides location → duration → date → time selection inline in the chat.
6. Confirms a browser-local appointment with a `HCS-XXXXXX` code.

## How the "no-AI" recommendation works

The bundled dataset (`Final_Augmented_dataset_Diseases_and_Symptoms.csv`) is a
**disease → symptom** matrix (773 diseases × 377 symptoms, ~247k rows). It has
no "specialist" column, so the specialty mapping is derived at build time:

1. `scripts/generate-data.mjs` classifies each disease into a specialty using a
   curated, ordered **keyword ruleset** (e.g. anything matching `cardi`, `heart`,
   `aortic` → Cardiology).
2. For every symptom it aggregates, across all disease instances that show the
   symptom, how strongly that symptom points at each specialty.
3. The result is a compact `src/data/routing-data.json` (~55 KB) that the app
   bundles.

At runtime, `recommendSpecialty()` sums those per-symptom specialty weights over
the selected symptoms and picks the best one, falling back to **Primary Care**
when the evidence is weak or ambiguous.

Regenerate the data after changing the classifier or the CSV:

```bash
npm run generate:data
```

## Project layout

```
scripts/generate-data.mjs      CSV → routing-data.json (build-time)
src/data/routing-data.json     generated symptom→specialty weights
src/lib/
  data.ts                      typed access to the generated data
  core/routing/matcher.ts      free-text → symptom names (synonyms + tokens)
  core/routing/router.ts       symptom set → specialty recommendation
  core/safety/redflags.ts      deterministic emergency screening
  core/scheduling/catalog.ts   seeded specialists, locations, durations
  core/scheduling/availability.ts  30-day slot generation + conflict checks
  persistence/storage.ts       localStorage appointments + confirmation codes
src/components/                chat + scheduling UI
src/app/page.tsx               conversation state machine (orchestrator)
```

## Known limitations (Phase 1)

- Free-text symptom matching is keyword/synonym based, so the **symptom picker**
  is the reliable path; free text is a convenience layer.
- Specialists, clinics, and availability are fictional demo data.
- Appointments persist only in the current browser (localStorage). No email is
  ever sent.
- The disease→specialty keyword classifier is heuristic; ~60 rare/injury/
  poisoning diseases intentionally fall back to Primary Care.

## Not included yet (later phases from `project-plan.md`)

Document/context uploads, importable CSV mapping packs, and the optional
server-side LLM enhancer are out of scope for Phase 1.

Vercel: https://residency-group2-section91.vercel.app/
