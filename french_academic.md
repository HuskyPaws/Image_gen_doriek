# French Academic History Painting Style - Implementation Export

This document contains everything needed to implement the **19th-Century French Academic History Painting** style in the image generator app.

---

## Overview

The French Academic style generates image prompts that look like authentic 19th-century French academic history paintings - the kind displayed in major museums like the Louvre, Musée d'Orsay, and École des Beaux-Arts collections.

**Style Characteristics:**
- École des Beaux-Arts / Academic Classicism aesthetic
- Neo-medieval / Gothic Revival undertone
- Museum reproduction/scan presentation (flat, even gallery lighting)
- Subtle canvas weave texture visible
- Gentle age patina and faint craquelure (fine network of cracks)
- Slight vignette around edges
- Polished academic finish with restrained drama

---

## 1. Constants

Add this prefix constant:

```typescript
const FRENCH_ACADEMIC_PREFIX = 'Create a 19th-century French academic history painting (École des Beaux-Arts / Academic Classicism) with a neo-medieval / Gothic Revival undertone, presented as a high-resolution museum reproduction/scan (flat, even gallery lighting; subtle canvas weave; gentle age patina; faint craquelure; slight vignette).';
```

---

## 2. System Prompt

This is the full AI system prompt that instructs the LLM how to generate French Academic style prompts:

```typescript
const FRENCH_ACADEMIC_SYSTEM_PROMPT = `You are an expert at creating image prompts that look like AUTHENTIC 19TH-CENTURY FRENCH ACADEMIC HISTORY PAINTINGS - the kind displayed in major museums like the Louvre, Musée d'Orsay, and École des Beaux-Arts collections.

CRITICAL: Every prompt MUST begin with this exact prefix:
"Create a 19th-century French academic history painting (École des Beaux-Arts / Academic Classicism) with a neo-medieval / Gothic Revival undertone, presented as a high-resolution museum reproduction/scan (flat, even gallery lighting; subtle canvas weave; gentle age patina; faint craquelure; slight vignette)."

AFTER the prefix, describe the SCENE in vivid detail using academic painting visual language.

KEY AESTHETIC REQUIREMENTS:
1. AUTHENTIC 19th-century French academic painting appearance - NOT photography, NOT 3D, NOT modern digital art
2. Neo-medieval / Gothic Revival aesthetic for historical subjects
3. Museum reproduction/scan presentation (flat, even gallery lighting)
4. Subtle canvas weave texture visible
5. Gentle age patina and faint craquelure (fine network of cracks)
6. Slight vignette around edges
7. Polished academic finish with restrained drama
8. NO cinematic effects, NO 3D look, NO modern objects

FRENCH ACADEMIC PAINTING CHARACTERISTICS:
- Formal, dignified compositions (often portraits or historical tableaux)
- Academic subtlety in rendering faces and hands - precise anatomy without caricature
- Controlled glazing technique for rich, layered color
- Believable textures: velvet, ruffled collars, leather, paper, wood grain
- Painterly but polished - visible brushwork but refined finish
- Atmospheric perspective for background elements (softened, reduced contrast)
- Historical accuracy in costume, architecture, and objects
- Restrained color palette: deep burgundies, rich browns, muted golds, ivory whites
- Classical composition principles: strong focal subject, balanced secondary elements

VISUAL LANGUAGE FOR FRENCH ACADEMIC STYLE:
Instead of "dramatic lighting" say "controlled painterly lighting with gentle highlights"
Instead of "cinematic" say "formal academic composition"
Instead of "photorealistic" say "academic subtlety with precise anatomy"
Instead of "glowing" say "warm tones modeled with controlled glazing"
Instead of "atmosphere" say "atmospheric perspective in the distance"

SUBJECT TREATMENT:
- Primary figures: Volumetric, classical, dignified poses - three-quarters turn is classic
- Faces and hands: Modeled with academic subtlety, aged skin, calm expressions, precise anatomy
- Clothing: Richly painted fabric textures (velvet, silk, linen, brocade)
- Period details: Heraldic elements, Gothic architectural details, leaded glass windows
- Background scenes: Small, subdued tableaux with softened atmospheric perspective
- Objects: Crisp contours, controlled glazing - books, documents, quills, seals, ribbons

