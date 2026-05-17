import { ScriptChunk } from './types';

// ---------------------------------------------------------------------------
// OpenRouter helpers (mirrors prompt-generator-v2 pattern)
// ---------------------------------------------------------------------------

function getOpenRouterApiKey(): string | null {
  if (typeof window !== 'undefined') {
    try {
      const ls = localStorage.getItem('openrouter_api_key');
      if (ls) return ls;
    } catch {}
    try {
      const ss = sessionStorage.getItem('openrouter_api_key');
      if (ss) return ss;
    } catch {}
    const mem = (window as any).__openrouter_api_key;
    if (typeof mem === 'string' && mem) return mem;
    return process.env.NEXT_PUBLIC_OPENROUTER_API_KEY || null;
  }
  return process.env.NEXT_PUBLIC_OPENROUTER_API_KEY || null;
}

function getOpenRouterModelId(): string {
  if (typeof window !== 'undefined') {
    return (
      localStorage.getItem('openrouter_model_id') ||
      process.env.NEXT_PUBLIC_OPENROUTER_MODEL_ID ||
      'anthropic/claude-sonnet-4.5'
    );
  }
  return process.env.NEXT_PUBLIC_OPENROUTER_MODEL_ID || 'anthropic/claude-sonnet-4.5';
}

export type VisualTreatment =
  | 'image'
  | 'image_only'
  | 'text_only'
  | 'counter'
  | 'map'
  | 'timeline'
  | 'document'
  | 'quote'
  | 'parchment'
  | 'scroll'
  | 'newspaper'
  | 'date'
  | 'route'
  | 'portrait'
  | 'chart'
  | 'comparison'
  | 'testimony'
  | 'stacked_cards'
  | 'parallax'
  | 'zoom'
  | 'fade_reveal'
  | 'uncrumple';

export interface ChunkTreatment {
  chunkId: number;
  treatment: VisualTreatment;
  reason: string;
  needsImage: boolean;
  displayText?: string; // on-screen text (NOT the narration — see documentary rules)
}

export interface TreatmentConfig {
  maxPercentage: Record<VisualTreatment, number>;
}

export const DEFAULT_TREATMENT_CONFIG: TreatmentConfig = {
  maxPercentage: {
    image:        100,
    image_only:    10,
    text_only:     10,
    counter:        5,
    map:            5,
    timeline:       5,
    document:       5,
    quote:         10,
    parchment:      5,
    scroll:         5,
    newspaper:      5,
    date:           5,
    route:          5,
    portrait:       5,
    chart:          5,
    comparison:     5,
    testimony:      5,
    stacked_cards:  5,
    parallax:       5,
    zoom:           5,
    fade_reveal:    5,
    uncrumple:      3,
  },
};

export const TREATMENT_LABELS: Record<VisualTreatment, string> = {
  image:         'Image',
  image_only:    'Image Only',
  text_only:     'Text Only',
  counter:       'Counter',
  map:           'Map',
  timeline:      'Timeline',
  document:      'Document',
  quote:         'Quote',
  parchment:     'Parchment',
  scroll:        'Scroll',
  newspaper:     'Newspaper',
  date:          'Date Card',
  route:         'Route',
  portrait:      'Portrait',
  chart:         'Chart',
  comparison:    'Comparison',
  testimony:     'Testimony',
  stacked_cards: 'Stacked Cards',
  parallax:      'Parallax',
  zoom:          'Zoom',
  fade_reveal:   'Fade Reveal',
  uncrumple:     'Uncrumple',
};

export const TREATMENT_DESCRIPTIONS: Record<VisualTreatment, string> = {
  image:         'Ken Burns pan/zoom with text overlay',
  image_only:    'Ken Burns with no text — let the image breathe',
  text_only:     'Kinetic text on black — no image needed',
  counter:       'Animated number counting up — no image needed',
  map:           'Map with animated pin or path',
  timeline:      'Year + event cards, chronological',
  document:      'Parchment/decree styled card',
  quote:         'Styled quote card with attribution',
  parchment:     'Aged parchment with calligraphic document text',
  scroll:        'Unrolling scroll animation revealing text',
  newspaper:     'Period newspaper front page layout',
  date:          'Year + date + event title card',
  route:         'Map with animated journey/migration path',
  portrait:      'Framed portrait of a historical figure',
  chart:         'Animated bar or data chart — no image needed',
  comparison:    'Split-screen before/after comparison',
  testimony:     'Multiple witness quote cards',
  stacked_cards: 'List of items appearing as stacked cards',
  parallax:      'Deep parallax scroll — image breathes with depth',
  zoom:          'Slow zoom into a detail within the scene',
  fade_reveal:   'Dramatic fade-in to reveal key information',
  uncrumple:     'Paper crumple/uncrumple animation reveal',
};

