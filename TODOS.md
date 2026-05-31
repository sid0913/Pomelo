# TODOs

## Test coverage

- [ ] Integration tests for `app/api/qualifying-chat/route.ts` — requires MSW or a real Supabase test instance; skipped in v0.2.0 due to infra cost
- [ ] Integration tests for `app/(app)/courses/new/page.tsx` qualifying wizard — multi-step state machine needs MSW to mock `/api/qualifying-chat`; current coverage ~55%, below 60% gate

## Exit button hardening (deferred from v0.2.1 adversarial review)

- [ ] AbortController: cancel in-flight `/api/qualifying-chat` fetch when user clicks Exit, to prevent stale fetch callbacks from running after navigation
- [ ] Server-side session cleanup: call API to mark `qualifying_session` as `status: "abandoned"` on exit, to prevent unbounded DB growth from orphaned sessions
- [ ] Exit confirmation dialog: warn user before discarding mid-wizard progress (UX decision — depends on whether resume flow is added)

## Auth flow hardening (deferred from v0.4.0.0 adversarial review)

- [ ] Sign-out error feedback — planned as T15 in feat/design-overhaul eng review; deferred
- [ ] Q5 `data.done === false` case — planned as T14 in feat/design-overhaul eng review; deferred
- [ ] Stale `sessionId` on Q5 re-answers — planned as T13 (remove Back button); deferred

## Hardening (deferred from adversarial review)

- [ ] Clamp `truncateToTurns` in the API route: validate `0 ≤ truncateToTurns ≤ session.turns.length` to prevent negative-slice edge cases
- [ ] Add Zod refinement on `finish_qualifying` tool output (chapters array non-empty, `estimated_minutes` > 0) before inserting to DB
- [ ] Double-submit guard on qualifying wizard: disable form / set in-flight flag so rapid taps can't fire two concurrent requests
- [ ] Orphaned course cleanup: if `chapters.insert` fails after `courses.insert`, roll back or queue a cleanup job
- [ ] Stale chips on back-to-Q5 — planned as T13 (remove Back button); deferred

## Mobile design (deferred from /plan-design-review — feat/design-overhaul)

- [ ] **Mobile navigation**: Bottom tab bar below 1024px (lg), sidebar at lg+. Items: My Courses + Account (sign out). Active state: orange-700. This branch removed the sidebar on mobile with no replacement — ship `feat/mobile-nav` immediately after design overhaul lands.
  - Spec: `AppShell` sidebar `hidden lg:flex`, bottom bar `flex lg:hidden`, 48px height, `role="navigation" aria-label="Mobile navigation"`
  - **Note:** AppShell ships with `hidden md:flex` as a temporary bridge. The mobile-nav PR must change this to `hidden lg:flex` when adding the bottom tab bar, or tablets (768-1023px) will lose navigation.
- [ ] **Mobile chapter chat**: Floating "Ask →" button fixed bottom-right of chapter reading area, visible below lg. Taps open a Shadcn `Sheet` (side=bottom) at 60% viewport height. Swipe down or tap outside to close.
  - Spec: orange-700 button, sheet contains full `ChapterChat` component, `aria-label="Open chapter chat"`
- [ ] **Page cross-fades**: View Transitions API for 150ms opacity transition between routes (DESIGN.md spec). Add `<ViewTransition>` wrapper in `app/layout.tsx`. Degrades gracefully on Safari <18 (instant cut).

## Design overhaul engineering review tasks (deferred — feat/design-overhaul)

Plan file: `~/.gstack/projects/pomelo/ananth-feat-design-overhaul-eng-review-20260529-161108.md`

### P1 — Critical path

- [x] **T1** `app/LandingPage.tsx:93` — `bg-white` → `bg-stone-50` ✓
- [x] **T2** `CourseDashboard.tsx` empty state warm loader — DONE ✓
- [x] **T3** `ChapterChat.tsx` — `sendError` state; inline error below textarea on failure; cleared on retry ✓
- [x] **T4** `courses/new/page.tsx` creating state — rotating verb shimmer added (CREATING_VERBS) ✓
- [x] **T11** `app/auth/callback/route.ts` — **SECURITY FIXED**: open redirect guard ✓
- [x] **T14** `courses/new/page.tsx` — Q5 `done===false` else branch added ✓

### P2 — Polish and hardening

- [x] **T5** `AppShell.tsx` — skip nav link added ✓
- [x] **T6** `AppShell.tsx` + chapter page — `aria-label="Main navigation"` + `aria-label="Chapter list"` ✓
- [x] **T7** `courses/new/page.tsx` — `p-2 -m-2` on Exit button ✓
- [x] **T8** `courses/page.tsx` + `courses/[id]/page.tsx` + `CourseDashboard.tsx` — streak removed; stat grid 2-col ✓
- [x] **T9** `courses/page.tsx:156` — `italic` on course name h2 — DONE ✓
- [x] **T10** `courses/[id]/chapters/[cId]/page.tsx` — TOC aside `hidden xl:flex` → `hidden lg:flex` ✓
- [x] **T12** `app/(auth)/reset-password/page.tsx` — **SECURITY FIXED**: `getSession()` → `getUser()` ✓
- [x] **T13** `courses/new/page.tsx` — `handleBack` + Back button removed ✓
- [x] **T15** `SignOutButton.tsx` — error state added; inline error rendered on failure ✓

### Tests

- [x] **T16** `__tests__/SignOutButton.test.tsx` — signOut error → inline error text ✓
- [x] **T17** `__tests__/NewCoursePage.test.tsx` — Back button not in DOM; Q5 done:false → error shown ✓
- [x] **T18** `__tests__/ChapterChat.test.tsx` — POST non-OK; network throw; success clears error ✓
- [x] **T19** `__tests__/auth-callback.test.ts` — open redirect blocked; valid /next passes through ✓

## Visual learning (deferred from /autoplan visual-learning review)

- [ ] Revisit AI image generation when per-image cost drops below $0.01 (currently ~$0.04/image with DALL-E 3)
- [ ] Add learner modality preference to qualifying conversation: "Are you more of a visual learner or do you prefer reading?" — use response to weight diagram/callout vs text ratio (v2)
- [ ] Move marker syntax spec to `lib/markers.ts` so `buildChapterPrompt` and `parseCards` share the source of truth — prevents silent prompt/parser drift (v2 refactor)
- [ ] Chapter completion rate baseline: instrument and record before shipping visual upgrade, then re-measure after 10+ chapters to validate impact
- [ ] Evaluate @mermaid-js/parser as server-side validator vs bundling full mermaid on server — check if mermaid.parse() works in Node.js without DOM polyfill
