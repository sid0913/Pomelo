<!-- /autoplan restore point: /Users/ananth/.gstack/projects/pomelo/feat-exit-qualifying-session-autoplan-restore-20260526-220009.md -->

# Pomelo — Visual Learning Optimization

**Status:** DRAFT
**Branch:** feat/exit-qualifying-session
**Created:** 2026-05-26
**Scope:** Chapter content visualization upgrade — more visuals, less dense prose

---

## Problem

Current chapter content is too text-heavy. The LLM generates mostly prose with 1 video and occasionally 1 image (from Wikimedia). Visual learners get a wall of text. The qualifying conversation collects experience level and learning gaps but the generated content doesn't leverage visual modalities.

**Root causes:**
1. `buildChapterPrompt` instructs "Use 1–3 markers per chapter" — too conservative
2. Only two media types: YouTube video and Wikimedia image
3. Wikimedia images are often poor for educational use (low-relevance diagrams, scientific photos)
4. No structured card types for: key concepts, analogies, process flows, comparisons
5. Prose is unbroken — no visual anchors to break up long text blocks

---

## Goal

Make every chapter feel like a visual science textbook, not a ChatGPT response. A learner should be able to skim the cards and absorb 70% of the chapter's concepts without reading every word. The target is rich educational images — labeled diagrams (DNA replication, force diagrams, anatomical cross-sections) and real photographs (microscopy, organisms, physics demonstrations) — not flowcharts or abstract text boxes.

**User direction (after initial review):** The visual modality that matters is photographs and scientific diagrams. Mermaid flowcharts are the wrong tool. Callout cards (key insight boxes) are still valuable. The upgrade path is better image sourcing and richer image queries, not diagram generation.

---

## Scope

**In scope (this build):**
- Prompt engineering: increase marker density to 3-5 markers per chapter, add visual cadence requirement
- New card type: `callout` (key insight / definition highlight — pure CSS, no external fetch)
- Smarter image sourcing: tiered fallback Wikimedia → Unsplash for rich educational images
- Better image query guidance in prompt: specific query patterns for scientific diagrams vs photographs
- Learner profile drives visual weighting (beginner → more callouts; advanced → more rich diagrams)
- Structured content sections: intro → concept → visual → insight → example pattern

**Not in scope (revised after user direction):**
- Mermaid/flowcharts — DROPPED. Wrong visual modality. The target is photographs and scientific diagrams, not abstract flowcharts.
- AI-generated images (DALL-E, Stable Diffusion) — cost + latency too high for v1
- Interactive diagrams (D3, Observable) — overkill for v1
- Video transcripts / timestamps — separate feature
- Quiz integration — separate feature

---

## Existing Code

| Sub-problem | Existing code |
|------------|---------------|
| Prompt that controls media density | `lib/claude.ts` → `buildChapterPrompt()` |
| Card type definitions | `lib/cards.ts` |
| Marker parsing | `lib/cards.ts` → `parseCards()` |
| Media resolution | `app/api/chapters/[id]/enrichment/route.ts` → `resolveCards()` |
| Image search | `lib/images.ts` → `searchWikimediaImage()` |
| Card rendering | `app/(app)/courses/[id]/chapters/[cId]/ChapterContent.tsx` |

---

## Proposed Changes

### 1. Prompt upgrade (`lib/claude.ts`)

Update `buildChapterPrompt` to:
- Require 3–5 media markers per chapter (up from 1–3)
- Require visual anchors every 2–3 paragraphs
- Add `[[CALLOUT: <key insight> | <label>]]` marker type (no external fetch)
- Improve IMAGE query guidance: distinguish scientific diagram queries vs photograph queries
- Instruct LLM to structure content as: intro paragraph → concept sections → conclusion, each concept section ending with a visual marker
- Use learner profile to weight visual modality

**Example prompt addition:**
```
Structure the chapter with visual cadence:
- Every concept section (2–3 paragraphs) must end with a media marker
- Target: 3–5 markers total per chapter (images + video + callouts)
- Marker types:
  [[VIDEO: <youtube search query> | <framing>]]
  [[IMAGE: <specific educational image query> | <caption>]]
  [[CALLOUT: <the key insight in 1–2 sentences> | <"Key insight" | "Definition" | "Warning" | "Example">]]
- For IMAGE queries, be specific:
  - Scientific diagrams: "<concept> diagram labeled" or "<process> schematic cross-section"
  - Photographs: "photograph of <organism/phenomenon>" or "<physical process> real photo"
  - Examples: "DNA replication diagram labeled", "mitosis stages diagram", "projectile motion diagram physics", "frog embryo development stages photograph"
- Never place two CALLOUT markers back to back — always separate with at least one paragraph
- Place markers where they CLARIFY, not decorate
```

### 2. New card type: CalloutCard (`lib/cards.ts`)

Add:
```ts
type CalloutCard = {
  type: "callout";
  content: string;   // key insight text (1–2 sentences)
  label: string;     // "Key insight" | "Definition" | "Warning" | "Example"
}
```

Update `parseCards()` to handle `[[CALLOUT: ... | ...]]` markers.
Extend `MARKER_RE` to include CALLOUT: `/\[\[(VIDEO|IMAGE|CALLOUT):\s*([^|\]]+?)\s*\|\s*([^\]]+?)\]\]/g`
Note: CALLOUT content is short prose (1–2 sentences). `|` characters in prose are rare and the LLM is guided to avoid them. No parser rewrite needed.

Update `UnresolvedCard` and `Card` union types to include `CalloutCard`.

### 3. Better image sourcing (`lib/images.ts`)

Replace `searchWikimediaImage` with a tiered search:
1. **Wikimedia Commons** (existing) — best for labeled SVG diagrams, scientific schematics
2. **Unsplash API** (new fallback) — best for photographs of organisms, physical phenomena
3. **null** — skip the card, don't show broken image

