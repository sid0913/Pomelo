# Pomelo — Polished Onboarding Plan

**Branch:** `feat/polished-onboarding`
**Status:** IN REVIEW (design review in progress)

---

## Scope

Redesign the full onboarding funnel:

1. **Landing** (`/`) — Topic input → email overlay — polish existing
2. **Login page** (`/(auth)/login`) — "Check your inbox" state — polish existing
3. **Qualifying** (`/courses/new`) — Full redesign from chat UI to Typeform-style one-question-at-a-time

**Key constraint:** Reduce qualifying from ~7 questions to **5 questions**.

---

## Design Reference

Design system from PLAN.md (inline, no DESIGN.md):
- Font: Plus Jakarta Sans (variable weight)
- Colors: stone/amber palette (#fafaf9 bg, #1c1917 text, #d97706 accent)
- Radius: 4/8/12px — restrained, not bubbly
- Spacing: 4/8/12/16/24/32/48/64/96px scale

---

## Concept: Typeform-Style Qualifying

Replace the current chat-bubble scroll UI (`/courses/new`) with a one-question-at-a-time wizard:

- **One question occupies the full screen** — nothing else visible
- **Claude Code-style options** — selectable with ↑↓ arrow keys, mouse click, or letter shortcuts (A, B, C, D)
- **Free-text fallback** — always available below options ("Or type your own answer...")
- **Back navigation** — return to previous questions (TBD: what happens to state)
- **Thinking animation** — between questions, show AI "thinking" state
- **Progress indicator** — subtle indicator showing current question number
- **5 questions** — down from ~7

---

## Screen Designs

### Information Architecture

#### Landing (`/`) — unchanged structure, polish pass only
```
┌──────────────────────────────────────────────────────┐
│                    Pomelo (amber-600)                 │
│                                                      │
│   The course that skips what you already know.       │  ← 40px bold, centered
│                                                      │
│   What do you want to learn?                         │  ← 18px stone-500
│   [                                    ]             │  ← input, full-width
│   [ Get started →                      ]             │  ← amber button
│                                                      │
└──────────────────────────────────────────────────────┘
STEP 2 (email overlay, same screen):
┌──────────────────────────────────────────────────────┐
│ ← Back                                               │
│ ┌─ Topic: Machine Learning ─────────────────────────┐│
│ └───────────────────────────────────────────────────┘│
│ Enter your email — we'll send you a sign-in link.    │
│ [                                    ]               │
│ [ Send sign-in link →                ]               │
└──────────────────────────────────────────────────────┘
```

#### Login page (`/(auth)/login`) — polish only
Currently: emoji icon + 2 lines of text. Needs to feel more intentional.

#### Qualifying (`/courses/new`) — FULL REDESIGN
Typeform-style. One question per screen.

```
┌──────────────────────────────────────────────────────┐
│ ← Back           Machine Learning        3 of 5 ●●●○○│
│                                                      │
│                                                      │
│  What best describes your background                 │  ← 32px bold, left-aligned
│  with machine learning?                              │
│                                                      │
│  ┌─────────────────────────────────────────────────┐ │
│  │ A  Complete beginner                            │ │  ← options
│  ├─────────────────────────────────────────────────┤ │
│  │ B  I know the basics                            │ │
│  ├─────────────────────────────────────────────────┤ │
│  │ C  I've built ML projects                       │ │
│  ├─────────────────────────────────────────────────┤ │
│  │ D  I work with ML professionally                │ │
│  └─────────────────────────────────────────────────┘ │
│                                                      │
│  ╌╌╌ Or type your own answer...                      │  ← dashed border input
│                                                      │
│                                       Continue →     │
└──────────────────────────────────────────────────────┘
```

Question 5 (last) — special "Topics to cover" chip-input format:
```
┌──────────────────────────────────────────────────────┐
│ ← Back           Machine Learning        5 of 5 ●●●●○│
│                                                      │
│  Any specific topics you want to                     │
│  make sure we cover?                                 │
│                                                      │
│  [Neural Networks ×] [CNNs ×] [+ Add topic...]       │  ← chip tags
│                                                      │
│  ───────────── or skip ─────────────                 │
│                                                      │
│                                         Finish →     │
└──────────────────────────────────────────────────────┘
```

### Progress Indicator (D3 decision)
**Style: 5 dots (●●●○○)** — top-right of qualifying screen.
- Filled amber circle = completed question
- Empty stone-300 circle = remaining
- ARIA: `role="status"` aria-label="Question 3 of 5"
- Dot size: 8px, spacing: 6px, `stroke-width: 2` for empty state

### Back Navigation (D2 decision)
**Model B:** Editing any previous answer clears all subsequent questions and restarts the AI from that edit point.
- Visual: Back button always visible from Q2 onward. Previous question re-appears with prior answer pre-selected.
- Changing the answer: clears forward state, shows "Continuing from here..." micro-copy, re-enters loading state.
- Unchanged answer + Continue: resumes forward as if nothing happened (no re-generation).
- API change needed: when user edits Q(n), truncate `qualifying_sessions.turns` to the first N*2 turns (user + assistant) then call `/api/qualifying-chat` as normal.

---

## Interaction State Table

### Typeform Qualifying — Per-Question States

| State | What user sees |
|-------|---------------|
| Question appears | Fades in (200ms ease-in) from slight offset (translateY 8px → 0) |
| Options loaded | Options appear 80ms staggered after question (A, B, C, D cascade) |
| Option hovered | Amber-500 ring, amber-50 bg, letter badge turns amber-600 |
| Option keyboard-focused | Same as hover (↑↓ arrow keys navigate, Enter selects) |
| Option selected | Amber-600 border + amber-50 bg; letter "A" shown in amber; Continue button activates |
| Free-text input focused | Dashed border turns solid stone-300; letter options de-emphasize (opacity 0.6) |
| Free-text typed | Continue activates; option selection is cleared |
| Continue clicked | Question fades out (150ms ease-out); rotating verb animation appears center; minimum 800ms hold |
| Thinking animation | Rotating verbs: "thinking...", "exploring...", "calibrating...", "mapping gaps..." every 2000ms; 14px stone-500 italic, centered |
| Next question ready | Verb fades out (150ms); next question fades in (200ms); options stagger in |
| Error (API failed) | Small inline error below the Continue button: "Something went wrong — try again" in red-600 12px; Continue re-enables |
| Back button clicked (Q>1) | Current question fades out; previous question fades in with prior answer pre-selected; if answer changes → clear forward message |
| Answer changed (going back) | Micro-copy appears below selection: "Continuing from here will clear later answers" (stone-400, 12px) |
| Q5 (chip input) — no chips | "skip this step" link prominent; Finish button disabled |
| Q5 (chip input) — chips added | Chips display as amber-100 bg, amber-600 text, stone-400 × to remove; Finish button active |
| Course creation loading | Full-screen: spinner + "Creating your personalized course…" (existing behavior) |

### Landing / Email / Login States

| Feature | Loading | Error | Success |
|---------|---------|-------|---------|
| Landing topic step | N/A | "Please enter a topic" inline below input | → email step (fade transition) |
| Email send | Button: "Sending…", disabled | "Something went wrong. Please try again." | → "Check your inbox" state |
| Login page | N/A | N/A | Static "Check your inbox" state |

### Animation Spec (D4 decision)
- **Question fade-out:** opacity 1→0, translateY 0→-8px, 150ms ease-out
- **Question fade-in:** opacity 0→1, translateY 8px→0, 200ms ease-in, 80ms delay after verb fades
- **Option stagger:** 80ms delay between each option row appearing
- **Verb animation:** fade in/out between verbs, 2000ms interval
- **Minimum loading hold:** 800ms (prevent flicker when API responds fast)
- **`prefers-reduced-motion`:** skip all translate/opacity transitions; use instant show/hide

---

## User Journey & Emotional Arc

| Step | User does | User feels | Plan specifies |
|------|-----------|------------|----------------|
| 1. Landing | Sees headline + input | Curious: "Is this different?" | Topic input IS the hero — no hero image, no SaaS pitch |
| 2. Types topic | Enters "machine learning" | Engaged — product asked what I want | Placeholder examples guide; no walls of text |
| 3. Email step | Sees topic confirmation + email field | Slight friction, reassured | Topic pill visible; copy: "Your topic is saved." |
| 4. Check inbox | Sees "Check your inbox" | Brief pause + anticipation | Inline confirmation state, no separate page |
| 5. Magic link click | Lands on qualifying screen | Re-orienting after email delay | **Topic pill + subtitle: "Building your course profile · 5 questions"** |
| 6. Q1 fades in | First question appears | "Oh — a real question, not a chatbot" | Typeform style: full screen, elegant, left-aligned |
| 7. Sees options | A/B/C/D options stagger in | "I can just click — easy" | Keyboard + mouse + free text all available |
| 8. Clicks Continue Q1 | Verbs rotate ("exploring...") | "It's thinking about my answer" | Full-screen verb animation, 800ms minimum hold |
| 9. Q2–4 | Answers each | Investment builds: "questions feel specific to me" | Each question references context from prior answers (AI behavior) |
| 10. Q5 — topics | Sees chip input | "I have control over what's covered" | Chip input + "skip" option; Finish button not Continues |
| 11. Finish → loading | Loading screen | Anticipation: "what will it build?" | Full-screen: spinner + "Creating your personalized course…" |
| 12. Dashboard reveal | Chapters stagger in | PAYOFF: "It skips what I already know" | Stagger reveal + "Your personalized course is ready" fade (from PLAN.md) |

### Arrival Context Fix (Pass 3 gap)
The qualifying screen header must show:
```
← Back          Machine Learning          ●○○○○
                Building your course profile · 5 questions
```
- "Building your course profile · 5 questions" is a fixed subtitle in stone-400 14px
- Only visible on Q1 (or always — consistency)
- Removes disorientation when arriving from magic link

---

## Design Decisions & AI Slop Fixes

### Pass 4: AI Slop
1. **Remove 📬 emoji** from `LandingPage.tsx` "sent" state and `/(auth)/login/page.tsx`. Replace with text-only:
   - "sent" state: just headline "Check your inbox" (24px bold) + body copy. No decorative icon.
   - Login page: same — headline + body only. Clean.
2. **Option rows are NOT slop** — letter badges (A/B/C/D) are functional keyboard shortcuts (Claude Code pattern). Allowed.
3. **Landing headline** "The course that skips what you already know." — specific and product-forward. Not generic hero copy.

### Pass 5: Design System Alignment
Qualifying screen uses the PLAN.md design system. New components to specify:

**Option row (new component):**
```
height: auto (min 56px for touch target)
padding: 14px 20px
background: white
border: 1px solid var(--color-border)  /* stone-200 */
border-radius: 8px
gap: 16px between badge and text

Letter badge:
  width: 28px, height: 28px
  background: #f5f5f4  /* stone-100 */
  border-radius: 6px
  font: 13px monospace bold
  color: #78716c  /* stone-500 */
  
  HOVER / FOCUS state:
  ring: 2px solid #f59e0b  /* amber-400 */
  background: #fffbeb  /* amber-50 */
  badge-color: #d97706  /* amber-600 */
  
  SELECTED state:
  border: 1.5px solid #d97706  /* amber-600 */
  background: #fffbeb  /* amber-50 */
  badge-background: #d97706
  badge-color: white
```

**Chip tag (new component — Q5 only):**
```
display: inline-flex, align-items: center, gap: 6px
padding: 4px 10px
background: #fffbeb  /* amber-50 */
border: 1px solid #fbbf24  /* amber-400 */
border-radius: 16px  /* pill */
font: 14px, color: #92400e  /* amber-900 */
× button: 14px, color: #d97706
```

**Thinking verb animation (reuses existing LOADING_VERBS from current code):**
```
font: 20px Plus Jakarta Sans italic
color: #78716c  /* stone-500 */
position: absolute, centered on screen
fade-in/out with 300ms opacity transition between verbs
```

## Responsive & Accessibility Spec

### Responsive Layout

| Element | Desktop (>640px) | Mobile (<640px) |
|---------|-----------------|-----------------|
| Qualifying container | max-width 560px, centered | full-width, 16px side padding |
| Question text | 32px | 26px |
| Option rows | max-width 560px, centered | full-width |
| Continue / Finish button | right-aligned, auto width | full-width |
| Back button | top-left, text-style | 44px touch target |
| Chip × button | 14px text | 44px touch area via padding trick: `p-3 -m-1` wrapper |
| Progress dots | top-right | top-right (same) |

### Keyboard Navigation (desktop)

- **Tab**: cycles through Back button → option rows → free-text input → Continue button
- **↑ / ↓ arrow keys**: cycle through option rows (A→B→C→D→A). Does NOT leave the option group.
- **Letter keys (A, B, C, D)**: select corresponding option. Only active when free-text input is NOT focused.
- **Enter**: when an option is selected and Continue is active → submits. When in free-text input → does NOT submit (multi-line not expected, but Enter = new line for now).
- **Escape**: no action (keep it simple for v1).

### Focus Management

- When a new question fades in: `autoFocus` or programmatic focus on the first option row (option A).
- When a question fades out (loading state): trap focus on loading container to prevent Tab from reaching invisible elements.
- When navigating Back: focus moves to the question's first option (pre-selected from prior answer).

### ARIA Spec

```
Progress dots container:
  role="status"
  aria-label="Question 3 of 5"
  aria-live="polite"

Option group:
  role="radiogroup"
  aria-label="[question text]"
  
Option row:
  role="radio"
  aria-checked={isSelected}
  aria-label="Option A: Complete beginner"
  tabIndex={isFocused ? 0 : -1}  (roving tabindex pattern)

Free-text input:
  <label className="sr-only">Or type your own answer</label>
  <input aria-label="Or type your own answer" />

Chip input (Q5):
  <label className="sr-only">Topics to cover</label>
  Chip × button: aria-label="Remove Neural Networks"

Thinking animation:
  role="status"
  aria-live="polite"
  aria-label="Loading next question"
```

### Touch Targets — All must be ≥44px

- Option rows: min-height 56px ✓
- Continue / Finish button: min-height 48px, full-width on mobile ✓
- Back button: padding to reach 44px touch area ✓
- Chip × button: `<button className="p-3 -m-1">×</button>` → 44px touch area ✓
- Progress dots: decorative only, not interactive ✓

## Remaining Design Specs (Pass 7 — all self-resolved)

### Back button on Q1
Hide the Back button on the first question (nothing to go back to). Show from Q2 onward.

### Landing step transitions
Add 150ms opacity fade between topic→email→sent steps. No slide.
```css
.step-enter { opacity: 0; }
.step-enter-active { opacity: 1; transition: opacity 150ms ease-in; }
```

### Login page polish
```
Pomelo (amber-600, 12px, uppercase, tracking-widest)  ← wordmark

Check your inbox                                       ← 22px bold, stone-900
We sent you a sign-in link. Click it to start         ← 16px, stone-500
building your personalized course.

Didn't get it? Check your spam folder.                ← 14px, stone-400, mt-6

← Back to sign in                                     ← 14px, stone-400, mt-8, link to /
```
No emoji. No image.

### "Continuing from here" micro-copy
When user goes back and changes an answer, show inline below the option group:
```
"Changing this will clear your later answers."   ← 12px, stone-400, italic, fade in
```
Disappears once they hit Continue and the transition begins.

### API prompt update
The qualifying prompt must instruct Claude to return ONLY the question text — no conversational preamble ("Great! Since you mentioned X..."). The question is the question. Conversational context belongs in Claude's reasoning, not its output.

### Qualifying question count
Update the backend `finish_qualifying` tool check: trigger course creation after exactly 5 user turns (not 7).

## Implementation Tasks

Synthesized from design review findings.

- [ ] **T1 (P1, human: ~3h / CC: ~30min)** — Qualifying wizard — Rebuild `/app/(app)/courses/new/page.tsx` as Typeform-style one-question-at-a-time UI
  - Surfaced by: Core product redesign — chat UI replaced with wizard
  - Files: `app/(app)/courses/new/page.tsx`
  - Verify: each question occupies full screen; next question fades in after API response

- [ ] **T2 (P1, human: ~1h / CC: ~10min)** — OptionRow component — Build keyboard-navigable A/B/C/D option row with letter badge, hover/focus/selected states
  - Surfaced by: Pass 1 IA + Pass 5 design system — new component needed
  - Files: `app/(app)/courses/new/OptionRow.tsx` (or inline in page.tsx)
  - Verify: ↑↓ arrow keys cycle options; letter keys A/B/C/D select; Enter submits; 56px min-height

- [ ] **T3 (P1, human: ~1h / CC: ~10min)** — ChipInput component — Build Q5 chip tag input with amber pill chips, × remove, skip option
  - Surfaced by: Pass 1 IA — "topics to cover" as final question
  - Files: `app/(app)/courses/new/ChipInput.tsx` (or inline)
  - Verify: type topic + Enter adds chip; × removes; skip works; Finish active with 0 chips only if Skip clicked

- [ ] **T4 (P1, human: ~1h / CC: ~10min)** — Question transitions — Implement fade-out/verb/fade-in animation cycle with 800ms minimum hold
  - Surfaced by: Pass 2 interaction states D4 decision
  - Files: `app/(app)/courses/new/page.tsx`, `app/globals.css`
  - Verify: Continue click → question fades out → verbs rotate → next question fades in; if API responds in <800ms, hold the verb state until 800ms passes

- [ ] **T5 (P1, human: ~2h / CC: ~20min)** — Back navigation — Implement Back button with client-side history stack + session turn truncation
  - Surfaced by: Pass 1 D2 decision (model B)
  - Files: `app/(app)/courses/new/page.tsx`, `app/api/qualifying-chat/route.ts`
  - Verify: answer Q1+Q2 → click Back → Q1 shows with prior answer selected → change answer → "Changing this will clear your later answers" appears → Continue → Q2 regenerates fresh from Claude

- [ ] **T6 (P2, human: ~30min / CC: ~5min)** — Landing polish — Remove 📬 emojis; add step fade transitions (150ms opacity)
  - Surfaced by: Pass 4 AI slop — emoji as design element
  - Files: `app/LandingPage.tsx`
  - Verify: "sent" step shows no emoji; transitions between steps fade smoothly

- [ ] **T7 (P2, human: ~30min / CC: ~5min)** — Login page — Pomelo wordmark + "Check your inbox" text-only layout + "Back to sign in" link
  - Surfaced by: Pass 3 + Pass 4 — bare page with emoji
  - Files: `app/(auth)/login/page.tsx`
  - Verify: no emoji; wordmark visible; "Back to sign in" links to `/`

- [ ] **T8 (P2, human: ~1h / CC: ~10min)** — Accessibility — ARIA spec: radiogroup on options, roving tabindex, live region on progress dots, sr-only labels on inputs
  - Surfaced by: Pass 6 accessibility spec
  - Files: `app/(app)/courses/new/page.tsx`
  - Verify: screen reader announces "Question 3 of 5" on each new question; option selection announced; keyboard-only flow works end-to-end

- [ ] **T9 (P2, human: ~30min / CC: ~5min)** — Backend prompt — Update qualifying prompt to return bare question text (no "Great! Since you said..." preamble)
  - Surfaced by: Pass 7 — Typeform UI breaks if question text has conversational prefix
  - Files: `lib/prompts/qualifying.ts`
  - Verify: Claude's qualifying response is a bare question + option list, no preamble

- [ ] **T10 (P1, human: ~30min / CC: ~5min)** — Backend — Reduce qualifying to 5 turns; add chip topics to user_profile in `finish_qualifying` tool output
  - Surfaced by: user decision + Pass 1 (Q5 chip topics must feed into course creation)
  - Files: `lib/prompts/qualifying.ts`, `app/api/qualifying-chat/route.ts`
  - Verify: course is created after exactly 5 user turns; `user_profile.custom_topics` populated if Q5 chips provided

## NOT in Scope

- Dark mode — single warm light theme for v1
- Survey-mode (letting user skip all questions) — deferred to v1.5
- AI-generated chip suggestions on Q5 — deferred (requires extra Claude call at Q5 load time)
- Animated progress bar (instead of dots) — explicitly rejected, dots chosen (D3)
- Smart branching back navigation (option A in D2) — deferred to v1.5
- Course editing (re-run qualifying for an existing course) — v2

## What Already Exists

- Rotating `LOADING_VERBS` array + cycling logic in current `new/page.tsx` — reuse as-is
- Supabase `qualifying_sessions.turns` JSONB array — truncation for Back navigation works by slicing this array
- `/api/qualifying-chat/route.ts` — keep the API unchanged; UI layer redesign only (except T5 session truncation and T10 turn count)
- `localStorage['pomelo_pending_topic']` persistence — unchanged
- Design system tokens (stone/amber palette, Plus Jakarta Sans, spacing) — all reused

## Architecture Notes (from Eng Review)

### Finding E1 — CRITICAL: T5 back navigation requires DB write (not client-only)
`route.ts:38-49` reads `turns` from `qualifying_sessions` by `sessionId`. Client-side truncation alone won't work — the API loads the full untruncated turns from DB every request.

**Fix:** Add optional `truncateToTurns?: number` to `RequestSchema` in `qualifying-chat/route.ts`. When provided, slice `session.turns` to that count before appending the new user turn. No new endpoint needed.

```ts
// RequestSchema addition:
truncateToTurns: z.number().int().min(0).optional(),

// In route handler, after fetching session:
const baseTurns = truncateToTurns !== undefined
  ? session.turns.slice(0, truncateToTurns)
  : session.turns;
const updatedTurns = [...baseTurns, { role: "user", content: userMessage, timestamp: ... }];
```

Client sends `truncateToTurns: questionIndex * 2` (where each question = 1 user + 1 assistant turn) when Back was used to edit a prior answer.

### Finding E2 — CRITICAL: T9 "bare question text" is insufficient — structured output required
The wizard needs `{ question: string, options: string[] }` for each question step, not a text blob. Without this, `OptionRow` (T2) has no data to render options. The current API returns `{ assistantMessage: string }`.

**Fix:** Add a `present_question` tool alongside `finish_qualifying`. Claude calls it to show each question:

```ts
// lib/prompts/qualifying.ts — new tool
export const PRESENT_QUESTION_TOOL: Anthropic.Messages.Tool = {
  name: "present_question",
  description: "Present a single qualifying question with options to the learner.",
  input_schema: {
    type: "object",
    properties: {
      question: { type: "string", description: "The question text, plain, no preamble." },
      options: {
        type: "array",
        minItems: 2,
        maxItems: 4,
        items: { type: "string" },
        description: "Answer options A, B, C, D. Concrete, mutually exclusive."
      }
    },
    required: ["question", "options"]
  }
};
```

API route change: when `stop_reason === "tool_use"` and tool name is `present_question`, extract `{ question, options }` from the tool input and return:
```json
{ "done": false, "sessionId": "...", "question": "...", "options": ["...", "..."] }
```

(instead of `{ "assistantMessage": "..." }`)

The client stores `{ question, options }` per step in the wizard history stack.

Q5 is special — the client hardcodes "Any specific topics you want to cover?" and renders the chip input without calling the API first. The chip answer is then POSTed as the final user turn.

### Finding E3 — MEDIUM: T10 turn threshold hardcoded at 6
`route.ts:84`: `userTurnCount >= 6` must become `>= 5`.

Also the system prompt says "usually after 5–8 exchanges" — update to: "After the learner answers exactly 5 questions, call finish_qualifying."

### Finding E4 — MEDIUM: T10 custom_topics path
Chips from Q5 should be serialized into the `userMessage` string before POSTing:
- No chips + skip clicked → send empty-ish message or a "skip" message
- Chips present → `"Topics I want to cover: Neural Networks, CNNs"`

Add `custom_topics?: string[]` to `user_profile` in `FINISH_QUALIFYING_TOOL`:
```ts
custom_topics: {
  type: "array",
  items: { type: "string" },
  description: "Specific subtopics the learner explicitly requested"
}
```
No DB migration needed — `user_profile` is JSONB (`courses` table).

### Finding E5 — LOW: System prompt rules 2 and 4 contradict Typeform format
Rules 2 ("Acknowledge what they say") and 4 ("Be conversational and warm") produce preamble text that breaks the wizard format. T9 must rewrite these.

**Proposed replacement:**
- Rule 2: "Output ONLY by calling `present_question` or `finish_qualifying`. Never output plain text."  
- Rule 4: (remove) — warmth comes from UI design, not AI narration.

### Finding E6 — LOW: T2/T3 component placement
OptionRow has complex keyboard state (roving tabindex, letter-key shortcuts) — separate file `OptionRow.tsx` recommended. ChipInput is Q5-only and simpler — inline in page.tsx is acceptable for v1.

### Updated API response shapes

**Normal turn (was `assistantMessage`, now structured):**
```json
{ "done": false, "sessionId": "...", "question": "...", "options": ["A text", "B text", ...] }
```

**Q5 final turn (triggers course creation):**
```json
{ "done": true, "courseId": "..." }
```

### Task amendments

- **T5** — add `truncateToTurns?: number` to RequestSchema; slice before appending (E1). Client sends `questionIndex * 2` when editing a prior answer.
- **T9** — add `present_question` tool (E2); rewrite rules 2 + 4 (E5); change API response shape; update `route.ts` to handle both tool names.
- **T10** — change `>= 6` to `>= 5` in `route.ts:84`; update system prompt (E3); add `custom_topics` to tool schema (E4).

## GSTACK REVIEW REPORT

| Review | Trigger | Why | Runs | Status | Findings |
|--------|---------|-----|------|--------|----------|
| CEO Review | `/plan-ceo-review` | Scope & strategy | 0 | — | — |
| Codex Review | `/codex review` | Independent 2nd opinion | 0 | — | — |
| Eng Review | `/plan-eng-review` | Architecture & tests (required) | 1 | CLEAR with amendments | 6 findings: 2 critical, 2 medium, 2 low — all resolved above |
| Design Review | `/plan-design-review` | UI/UX gaps | 1 | CLEAR | score: 2/10 → 9/10, 5 decisions |
| DX Review | `/plan-devex-review` | Developer experience gaps | 0 | — | — |

**DESIGN DECISIONS:** D2 (back nav = clear forward), D3 (5-dot progress), D4 (question fade + verb animation, 800ms hold), topics chip as Q5, qualifying reduced to 5 turns.
**ENG DECISIONS:** E1 (truncateToTurns param, no PATCH endpoint), E2 (present_question tool, structured API response), E3 (threshold → 5), E4 (custom_topics in JSONB), E5 (rewrite prompt rules 2+4), E6 (OptionRow separate file).
**UNRESOLVED:** 0
**VERDICT:** ENG CLEARED — ready to implement T1–T10 with amendments above.
