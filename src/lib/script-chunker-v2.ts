import nlp from 'compromise';

// ============================================================================
// TYPES & INTERFACES
// ============================================================================

export interface ScriptChunk {
  id: number;
  text: string;
  wordCount: number;
  sentenceCount: number;
  clauseCount: number;
}

interface ChunkContext {
  previousChunk?: ScriptChunk;
  currentLocation?: string;
  currentSpeaker?: string;
  personsSeen: Set<string>;
  placesSeen: Set<string>;
}

type HardBreakType = 'paragraph' | 'heading' | 'quote' | 'temporal' | 'location' | 'speaker' | 'list';

interface BeatAccumulator {
  clauses: string[];
  sentences: string[];
  wordCount: number;
  clauseCount: number;
  sentenceCount: number;
  weakScore: number;
}

// ============================================================================
// WORD LISTS & PATTERNS
// ============================================================================

const RHETORICAL_PIVOTS = new Set([
  'however', 'but', 'meanwhile', 'instead', 'suddenly', 'then', 
  'afterward', 'later', 'ultimately', 'in contrast', 'on the other hand'
]);

const ACTION_VERBS = new Set([
  'enter', 'leave', 'arrive', 'depart', 'begin', 'end', 'start', 'stop',
  'open', 'close', 'break', 'build', 'destroy', 'attack', 'defend', 'issue',
  'sign', 'decree', 'announce', 'arrest', 'release', 'burn', 'create', 'form',
  'establish', 'abolish', 'execute', 'murder', 'kill', 'die', 'born', 'marry',
  'divorce', 'crown', 'invade', 'retreat', 'surrender', 'conquer', 'defeat',
  'win', 'lose', 'rise', 'fall', 'ascend', 'descend', 'climb', 'flee',
  'escape', 'capture', 'seize', 'launch', 'strike', 'fire', 'explode',
  'collapse', 'shatter', 'unite', 'divide', 'split', 'merge', 'transform',
  'convert', 'revolt', 'rebel', 'protest', 'riot', 'march', 'charge',
  'storm', 'besiege', 'enters', 'leaves', 'arrives', 'departs', 'begins',
  'ends', 'starts', 'stops', 'opens', 'closes', 'breaks', 'builds', 'destroys',
  'attacks', 'defends', 'issues', 'signs', 'decrees', 'announces', 'arrests',
  'releases', 'burns', 'creates', 'forms', 'establishes', 'abolishes',
  'executes', 'murders', 'kills', 'dies', 'marries', 'divorces', 'crowns',
  'invades', 'retreats', 'surrenders', 'conquers', 'defeats', 'wins', 'loses',
  'rises', 'falls', 'ascends', 'descends', 'climbs', 'flees', 'escapes',
  'captures', 'seizes', 'launches', 'strikes', 'fires', 'explodes', 'collapses',
  'shatters', 'unites', 'divides', 'splits', 'merges', 'transforms', 'converts',
  'revolts', 'rebels', 'protests', 'riots', 'marches', 'charges', 'storms',
  'besieges'
]);

const CAUSAL_MARKERS = new Set([
  'therefore', 'thus', 'as a result', 'consequently'
]);

const CONTRASTIVE_WORDS = new Set(['however', 'but', 'yet']);

const TEMPORAL_WORDS = new Set(['then', 'later', 'afterward', 'meanwhile']);

// Regex patterns
const YEAR_PATTERN = /\b(1[0-9]{3}|20[0-9]{2})\b/;
const MONTH_PATTERN = /\b(January|February|March|April|May|June|July|August|September|October|November|December|Jan|Feb|Mar|Apr|May|Jun|Jul|Aug|Sep|Sept|Oct|Nov|Dec)\b/i;
const TIME_PATTERN = /\b\d{1,2}:\d{2}\b/;
const LIST_PATTERN = /^\s*[-*•\d]+[\.\)]\s+/;
const HEADING_PATTERN = /^([A-Z\s]+|[A-Z][a-z\s]+):\s*$/;

// ============================================================================
// UTILITY FUNCTIONS
// ============================================================================

function countWords(text: string): number {
  return text.trim().split(/\s+/).filter(w => w.length > 0).length;
}

function hasMultipleNumerals(text: string): boolean {
  const matches = text.match(/\d+/g);
  return (matches?.length || 0) >= 2;
}

