// @ts-nocheck
/**
 * generate-data.mjs
 * -----------------
 * Turns the large disease/symptom matrix
 * (Final_Augmented_dataset_Diseases_and_Symptoms.csv) into small, app-ready
 * JSON files that the deterministic (no-AI) router consumes at runtime.
 *
 * The source CSV is a binary matrix:
 *   column 0            -> disease name
 *   columns 1..N        -> symptom names, value 0/1 per row (a disease instance)
 *
 * There is NO specialist column in the data. We derive one with a curated,
 * keyword-based disease -> specialty classifier (see SPECIALTY_RULES below),
 * then aggregate, per symptom, how strongly it points at each specialty across
 * every disease instance that exhibits it. That aggregation is the mapping the
 * chatbot uses to recommend a specialist from a set of reported symptoms.
 *
 * Usage:
 *   node scripts/generate-data.mjs            # (re)generate
 *   node scripts/generate-data.mjs --if-missing   # skip if output already exists
 */

import fs from "node:fs";
import path from "node:path";
import readline from "node:readline";
import { fileURLToPath } from "node:url";

const __dirname = path.dirname(fileURLToPath(import.meta.url));
const ROOT = path.resolve(__dirname, "..");
const CSV_PATH = path.join(ROOT, "Final_Augmented_dataset_Diseases_and_Symptoms.csv");
const OUT_DIR = path.join(ROOT, "src", "data");
const OUT_FILE = path.join(OUT_DIR, "routing-data.json");

// ---------------------------------------------------------------------------
// Specialty catalog (allowlist). Every recommendation resolves to one of these.
// ---------------------------------------------------------------------------
const SPECIALTIES = [
  { id: "primary_care", label: "Primary Care", blurb: "General evaluation, coordination, and referral for broad or unclear symptoms." },
  { id: "cardiology", label: "Cardiology", blurb: "Heart rhythm, chest, blood-pressure, and circulation concerns." },
  { id: "pulmonology", label: "Pulmonology", blurb: "Lungs and breathing conditions such as asthma, cough, and shortness of breath." },
  { id: "gastroenterology", label: "Gastroenterology", blurb: "Digestive tract, stomach, bowel, and liver-related concerns." },
  { id: "neurology", label: "Neurology", blurb: "Brain and nervous system: headaches, dizziness, numbness, seizures." },
  { id: "dermatology", label: "Dermatology", blurb: "Skin, hair, and nail conditions such as rashes and lesions." },
  { id: "endocrinology", label: "Endocrinology", blurb: "Hormones and metabolism: thyroid, diabetes, and related concerns." },
  { id: "orthopedics", label: "Orthopedics", blurb: "Bones, joints, muscles, and injuries to the musculoskeletal system." },
  { id: "ent", label: "Otolaryngology (ENT)", blurb: "Ear, nose, throat, sinus, and hearing concerns." },
  { id: "allergy_immunology", label: "Allergy & Immunology", blurb: "Allergic reactions, hay fever, and immune-related symptoms." },
  { id: "urology", label: "Urology", blurb: "Urinary tract, bladder, and male reproductive concerns." },
  { id: "gynecology", label: "Gynecology", blurb: "Reproductive health, menstrual, and pregnancy-related concerns." },
  { id: "behavioral_health", label: "Behavioral Health", blurb: "Mood, anxiety, sleep, and mental-health concerns." },
  { id: "ophthalmology", label: "Ophthalmology", blurb: "Eye and vision concerns." },
  { id: "nephrology", label: "Nephrology", blurb: "Kidney function and related conditions." },
  { id: "rheumatology", label: "Rheumatology", blurb: "Autoimmune and inflammatory joint/connective-tissue conditions." },
  { id: "hematology", label: "Hematology", blurb: "Blood disorders such as anemia and clotting problems." },
  { id: "infectious_disease", label: "Infectious Disease", blurb: "Serious or persistent infections." },
  { id: "oncology", label: "Oncology", blurb: "Evaluation and care related to cancers and tumors." },
];