export const TREATMENT_COLORS: Record<VisualTreatment, string> = {
  image:         'bg-blue-500/20 text-blue-300 border-blue-500/40',
  image_only:    'bg-indigo-500/20 text-indigo-300 border-indigo-500/40',
  text_only:     'bg-yellow-500/20 text-yellow-300 border-yellow-500/40',
  counter:       'bg-orange-500/20 text-orange-300 border-orange-500/40',
  map:           'bg-green-500/20 text-green-300 border-green-500/40',
  timeline:      'bg-cyan-500/20 text-cyan-300 border-cyan-500/40',
  document:      'bg-amber-500/20 text-amber-300 border-amber-500/40',
  quote:         'bg-purple-500/20 text-purple-300 border-purple-500/40',
  parchment:     'bg-yellow-700/20 text-yellow-200 border-yellow-600/40',
  scroll:        'bg-stone-500/20 text-stone-300 border-stone-500/40',
  newspaper:     'bg-slate-400/20 text-slate-200 border-slate-400/40',
  date:          'bg-sky-500/20 text-sky-300 border-sky-500/40',
  route:         'bg-emerald-500/20 text-emerald-300 border-emerald-500/40',
  portrait:      'bg-rose-500/20 text-rose-300 border-rose-500/40',
  chart:         'bg-lime-500/20 text-lime-300 border-lime-500/40',
  comparison:    'bg-fuchsia-500/20 text-fuchsia-300 border-fuchsia-500/40',
  testimony:     'bg-violet-400/20 text-violet-200 border-violet-400/40',
  stacked_cards: 'bg-teal-500/20 text-teal-300 border-teal-500/40',
  parallax:      'bg-blue-700/20 text-blue-200 border-blue-600/40',
  zoom:          'bg-pink-500/20 text-pink-300 border-pink-500/40',
  fade_reveal:   'bg-purple-700/20 text-purple-200 border-purple-600/40',
  uncrumple:     'bg-amber-700/20 text-amber-200 border-amber-600/40',
};

// Treatments that do NOT require an image prompt
export const TREATMENTS_NO_IMAGE: VisualTreatment[] = [
  'text_only', 'counter', 'scroll', 'newspaper', 'date',
  'chart', 'comparison', 'testimony', 'stacked_cards',
];

// ---------------------------------------------------------------------------
// Merge suggestions
// ---------------------------------------------------------------------------

export interface MergeSuggestion {
  chunkIds: [number, number]; // exactly 2 adjacent chunk IDs (lower first)
  reason: string;
}

const MERGE_ANALYSIS_SYSTEM_PROMPT = `You are an expert video editor and visual storyteller analyzing script chunks for documentary or educational video production.

Your task is to identify ADJACENT chunks that would produce a stronger, more coherent single visual beat if merged.

MERGE when:
- A chunk is very short (under 8 words) and continues the same thought as its neighbor
- Two chunks describe the same single moment, scene, or visual action
- Merging would create a clearer, more focused image or animation prompt
- Two consecutive chunks together form one complete visual concept (e.g. cause + immediate effect)

DO NOT merge when:
- Either chunk is already 20+ words and stands on its own visually
- The chunks cover clearly different events, locations, or time periods
- Merging would create text over 60 words (too dense for a single image)
- Each chunk is already a distinct visual beat

Return ONLY valid JSON — no markdown, no explanation:
{"suggestions":[{"chunkIds":[1,2],"reason":"short reason"},{"chunkIds":[4,5],"reason":"short reason"}]}

If no merges are needed, return exactly: {"suggestions":[]}`;

export async function analyzeMergesWithAI(
  chunks: ScriptChunk[],
  onProgress?: (current: number, total: number) => void
): Promise<MergeSuggestion[]> {
  const apiKey = getOpenRouterApiKey();
  if (!apiKey) throw new Error('OpenRouter API key not configured.');
  const model = getOpenRouterModelId();

  onProgress?.(0, 1);

  const payload = chunks.map(c => ({ id: c.id, text: c.text, words: c.wordCount }));

  const resp = await fetch('https://openrouter.ai/api/v1/chat/completions', {
    method: 'POST',
    headers: {
      'Content-Type': 'application/json',
      Authorization: `Bearer ${apiKey}`,
      'HTTP-Referer': typeof window !== 'undefined' ? window.location.origin : '',
      'X-Title': 'Script Chunker V2 - Merge Analysis',
    },
    body: JSON.stringify({
      model,
      messages: [
        { role: 'system', content: MERGE_ANALYSIS_SYSTEM_PROMPT },
        {
          role: 'user',
          content: `Analyze these ${chunks.length} script chunks and suggest adjacent merges that would improve visual storytelling:\n\n${JSON.stringify(payload, null, 2)}`,
        },
      ],
      temperature: 0.3,
      max_tokens: 2000,
    }),
  });

  if (!resp.ok) {
    const err = await resp.text();
    throw new Error(`OpenRouter error ${resp.status}: ${err}`);
  }

  const data = await resp.json();
  const content: string = data.choices?.[0]?.message?.content ?? '';

  onProgress?.(1, 1);

  const jsonMatch = content.match(/\{[\s\S]*\}/);
  if (!jsonMatch) return [];

  let parsed: { suggestions: Array<{ chunkIds: number[]; reason: string }> };
  try {
    parsed = JSON.parse(jsonMatch[0]);
  } catch {
    return [];
  }
  if (!Array.isArray(parsed.suggestions)) return [];

  const idSet = new Set(chunks.map(c => c.id));
  const valid: MergeSuggestion[] = [];

  for (const s of parsed.suggestions) {
    if (!Array.isArray(s.chunkIds) || s.chunkIds.length !== 2) continue;
    const [a, b] = s.chunkIds as [number, number];
    if (!idSet.has(a) || !idSet.has(b)) continue;
    const idxA = chunks.findIndex(c => c.id === a);
    const idxB = chunks.findIndex(c => c.id === b);
    if (Math.abs(idxA - idxB) !== 1) continue; // must be adjacent
    const first  = idxA < idxB ? a : b;
    const second = idxA < idxB ? b : a;
    valid.push({ chunkIds: [first, second], reason: s.reason ?? '' });
  }

  return valid;
}

