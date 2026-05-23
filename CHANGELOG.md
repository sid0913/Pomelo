# Changelog

All notable changes to Pomelo are documented here.

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