function hasSingleNumeral(text: string): boolean {
  const matches = text.match(/\d+/g);
  return (matches?.length || 0) === 1;
}

function isAllCaps(line: string): boolean {
  const trimmed = line.trim();
  return trimmed.length > 0 && trimmed === trimmed.toUpperCase() && /[A-Z]/.test(trimmed);
}

function isTitleCase(line: string): boolean {
  const trimmed = line.trim();
  const words = trimmed.split(/\s+/);
  return words.length > 1 && words.every(w => /^[A-Z][a-z]*$/.test(w));
}

function extractFirstCapitalizedWord(text: string): string | null {
  const match = text.match(/\b([A-Z][a-z]+)\b/);
  return match ? match[1] : null;
}

function startsWithWord(text: string, wordSet: Set<string>): boolean {
  const trimmed = text.trim().toLowerCase();
  for (const word of wordSet) {
    if (trimmed.startsWith(word.toLowerCase())) {
      return true;
    }
  }
  return false;
}

function containsActionVerb(text: string): boolean {
  const words = text.toLowerCase().split(/\s+/);
  return words.some(word => ACTION_VERBS.has(word));
}

// ============================================================================
// SENTENCE & CLAUSE SPLITTING
// ============================================================================

function splitIntoSentences(text: string): string[] {
  const doc = nlp(text);
  return doc.sentences().out('array') as string[];
}

function splitIntoClauses(sentence: string): string[] {
  // Use capturing groups to preserve the separators
  // Split on strong clause separators but keep the separator with the following part
  const pattern = /(\s*;\s*|\s+but\s+|\s+because\s+|\s+when\s+|\s+while\s+|\s+though\s+|\s+although\s+|\s+however\s+)/i;
  
  const parts = sentence.split(pattern);
  const clauses: string[] = [];
  
  // When split with capturing group, array alternates: [content, separator, content, separator, ...]
  // parts[0] = content before first separator
  // parts[1] = first separator (e.g., " but ")
  // parts[2] = content after first separator
  // parts[3] = second separator
  // etc.
  
  let i = 0;
  while (i < parts.length) {
    if (i === 0) {
      // First clause (no separator before it)
      if (parts[i].trim()) {
        clauses.push(parts[i].trim());
      }
      i++;
    } else {
      // Subsequent clauses: separator + content
      const separator = parts[i] || '';
      const content = parts[i + 1] || '';
      const combined = (separator + content).trim();
      if (combined) {
        clauses.push(combined);
      }
      i += 2;
    }
  }

  return clauses.filter(c => c.length > 0);
}

function shouldPreSplitSentence(sentence: string): boolean {
  const wordCount = countWords(sentence);
  const commaCount = (sentence.match(/,/g) || []).length;
  return wordCount > 30 || commaCount >= 3;
}

// ============================================================================
// BREAK DETECTION
// ============================================================================

function checkHardBreak(
  clause: string,
  context: ChunkContext,
  lineContext: { isNewParagraph: boolean; isQuote: boolean; isList: boolean }
): HardBreakType | null {
  // Paragraph breaks
  if (lineContext.isNewParagraph) {
    return 'paragraph';
  }

  // Heading detection
  const trimmed = clause.trim();
  if (isAllCaps(trimmed) || isTitleCase(trimmed) || HEADING_PATTERN.test(trimmed)) {
    return 'heading';
  }

  // Quote detection
  if (lineContext.isQuote) {
    return 'quote';
  }

  // List detection
  if (lineContext.isList || LIST_PATTERN.test(trimmed)) {
    return 'list';
  }

  // Temporal markers (years, months, times)
  if (YEAR_PATTERN.test(clause) || MONTH_PATTERN.test(clause) || TIME_PATTERN.test(clause)) {
    return 'temporal';
  }

  // Speaker changes (Name said: or Name asked:)
  const speakerMatch = clause.match(/\b([A-Z][a-z]+)\s+(said|asked|wrote|testified|declared):/);
  if (speakerMatch) {
    const speaker = speakerMatch[1];
    if (speaker !== context.currentSpeaker) {
      return 'speaker';
    }
  }

  // Location changes (new place detected via NER)
  const doc = nlp(clause);
  const places = doc.places().out('array') as string[];
  if (places.length > 0) {
    const newPlace = places[0];
    if (!context.placesSeen.has(newPlace)) {
      return 'location';
    }
  }

  return null;
}