PERIOD-ACCURATE ELEMENTS:
- Architecture: Gothic Revival elements - diamond-pane leaded windows, carved wood, stone mullions
- Furniture: Heavy wooden desks, ornate chairs, period-appropriate appointments
- Decorative elements: Patterned wall hangings, ornamental brocade, tapestry-like motifs (kept secondary)
- Costume: Historical dress with ruffled collars, velvet textures, restrained heraldic details
- Objects: Quills, ledgers, sealed documents, books, candles, religious items

COMPOSITION GUIDELINES:
- Figure as dominant focal subject
- Background elements kept secondary (smaller scale, softened focus)
- Clean architectural drafting - historically plausible details
- Controlled, natural lighting - gentle highlights on key elements (ruff, face, hands)
- Deep but natural shadows (under desks, around furniture)
- Gothic Revival decorative elements add period flavor without overwhelming the figure

ALWAYS END PROMPTS WITH:
"Lighting is controlled and painterly, with gentle highlights and deep natural shadows; no cinematic effects, no 3D look, no modern objects — authentic 19th-century French academic oil painting with polished finish and restrained drama."

EXAMPLE PROMPT:
"Create a 19th-century French academic history painting (École des Beaux-Arts / Academic Classicism) with a neo-medieval / Gothic Revival undertone, presented as a high-resolution museum reproduction/scan (flat, even gallery lighting; subtle canvas weave; gentle age patina; faint craquelure; slight vignette). Formal portrait composition: a Tudor-era ambassador seated at a heavy wooden writing desk, turned three-quarters toward the viewer in dignified diplomatic attire with a richly painted ruffled collar, dark velvet textures, and restrained heraldic details; he holds a quill poised over an open ledger, with believable ink sheen and carefully rendered paper edges. The desk surface is arranged with stacked books, sealed documents, and ribbons, painted with crisp contours and controlled glazing; hands and face are modeled with academic subtlety—aged skin, calm stern gaze, precise anatomy. Behind him rises a tall diamond-pane leaded-glass window; through it, in the far distance, a castle courtyard scene is visible as a small, subdued tableau with softened atmospheric perspective and miniature figures. Architecture and interior details (carved wood, stone mullions, ironwork) are drafted cleanly and historically plausible. A faint Gothic Revival decorative element—a patterned wall hanging—is kept secondary so the figure remains volumetric and classical. Lighting is controlled and painterly, with gentle highlights and deep natural shadows; no cinematic effects, no 3D look, no modern objects — authentic 19th-century French academic oil painting with polished finish and restrained drama."

MODERATION COMPLIANCE:
- All people fully clothed in period-appropriate attire
- Show tension through dignified expressions and symbolic elements, not graphic content
- Focus on psychological depth through classical portraiture techniques
- No nudity, gore, or explicit violence
- Use atmospheric perspective and composition to suggest events rather than depicting them explicitly

AVOID:
- Modern photographic or cinematic aesthetic
- CGI/3D render look
- Hyper-realistic digital art style
- Dynamic action poses (use formal, dignified classical poses)
- Graphic violence or inappropriate content
- Any post-1900 elements
- Harsh, dramatic lighting (use controlled, painterly illumination)

YOUR TASK:
For each script chunk, create an authentic French academic history painting prompt. Start with the required prefix, describe the specific historical scene with period-accurate details using academic painting visual language, and end with the "authentic oil painting" disclaimer.`;
```

---

## 3. Helper Function

This function ensures all prompts have the correct prefix:

```typescript
export function ensureFrenchAcademicPrefix(prompt: string): string {
  const trimmed = prompt.trim();
  if (trimmed.toLowerCase().startsWith('create a 19th-century french academic history painting')) return trimmed;
  return `${FRENCH_ACADEMIC_PREFIX} ${trimmed}`.trim();
}
```

---

## 4. Fallback Template (Non-AI Mode)

When AI is disabled, use this template for generating prompts:

```typescript
const fallbackTemplate = `Create a 19th-century French academic history painting (École des Beaux-Arts / Academic Classicism) with a neo-medieval / Gothic Revival undertone, presented as a high-resolution museum reproduction/scan (flat, even gallery lighting; subtle canvas weave; gentle age patina; faint craquelure; slight vignette). ${chunk.text}. Formal composition with dignified poses, academic subtlety in rendering faces and hands, controlled glazing, historically plausible architecture and costume details. Lighting is controlled and painterly, with gentle highlights and deep natural shadows; no cinematic effects, no 3D look, no modern objects — authentic 19th-century French academic oil painting with polished finish and restrained drama.`;
```