```ts
export async function searchImage(query: string): Promise<string | null> {
  const wikimedia = await searchWikimediaImage(query);
  if (wikimedia) return wikimedia;
  const unsplash = await searchUnsplashImage(query);
  if (unsplash) return unsplash;
  return null;
}

async function searchUnsplashImage(query: string): Promise<string | null> {
  // Unsplash Source API (free, no auth required for random):
  // https://source.unsplash.com/800x600/?{query}
  // Returns redirect to actual image URL — follow redirect
  // Rate limit: 50 req/hour — acceptable for chapter enrichment
  const url = `https://source.unsplash.com/800x600/?${encodeURIComponent(query)}`;
  try {
    const res = await fetch(url, { redirect: 'follow', next: { revalidate: 86400 } });
    if (res.ok && res.url !== url) return res.url;
    return null;
  } catch { return null; }
}
```

Note: `source.unsplash.com` requires no API key and is free for open-source / non-commercial use. Rate limits are generous. Attribution via alt text.

### 4. Resolution (`app/api/chapters/[id]/enrichment/route.ts`)

- `CALLOUT` cards: no external fetch — content is inline text (passthrough)
- `IMAGE` cards: use new `searchImage()` tiered fallback
- Update `resolveCards()` to dispatch `callout` cards as passthrough

### 5. Card rendering (`ChapterContent.tsx`)

Add `CalloutCard` component:
```tsx
const CALLOUT_STYLES = {
  "Key insight": "bg-amber-50 border-l-4 border-amber-500",
  "Definition":  "bg-stone-100 border-l-4 border-stone-400",
  "Warning":     "bg-red-50 border-l-4 border-red-400",
  "Example":     "bg-blue-50 border-l-4 border-blue-400",
} as const;

const CALLOUT_BADGE = {
  "Key insight": "bg-amber-100 text-amber-800",
  "Definition":  "bg-stone-200 text-stone-700",
  "Warning":     "bg-red-100 text-red-700",
  "Example":     "bg-blue-100 text-blue-700",
} as const;