// ---------------------------------------------------------------------------
// Disease -> specialty classifier. Ordered, first keyword hit wins.
// More specific / higher-priority specialties are listed first.
// ---------------------------------------------------------------------------
const SPECIALTY_RULES = [
  ["oncology", ["cancer", "carcinoma", "malignan", "sarcoma", "myeloma", "metasta", "neoplasm", "tumor", "lymphoma", "lipoma", "osteochondroma", "meningioma", "ependymoma", "myelodysplastic", "leukoplakia", "mastectomy"]],
  ["behavioral_health", ["anxiety", "depress", "panic", "psychot", "bipolar", "schizo", "mania", "manic", "alcohol", "substance", "drug abuse", "marijuana", "opioid", "cocaine", "cannabis", "addiction", "withdrawal", "insomnia", "narcolepsy", "eating disorder", "anorexia", "bulimia", "ptsd", "post-traumatic", "stress reaction", "adjustment reaction", "personality disorder", "attention deficit", "adhd", "autism", "asperger", "suicid", "phobia", "obsessive", "somatoform", "somatization", "dissociative", "conduct disorder", "conversion disorder", "factitious", "dysthymic", "impulse control", "oppositional", "psychosexual", "chronic pain disorder", "pain disorder"]],
  ["neurology", ["stroke", "migraine", "headache", "seizure", "epilep", "parkinson", "alzheimer", "dementia", "delirium", "multiple sclerosis", "neuropathy", "neuralgia", "neuritis", "bell palsy", "cerebral palsy", "amyotrophic", "myasthenia", "encephal", "cerebral", "brain", "spinal cord", "sciatica", "vertigo", "bppv", "positional vert", "concussion", "tremor", "myoclonus", "neuro", "cranial", "guillain", "huntington", "transient ischemic", "tia", "syncope", "peripheral nerve", "hemiplegia", "hydrocephalus", "hemorrhage", "autonomic nervous", "extrapyramidal", "ataxia", "restless leg", "syringomyelia", "tic (movement)", "tourette", "moyamoya", "muscular dystrophy", "spina bifida", "vertebrobasilar", "wernicke", "tuberous sclerosis"]],
  ["cardiology", ["heart", "cardi", "aortic", "aneurysm", "angina", "arrhythmia", "atrial", "ventric", "coronary", "myocard", "pericard", "endocard", "hypertension", "high blood pressure", "valve", "tachycardia", "bradycardia", "palpitation", "ischemic heart", "chf", "congestive", "atherosclerosis", "varicose", "deep vein thrombosis", "dvt", "thrombophlebitis", "peripheral arterial", "venous insufficiency", "raynaud", "orthostatic hypotension"]],
  ["pulmonology", ["lung", "pulmon", "asthma", "copd", "bronchi", "bronchit", "pleur", "emphysema", "pneumothorax", "pneumonia", "pneumoconiosis", "respiratory distress", "sleep apnea", "apnea", "silicosis", "asbestosis", "sarcoidosis", "atelectasis", "empyema", "cystic fibrosis", "tracheitis", "whooping cough"]],
  ["gastroenterology", ["stomach", "gastr", "intestin", "bowel", "colon", "colitis", "crohn", "ulcer", "esophag", "hepat", "liver", "pancrea", "gallbladder", "gallstone", "cholecyst", "cholangitis", "choledocholithiasis", "biliary", "diverticul", "hemorrhoid", "anal", "rectal", "celiac", "appendicitis", "hernia", "reflux", "dyspepsia", "indigestion", "cirrhosis", "irritable bowel", "achalasia", "malabsorption", "gastritis", "peritonitis", "proctitis", "constipation", "dumping syndrome", "ileus", "intussusception", "hirschsprung", "lactose intolerance", "pyloric stenosis", "volvulus", "neonatal jaundice"]],
  ["dermatology", ["skin", "dermat", "acne", "eczema", "psoriasis", "rash", "wart", "melanoma", "keratosis", "cellulitis", "urticaria", "rosacea", "alopecia", "nail", "onychomycosis", "paronychia", "impetigo", "tinea", "athlete's foot", "vitiligo", "sebaceous", "pemphig", "scabies", "lice", "hair loss", "boil", "carbuncle", "hidradenitis", "acanthosis", "dyshidrosis", "callus", "lichen", "erythema", "hemangioma", "hyperhidrosis", "molluscum", "pityriasis", "pilonidal", "scar", "frostbite", "burn", "cold sore"]],
  ["endocrinology", ["diabet", "thyroid", "goiter", "graves", "adrenal", "cushing", "addison", "pituitary", "hormone", "obesity", "osteoporosis", "hyperlipidemia", "cholesterol", "insulin", "endocrine", "parathyroid", "acromegaly", "metabolic", "hypoglycemia", "prolactin", "galactorrhea", "hirsutism", "glucocorticoid", "hypercalcemia", "hypocalcemia", "hyperkalemia", "hypokalemia", "hypernatremia", "hyponatremia", "siadh", "inappropriate secretion"]],
  ["rheumatology", ["rheumat", "lupus", "vasculitis", "scleroderma", "ankylosing", "gout", "fibromyalgia", "connective tissue", "sjogren", "polymyalgia", "psoriatic arthritis", "reactive arthritis", "septic arthritis", "autoimmune", "myositis", "tietze"]],
  ["orthopedics", ["fracture", "bone", "joint", "arthritis", "osteoarthritis", "dislocation", "sprain", "tendon", "ligament", "meniscus", "rotator cuff", "shoulder", "knee", "patella", "osteomyelitis", "osteochondrosis", "scoliosis", "bursitis", "tendinitis", "tendinosis", "carpal tunnel", "spondyl", "herniated disc", "degenerative disc", "spinal stenosis", "back pain", "lumbago", "adhesive capsulitis", "sciatic", "cartilage", "muscle", "musculoskeletal", "bunion", "hammer toe", "flat feet", "flat foot", "chondromalacia", "avascular necrosis", "de quervain", "ganglion cyst", "hemarthrosis", "epicondylitis", "tennis elbow", "plantar fasciitis", "thoracic outlet", "torticollis", "trigger finger", "rhabdomyolysis"]],
  ["ent", ["ear", "otitis", "otosclerosis", "sinus", "nasal", "nose", "throat", "pharyng", "laryng", "tonsil", "adenoid", "hearing", "presbyacusis", "tinnitus", "epistaxis", "hoarse", "mastoiditis", "labyrinthitis", "meniere", "deviated septum", "vocal cord", "cholesteatoma", "croup", "common cold", "salivary gland", "sialoadenitis", "jaw disorder", "tooth", "teething", "dental", "gum disease", "oral muc", "mucositis"]],
  ["ophthalmology", ["eye", "glaucoma", "cataract", "retina", "macular", "conjunctiv", "vision", "ocular", "cornea", "optic", "amblyopia", "uveitis", "blephar", "stye", "strabismus", "keratitis", "astigmat", "aphakia", "hyperopia", "myopia", "presbyopia", "floaters", "chalazion", "ectropion", "entropion", "endophthalmitis", "chorioretinitis", "iridocyclitis", "scleritis", "pterygium", "pinguecula", "trichiasis", "vitreous"]],
  ["gynecology", ["pregnan", "menstrua", "menstruation", "ovar", "uter", "vagin", "cervi", "menopaus", "endometri", "pelvic inflamm", "pelvic organ prolapse", "pelvic fistula", "gynec", "fibroid", "fibroadenoma", "pcos", "polycystic ovary", "breast", "eclampsia", "menorrhagia", "dysmenorrhea", "mittelschmerz", "vulv", "ectopic", "gravidarum", "hydatidiform", "abortion", "infertility", "placenta", "placental", "amniotic"]],
  ["urology", ["kidney stone", "bladder", "urinary", "urine", "urethr", "prostat", "urolog", "incontinence", "cystitis", "renal calculi", "testic", "penile", "erectile", "epididym", "varicocele", "hydrocele", "spermatocele", "cryptorchidism", "balanitis", "corpus cavernosum", "peyronie", "priapism", "phimosis", "urol"]],
  ["nephrology", ["kidney", "renal", "nephr", "glomerul", "dialysis", "hypovolemia", "fluid overload"]],
  ["hematology", ["anemia", "leukemia", "thrombocyt", "hemophilia", "clotting", "coagul", "sickle cell", "thalassemia", "hemat", "polycythemia", "neutropenia", "pancytopenia", "spherocytosis", "g6pd", "folate deficiency", "von willebrand", "hypergammaglobulinemia", "white blood cell", "vitamin b12 deficiency"]],
  ["allergy_immunology", ["allergy", "allergies", "hay fever", "food allergy", "drug reaction", "drug poisoning", "immunodefic", "hypersensitiv", "anaphyl", "envenomation", "insect bite", "spider"]],
  ["infectious_disease", ["infection", "sepsis", "septic", "hiv", "aids", "tuberculosis", "malaria", "influenza", "flu", "covid", "meningitis", "mononucleosis", "gonorrhea", "chlamydia", "syphilis", "abscess", "sexually transmitted", "shingles", "herpes", "cholera", "typhoid", "dengue", "measles", "mumps", "rubella", "tetanus", "rabies", "lyme", "chickenpox", "cryptococcosis", "cysticercosis", "histoplasmosis", "aspergillosis", "cat scratch", "gas gangrene", "hpv", "granuloma inguinale", "lymphogranuloma", "necrotizing fasciitis", "lymphadenitis", "lymphangitis", "scarlet fever", "rheumatic fever", "rocky mountain", "toxoplasmosis", "trichinosis", "valley fever", "viral exanthem", "sporotrichosis", "parasitic", "acariasis", "omphalitis", "cryptorch_no"]],
];