// --- Detection helpers ---

const QUOTE_PATTERNS = [
  /^["""''\u2018\u2019\u201C\u201D]/, // starts with opening quote mark
  /["""''\u201C\u201D][^"""'']{10,}["""''\u2018\u2019\u201C\u201D]/,
  /\b(said|declared|proclaimed|wrote|stated|uttered|cried|shouted|replied|answered|whispered|exclaimed|commanded|ordered|announced|confessed|admitted|warned|vowed)\b/i,
];

// Requires unambiguously legal-document nouns — no generic words like "will", "article", "sentence"
const DOCUMENT_KEYWORDS =
  /\b(decree|edict|oath|treaty|charter|proclamation|ratified|statute|ordinance|papal bull|writ|legislation|amendment|magna carta|constitution|covenant|manifesto|imperial edict|royal decree|signed (the |a )?(treaty|charter|decree|edict|oath)|swore (an |the )?oath|took (an |the )?oath)\b/i;

const COUNTER_PATTERNS = [
  /\b\d{1,3}(,\d{3})+\b/, // numbers with commas: 14,000
  /\b\d+\s*%/, // percentages
  /\b(half|quarter|third|double|triple)\s+of\b/i,
  /\b\d+\s*(million|billion|thousand|hundred)\b/i,
  /\b(died|killed|executed|deported|arrested|wounded|survived|fled|expelled|imprisoned|massacred|starved|enslaved)\s+\d+/i,
  /\b\d+\s*(died|killed|executed|deported|arrested|wounded|survived|fled|expelled|imprisoned|massacred|starved|enslaved)\b/i,
  /\bover\s+\d{4,}\b/i,
  /\bnearly\s+\d{4,}\b/i,
  /\bmore than\s+\d{4,}\b/i,
];

// Requires explicit geographic movement or territorial action — not just directional words
const MAP_KEYWORDS =
  /\b(marched (to|through|into|across|from)|crossed (the |into |over )|sailed (to|from|through|into|across)|invaded|annexed|besieged|encircled|flanked|withdrew to|retreated (to|into|across)|fled (to|across|through)|moved (his |their |the )?army|trade route|supply route|migration route|marching route|troop movement|(east|west|north|south)(ern)? (border|flank|front|coast|province|bank|shore|territory|frontier)|(border|territory|province|frontier|flank) (between|of|with))\b/i;

const ROUTE_KEYWORDS =
  /\b(set sail|the voyage|the journey|the crossing|the passage|the march|embarked (on|from)|deported (to|from)|ships (departed|left|arrived)|the fleet (sailed|arrived)|carried (across|to)|transported (to|from|across)|the route (led|stretched)|sailing (south|north|east|west)|across the (ocean|sea|atlantic|channel|strait))\b/i;

const PORTRAIT_KEYWORDS =
  /\b(was born|his name was|her name was|known as|referred to as|colonel |general |governor |admiral |commander |lieutenant |sergeant |captain |major |bishop |cardinal |pope |king |queen |emperor |empress |duke |duchess |lord |lady |sir |commander-in-chief|portrait of|engraving of|depicted as)\b/i;

const NEWSPAPER_KEYWORDS =
  /\b(news (of|spread|reached)|it was (reported|announced|proclaimed)|according to (reports|the press|eyewitnesses)|the announcement (of|that)|headlines (declared|read|screamed)|the (gazette|herald|chronicle|times|journal) (reported|declared|announced)|news broke|word spread|the world learned)\b/i;

const PARCHMENT_KEYWORDS =
  /\b(the order (read|declared|stated)|it was written|the document (stated|declared|read)|as written in|the text (read|declared|states)|hereby (declare|order|proclaim|command)|let it be known|by order of|in the name of (the king|the crown|god|his majesty)|be it known|be it resolved)\b/i;

const SCROLL_KEYWORDS =
  /\b(the scroll|the manuscript|the ancient text|as recorded in|the chronicle (states|records|notes)|written in the annals|the annals (record|state)|the codex|the parchment (reads|states)|inscribed (on|in)|the inscription (reads|states))\b/i;

const CHART_KEYWORDS = [
  /\b\d+\s*(million|billion|thousand)\b.*\b\d+\s*(million|billion|thousand)\b/i, // two big numbers
  /\b(compared to|versus|vs\.?|by contrast|in contrast,|whereas)\b.*\b\d+/i,
  /\b(grew (from|by)|fell (from|by)|rose (from|to)|declined (from|to)|increased (from|to)|decreased (from|to))\b/i,
  /\b(population (of|grew|fell|reached)|census (showed|recorded|counted))\b/i,
];

const COMPARISON_KEYWORDS =
  /\b(before (the|this|that) (war|battle|revolution|deportation|exile|conquest)|after (the|this|that) (war|battle|revolution|deportation|exile|conquest)|where once|whereas once|what had been|what would become|the contrast between|in peacetime|in wartime)\b/i;

const TESTIMONY_KEYWORDS =
  /\b(eyewitnesses (reported|recalled|described)|survivors (recalled|described|said|wrote)|those who (were there|survived|witnessed)|according to (survivors|witnesses|accounts)|witness accounts|testimony of|as one survivor|as an eyewitness)\b/i;