function CalloutCardComponent({ card }: { card: CalloutCard }) {
  if (!card.content) return null;
  const boxStyle = CALLOUT_STYLES[card.label as keyof typeof CALLOUT_STYLES] ?? CALLOUT_STYLES["Definition"];
  const badgeStyle = CALLOUT_BADGE[card.label as keyof typeof CALLOUT_BADGE] ?? CALLOUT_BADGE["Definition"];
  return (
    <aside aria-label={card.label} className={`${boxStyle} rounded-r-xl p-4`}>
      <span className={`${badgeStyle} text-xs font-semibold px-2 py-0.5 rounded-full`}>{card.label}</span>
      <p className="mt-2 text-[15px] leading-[1.7] text-stone-700 font-medium">{card.content}</p>
    </aside>
  );
}
```

Update `CardRenderer` to handle `callout` type.

### 6. DB schema

No migration needed. `cards` column is already JSONB. `CalloutCard` is backward-compatible.

---

## Implementation Order (revised — Mermaid dropped)

1. `lib/cards.ts` — add CalloutCard type + extend MARKER_RE + update unions
2. `lib/claude.ts` — update buildChapterPrompt (density + CALLOUT type + image query guidance + learner weighting)
3. `lib/images.ts` — add `searchUnsplashImage()` + `searchImage()` tiered fallback
4. `app/api/chapters/[id]/enrichment/route.ts` — callout passthrough + use searchImage()
5. `ChapterContent.tsx` — add CalloutCard component + update CardRenderer
6. Test: generate a chapter on a visual topic, inspect card distribution

---

## Updated Proposed Changes (after /autoplan review)

### Key changes from review

**1. DROP: Unsplash fallback** (CEO Phase 1 — lifestyle photos ≠ educational)

**2. ADD: Learner profile → visual weighting** (`buildChapterPrompt` already takes `UserProfile`)
```
Pass experience_level and gap_topics into visual density guidance:
- beginner: prefer more callouts (key insight anchoring), fewer dense diagrams
- intermediate/advanced: prefer diagrams and process flows
- Visual topics (biology, chemistry, physics): weight toward IMAGE/DIAGRAM
- Abstract topics (economics, philosophy): weight toward CALLOUT
```

**3. REWRITE: `parseCards()` as state-machine parser** (Eng Phase 3 — critical)
Replace single `MARKER_RE` regex. New algorithm: find `[[`, extract type, find matching `]]`, split on LAST `|` before `]]`. Handles multiline Mermaid and pipe characters in content.

**4. ADD: `@mermaid-js/parser` for server-side validation** (Eng Phase 3)
In `enrichment/route.ts`: validate Mermaid code before storing. On invalid: `{ mermaid: null }`. Client renders fallback.

**5. ADD: Mermaid lazy load + security config** (Eng Phase 3)
```tsx
mermaid.initialize({ securityLevel: 'strict', theme: 'neutral', fontFamily: 'inherit' })
// Lazy load: next/dynamic with ssr: false
```

**6. ADD: CalloutCard full spec** (Design Phase 2)
- Per-label colors: amber (Key insight), stone (Definition), red (Warning), blue (Example)
- Typography: `text-[15px] leading-[1.7] text-stone-700 font-medium p-4`
- Unknown label: fall through to Definition
- Empty content: skip render

**7. ADD: DiagramCard full spec** (Design Phase 2)
- Loading: existing spinner in `min-h-[160px]` container
- Error: "Diagram unavailable" text + caption italic
- Success: `overflow-x-auto -mx-4 px-4` wrapper, `min-w-[400px]` inner
- ARIA: `<figure role="img" aria-label={caption}>` + `aria-hidden="true"` on SVG

**8. UPDATE: Prompt — Adjacent callout constraint** (Design Phase 2)
Add: "Never place two CALLOUT markers back to back — always separate with at least one paragraph."

**9. ADD: "Example" to prompt label list** (Design Phase 2 — consistency with type definition)

**10. ADD: Completion rate to success criteria** (CEO Phase 1)

### Updated Implementation Order

1. `lib/cards.ts` — parser rewrite + DiagramCard/CalloutCard types + union updates
2. `lib/claude.ts` — prompt density (3-6 markers) + new marker types + learner profile weighting + callout constraints
3. `app/api/chapters/[id]/enrichment/route.ts` — DIAGRAM/CALLOUT dispatch (zero fetch); @mermaid-js/parser validation
4. `ChapterContent.tsx` — DiagramCard (lazy mermaid, securityLevel:strict) + CalloutCard (pure CSS)
5. `__tests__/cards.test.ts` — unit tests for parser rewrite (new file)
6. `package.json` — `npm install mermaid @mermaid-js/parser`
7. Manual QA: generate chapter, inspect card distribution

---

## Decision Audit Trail

<!-- AUTONOMOUS DECISION LOG -->

| # | Phase | Decision | Classification | Principle | Rationale | Rejected |
|---|-------|----------|-----------|-----------|----------|---------|
| 1 | CEO | Drop Unsplash fallback | Mechanical | P5 | Lifestyle photos irrelevant for educational concepts | Tiered fallback |
| 2 | CEO | Add learner profile → visual weighting | Mechanical | P2 | In blast radius (userProfile already in buildChapterPrompt), zero schema change | None |
| 3 | CEO | Add Mermaid validation + error fallback | Mechanical | P1 | Completeness — broken diagrams reach users without this | Client-only validation |
| 4 | CEO | Add chapter completion rate to success criteria | Mechanical | P1 | Outcome metric, not just production metric | None |
| 5 | CEO | Add AI image / modality preference to TODOS | Mechanical | P3 | Pragmatic deferral — cost/complexity too high for v1 | Include in v1 |
| 6 | Design | Specify per-label CalloutCard colors | Mechanical | P1 | Unspecified = random implementation = visual inconsistency | Single amber color |
| 7 | Design | Specify DiagramCard loading/error states | Mechanical | P1 | Missing states = blank UI on errors | None |
| 8 | Design | Add mobile overflow handling for DiagramCard | Mechanical | P1 | Mermaid SVGs >600px will break mobile layout | No overflow handling |
| 9 | Design | Adjacent callout prompt constraint | Mechanical | P5 | Explicit prompt rule beats rendering logic | Render-side guard |
| 10 | Design | Add "Example" to prompt label list | Mechanical | P5 | Consistency between type definition and prompt | Remove from type def |
| 11 | Design | Specify CalloutCard typography | Mechanical | P5 | Explicit > implementer guess | None |
| 12 | Design | Add ARIA labels for DiagramCard/CalloutCard | Mechanical | P1 | Accessibility not optional | None |
| 13 | Eng | Rewrite parseCards() as state-machine | Mechanical | P1 | Regex fundamentally broken for DIAGRAM with `\|` in code | Patch regex |
| 14 | Eng | Add @mermaid-js/parser for server-side validation | Mechanical | P1 | Invalid Mermaid should not reach DB or client renderer | Client-only validation |
| 15 | Eng | Lazy load Mermaid with next/dynamic | Mechanical | P1 | 2MB bundle blocks initial chapter render | Eager load |
| 16 | Eng | securityLevel: 'strict' for Mermaid | Mechanical | P1 | LLM content is untrusted; XSS vector without this | securityLevel: loose |
| 17 | Eng | Add DiagramCard/CalloutCard to TS unions | Mechanical | P1 | TypeScript won't catch unhandled cases in CardRenderer | Ignore types |
| 18 | User override | DROP Mermaid/DiagramCard entirely | User Challenge | User | User direction: rich images (photographs + scientific diagrams) not flowcharts. Wrong visual modality. | Include Mermaid |
| 19 | User override | Focus on rich image sourcing (Unsplash fallback) | User Challenge | User | Educational images: DNA diagrams, biology photos, kinematics schematics — Wikimedia + Unsplash tiered | Mermaid diagrams |
| 20 | Scope | Parser rewrite no longer needed | Mechanical | P5 | Dropping DIAGRAM removes the `\|` multiline problem. CALLOUT uses existing regex; `\|` in prose is LLM-avoidable. | Full rewrite |

---

## Cross-Phase Themes

**Theme: Unvalidated LLM output** — flagged in Phase 1 (Mermaid reliability unexamined) AND Phase 3 (invalid Mermaid reaches DB). High-confidence signal. Both phases independently identified that LLM-generated structured content (Mermaid code) needs a validation gate before reaching the user. Fix is in plan: `@mermaid-js/parser` server-side + client error boundary.

**Theme: Missing states** — flagged in Phase 2 (DiagramCard loading/error states) AND Phase 3 (null mermaid stored in DB). High-confidence. Both phases independently flag that the plan's new components have unspecified failure modes. Fix is in plan: 3-state spec for DiagramCard.

---

## Success Criteria (revised — Mermaid dropped)

- Average cards per chapter: 5+ (vs current ~2–3)
- Text card count: 3–4 max per chapter (concepts broken into smaller chunks)
- IMAGE cards: 2–3 per chapter, showing rich educational content (labeled diagrams, photographs)
- CALLOUT cards: 1–2 per chapter (key insight boxes)
- No broken image cards shown to user (null images are skipped, not rendered)
- Wikimedia → Unsplash tiered: fewer null image fallbacks vs Wikimedia-only
- **Chapter completion rate: track before/after (baseline first, then re-measure after 10 chapters generated)**

---

## NOT in scope

- AI image generation
- Interactive diagrams
- Per-chapter visual style configuration
- Quiz cards
- Flashcard / spaced repetition integration

---

## GSTACK REVIEW REPORT

---

# Phase 1: CEO Review

**Mode:** SELECTIVE EXPANSION
**Codex:** [codex-unavailable — binary not installed]

## Step 0A: Premise Challenge

| Premise | Status | Risk |
|---------|--------|------|
| Text-heavy chapters are why learners struggle | **ASSUMED** — no completion/retention data | HIGH |
| More markers = better learning | ASSUMED — quantity vs quality tradeoff unexamined | MEDIUM |
| Mermaid LLM generation is reliable enough | **ASSUMED** — not validated empirically | HIGH |
| Wikimedia images are poor for educational use | Reasonable — images often irrelevant to concept | LOW |
| Unsplash fallback improves over Wikimedia | QUESTIONABLE — Unsplash is lifestyle photos, not diagrams | MEDIUM |
| 3–6 markers is the right density | Untested — could create visual noise | MEDIUM |

**Key shaky premise:** "Text-heaviness is the problem." Root cause could be: wrong content for learner's gaps, too-long chapters, no clear progress feedback. Visual density is one lever, not the only one.

## Step 0B: Existing Code Leverage Map

| Sub-problem | Existing code | Reuse plan |
|-------------|--------------|------------|
| Marker density | `lib/claude.ts:buildChapterPrompt()` | Modify prompt string — 10 min |
| New card types | `lib/cards.ts:parseCards()` | Add DIAGRAM/CALLOUT to regex — 20 min |
| Resolution dispatch | `enrichment/route.ts:resolveCards()` | Add cases — 10 min |
| Card rendering | `ChapterContent.tsx:CardRenderer` | Add 2 components — 30 min |
| Learner profile | `buildChapterPrompt()` already takes `UserProfile` | Use existing data — 15 min |

**Key leverage:** `userProfile` is already passed to `buildChapterPrompt`. The prompt can weight visual modality based on `experience_level` + implicit learning style from gap topics right now, with zero schema changes.

## Step 0C: Dream State Delta

```
CURRENT STATE:
  Chapter → prose + 1 video + 1 Wikimedia image
  ~2-3 cards per chapter, 80% text
  userProfile collected but not used for visual weighting