function checkStrongSoftBreak(clause: string, beatWordCount: number): boolean {
  // Only trigger if beat >= 20 words
  if (beatWordCount < 20) return false;

  // Rhetorical pivots
  if (startsWithWord(clause, RHETORICAL_PIVOTS)) {
    return true;
  }

  // Action verbs
  if (containsActionVerb(clause)) {
    return true;
  }

  // Numerical claims (>=2 numerals)
  if (hasMultipleNumerals(clause)) {
    return true;
  }

  // Causal markers
  if (startsWithWord(clause, CAUSAL_MARKERS)) {
    return true;
  }

  return false;
}

function calculateWeakScore(clause: string, currentBeat: BeatAccumulator, context: ChunkContext): number {
  let score = 0;

  // Contrastive word at clause start (+2)
  if (startsWithWord(clause, CONTRASTIVE_WORDS)) {
    score += 2;
  }

  // Temporal word at clause start (+2)
  if (startsWithWord(clause, TEMPORAL_WORDS)) {
    score += 2;
  }

  // New person name detected (+1)
  const doc = nlp(clause);
  const people = doc.people().out('array') as string[];
  if (people.length > 0) {
    const newPerson = people[0];
    if (!context.personsSeen.has(newPerson)) {
      score += 1;
    }
  }

  // Subject change heuristic: clause starts with different capitalized word (+1)
  const currentCapWord = extractFirstCapitalizedWord(clause);
  const prevClause = currentBeat.clauses[currentBeat.clauses.length - 1];
  const prevCapWord = prevClause ? extractFirstCapitalizedWord(prevClause) : null;
  if (currentCapWord && prevCapWord && currentCapWord !== prevCapWord) {
    score += 1;
  }

  // Single numeral (+1)
  if (hasSingleNumeral(clause)) {
    score += 1;
  }

  // Clause length >25 words (+1)
  if (countWords(clause) > 25) {
    score += 1;
  }

  return score;
}

// ============================================================================
// CAPS VALIDATION
// ============================================================================

function wouldViolateCaps(current: BeatAccumulator, clause: string, addingSentence: boolean = false): boolean {
  const clauseWords = countWords(clause);
  const newWordCount = current.wordCount + clauseWords;

  // Max 60 words - strict cap
  if (newWordCount > 60) return true;

  // Max 3 sentences - hard cap
  // But if we have 2 sentences and 20+ words, we should also break
  if (addingSentence && current.sentenceCount >= 3) return true;
  if (addingSentence && current.sentenceCount >= 2 && current.wordCount >= 20) return true;

  // Max 3 clauses - strict cap
  if (current.clauseCount >= 3) return true;

  return false;
}

function meetsMinimumWords(beat: BeatAccumulator): boolean {
  // Always accept beats with at least 1 complete sentence
  // The 8-word minimum is a guideline, not a strict requirement for complete sentences
  return beat.wordCount >= 8 || beat.sentenceCount >= 1;
}

// ============================================================================
// MAIN CHUNKING ALGORITHM
// ============================================================================

