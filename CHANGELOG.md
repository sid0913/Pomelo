# Changelog

All notable changes to Pomelo are documented here.

## [0.5.1.0] — 2026-05-30

### Security
- **T11 fixed** — `auth/callback/route.ts`: open redirect guard — `next` params not starting with `/` or starting with `//` now redirect to `/courses` (CWE-601)
- **T12 fixed** — `reset-password/page.tsx`: replaced `getSession()` (cookie-local) with `getUser()` (server-validated) for auth guard

### Added
- `ChapterChat`: `sendError` state — inline error displayed below textarea on POST failure or network throw; cleared on next send attempt (T3)
- `courses/new/page.tsx`: CREATING_VERBS shimmer during course-creation phase — matches loading/exiting verb animation (T4)
- `courses/new/page.tsx`: Q5 `done===false` else branch — shows inline error instead of silently doing nothing (T14)
- `AppShell`: skip-to-content link (`sr-only focus:not-sr-only`) and `aria-label="Main navigation"` on sidebar nav (T5, T6)
- Chapter page: `aria-label="Chapter list"` on TOC nav (T6)
- `SignOutButton`: inline error state — renders error text below button if `signOut()` returns an error (T15)

### Fixed
- `LandingPage`: `bg-white` → `bg-stone-50` to match design system background (T1)
- Chapter page: TOC aside `hidden xl:flex` → `hidden lg:flex` so it appears at lg breakpoint (T10)
- `courses/new/page.tsx`: Exit button `p-2 -m-2` for 44px touch target (T7)
- `courses/new/page.tsx`: Back button removed — eliminates stale-history and stale-chips bugs (T13)
- `courses/page.tsx` / `courses/[id]/page.tsx` / `CourseDashboard.tsx`: streak removed entirely; stat grid converted to 2-col (T8)

### Tests
- T16: `SignOutButton` — signOut error → inline error rendered
- T17: `NewCoursePage` — Back button absent; Q5 done:false → error shown
- T18: `ChapterChat.test.tsx` — POST non-OK, network throw, success clears error (new file)
- T19: `auth-callback.test.ts` — open redirect blocked, valid next passes through (new file)
- Total: 112 passing

## [0.5.0.0] — 2026-05-30

### Added
- **Design system — Scholarly Warmth** — Fraunces (display) + Outfit (body) + Geist Mono (data); brand `#C2410C` orange; `#FAFAF9` background throughout.
- **New landing page flow** — topic → email → inline OTP verification (code-based, no magic link redirect); returning users tap "Sign in" in the header for email+password signin.
- **Forgot password / reset password pages** — `/forgot-password` sends a reset email; `/reset-password` lets users set a new password.
- **AppShell sidebar** — persistent sidebar nav on md+ screens (`hidden md:flex`); contains logo, My Courses link, and sign-out button. Bottom tab bar deferred to `feat/mobile-nav`.
- **Middleware** — Supabase SSR cookie refresh on every request; auth guard redirects unauthenticated users from `/courses/*` to homepage.
- **Qualifying wizard redesign** — full-screen dark canvas (`#1A1410`) with centered warm card (`#FFFDF5`); animated option chips; rotating verb shimmer on loading/exiting phases.
- **Course dashboard redesign** — warm chapter list cards with completion rings; per-chapter estimated minutes; empty-state warm loader.
- **Chapter page redesign** — warm typography, orange-700 accent, inline chapter chat panel on lg+; TOC aside at lg+.
- **Course index redesign** — italic course name headings; warm card grid layout; 2-col stat grid (streak removed).
- **Pomelo logo** — SVG + PNG assets added; used in AppShell header and landing page.
- **courseId null guard** — qualifying wizard now handles malformed API responses that return a missing `courseId` with an inline error instead of navigating to `/courses/undefined`.

### Tests
- Rewrote `LandingPage` test suite (11 tests) to match new multi-step auth flow.
- Fixed `NewCoursePage` exit-button tests (3 tests) — mock now resolves a question response so the component reaches the "question" phase where the Exit button lives.
- Fixed `OtherRow` placeholder text assertion to match new design copy.
- Total: 102 passing.

### Deferred
- Security: open redirect in `auth/callback/route.ts` (T11) — tracked in TODOS.md
- Security: `getSession()` → `getUser()` in `reset-password/page.tsx` (T12) — tracked in TODOS.md
- Mobile nav bottom tab bar (T30/feat/mobile-nav), chapter chat floating button, page cross-fades

## [0.4.0.0] — 2026-05-28

### Added
- **Returning user sign-in** — landing page now shows "Already have an account? Sign in →" below the Get Started button. Clicking it opens a "Welcome back" email-only form (no topic prompt). After clicking the magic link, returning users land on `/courses` (their course dashboard) instead of the new-course wizard.
- **Sign-out button** — a fixed top-right "Sign out" button appears on all authenticated pages (courses, chapters). Calls `supabase.auth.signOut()` and redirects to the landing page.
- **Auth flow tests** — 15 new tests for `LandingPage` (returning user step, OTP redirect logic, sent-step text adaptation) and `SignOutButton` (render, signOut call, router redirect). Total: 103 passing.

### Fixed
- Auth callback redirect for users with no pending topic: previously sent to `/courses/new` (the new-course wizard); now correctly sends to `/courses` (the course dashboard).

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