THIS PLAN:
  Chapter → prose (shorter blocks) + callout + diagram + video + image
  ~5-7 cards per chapter, 50% text
  Mermaid diagrams for process/relationship concepts
  Callout cards anchoring key insights

12-MONTH IDEAL:
  Learner declares modality preference (visual/read/example-first)
  Chapters adapt: visual learner → more diagrams; example-learner → more code cards
  AI image generation at <$0.01/image makes unique illustrations viable
  Interactive cards: drag-to-order, fill-in-concept, not just static visuals
```

**Delta:** This plan gets 60% of the way to the dream state. The missing 40%: learner modality preferences (explicit), interactive cards, AI images. Learner profile driving visual selection is in blast radius and should be added now.

## Step 0C-bis: Implementation Alternatives

| Approach | Effort (human/CC) | Risk | Coverage |
|----------|------------------|------|----------|
| A) Prompt-only: density + callout, no Mermaid | human: 1h / CC: 15min | Low | 7/10 |
| B) Current plan: prompt + callout + diagram + better images | human: 4h / CC: 45min | Medium | 8/10 |
| C) Structured JSON output: LLM returns schema, not markers | human: 2 days / CC: 2h | High | 9/10 |

**Auto-decision:** Approach B with Mermaid validation layer added (P1 — completeness). Approach C is a future redesign.

## Step 0D: Scope Decisions

| Item | Decision | Principle |
|------|----------|-----------|
| Callout cards | IN — high value, zero external fetch | P1 |
| Diagram cards (Mermaid) | IN — but add validation + error fallback | P1 |
| Unsplash fallback | OUT — lifestyle photos don't serve educational concepts; skip | P5 |
| Learner profile → visual weighting | IN — blast radius, zero schema change | P2 |
| AI image generation | OUT — cost/latency too high now; revisit at <$0.01/image | P3 |
| Completion rate tracking | IN — add to success criteria | P1 |

## Step 0E: Temporal Interrogation

| Horizon | Risk |
|---------|------|
| HOUR 1 | Prompt change shipped; chapters now have more markers but Mermaid not tested |
| HOUR 2-3 | Callout card added — immediate value, zero failure modes |
| HOUR 4-6 | Mermaid rendering added — first real test of LLM diagram quality |
| DAY 1+ | Discover LLM produces invalid Mermaid 20-40% of the time without validation |
| 6 MONTHS | AI image generation at $0.001/image makes our static cards look dated |

**Key risk mitigation:** Add Mermaid validation (parse before storing) and client-side error boundary. Without this, broken diagrams reach users.

## CLAUDE SUBAGENT — CEO Strategic Independence

**Finding 1 (Critical):** Wrong problem framing. "Text-heavy" is a symptom, not the root cause. May be: wrong content for learner gaps, chapter length, no retention feedback loop. Fix: instrument completion rates before/after. Don't wait — ship visual upgrades AND add completion tracking concurrently.

**Finding 2 (High):** Mermaid LLM reliability unexamined. Claude generates invalid/misleading Mermaid inconsistently. Fix: validate Mermaid before storing; client-side error boundary that shows text fallback, not blank card.

**Finding 3 (Medium):** Unsplash fallback underdeveloped. Lifestyle photos are irrelevant for abstract concepts. Fix: drop Unsplash, lean on Callout + Diagram instead.

**Finding 4 (High):** Learner profile not driving visual selection. Qualifying conversation collects learning style signals, but prompt ignores them. Fix: use `userProfile` (already in scope) to weight visual modality.

**Finding 5 (High):** 6-month regret: AI image generation prices falling fast; interactivity (quizzes, exercises) may matter more than static visuals. Fix: add revisit trigger to TODOS.

**Finding 6 (Medium):** Success metrics are production metrics (cards/chapter count), not learning outcomes (completion rate, retention). Fix: add chapter completion rate as primary success metric.

## CEO DUAL VOICES — CONSENSUS TABLE

```
CEO DUAL VOICES — CONSENSUS TABLE:
═══════════════════════════════════════════════════════════════
  Dimension                           Claude  Codex  Consensus
  ──────────────────────────────────── ─────── ─────── ─────────
  1. Premises valid?                   NO      N/A    SINGLE (Mermaid + root cause unvalidated)
  2. Right problem to solve?           PARTIAL N/A    SINGLE (may be symptom not cause)
  3. Scope calibration correct?        YES     N/A    SINGLE (good, but drop Unsplash)
  4. Alternatives sufficiently explored?YES    N/A    SINGLE (Approach B is right)
  5. Competitive/market risks covered? PARTIAL N/A    SINGLE (AI images shelf life flagged)
  6. 6-month trajectory sound?         PARTIAL N/A    SINGLE (interactivity missing from roadmap)