export function chunkScript(text: string): ScriptChunk[] {
  const chunks: ScriptChunk[] = [];
  let chunkId = 1;

  // Pre-process: split into lines to detect paragraphs
  const lines = text.split('\n');
  const processedLines: Array<{ text: string; isNewParagraph: boolean; isQuote: boolean; isList: boolean }> = [];
  
  let lastLineEmpty = true;
  for (const line of lines) {
    const trimmed = line.trim();
    if (trimmed.length === 0) {
      lastLineEmpty = true;
      continue;
    }

    const isNewParagraph = lastLineEmpty;
    const isQuote = trimmed.startsWith('"') && trimmed.includes('"');
    const isList = LIST_PATTERN.test(trimmed);

    processedLines.push({ text: trimmed, isNewParagraph, isQuote, isList });
    lastLineEmpty = false;
  }

  // Initialize context
  const context: ChunkContext = {
    personsSeen: new Set(),
    placesSeen: new Set(),
  };

  let currentBeat: BeatAccumulator = {
    clauses: [],
    sentences: [],
    wordCount: 0,
    clauseCount: 0,
    sentenceCount: 0,
    weakScore: 0,
  };

  let sentencesSinceLastBreak = 0;

  function finalizeBeat() {
    if (currentBeat.clauses.length > 0 && meetsMinimumWords(currentBeat)) {
      const text = currentBeat.clauses.join(' ').trim();
      chunks.push({
        id: chunkId++,
        text,
        wordCount: currentBeat.wordCount,
        sentenceCount: currentBeat.sentenceCount,
        clauseCount: currentBeat.clauseCount,
      });

      // Update context with entities from this beat
      const doc = nlp(text);
      const people = doc.people().out('array') as string[];
      const places = doc.places().out('array') as string[];
      people.forEach(p => context.personsSeen.add(p));
      places.forEach(p => context.placesSeen.add(p));
    }

    currentBeat = {
      clauses: [],
      sentences: [],
      wordCount: 0,
      clauseCount: 0,
      sentenceCount: 0,
      weakScore: 0,
    };
    sentencesSinceLastBreak = 0;
  }

  // Process each line
  for (const lineData of processedLines) {
    const sentences = splitIntoSentences(lineData.text);

    for (const sentence of sentences) {
      // Check if adding this sentence would violate the 2-sentence cap
      const isStartingNewSentence = currentBeat.clauses.length > 0;
      let shouldFinalizeAfterSentence = false;
      
      // Check if sentence needs pre-splitting
      const clauses = shouldPreSplitSentence(sentence) 
        ? splitIntoClauses(sentence)
        : [sentence];

      for (let i = 0; i < clauses.length; i++) {
        const clause = clauses[i].trim();
        if (!clause) continue;

        // Check hard break
        const hardBreak = checkHardBreak(clause, context, lineData);
        if (hardBreak) {
          // Only finalize if current beat is substantial (>=15 words)
          // Otherwise, let small chunks merge with the hard break content
          if (currentBeat.clauses.length > 0 && currentBeat.wordCount >= 15) {
            currentBeat.sentenceCount += 1;
            finalizeBeat();
          }
          currentBeat.clauses.push(clause);
          currentBeat.wordCount += countWords(clause);
          currentBeat.clauseCount += 1;
          continue;
        }

        // Check strong soft break
        if (checkStrongSoftBreak(clause, currentBeat.wordCount)) {
          if (currentBeat.clauses.length > 0 && currentBeat.wordCount >= 15) {
            currentBeat.sentenceCount += 1;
            finalizeBeat();
          }
          currentBeat.clauses.push(clause);
          currentBeat.wordCount += countWords(clause);
          currentBeat.clauseCount += 1;
          continue;
        }

        // Calculate weak score
        const weakScoreIncrement = calculateWeakScore(clause, currentBeat, context);
        const newWeakScore = currentBeat.weakScore + weakScoreIncrement;

        if (newWeakScore >= 3) {
          if (currentBeat.clauses.length > 0 && currentBeat.wordCount >= 15) {
            currentBeat.sentenceCount += 1;
            finalizeBeat();
          }
          currentBeat.clauses.push(clause);
          currentBeat.wordCount += countWords(clause);
          currentBeat.clauseCount += 1;
          continue;
        }

        // Check caps (including sentence count check for first clause of new sentence)
        if (wouldViolateCaps(currentBeat, clause, i === 0 && isStartingNewSentence)) {
          if (currentBeat.clauses.length > 0) {
            currentBeat.sentenceCount += 1;
            finalizeBeat();
          }
          currentBeat.clauses.push(clause);
          currentBeat.wordCount += countWords(clause);
          currentBeat.clauseCount += 1;
          continue;
        }

        // Append clause to current beat
        currentBeat.clauses.push(clause);
        currentBeat.wordCount += countWords(clause);
        currentBeat.clauseCount += 1;
        currentBeat.weakScore = newWeakScore;
      }

      // Increment sentence count for this completed sentence
      currentBeat.sentenceCount += 1;
      sentencesSinceLastBreak += 1;

      // Finalize if:
      // - We have 2+ sentences AND 20+ words (good chunk size), OR
      // - We have 3+ sentences (hard cap to prevent run-on chunks)
      if ((currentBeat.sentenceCount >= 2 && currentBeat.wordCount >= 20) || currentBeat.sentenceCount >= 3) {
        finalizeBeat();
      }
    }
  }

  // Finalize remaining beat
  finalizeBeat();

  return chunks;
}