const STACKED_CARDS_KEYWORDS =
  /\b((homes? (were|had been) (burned|destroyed|torn down|seized)|(livestock|cattle|crops) (were|had been) (seized|taken|confiscated))|(churches? (were|had been) (burned|destroyed|torn down))|(families? (were|had been) (separated|torn apart|split up)))\b/i;

const PARALLAX_KEYWORDS =
  /\b(stretched (across|to|for miles)|as far as (the eye|anyone) could see|vast (fields|marshlands|plains|ocean|landscape|horizon)|the rolling|the sweeping|panorama|rolling hills|open sea|the horizon)\b/i;

const ZOOM_KEYWORDS =
  /\b(a closer (look|examination|inspection)|in the (background|foreground|corner|distance)|hidden (among|behind|beneath|within)|the detail|barely visible|if you look closely|tucked (into|behind|beneath)|at the edge of|in the shadows|a small (figure|shape|mark|detail))\b/i;

const FADE_REVEAL_KEYWORDS =
  /\b(what (they|he|she|no one) did not know|the truth (was|would emerge)|little did (they|he|she) know|it would (later|soon) be revealed|what emerged (was|would be)|unknown to (them|him|her)|unbeknownst to|the hidden (truth|cost|toll|reality)|beneath the (surface|official|facade))\b/i;

const UNCRUMPLE_KEYWORDS =
  /\b(the letter (was|had been) (discovered|found|preserved|unearthed)|when the document (was|had been) (found|opened|discovered|unsealed)|preserved in the archives|the (diary|journal|letter|note|document) (read|reveals|shows|states)|found among (the|his|her) (papers|belongings|effects)|unearthed (from|in) (the|an?) archive)\b/i;

const DATE_FULL_PATTERN =
  /\b(January|February|March|April|May|June|July|August|September|October|November|December)\s+\d{1,2},?\s+(1[0-9]{3}|20[0-2][0-9])\b|\b(1[0-9]{3}|20[0-2][0-9])\b/;

const DATE_PATTERN = /\b(1[0-9]{3}|20[0-2][0-9])\b/;

function isLikelyQuote(text: string): boolean {
  return QUOTE_PATTERNS.some((p) => p.test(text));
}

function isLikelyDocument(text: string): boolean {
  return DOCUMENT_KEYWORDS.test(text);
}

function hasStatisticalNumbers(text: string): boolean {
  return COUNTER_PATTERNS.some((p) => p.test(text));
}

function isLikelyMap(text: string): boolean {
  return MAP_KEYWORDS.test(text);
}

function isLikelyRoute(text: string): boolean {
  return ROUTE_KEYWORDS.test(text);
}

function isLikelyPortrait(text: string): boolean {
  return PORTRAIT_KEYWORDS.test(text);
}

function isLikelyNewspaper(text: string): boolean {
  return NEWSPAPER_KEYWORDS.test(text);
}

function isLikelyParchment(text: string): boolean {
  return PARCHMENT_KEYWORDS.test(text);
}

function isLikelyScroll(text: string): boolean {
  return SCROLL_KEYWORDS.test(text);
}

function isLikelyChart(text: string): boolean {
  return CHART_KEYWORDS.some(p => p.test(text));
}

function isLikelyComparison(text: string): boolean {
  return COMPARISON_KEYWORDS.test(text);
}

function isLikelyTestimony(text: string): boolean {
  return TESTIMONY_KEYWORDS.test(text);
}

function isLikelyStackedCards(text: string): boolean {
  return STACKED_CARDS_KEYWORDS.test(text);
}

function isLikelyParallax(text: string): boolean {
  return PARALLAX_KEYWORDS.test(text);
}

function isLikelyZoom(text: string): boolean {
  return ZOOM_KEYWORDS.test(text);
}

function isLikelyFadeReveal(text: string): boolean {
  return FADE_REVEAL_KEYWORDS.test(text);
}

function isLikelyUncrumple(text: string): boolean {
  return UNCRUMPLE_KEYWORDS.test(text);
}

function isProminentDate(text: string, wordCount: number): boolean {
  // A short chunk where a specific full date dominates
  return wordCount <= 20 && DATE_FULL_PATTERN.test(text);
}

function isDramaticShort(text: string, wordCount: number): boolean {
  if (wordCount >= 15) return false;
  const hasDramaticMark = /[!?]$/.test(text.trim());
  const isVeryShort = wordCount <= 8;
  const isDeclarativeSnippet = /^[A-Z][^.]{5,30}\.$/.test(text.trim());
  return hasDramaticMark || isVeryShort || isDeclarativeSnippet;
}

function isRapidDateSequence(chunks: ScriptChunk[], index: number): boolean {
  if (index === 0) return false;
  const prevHasDate = DATE_PATTERN.test(chunks[index - 1].text);
  const currHasDate = DATE_PATTERN.test(chunks[index].text);
  const nextHasDate =
    index < chunks.length - 1 ? DATE_PATTERN.test(chunks[index + 1].text) : false;
  return currHasDate && (prevHasDate || nextHasDate);
}

// --- Main assignment function ---