═══════════════════════════════════════════════════════════════
CONFIRMED = both agree. DISAGREE = models differ (→ taste decision).
Missing voice = N/A (Codex unavailable). Single critical finding from one voice = flagged regardless.
```

## CEO Sections 1–10

**Section 1 — Mission Clarity:** Goal is clear (visual-first chapter experience). Success criteria include card counts. Missing: outcome metric (completion rate). Auto-decided: add completion rate to success criteria.

**Section 2 — Error & Rescue Registry:**

| Error | User sees | Rescue |
|-------|-----------|--------|
| Mermaid render failure (invalid syntax) | Blank diagram | Show text fallback: "Diagram unavailable" + the caption |
| Mermaid render failure (client-side exception) | White box / console error | Error boundary catches; renders text fallback |
| Unsplash API rate limit | (removed from plan) | N/A — dropped |
| Wikimedia returns null | No image card shown | Skip card — don't render empty ImageCard |
| LLM generates 0 markers | All text, no visuals | Fallback: re-enrichment with explicit instruction |

**Section 3 — Competitive Risk:** Brilliant and Khanmigo are moving toward visual-first learning. Pomelo's differentiator is personalization (the qualifying conversation). Adding visuals strengthens the product but doesn't deepen the moat — the moat is the gap-mapping. Visual quality alone won't separate Pomelo from a "GPT + YouTube" combo.

**Section 4 — Scope Analysis:** Good. Drop Unsplash (flavor photos ≠ educational diagrams). Add learner profile → visual weighting (in blast radius, zero schema change).

**Section 5 — User Psychology:** Visual anchors (callout boxes, key insight cards) break the text wall most effectively. The strongest first-session change is the callout card — it signals "this is the important thing." Diagrams are second. Videos are third (already partially working).

**Section 6 — Monetization:** No impact on current free-first model. Visual quality improvements → higher completion → stronger word-of-mouth. Long-term: visual richness supports premium tier.

**Section 7 — Technical Risk:** Mermaid is the primary risk. See Section 2. Callout card is zero-risk. Prompt density increase is zero-risk.

**Section 8 — Habit Formation:** Not in scope for this plan. Visual quality helps first-session engagement but habit formation requires the email reminder + daily goal mechanics already planned.

**Section 9 — Distribution:** Not applicable.

**Section 10 — Execution Confidence:** High (callout + density). Medium-low (Mermaid without validation). LOW if Mermaid validation not added.

## CEO: What Already Exists

- `userProfile` already in `buildChapterPrompt` — use it for visual weighting
- `parseCards` regex already handles typed markers — extend cleanly
- Card component architecture already exists — add new types
- Enrichment route already dispatches per type — add new cases

## CEO: NOT in Scope (deferred)

| Item | Rationale |
|------|-----------|
| AI image generation | Cost + latency; revisit at <$0.01/image |
| Interactive cards | Quiz/exercise cards are v2+ feature |
| Modality preference UI | Let learner declare "I'm visual" — v2 |
| Unsplash | Dropped — lifestyle photos ≠ educational |

Add to TODOS.md:
- [ ] Revisit AI image generation when cost drops below $0.01/image
- [ ] Add learner modality preference to qualifying conversation (v2)
- [ ] Chapter completion rate tracking (instrument before/after visual upgrade)

## CEO: Dream State Delta

This plan: 60% of dream state. Gets: visual variety, callout anchors, diagram support.
Missing: modality-driven generation, interactivity, AI images (timeline issue only).

## CEO Completion Summary

| Dimension | Score | Key issue |
|-----------|-------|-----------|
| Premise validity | 6/10 | Root cause unvalidated; Mermaid reliability unexamined |
| Problem fit | 7/10 | Visual density is real problem, maybe not the only one |
| Scope | 8/10 | Drop Unsplash; add learner profile weighting |
| Alternatives | 8/10 | Approach B is correct |
| Competitive risk | 6/10 | AI images have short shelf life; interactivity needed |
| Execution trajectory | 7/10 | Strong if Mermaid validated; risky if not |

**Auto-decided scope changes:**
- DROP: Unsplash image fallback
- ADD: Mermaid validation + error fallback
- ADD: Learner profile drives visual weighting in prompt
- ADD: Chapter completion rate to success criteria
- ADD: TODOS for AI images / modality preference revisit

---

**Phase 1 COMPLETE.** Claude subagent: 6 findings (2 critical/high, 3 medium, 1 low). Codex: unavailable [codex-unavailable]. Consensus: single-model review. 4 auto-decisions applied. Passing to Phase 2 (Design Review — UI scope detected).

---

# Phase 2: Design Review

**Mode:** UI scope detected (new card components: DiagramCard, CalloutCard)
**Codex:** [codex-unavailable]
**Design binary:** available but no OpenAI API key — text-based review

## Design Step 0: Scope + Rating

**Initial design completeness: 4/10.** The plan says "styled highlight box with label badge" but never specifies colors, typography, spacing, or states. A 10 would have: exact Tailwind classes, loading/error states for every card, mobile overflow strategy, and label-to-color mapping.

**No DESIGN.md.** All decisions calibrate against existing patterns in `ChapterContent.tsx`.

**Existing design leverage:**
- Existing spinner: `w-6 h-6 rounded-full border-2 border-stone-200 border-t-amber-600 animate-spin`
- Existing card container: `rounded-xl overflow-hidden border border-stone-200`
- Existing text: `text-[17px] leading-[1.8] text-stone-800`
- Existing null guard pattern: don't render if resource is null (VideoCard, ImageCard both do this)
- Accent color: amber-600

## CLAUDE SUBAGENT — Design Independence

**Finding 1 (Critical):** CalloutCard colors completely unspecified. 4 label types, 1 accent color. Implementer will make inconsistent choices.

Fix: per-label Tailwind spec:
- Key insight: `bg-amber-50 border-l-4 border-amber-500`, badge `bg-amber-100 text-amber-800 text-xs font-semibold`
- Definition: `bg-stone-100 border-l-4 border-stone-400`, badge `bg-stone-200 text-stone-700`
- Warning: `bg-red-50 border-l-4 border-red-400`, badge `bg-red-100 text-red-700`
- Example: `bg-blue-50 border-l-4 border-blue-400`, badge `bg-blue-100 text-blue-700`
- Unknown label: fall through to Definition styling

**Finding 2 (Critical):** DiagramCard has no loading or error state. Mermaid renders async (100-400ms). No state spec.

Fix: three states:
1. Loading: existing spinner in `rounded-xl border border-stone-200 min-h-[160px]` container
2. Error: `bg-stone-50 rounded-xl border border-stone-200 p-6 text-center`, "Diagram unavailable" `text-stone-400 text-sm` + caption in italic
3. Success: SVG in `overflow-x-auto -mx-4 px-4` container

**Finding 3 (High):** Mobile overflow. Mermaid SVGs are 600-900px wide. Will break 375px viewport.

Fix: `overflow-x-auto -mx-4 px-4` wrapper, `min-w-[400px]` on inner SVG container. Horizontal scroll, no pinch-to-zoom.

**Finding 4 (High):** Adjacent callout collision. Two CalloutCards next to each other = double left-border stack with no visual break.

Fix: add to prompt: "Never place two CALLOUT markers back to back — always separate with at least one paragraph."

**Finding 5 (Medium):** "Example" label in type definition but not in prompt. Inconsistency.

Fix: add "Example" to prompt label list.

**Finding 6 (Medium):** CalloutCard typography unspecified.

Fix: `text-[15px] leading-[1.7] text-stone-700 font-medium p-4` for callout body.

## DESIGN DUAL VOICES — LITMUS SCORECARD

```
DESIGN DUAL VOICES — LITMUS SCORECARD:
═══════════════════════════════════════════════════════════════
  Check                                    Claude  Codex  Consensus
  ─────────────────────────────────────── ─────── ─────── ─────────
  1. Brand unmistakable in first screen?   YES     N/A    SINGLE (cards match stone/amber system)
  2. One strong visual anchor?             PARTIAL N/A    SINGLE (callout has visual weight; diagram needs it)
  3. Scannable by headlines only?          NO      N/A    SINGLE (callout labels ARE scannable signals)
  4. Each section has one job?             YES     N/A    SINGLE (each card type = one job)
  5. Cards actually necessary?             YES     N/A    SINGLE (break text wall — confirmed necessary)
  6. Motion improves hierarchy?            N/A     N/A    N/A (no motion proposed)
  7. Premium without decorative shadows?  YES     N/A    SINGLE (border-l pattern is flat, premium)
  ─────────────────────────────────────── ─────── ─────── ─────────
  Hard rejections triggered:               0       N/A    0