function classifyDisease(name) {
  const n = name.toLowerCase();
  for (const [specialtyId, keywords] of SPECIALTY_RULES) {
    for (const kw of keywords) {
      if (n.includes(kw)) return specialtyId;
    }
  }
  return "primary_care";
}

// ---------------------------------------------------------------------------
async function main() {
  const ifMissing = process.argv.includes("--if-missing");
  if (ifMissing && fs.existsSync(OUT_FILE)) {
    console.log(`[generate-data] ${path.relative(ROOT, OUT_FILE)} exists, skipping.`);
    return;
  }
  if (!fs.existsSync(CSV_PATH)) {
    console.error(`[generate-data] Source CSV not found at ${CSV_PATH}`);
    console.error("[generate-data] Place the dataset CSV in the project root and re-run `npm run generate:data`.");
    process.exit(1);
  }

  console.log("[generate-data] Reading CSV (this can take a moment for the large file)...");

  const rl = readline.createInterface({
    input: fs.createReadStream(CSV_PATH, { encoding: "utf8" }),
    crlfDelay: Infinity,
  });

  let symptoms = null; // string[]
  let numSymptoms = 0;
  let agg = null; // Float64Array flattened [symptomIdx * numSpecialties + specialtyIdx]
  let symptomDiseaseCount = null; // how many disease-instances show each symptom
  const specialtyIndex = new Map(SPECIALTIES.map((s, i) => [s.id, i]));
  const numSpecialties = SPECIALTIES.length;
  const specialtyDiseaseCounts = new Map(); // specialtyId -> unique-disease count
  const seenDiseaseSpecialty = new Map(); // diseaseName -> specialtyId
  let rowCount = 0;

  for await (const rawLine of rl) {
    const line = rawLine.replace(/\r$/, "");
    if (!line) continue;

    if (symptoms === null) {
      // header
      const parts = splitCsv(line);
      symptoms = parts.slice(1).map((s) => s.trim());
      numSymptoms = symptoms.length;
      agg = new Float64Array(numSymptoms * numSpecialties);
      symptomDiseaseCount = new Float64Array(numSymptoms);
      continue;
    }

    const parts = splitCsv(line);
    // Robust to commas inside a disease name: last numSymptoms fields are values.
    const values = parts.slice(parts.length - numSymptoms);
    const name = parts.slice(0, parts.length - numSymptoms).join(",").trim();
    if (!name) continue;

    let specialtyId = seenDiseaseSpecialty.get(name);
    if (specialtyId === undefined) {
      specialtyId = classifyDisease(name);
      seenDiseaseSpecialty.set(name, specialtyId);
      specialtyDiseaseCounts.set(specialtyId, (specialtyDiseaseCounts.get(specialtyId) || 0) + 1);
    }
    const spIdx = specialtyIndex.get(specialtyId);

    for (let i = 0; i < numSymptoms; i++) {
      if (values[i] === "1") {
        agg[i * numSpecialties + spIdx] += 1;
        symptomDiseaseCount[i] += 1;
      }
    }

    rowCount++;
    if (rowCount % 40000 === 0) console.log(`[generate-data]   processed ${rowCount} rows...`);
  }

  console.log(`[generate-data] Done reading. ${rowCount} rows, ${symptoms.length} symptoms, ${seenDiseaseSpecialty.size} diseases.`);

  // Build per-symptom specialty weights (normalized), keeping the meaningful ones.
  const symptomEntries = symptoms.map((name, i) => {
    const base = i * numSpecialties;
    let total = 0;
    for (let s = 0; s < numSpecialties; s++) total += agg[base + s];
    const weights = {};
    if (total > 0) {
      for (let s = 0; s < numSpecialties; s++) {
        const v = agg[base + s];
        if (v <= 0) continue;
        const w = v / total; // share of specialty among instances showing this symptom
        if (w >= 0.03) weights[SPECIALTIES[s].id] = Math.round(w * 1000) / 1000;
      }
    }
    return { name, weights, prevalence: symptomDiseaseCount[i] };
  });

  // Top symptoms per specialty (used for follow-up "do you also have..." prompts).
  const specialtySymptoms = {};
  for (const sp of SPECIALTIES) specialtySymptoms[sp.id] = [];
  for (const entry of symptomEntries) {
    for (const [spId, w] of Object.entries(entry.weights)) {
      // score for representativeness = specialty share * log-ish prevalence
      specialtySymptoms[spId].push({ name: entry.name, w });
    }
  }
  for (const spId of Object.keys(specialtySymptoms)) {
    specialtySymptoms[spId] = specialtySymptoms[spId]
      .sort((a, b) => b.w - a.w)
      .slice(0, 24)
      .map((x) => x.name);
  }

  const out = {
    generatedAt: new Date().toISOString(),
    source: path.basename(CSV_PATH),
    stats: {
      rows: rowCount,
      symptomCount: symptoms.length,
      diseaseCount: seenDiseaseSpecialty.size,
      specialtyDiseaseCounts: Object.fromEntries(
        [...specialtyDiseaseCounts.entries()].sort((a, b) => b[1] - a[1])
      ),
    },
    specialties: SPECIALTIES,
    symptoms: symptomEntries, // { name, weights: {specialtyId: share}, prevalence }
    specialtySymptoms,
  };

  fs.mkdirSync(OUT_DIR, { recursive: true });
  fs.writeFileSync(OUT_FILE, JSON.stringify(out));
  const kb = (fs.statSync(OUT_FILE).size / 1024).toFixed(0);
  console.log(`[generate-data] Wrote ${path.relative(ROOT, OUT_FILE)} (${kb} KB).`);
  console.log("[generate-data] Disease coverage by specialty:");
  for (const [sp, count] of Object.entries(out.stats.specialtyDiseaseCounts)) {
    console.log(`  ${sp.padEnd(20)} ${count}`);
  }
}

/** Minimal CSV field splitter (handles simple quoted fields). */
function splitCsv(line) {
  if (line.indexOf('"') === -1) return line.split(",");
  const out = [];
  let cur = "";
  let inQ = false;
  for (let i = 0; i < line.length; i++) {
    const c = line[i];
    if (inQ) {
      if (c === '"') {
        if (line[i + 1] === '"') { cur += '"'; i++; }
        else inQ = false;
      } else cur += c;
    } else if (c === '"') inQ = true;
    else if (c === ",") { out.push(cur); cur = ""; }
    else cur += c;
  }
  out.push(cur);
  return out;
}

export { classifyDisease, SPECIALTIES, SPECIALTY_RULES };

// Only run generation when invoked directly (not when imported for tests/checks).
if (process.argv[1] && path.resolve(process.argv[1]) === fileURLToPath(import.meta.url)) {
  main().catch((err) => {
    console.error(err);
    process.exit(1);
  });
}