export function assignVisualTreatments(
  chunks: ScriptChunk[],
  config: TreatmentConfig = DEFAULT_TREATMENT_CONFIG
): ChunkTreatment[] {
  const total = chunks.length;
  const counts: Record<VisualTreatment, number> = {
    image: 0, image_only: 0, text_only: 0, counter: 0, map: 0, timeline: 0,
    document: 0, quote: 0, parchment: 0, scroll: 0, newspaper: 0, date: 0,
    route: 0, portrait: 0, chart: 0, comparison: 0, testimony: 0,
    stacked_cards: 0, parallax: 0, zoom: 0, fade_reveal: 0, uncrumple: 0,
  };

  // First pass: rule-based assignment (priority order — most specific first)
  const raw: { treatment: VisualTreatment; reason: string }[] = chunks.map((chunk, i) => {
    const text = chunk.text;
    const words = chunk.wordCount;

    if (isLikelyUncrumple(text))
      return { treatment: 'uncrumple', reason: 'Document discovered or revealed from archives' };
    if (isLikelyTestimony(text))
      return { treatment: 'testimony', reason: 'Multiple witness or survivor accounts' };
    if (isLikelyScroll(text))
      return { treatment: 'scroll', reason: 'Ancient manuscript or chronicle text' };
    if (isLikelyParchment(text))
      return { treatment: 'parchment', reason: 'Formal decree or proclamation language' };
    if (isLikelyDocument(text))
      return { treatment: 'document', reason: 'Legal/official language detected' };
    if (isLikelyNewspaper(text))
      return { treatment: 'newspaper', reason: 'News reporting or announcement style' };
    if (isLikelyQuote(text))
      return { treatment: 'quote', reason: 'Direct speech or attribution detected' };
    if (isLikelyStackedCards(text))
      return { treatment: 'stacked_cards', reason: 'List of consequences or events' };
    if (isLikelyComparison(text))
      return { treatment: 'comparison', reason: 'Before/after or contrast language' };
    if (isLikelyChart(text))
      return { treatment: 'chart', reason: 'Multiple statistics for comparison' };
    if (hasStatisticalNumbers(text))
      return { treatment: 'counter', reason: 'Specific statistics or large numbers' };
    if (isProminentDate(text, words))
      return { treatment: 'date', reason: 'Prominent specific date in short chunk' };
    if (isRapidDateSequence(chunks, i))
      return { treatment: 'timeline', reason: 'Rapid date sequence detected' };
    if (isLikelyRoute(text))
      return { treatment: 'route', reason: 'Journey, voyage, or migration path' };
    if (isLikelyMap(text))
      return { treatment: 'map', reason: 'Geographic movement or location' };
    if (isLikelyPortrait(text))
      return { treatment: 'portrait', reason: 'Introduction of a named historical figure' };
    if (isLikelyFadeReveal(text))
      return { treatment: 'fade_reveal', reason: 'Dramatic revelation or hidden truth' };
    if (isLikelyZoom(text))
      return { treatment: 'zoom', reason: 'Focus on a specific detail or hidden element' };
    if (isLikelyParallax(text))
      return { treatment: 'parallax', reason: 'Sweeping landscape or panoramic description' };
    if (isDramaticShort(text, words))
      return { treatment: 'text_only', reason: 'Short dramatic statement (under 15 words)' };

    return { treatment: 'image', reason: 'Default narrative treatment' };
  });

  // Pre-compute integer caps: at least 1 allowed for every non-image treatment
  const maxCounts: Record<VisualTreatment, number> = {} as Record<VisualTreatment, number>;
  for (const t of Object.keys(config.maxPercentage) as VisualTreatment[]) {
    const pct = config.maxPercentage[t] ?? 100;
    maxCounts[t] = t === 'image' ? Infinity : Math.max(1, Math.round((pct / 100) * total));
  }

  // Second pass: enforce integer caps (demote overflow to 'image')
  const treatments: ChunkTreatment[] = raw.map((r, i) => {
    let treatment = r.treatment;
    let reason = r.reason;

    if (treatment !== 'image') {
      if (counts[treatment] >= maxCounts[treatment]) {
        const maxPct = config.maxPercentage[treatment] ?? 100;
        treatment = 'image';
        reason = `Demoted from ${TREATMENT_LABELS[r.treatment]} — cap of ${maxCounts[r.treatment]} chunk(s) (${maxPct}%) reached`;
      }
    }

    counts[treatment]++;

    return {
      chunkId: chunks[i].id,
      treatment,
      reason,
      needsImage: !TREATMENTS_NO_IMAGE.includes(treatment),
    };
  });

  // Third pass: after 3 consecutive 'image' → make the next one 'image_only'
  let consecutiveImage = 0;
  for (let i = 0; i < treatments.length; i++) {
    if (treatments[i].treatment === 'image') {
      consecutiveImage++;
      if (consecutiveImage > 3) {
        if (counts['image_only'] < maxCounts['image_only']) {
          counts['image']--;
          counts['image_only']++;
          treatments[i].treatment = 'image_only';
          treatments[i].reason = 'Breathing room after 3+ consecutive image chunks';
          consecutiveImage = 0;
        }
      }
    } else {
      consecutiveImage = 0;
    }
  }

  return treatments;
}

// --- Stats helper ---