═══════════════════════════════════════════════════════════════
```

## Design Pass 1: Information Architecture (5/10 → 8/10)

**Gap:** Card ordering is a prompt instruction, not a rendering constraint. The "intro → concept → visual → insight → example" pattern is aspirational. No IA spec for how card types relate to chapter structure.

**Auto-fix:** Add to plan:
- Callout cards appear at ends of concept sections, not beginnings (anchor, not intro)
- Diagram cards follow concept explanation, not precede it
- Video cards appear early (hook) or late (reinforce)
- Two callout cards must be separated by at least one text card

## Design Pass 2: Interaction States (3/10 → 9/10)

**Gap:** Zero states specified for DiagramCard. CalloutCard has no undefined-label state.

**Auto-fix:** Add to plan (all states now specified in Finding 2 above):
- DiagramCard: loading → spinner (reuse existing), error → text fallback, success → scrollable SVG
- CalloutCard: unknown label → Definition styling (never crash)
- ImageCard null → already handled (skip card), confirmed carried forward

## Design Pass 3: User Journey (7/10)

Examined: Chapter page opens → cards render top-to-bottom → user scrolls through text → callout boxes signal "this matters" → diagram visualizes a concept → video reinforces.

No issues found. The journey is clear. Callout + diagram placement makes the scan path readable. The sentinel at the bottom triggers completion — unchanged.

## Design Pass 4: Specificity (2/10 → 8/10)

**Gap:** "Styled highlight box" and "label badge" are vague. "Mermaid diagram" doesn't specify font size, SVG dimensions, or responsive behavior.

**Auto-fix:** All now specified (per Findings 1, 2, 3, 6 above). Remaining ambiguity: Mermaid theme. Add to plan: use `mermaid.initialize({ theme: 'neutral', fontFamily: 'inherit' })` to match Stone font stack.

## Design Pass 5: Edge Cases (4/10 → 9/10)

| Edge case | Before | After |
|-----------|--------|-------|
| LLM generates invalid Mermaid | Blank/crash | Error state: "Diagram unavailable" |
| Mermaid SVG wider than viewport | Layout break | overflow-x-auto container |
| Unknown callout label | Unstyled | Falls through to Definition |
| Two callouts adjacent | Visual collision | Prompt prevents; no render guard needed |
| Chapter with 0 visual cards | All text | Existing fallback (TextCard list) |
| Callout content is empty string | Blank colored box | Skip render if content is empty |

## Design Pass 6: Accessibility (5/10 → 8/10)

**Gap:** No ARIA labels for new card types. Mermaid diagrams are SVGs — screenreaders may read raw SVG paths.

**Auto-fix:**
- DiagramCard: `<figure role="img" aria-label={caption}>` wrapping the SVG
- Add `aria-hidden="true"` to the SVG element; the caption serves as the accessible label
- CalloutCard: `<aside aria-label={label}>` so screenreaders announce the label type
- Touch targets: callout boxes are read-only, no touch target concern

## Design Pass 7: Responsive (5/10 → 9/10)

**Gap:** No responsive spec for DiagramCard. CalloutCard assumed full-width.

**Auto-fix:**
- DiagramCard: `overflow-x-auto -mx-4 px-4 rounded-xl` wrapper on mobile; SVG scrolls horizontally
- CalloutCard: full-width on all breakpoints, `p-4` consistent
- Both cards: same `rounded-xl border` container as existing VideoCard

## Design: Final Rating After Auto-Fixes

**9/10.** Missing the 10%: visual mockup validation (need to actually see the callout color variants in context). Recommend quick visual spot-check after implementation before shipping.

**Phase 2 COMPLETE.** Claude subagent: 6 findings (2 critical, 2 high, 2 medium) — all auto-resolved. Codex: unavailable. Single-model review. 6 auto-decisions applied to plan. Passing to Phase 3 (Eng Review).

---

# Phase 3: Eng Review

**Codex:** [codex-unavailable]

## Step 0: Scope Challenge + Code Analysis

Reading `lib/cards.ts` — current `parseCards()` uses:
```
const MARKER_RE = /\[\[(VIDEO|IMAGE):\s*([^|\]]+?)\s*\|\s*([^\]]+?)\]\]/g;
```

This regex has a fatal flaw for DIAGRAM: `[^|\]]+?` stops at `|` characters. Mermaid flowcharts use `|` extensively: `A -->|label| B`. The plan's proposed marker syntax `[[DIAGRAM: graph TD\n  A -->|yes| B | caption]]` will silently misparse — the query field captures only `graph TD\n  A -->` and the caption gets `yes| B`. The DIAGRAM feature is broken before any rendering code runs.

**Architecture map:**
```
LLM output (string)
  ↓ parseCards() [lib/cards.ts]