---

## 5. AI Prompt Generation Instructions

When calling the AI to generate prompts, use these style-specific instructions:

```typescript
const styleInstructions = `Create AUTHENTIC 19TH-CENTURY FRENCH ACADEMIC HISTORY PAINTING prompts for each script chunk below.

REQUIREMENTS:
- Each prompt MUST begin with: "Create a 19th-century French academic history painting (École des Beaux-Arts / Academic Classicism) with a neo-medieval / Gothic Revival undertone, presented as a high-resolution museum reproduction/scan (flat, even gallery lighting; subtle canvas weave; gentle age patina; faint craquelure; slight vignette)."
- AFTER the prefix, describe the specific historical scene with formal academic painting techniques
- Use academic painting terminology: "controlled glazing", "academic subtlety", "atmospheric perspective", "polished finish"
- Figures should be dignified, volumetric, classical (three-quarters poses are classic)
- Faces and hands modeled with academic subtlety - precise anatomy, no caricature
- Include period-accurate costume details: velvet textures, ruffled collars, heraldic elements
- Gothic Revival architectural details: diamond-pane leaded windows, carved wood, stone mullions
- Background scenes should use atmospheric perspective (softened, reduced contrast, miniature figures)
- End each prompt with: "Lighting is controlled and painterly, with gentle highlights and deep natural shadows; no cinematic effects, no 3D look, no modern objects — authentic 19th-century French academic oil painting with polished finish and restrained drama."
- Must look like a REAL museum painting, NOT photography or 3D or modern digital art`;

const exampleFormat = `{"chunkId": 1, "prompt": "Create a 19th-century French academic history painting (École des Beaux-Arts / Academic Classicism) with a neo-medieval / Gothic Revival undertone, presented as a high-resolution museum reproduction/scan (flat, even gallery lighting; subtle canvas weave; gentle age patina; faint craquelure; slight vignette). [SCENE DESCRIPTION with formal composition and academic painting techniques]. Lighting is controlled and painterly, with gentle highlights and deep natural shadows; no cinematic effects, no 3D look, no modern objects — authentic 19th-century French academic oil painting with polished finish and restrained drama."}`;
```

---

## 6. UI Implementation

### Style Selection Type

Add `'french-academic'` to your prompt style type:

```typescript
type PromptStyle = 'narrative' | 'director-painting' | 'cinematic' | 'archival' | 'copperplate' | 'french-academic';
```

### Style Selector Button

Here's the UI button for selecting the French Academic style (only shown for Medieval/Renaissance environment):

```tsx
{/* Style 5: French Academic History Painting - MEDIEVAL ONLY */}
{environment === 'medieval' && (
  <button
    onClick={() => setPromptStyle('french-academic')}
    className={`p-4 rounded-lg border-2 transition-all text-left ${
      promptStyle === 'french-academic'
        ? 'border-amber-500 bg-amber-950/50'
        : 'border-slate-700 bg-slate-900 hover:border-amber-700'
    }`}
  >
    <div className="flex items-start justify-between mb-2">
      <h4 className="font-semibold text-slate-100">French Academic</h4>
      {promptStyle === 'french-academic' && (
        <CheckCircle className="h-5 w-5 text-amber-500" />
      )}
    </div>
    <div className="text-xs text-slate-400">
      <Badge className="bg-purple-600 text-xs mb-1">19th Century</Badge><br />
      École des Beaux-Arts style museum painting. Neo-medieval/Gothic Revival undertone, canvas weave texture, craquelure, formal compositions. Dignified academic portraiture with polished finish.
    </div>
  </button>
)}
```

---

## 7. Logic Integration

### In the prompt generation function, add this condition:

```typescript
// Check for French Academic style
let isFrenchAcademicStyle = false;

if (style === 'french-academic') {
  systemPrompt = FRENCH_ACADEMIC_SYSTEM_PROMPT;
  isFrenchAcademicStyle = true;
  console.log('[Prompt Generator] Using FRENCH ACADEMIC style');
}

// When processing AI response:
if (isFrenchAcademicStyle) {
  prompt = ensureFrenchAcademicPrefix(String(item.prompt || ''));
}

// For fallback (non-AI mode):
if (style === 'french-academic') {
  fallbackTemplate = `Create a 19th-century French academic history painting (École des Beaux-Arts / Academic Classicism) with a neo-medieval / Gothic Revival undertone, presented as a high-resolution museum reproduction/scan (flat, even gallery lighting; subtle canvas weave; gentle age patina; faint craquelure; slight vignette). ${chunk.text}. Formal composition with dignified poses, academic subtlety in rendering faces and hands, controlled glazing, historically plausible architecture and costume details. Lighting is controlled and painterly, with gentle highlights and deep natural shadows; no cinematic effects, no 3D look, no modern objects — authentic 19th-century French academic oil painting with polished finish and restrained drama.`;
  // No prefix needed - already has full prefix
}
```

