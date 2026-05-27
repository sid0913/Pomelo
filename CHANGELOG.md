# Changelog

All notable changes to Pomelo are documented here.

## [0.3.0] — 2026-05-27

### Added
- **Visual card system** — chapters now render as a structured card feed (text, video, image, callout) instead of a flat prose block. Cards are parsed from LLM-generated marker syntax and resolved server-side during enrichment.
- **Image search pipeline** — tiered image lookup via Wikimedia Commons (JPEG/PNG/SVG, origin-validated to `upload.wikimedia.org`) with Unsplash CDN fallback. Images are embedded inline between text cards.
- **Callout cards** — four styled highlight types (Key insight, Definition, Warning, Example) with per-label colors (amber, stone, red, blue) and ARIA labels. Renders inline between paragraphs.
- **Richer LLM prompt** — `buildChapterPrompt` updated to target 3–5 visual markers per chapter with specific image query guidance (labeled diagrams vs. photographs) and learner-level weighting (beginners get definitions first; advanced learners get detailed schematics).
- **Supabase migration** — `cards JSONB` column added to `chapters` table via `003_cards.sql`.
- **Unit tests** — 46 new tests for `parseCards` (all card types, edge cases, pipe-in-content) and `searchImage` (Wikimedia origin check, Unsplash hostname validation, MIME filtering). Total: 88 passing.

### Fixed
- Enrichment exceptions no longer permanently lock a chapter (`enriched=true, cards=null`) — the flag resets to `false` on failure so re-enrichment can run.
- Race condition in enrichment: a second concurrent request now returns `ready: false` while the first is still resolving, preventing stale "done with no cards" responses.
- Retry route now resets `enriched: false, cards: null` so card enrichment re-runs after a generation retry.
- OtherRow: `stopPropagation` on keydown prevents keyboard events from leaking to parent wizard nav.
- New course page: bounds check prevents out-of-range `selectedIndex` from crashing option lookup.
- Marker strip regex in prose fallback now includes CALLOUT and uses dotAll flag, preventing raw marker text from appearing during streaming.

## [0.2.1] — 2026-05-24

### Added
- Exit button in the qualifying wizard header — clears the pending topic and returns to `/courses`
- Tests for `handleExit`: verifies localStorage cleanup and `/courses` navigation

### Fixed
- Exit button hidden during the 150ms `exiting` animation phase to prevent a navigation race with the in-flight qualifying-chat request

## [0.2.0] — 2026-05-23

### Added
- **OptionRow**: extracted reusable option chip component with amber border highlight on selection
- **OtherRow**: inline "Type your own answer" row for Q1–Q4, navigable by arrow keys or pressing E; Continue blocked until text is present
- **Skip toggle on Q5**: replaced divider-style skip with an honest underlined toggle ("Skip — no specific topics in mind" / "No specific topics · undo"); hidden once chips are added
- **Back link on course dashboard**: "← My courses" link for easy navigation
- **Test infrastructure**: Vitest + React Testing Library; unit tests for `toTitleCase`, `OptionRow`, and `OtherRow`
- **`lib/format.ts`**: shared `toTitleCase` helper (sentence case — capitalizes first character only, preserves acronyms and proper nouns)

### Changed
- Course topic rendered in sentence case everywhere (courses list, dashboard, chapter breadcrumb) via shared `toTitleCase`
- Qualifying wizard loads minimum 800 ms to avoid flash-of-content on fast responses
- Moved `PLAN.md` and `PLAN-onboarding.md` into `plans/` directory
- `callQualifyingChat()` extracted as shared fetch helper, eliminating duplicated fetch logic

### Fixed
- Prompt injection: topic string sanitized (newlines/quotes stripped) before embedding in Claude system prompt
- UTC offset derivation: now reads from the validated client timezone string via `Intl.DateTimeFormat shortOffset` instead of using server clock offset
- Parallel Supabase writes on course creation (chapters, session update, habit reminder) now use `Promise.all`
- Selected option border: amber highlight on all four sides (was missing left/right borders)
- Focus-visible rings added to keyboard-accessible Back buttons

## [0.1.0] — 2026-05-22

Initial MVP: qualifying chat flow, course + chapter scaffolding, Supabase auth (magic link), daily habit reminders.