UnresolvedCard[]
  ↓ resolveCards() [enrichment/route.ts]
Card[]
  ↓ stored in Supabase JSONB
  ↓ CardRenderer [ChapterContent.tsx]
React component
```

## CLAUDE SUBAGENT — Eng Independence

**Finding 1 (Critical):** `MARKER_RE` regex fails on multiline Mermaid code containing `|` characters. `graph TD\n  A -->|yes| B` causes the regex to split the Mermaid code at `|yes|` and treat `yes` as the caption. The entire DIAGRAM feature is non-functional as designed.

Fix: Replace the single `MARKER_RE` with a multi-type parser:
1. Scan for `[[` opening
2. Extract type prefix (VIDEO/IMAGE/DIAGRAM/CALLOUT)
3. Find the closing `]]`
4. For DIAGRAM and CALLOUT: split on the **last** `|` before `]]` (not the first)
5. For VIDEO and IMAGE: existing field-splitting rules work (no `|` in YouTube queries)

**Finding 2 (High):** No server-side Mermaid validation before DB storage. Invalid Mermaid reaches the DB; every subsequent page load attempts client-side render and fails silently.

Fix: In `enrichment/route.ts`, after extracting mermaid code, call `mermaid.parse(code)` (throws on invalid). On throw: store `{ type: "diagram", mermaid: null, caption }`. Client renders fallback unconditionally for null mermaid.

**Finding 3 (High):** `[^\]]+?` terminates early on single `]`. Defensive concern — low probability for captions but certain for malformed LLM output.

Fix: Parser rewrite (Finding 1 fix) handles this.

**Finding 4 (Medium):** `parseCards` single-regex `matchAll` loop is incompatible with multi-type parsing. Can't add DIAGRAM to the same regex without hitting Finding 1.

Fix: Parser rewrite handles this.

**Finding 5 (Medium):** CALLOUT insight prose can contain `|` (natural language). `[[CALLOUT: The rate is 50% | more | Key insight]]` — splits at first `|`.

Fix: Parser rewrite (split on last `|`) handles this.

**Finding 6 (Medium):** XSS via LLM-generated Mermaid. Mermaid renders SVG client-side. Old versions have known XSS vectors; `securityLevel: 'loose'` re-enables script injection.

Fix: `mermaid.initialize({ securityLevel: 'strict' })` — disables click handlers and href attributes. Required regardless of Mermaid version.

**Finding 7 (Low):** New types missing from `Card` and `UnresolvedCard` TypeScript unions. TypeScript won't catch unhandled cases in `CardRenderer` exhaustive switch.

Fix: Add `DiagramCard` and `CalloutCard` to both union types.

## ENG DUAL VOICES — CONSENSUS TABLE

```
ENG DUAL VOICES — CONSENSUS TABLE:
═══════════════════════════════════════════════════════════════
  Dimension                           Claude  Codex  Consensus
  ──────────────────────────────────── ─────── ─────── ─────────
  1. Architecture sound?               NO      N/A    SINGLE (regex is the wrong tool for DIAGRAM)
  2. Test coverage sufficient?         NO      N/A    SINGLE (parser rewrite needs unit tests)
  3. Performance risks addressed?      YES     N/A    SINGLE (mermaid is lazy-loaded)
  4. Security threats covered?         NO      N/A    SINGLE (XSS via mermaid securityLevel)
  5. Error paths handled?              NO      N/A    SINGLE (before this review: no. After: yes)
  6. Deployment risk manageable?       YES     N/A    SINGLE (JSONB backward-compatible)
═══════════════════════════════════════════════════════════════
```

## Section 1: Architecture — ASCII Dependency Graph

```
lib/cards.ts
  parseCards()     ← NEEDS REWRITE (state-machine, not regex)
    TextCard       ← unchanged
    VideoCard      ← unchanged
    ImageCard      ← unchanged
    DiagramCard    ← NEW (mermaid: string | null, caption: string)
    CalloutCard    ← NEW (content: string, label: string)

lib/claude.ts
  buildChapterPrompt()  ← prompt density + new marker types
    DIAGRAM/CALLOUT syntax  ← must match parser's expectations

app/api/chapters/[id]/enrichment/route.ts
  resolveCards()   ← add DIAGRAM/CALLOUT dispatch cases
    mermaid.parse()  ← NEW: server-side validation before DB
    DiagramCard → no external fetch (mermaid inline)
    CalloutCard → no external fetch (content inline)

lib/images.ts     ← UNCHANGED (Unsplash dropped)

app/(app)/courses/[id]/chapters/[cId]/ChapterContent.tsx
  CardRenderer
    DiagramCard component  ← NEW (mermaid.js lazy import)
    CalloutCard component  ← NEW (pure CSS/Tailwind)