### Environment Reset Logic

When switching environments, reset style if French Academic (medieval-only) is selected but switching to WW2:

```typescript
useEffect(() => {
  // If switching to WW2 and medieval-only styles are selected, reset to director-painting
  if (environment === 'ww2' && (promptStyle === 'copperplate' || promptStyle === 'french-academic')) {
    setPromptStyle('director-painting');
  }
}, [environment, promptStyle]);
```

---

## 8. Status Messages

Update status/confirmation messages to handle the French Academic style:

```typescript
// In the alert/notification after generation:
{promptStyle === 'french-academic'
  ? 'All prompts begin with "Create a 19th-century French academic history painting..." as required. Edit prompts if needed.'
  : '...other styles...'
}
```

---

## 9. Summary

**Files to modify:**
1. **Types file** - Add `'french-academic'` to the `PromptStyle` type
2. **Prompt generator** - Add the system prompt, prefix constant, helper function, and generation logic
3. **UI component** - Add the style selector button and environment-aware visibility logic

**Key Points:**
- French Academic is only available for Medieval/Renaissance environment (not WW2)
- Always ensure prompts start with the exact prefix
- Always end prompts with the "authentic 19th-century French academic oil painting" disclaimer
- Use formal, dignified compositions - no dynamic action poses
- Focus on academic painting terminology: "controlled glazing", "academic subtlety", "atmospheric perspective"

---

## 10. Example Generated Prompts

Here are some example prompts this style produces:

### Example 1: Tudor Ambassador
```
Create a 19th-century French academic history painting (École des Beaux-Arts / Academic Classicism) with a neo-medieval / Gothic Revival undertone, presented as a high-resolution museum reproduction/scan (flat, even gallery lighting; subtle canvas weave; gentle age patina; faint craquelure; slight vignette). Formal portrait composition: a Tudor-era ambassador seated at a heavy wooden writing desk, turned three-quarters toward the viewer in dignified diplomatic attire with a richly painted ruffled collar, dark velvet textures, and restrained heraldic details; he holds a quill poised over an open ledger, with believable ink sheen and carefully rendered paper edges. The desk surface is arranged with stacked books, sealed documents, and ribbons, painted with crisp contours and controlled glazing; hands and face are modeled with academic subtlety—aged skin, calm stern gaze, precise anatomy. Behind him rises a tall diamond-pane leaded-glass window; through it, in the far distance, a castle courtyard scene is visible as a small, subdued tableau with softened atmospheric perspective and miniature figures. Lighting is controlled and painterly, with gentle highlights and deep natural shadows; no cinematic effects, no 3D look, no modern objects — authentic 19th-century French academic oil painting with polished finish and restrained drama.
```

### Example 2: Medieval Queen
```
Create a 19th-century French academic history painting (École des Beaux-Arts / Academic Classicism) with a neo-medieval / Gothic Revival undertone, presented as a high-resolution museum reproduction/scan (flat, even gallery lighting; subtle canvas weave; gentle age patina; faint craquelure; slight vignette). Formal portrait of a medieval queen in her private chambers, seated on an ornate wooden throne with Gothic carved details, wearing rich burgundy velvet robes with ermine trim and a simple gold circlet. Her face is rendered with academic subtlety—serene yet thoughtful expression, hands folded gracefully in her lap. A small prayer book rests on the arm of her chair. Through a tall leaded-glass window behind her, soft daylight illuminates the scene. The stone walls feature a faded tapestry depicting a hunting scene. A carved wooden prie-dieu stands in the corner. The color palette emphasizes deep reds, muted golds, and ivory whites. Lighting is controlled and painterly, with gentle highlights and deep natural shadows; no cinematic effects, no 3D look, no modern objects — authentic 19th-century French academic oil painting with polished finish and restrained drama.
```

---

*Export created: January 31, 2026*
*Source: image-generator-app Script Chunker*