export function getTreatmentStats(
  treatments: ChunkTreatment[]
): Record<VisualTreatment, { count: number; percentage: number }> {
  const total = treatments.length;
  const counts: Record<VisualTreatment, number> = {
    image: 0, image_only: 0, text_only: 0, counter: 0, map: 0, timeline: 0,
    document: 0, quote: 0, parchment: 0, scroll: 0, newspaper: 0, date: 0,
    route: 0, portrait: 0, chart: 0, comparison: 0, testimony: 0,
    stacked_cards: 0, parallax: 0, zoom: 0, fade_reveal: 0, uncrumple: 0,
  };

  treatments.forEach((t) => counts[t.treatment]++);

  return Object.fromEntries(
    Object.entries(counts).map(([k, v]) => [
      k,
      { count: v, percentage: total > 0 ? Math.round((v / total) * 100) : 0 },
    ])
  ) as Record<VisualTreatment, { count: number; percentage: number }>;
}

// ---------------------------------------------------------------------------
// AI-powered treatment assignment
// ---------------------------------------------------------------------------

const TREATMENT_AI_SYSTEM_PROMPT = `You are a visual treatment analyst for documentary video production. Classify each script chunk into exactly one of the 22 visual animation styles below.

## TREATMENTS THAT NEED AN IMAGE
| Treatment   | When to use |
|-------------|-------------|
| image       | Default Ken Burns pan/zoom with text overlay. Descriptive narration. ~40-50% |
| image_only  | Ken Burns with NO text. Let a powerful image breathe. ~10% |
| map         | Fixed geography — locations, settlements, territories. ~3% |
| route       | Moving paths — voyages, deportations, migrations, troop marches. ~3% |
| portrait    | Introduction of a named historical figure as the visual focus. ~3% |
| parallax    | Sweeping landscape or panoramic scene with depth/movement. ~3% |
| zoom        | Slow zoom into a specific detail, object, or figure in a scene. ~3% |
| fade_reveal | Dramatic reveal — hidden truth, unknown fate, shocking discovery. ~3% |
| uncrumple   | A physical document being found, opened, or revealed. ~2% |

## TREATMENTS THAT DO NOT NEED AN IMAGE
| Treatment    | When to use |
|--------------|-------------|
| text_only    | Dramatic one-liners or punchy thesis statements under ~15 words. ~8% |
| counter      | ONE main statistic or number is the entire point. ~5% |
| chart        | Multiple statistics being compared (2+ data points). ~3% |
| timeline     | Rapid date sequences where chronology IS the story. ~3% |
| document     | Laws, decrees, oaths, treaties, proclamations — formal legal text. ~3% |
| parchment    | Direct reading of a formal order or decree ("hereby declared..."). ~3% |
| scroll       | Ancient chronicle, manuscript, or codex text being quoted. ~2% |
| newspaper    | News report style, announcement, or headline moment. ~3% |
| date         | A specific date in a short chunk where the date IS the message. ~3% |
| quote        | A direct quote from a real named person. ~8% |
| testimony    | Multiple witness or survivor accounts in the same chunk. ~3% |
| comparison   | Explicit before/after or contrast between two states/times. ~3% |
| stacked_cards| A list of parallel consequences, losses, or events. ~3% |

## Hard rules
- text_only, counter, chart, timeline, document, parchment, scroll, newspaper, date, testimony, comparison, stacked_cards → NO image generated
- After 3+ consecutive image chunks → consider image_only or parallax for breathing room
- Prefer accuracy over hitting percentages; percentages are soft guides only
- Use specialized types (parchment, scroll, route, etc.) when genuinely appropriate — do not over-use them

## Output format
Return ONLY a valid JSON array — no markdown, no explanation:
[{"chunkId": 1, "treatment": "image", "reason": "one short sentence"}, ...]

One object per chunk, same order as input.`;

const BATCH_SIZE = 25;

async function classifyBatch(
  batch: ScriptChunk[],
  modelId: string,
  apiKey: string
): Promise<{ chunkId: number; treatment: VisualTreatment; reason: string }[]> {
  const chunksText = batch
    .map(c => `[${c.id}] (${c.wordCount} words) ${c.text}`)
    .join('\n');

  const res = await fetch('https://openrouter.ai/api/v1/chat/completions', {
    method: 'POST',
    headers: {
      'Content-Type': 'application/json',
      Authorization: `Bearer ${apiKey}`,
      'HTTP-Referer': typeof window !== 'undefined' ? window.location.origin : '',
    },
    body: JSON.stringify({
      model: modelId,
      messages: [
        { role: 'system', content: TREATMENT_AI_SYSTEM_PROMPT },
        {
          role: 'user',
          content: `Classify each of the following ${batch.length} script chunks. Return the JSON array only.\n\n${chunksText}`,
        },
      ],
      temperature: 0.2,
      max_tokens: 2000,
    }),
  });

  if (!res.ok) {
    const err = await res.text();
    throw new Error(`OpenRouter error ${res.status}: ${err}`);
  }

  const data = await res.json();
  const raw = data.choices?.[0]?.message?.content ?? '';

  // Strip any accidental markdown fences
  const cleaned = raw.replace(/```json\s*/gi, '').replace(/```\s*/g, '').trim();

  let parsed: { chunkId: number; treatment: string; reason: string }[];
  try {
    parsed = JSON.parse(cleaned);
  } catch {
    throw new Error(`AI returned invalid JSON for batch starting at chunk ${batch[0].id}`);
  }

  return parsed.map(item => ({
    chunkId: item.chunkId,
    treatment: (Object.keys(TREATMENT_LABELS).includes(item.treatment)
      ? item.treatment
      : 'image') as VisualTreatment,
    reason: item.reason ?? '',
  }));
}

/**
 * AI-powered visual treatment assignment.
 * Falls back to rule-based on any error.
 */