```

**Coupling concern:** `buildChapterPrompt()` and `parseCards()` are implicitly coupled via marker syntax. If the prompt changes marker format, the parser breaks silently. Mitigation: co-locate the marker regex/parser spec in a single `lib/markers.ts` that both import — deferred to v2 since scope is small. Note in TODO.

## Section 2: Code Quality

**DRY:** `resolveCards()` currently has `if (card.type === "text") return card` pattern; DIAGRAM and CALLOUT both pass through the same way — consistent.

**Naming:** `DiagramCard.mermaid` — clear. `CalloutCard.label` — clear. `CalloutCard.content` — consistent with `TextCard.content`.

**Complexity:** Parser rewrite is 40-60 lines replacing the current 20-line regex approach. Not over-engineered — it's what the use case requires.

## Section 3: Test Plan

**New codepaths requiring tests:**

| Codepath | Test type | Description |
|----------|-----------|-------------|
| `parseCards` — DIAGRAM with `\|` in Mermaid | Unit | `[[DIAGRAM: graph TD\n  A -->|yes| B | caption]]` parses correctly |
| `parseCards` — CALLOUT with `\|` in content | Unit | `[[CALLOUT: rate is 50\% \| high | Key insight]]` parses correctly |
| `parseCards` — DIAGRAM + CALLOUT in sequence | Unit | Mixed marker types extract without overlap |
| `parseCards` — invalid DIAGRAM (no `\|` separator) | Unit | Skips or falls back to text card |
| `resolveCards` — invalid Mermaid code | Unit | `mermaid: null` stored, no throw |
| `resolveCards` — valid Mermaid code | Unit | `mermaid: <code>` stored |
| `DiagramCard` — null mermaid | Component | Renders "Diagram unavailable" fallback |
| `DiagramCard` — loading state | Component | Renders spinner |
| `DiagramCard` — valid mermaid | Component | Renders SVG container |
| `CalloutCard` — known label types | Component | Correct color class per label |
| `CalloutCard` — unknown label | Component | Falls back to Definition styling |
| `CalloutCard` — empty content | Component | Renders nothing |

**Existing tests to update:**
- `__tests__/format.test.ts` — no change needed
- Add `__tests__/cards.test.ts` — new file for `parseCards` unit tests

**What would break at 2am Friday:** LLM generates Mermaid with `|` in edge labels (common in flowcharts). Without the parser rewrite, this silently produces malformed cards stored in DB. Users see garbled content, not an error.

## Section 4: Performance

**Mermaid bundle size:** The `mermaid` npm package is ~2MB minified. Must be lazy-loaded to avoid blocking initial chapter render.

Auto-fix: Use `next/dynamic` with `ssr: false` and `loading: () => <spinner>` for the DiagramCard component:
```tsx
const MermaidRenderer = dynamic(() => import("./MermaidRenderer"), {
  ssr: false,
  loading: () => <div className="animate-spin ..." />
});
```

**N+1 concern:** None. DIAGRAM and CALLOUT cards require zero external fetches. Enrichment is already parallel for VIDEO + IMAGE. Adding two zero-fetch types doesn't change the profile.

**Mermaid.parse() server-side:** The `mermaid` package is browser-oriented; `mermaid.parse()` may require DOM APIs on the server. Alternative: use `@mermaid-js/parser` (the lightweight AST-only package) for server-side validation. Auto-fix: specify `@mermaid-js/parser` for server-side validation, `mermaid` for client-side rendering.

## Section 5: Security

**XSS:** LLM-generated Mermaid code is untrusted input. Mermaid renders SVG via DOM manipulation. `securityLevel: 'strict'` disables click handlers and href attributes in diagram nodes. Required.

**Content injection:** Mermaid `securityLevel: 'strict'` prevents script injection but not content injection (user-visible text in diagram nodes). For a learning app, content injection (someone sees wrong text in a diagram) is the realistic attack surface, not code execution. The LLM is the content source — this is an AI-native app, so content injection via the LLM is a product-level concern, not an XSS concern.

**CalloutCard:** Pure text rendering with Tailwind classes. No `dangerouslySetInnerHTML`. No injection risk.

## Phase 3: Mandatory Outputs

### Architecture Decision

**REWRITE `parseCards()` as a state-machine parser.** The current regex approach cannot handle DIAGRAM markers with pipe characters. New algorithm:

```
function parseCards(content: string): UnresolvedCard[] {
  scan for next [[
  extract type prefix before :
  find matching ]]
  for DIAGRAM/CALLOUT: split on last | before ]]
  for VIDEO/IMAGE: keep current field extraction
  recursive/iterative over full content
}
```

### Implementation Order (UPDATED)

1. `lib/cards.ts` — parser rewrite (state-machine) + new types + updated unions
2. `lib/claude.ts` — update buildChapterPrompt (density + new marker types + learner profile weighting)
3. `app/api/chapters/[id]/enrichment/route.ts` — handle diagram (server-validate with @mermaid-js/parser) + callout in resolveCards
4. `ChapterContent.tsx` — add DiagramCard (lazy Mermaid) + CalloutCard renderers + Mermaid initialization with securityLevel: 'strict'
5. `__tests__/cards.test.ts` — unit tests for parser rewrite
6. Manual test: generate a chapter and inspect card distribution

### Failure Modes Registry

| Failure | Severity | Gap | Mitigation |
|---------|----------|-----|------------|
| Regex splits Mermaid on `\|` | Critical | Was unmitigated | Parser rewrite |
| Invalid Mermaid crashes client | High | Was unmitigated | Server validation + null path |
| Mermaid XSS | Medium | Was unmitigated | securityLevel: strict |
| Mermaid bundle blocks render | Medium | Was unmitigated | next/dynamic lazy load |
| Adjacent callouts | Low | Visual only | Prompt constraint |
| Empty CalloutCard content | Low | Was unmitigated | Skip render if empty |

### NOT in scope (from Phase 3)

- Rewriting VIDEO/IMAGE marker parsing (not needed — those markers don't contain `|` in content)
- Moving marker syntax to a shared `lib/markers.ts` (good idea, deferred — too much refactor for v1)

### What already exists

- `mermaid` npm package not yet installed — `npm install mermaid @mermaid-js/parser`
- `next/dynamic` already used for other lazy components (if not, standard Next.js pattern)
- `parseCards` tests currently zero — all new

**Phase 3 COMPLETE.** Claude subagent: 7 findings (1 critical, 2 high, 4 medium/low) — all auto-resolved. Major architectural change: parser rewrite required. Codex: unavailable. Passing to Phase 4 (Final Gate). DX scope: not detected — Phase 3.5 skipped.

---
