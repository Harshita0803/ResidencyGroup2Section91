// Deterministic emergency red-flag screening. Runs on every user free-text
// message BEFORE routing. A hit stops routine scheduling (urgent_exit).
// This is intentionally conservative and is NOT a diagnosis.

export interface RedFlagRule {
  category: string;
  message: string;
  patterns: RegExp[];
}

const RULES: RedFlagRule[] = [
  {
    category: "Possible heart attack",
    message:
      "Crushing or spreading chest pain — especially with sweating, nausea, or pain radiating to the arm or jaw — can be a heart emergency.",
    patterns: [
      /\bcrushing chest\b/,
      /chest pain.*(arm|jaw|sweat|short(ness)? of breath|radiat)/,
      /(arm|jaw|sweat|radiat).*chest pain/,
      /\bheart attack\b/,
      /chest.*(pressure|tightness).*(arm|jaw|sweat)/,
    ],
  },
  {
    category: "Possible stroke",
    message:
      "Sudden face drooping, arm weakness, slurred or lost speech, or one-sided numbness can be signs of a stroke. Every minute matters.",
    patterns: [
      /\bstroke\b/,
      /face (droop|drooping|is drooping)/,
      /slurred speech/,
      /can('| ca)?n?o?t? (speak|talk)/,
      /(sudden|one).*(numb|weak).*(side|arm|face|leg)/,
      /(numb|weak).*(one side|left side|right side)/,
      /drooping (face|mouth)/,
    ],
  },
  {
    category: "Severe breathing difficulty",
    message:
      "Severe trouble breathing, gasping, or blue lips needs emergency care right away.",
    patterns: [
      /can('| ca)?n?o?t? breathe/,
      /cannot breathe/,
      /(struggling|gasping) (to |for )?breath/,
      /(blue|turning blue) (lips|face)/,
      /choking/,
    ],
  },
  {
    category: "Loss of consciousness / confusion",
    message:
      "Fainting, unresponsiveness, or sudden severe confusion needs urgent evaluation.",
    patterns: [
      /passed out/,
      /pass(ing)? out/,
      /(lost|loss of) consciousness/,
      /unconscious/,
      /unresponsive/,
      /sudden.*confus/,
    ],
  },
  {
    category: "Uncontrolled bleeding",
    message:
      "Heavy bleeding that will not stop needs emergency care and direct pressure on the wound.",
    patterns: [
      /(bleeding|blood).*(won('| wi)?t stop|will not stop|can('| ca)?n?o?t stop)/,
      /uncontrol.*bleed/,
      /heavy(ly)? bleeding/,
      /gushing blood/,
    ],
  },
  {
    category: "Severe allergic reaction",
    message:
      "Swelling of the face, lips, tongue, or throat with trouble breathing may be a life-threatening allergic reaction (anaphylaxis).",
    patterns: [
      /anaphylax/,
      /(throat|tongue|lips|face) (is )?swelling/,
      /swelling.*(throat|tongue).*(breath|swallow)/,
      /can('| ca)?n?o?t? swallow.*swell/,
    ],
  },
  {
    category: "Immediate self-harm risk",
    message:
      "If you are thinking about harming yourself or ending your life, you are not alone and help is available right now.",
    patterns: [
      /kill myself/,
      /suicid/,
      /end my life/,
      /want to die/,
      /harm myself/,
      /hurting myself/,
    ],
  },
  {
    category: "Possible severe reaction / poisoning",
    message:
      "A suspected overdose or poisoning needs immediate emergency help.",
    patterns: [/overdose/, /poison(ed|ing)/, /took too many pills/],
  },
];

export interface RedFlagResult {
  category: string;
  message: string;
  matchedPhrase: string;
}

export function screenForRedFlags(text: string): RedFlagResult | null {
  const norm = text.toLowerCase().replace(/\s+/g, " ").trim();
  if (!norm) return null;
  for (const rule of RULES) {
    for (const pattern of rule.patterns) {
      const m = norm.match(pattern);
      if (m) {
        return {
          category: rule.category,
          message: rule.message,
          matchedPhrase: m[0],
        };
      }
    }
  }
  return null;
}