export async function assignVisualTreatmentsWithAI(
  chunks: ScriptChunk[],
  config: TreatmentConfig = DEFAULT_TREATMENT_CONFIG,
  onProgress?: (current: number, total: number) => void
): Promise<ChunkTreatment[]> {
  const apiKey = getOpenRouterApiKey();
  if (!apiKey) {
    throw new Error('OpenRouter API key not configured. Please add your key in Settings.');
  }
  const modelId = getOpenRouterModelId();

  // Split into batches
  const batches: ScriptChunk[][] = [];
  for (let i = 0; i < chunks.length; i += BATCH_SIZE) {
    batches.push(chunks.slice(i, i + BATCH_SIZE));
  }

  const allRaw: { chunkId: number; treatment: VisualTreatment; reason: string }[] = [];
  let processed = 0;

  for (const batch of batches) {
    const results = await classifyBatch(batch, modelId, apiKey);
    allRaw.push(...results);
    processed += batch.length;
    onProgress?.(processed, chunks.length);
  }

  // Build a lookup by chunkId
  const lookup = new Map(allRaw.map(r => [r.chunkId, r]));

  // Enforce integer caps (same logic as rule-based)
  const total = chunks.length;
  const counts: Record<VisualTreatment, number> = {
    image: 0, image_only: 0, text_only: 0, counter: 0, map: 0, timeline: 0,
    document: 0, quote: 0, parchment: 0, scroll: 0, newspaper: 0, date: 0,
    route: 0, portrait: 0, chart: 0, comparison: 0, testimony: 0,
    stacked_cards: 0, parallax: 0, zoom: 0, fade_reveal: 0, uncrumple: 0,
  };

  const maxCounts: Record<VisualTreatment, number> = {} as Record<VisualTreatment, number>;
  for (const t of Object.keys(config.maxPercentage) as VisualTreatment[]) {
    const pct = config.maxPercentage[t] ?? 100;
    maxCounts[t] = t === 'image' ? Infinity : Math.max(1, Math.round((pct / 100) * total));
  }

  const treatments: ChunkTreatment[] = chunks.map(chunk => {
    const ai = lookup.get(chunk.id);
    let treatment: VisualTreatment = ai?.treatment ?? 'image';
    let reason = ai?.reason ?? 'AI classification';

    if (treatment !== 'image' && counts[treatment] >= maxCounts[treatment]) {
      const maxPct = config.maxPercentage[treatment] ?? 100;
      treatment = 'image';
      reason = `Demoted from ${TREATMENT_LABELS[ai?.treatment ?? 'image']} — cap of ${maxCounts[ai?.treatment ?? 'image']} chunk(s) (${maxPct}%) reached`;
    }

    counts[treatment]++;

    return {
      chunkId: chunk.id,
      treatment,
      reason,
      needsImage: !TREATMENTS_NO_IMAGE.includes(treatment),
    };
  });

  // Third pass: after 3 consecutive image → image_only
  let consecutiveImage = 0;
  for (let i = 0; i < treatments.length; i++) {
    if (treatments[i].treatment === 'image') {
      consecutiveImage++;
      if (consecutiveImage > 3) {
        if (counts['image_only'] < maxCounts['image_only']) {
          counts['image']--;
          counts['image_only']++;
          treatments[i].treatment = 'image_only';
          treatments[i].reason = 'Breathing room after 3+ consecutive image chunks';
          consecutiveImage = 0;
        }
      }
    } else {
      consecutiveImage = 0;
    }
  }

  return treatments;
}

// ---------------------------------------------------------------------------
// Display text generation
// ---------------------------------------------------------------------------

const DISPLAY_TEXT_SYSTEM_PROMPT = `You are a documentary film editor generating on-screen DISPLAY TEXT for each scene.

CORE PRINCIPLE
The viewer HEARS the full script as voiceover. Display text ENHANCES — it does NOT duplicate.
Think chapter titles, key stats, a single powerful phrase. The screen should add visual impact.

RULES BY TREATMENT TYPE

image — Extract 1 key phrase (3-8 words max). Pick the most visual or emotional fragment.
  Example: "Governor Lawrence viewed the Acadians as a persistent threat" → "A Persistent Threat"

image_only — Empty string OR a 1-3 word ALL CAPS location/label. At least half should be "".
  Example: "" or "GRAND-PRE" or "THE ATLANTIC"

parallax — 1 evocative phrase (3-6 words). Landscape, sweep, scale.
  Example: "Fields that stretched for miles" → "Endless Fields"

zoom — A 1-4 word label for what the camera zooms into.
  Example: "The faces of the soldiers" → "The Soldiers' Eyes"

fade_reveal — A dramatic revelation phrase (4-8 words). Present tense, punchy.
  Example: "What no one knew was the true cost" → "The Hidden Cost"

text_only — Max 12 words. This IS the visual — make it hit hard.
  Use | to separate main text from optional subtext.
  Example: "They were never conquered.|They were simply removed."

counter — The actual numbers + labels. Always extract exact numbers from the script.
  Format: NUMBER::LABEL or NUMBER::SUFFIX::LABEL — use || for multiple stats.
  Example: "14000::DEPORTED||50::%::PERISHED"

chart — Multiple data points as label::value pairs separated by ||.
  Example: "BEFORE::10000 FAMILIES||AFTER::FEWER THAN 1000"

quote — Exact quote | attribution. Strip all "he said / she wrote" framing.
  Example: "The duty is very disagreeable to my nature.|Colonel John Winslow"

testimony — WITNESS ACCOUNT | First name or region only (never full name unless famous).
  Example: "WITNESS ACCOUNT|Marie, Grand-Pre"

document — Heading | body excerpt | footer (date or signatory).
  Write it as the actual document — not a description of it.
  Example: "ORDER OF DEPORTATION|Your lands are forfeited to the Crown...|Winslow, Sept 5 1755"

parchment — Title of the decree | key line from it (verbatim if in script).
  Example: "ROYAL PROCLAMATION OF 1763|Be it known to all subjects..."

scroll — Title of the text | first line (verbatim or paraphrased in period tone).
  Example: "ANNALS OF THE DEPORTATION|In the year of our Lord 1755..."

newspaper — Headline (ALL CAPS, max 8 words) | dateline.
  Example: "THOUSANDS EXPELLED FROM NOVA SCOTIA|Boston Gazette, October 1755"

map — Location name (ALL CAPS) | optional 1-line context.
  Example: "GRAND-PRE|Heart of Acadian Settlement"

route — From → To label | distance or vessel count if in script.
  Example: "GRAND-PRE → CAROLINA|18 Ships, 7,000 Souls"

portrait — FULL NAME (ALL CAPS) | title or role | year if relevant.
  Example: "COLONEL JOHN WINSLOW|British Commander, 1755"

date — The date itself in clear format | event name (3-6 words).
  Example: "September 5, 1755|The Order is Read"

timeline — Year (bold) | event title (short, 4-6 words).
  Example: "1755|The Great Deportation Begins"

stacked_cards — Each item on its own line using ||. Short noun phrases, no full sentences.
  Example: "Homes burned||Livestock seized||Churches demolished||Families torn apart"

comparison — Before label::value || After label::value. Use the specific year/era if available.
  Example: "1754::10,000 Acadians||1763::Fewer than 1,000"

uncrumple — Title of document | archive location or date found.
  Example: "WINSLOW'S JOURNAL|Discovered: Massachusetts Archives"

GENERAL RULES
- NEVER put the full narration chunk as display text
- Shorter is always better; if in doubt, cut more words
- Use actual names, dates, numbers from the script — never generalize
- Strip filler: not "In the year of..." just "1755"
- Display text must make visual sense even without the narration audio
- Vary rhythm: after 2-3 scenes with text, let image_only have empty display text
- | separates fields within one display text block
- || separates list items or multiple data rows
- :: separates a key from its value within a pair

Return ONLY valid JSON — no markdown, no explanation:
{"displayTexts":[{"chunkId":1,"displayText":"The Marshlands of Grand-Pre"},{"chunkId":2,"displayText":"A Persistent Threat"}]}`;

const DISPLAY_TEXT_BATCH_SIZE = 20;

export async function generateDisplayTextWithAI(
  chunks: ScriptChunk[],
  treatments: ChunkTreatment[],
  onProgress?: (current: number, total: number) => void
): Promise<ChunkTreatment[]> {
  const apiKey = getOpenRouterApiKey();
  if (!apiKey) throw new Error('OpenRouter API key not configured.');
  const model = getOpenRouterModelId();

  const treatmentMap = new Map(treatments.map(t => [t.chunkId, t]));
  const total = chunks.length;
  let done = 0;
  onProgress?.(0, total);

  const updated = treatments.map(t => ({ ...t }));

  for (let i = 0; i < chunks.length; i += DISPLAY_TEXT_BATCH_SIZE) {
    const batch = chunks.slice(i, i + DISPLAY_TEXT_BATCH_SIZE);
    const payload = batch.map(c => ({
      chunkId: c.id,
      treatment: treatmentMap.get(c.id)?.treatment ?? 'image',
      text: c.text,
      words: c.wordCount,
    }));

    const resp = await fetch('https://openrouter.ai/api/v1/chat/completions', {
      method: 'POST',
      headers: {
        'Content-Type': 'application/json',
        Authorization: `Bearer ${apiKey}`,
        'HTTP-Referer': typeof window !== 'undefined' ? window.location.origin : '',
        'X-Title': 'Script Chunker V2 - Display Text',
      },
      body: JSON.stringify({
        model,
        messages: [
          { role: 'system', content: DISPLAY_TEXT_SYSTEM_PROMPT },
          {
            role: 'user',
            content: `Generate display text for these ${batch.length} chunks:\n\n${JSON.stringify(payload, null, 2)}`,
          },
        ],
        temperature: 0.4,
        max_tokens: 2000,
      }),
    });

    if (!resp.ok) {
      const err = await resp.text();
      throw new Error(`OpenRouter error ${resp.status}: ${err}`);
    }

    const data = await resp.json();
    const content: string = data.choices?.[0]?.message?.content ?? '';

    const jsonMatch = content.match(/\{[\s\S]*\}/);
    if (jsonMatch) {
      try {
        const parsed = JSON.parse(jsonMatch[0]) as {
          displayTexts: Array<{ chunkId: number; displayText: string }>;
        };
        for (const item of parsed.displayTexts ?? []) {
          const idx = updated.findIndex(t => t.chunkId === item.chunkId);
          if (idx !== -1) updated[idx] = { ...updated[idx], displayText: item.displayText };
        }
      } catch { /* skip bad batch */ }
    }

    done += batch.length;
    onProgress?.(done, total);
  }

  return updated;
}
