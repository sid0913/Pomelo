# TODOs

## Test coverage

- [ ] Integration tests for `app/api/qualifying-chat/route.ts` — requires MSW or a real Supabase test instance; skipped in v0.2.0 due to infra cost
- [ ] Integration tests for `app/(app)/courses/new/page.tsx` qualifying wizard — multi-step state machine needs MSW to mock `/api/qualifying-chat`; current coverage ~55%, below 60% gate

## Exit button hardening (deferred from v0.2.1 adversarial review)

- [ ] AbortController: cancel in-flight `/api/qualifying-chat` fetch when user clicks Exit, to prevent stale fetch callbacks from running after navigation
- [ ] Server-side session cleanup: call API to mark `qualifying_session` as `status: "abandoned"` on exit, to prevent unbounded DB growth from orphaned sessions
- [ ] Exit confirmation dialog: warn user before discarding mid-wizard progress (UX decision — depends on whether resume flow is added)

## Auth flow hardening (deferred from v0.4.0.0 adversarial review)

- [x] Sign-out error feedback — resolved in feat/design-overhaul (T15)
- [x] Q5 `data.done === false` case — resolved in feat/design-overhaul (T14: else branch added)
- [x] Stale `sessionId` on Q5 re-answers — resolved in feat/design-overhaul (T13: Back button removed, stale history impossible)

## Hardening (deferred from adversarial review)

- [ ] Clamp `truncateToTurns` in the API route: validate `0 ≤ truncateToTurns ≤ session.turns.length` to prevent negative-slice edge cases
- [ ] Add Zod refinement on `finish_qualifying` tool output (chapters array non-empty, `estimated_minutes` > 0) before inserting to DB
- [ ] Double-submit guard on qualifying wizard: disable form / set in-flight flag so rapid taps can't fire two concurrent requests
- [ ] Orphaned course cleanup: if `chapters.insert` fails after `courses.insert`, roll back or queue a cleanup job
- [x] Stale chips on back-to-Q5 — resolved in feat/design-overhaul (T13: Back button removed)

## Mobile design (deferred from /plan-design-review — feat/design-overhaul)

- [ ] **Mobile navigation**: Bottom tab bar below 1024px (lg), sidebar at lg+. Items: My Courses + Account (sign out). Active state: orange-700. This branch removed the sidebar on mobile with no replacement — ship `feat/mobile-nav` immediately after design overhaul lands.
  - Spec: `AppShell` sidebar `hidden lg:flex`, bottom bar `flex lg:hidden`, 48px height, `role="navigation" aria-label="Mobile navigation"`
  - **Note:** AppShell ships with `hidden md:flex` as a temporary bridge. The mobile-nav PR must change this to `hidden lg:flex` when adding the bottom tab bar, or tablets (768-1023px) will lose navigation.
- [ ] **Mobile chapter chat**: Floating "Ask →" button fixed bottom-right of chapter reading area, visible below lg. Taps open a Shadcn `Sheet` (side=bottom) at 60% viewport height. Swipe down or tap outside to close.
  - Spec: orange-700 button, sheet contains full `ChapterChat` component, `aria-label="Open chapter chat"`
- [ ] **Page cross-fades**: View Transitions API for 150ms opacity transition between routes (DESIGN.md spec). Add `<ViewTransition>` wrapper in `app/layout.tsx`. Degrades gracefully on Safari <18 (instant cut).

## Visual learning (deferred from /autoplan visual-learning review)

- [ ] Revisit AI image generation when per-image cost drops below $0.01 (currently ~$0.04/image with DALL-E 3)
- [ ] Add learner modality preference to qualifying conversation: "Are you more of a visual learner or do you prefer reading?" — use response to weight diagram/callout vs text ratio (v2)
- [ ] Move marker syntax spec to `lib/markers.ts` so `buildChapterPrompt` and `parseCards` share the source of truth — prevents silent prompt/parser drift (v2 refactor)
- [ ] Chapter completion rate baseline: instrument and record before shipping visual upgrade, then re-measure after 10+ chapters to validate impact
- [ ] Evaluate @mermaid-js/parser as server-side validator vs bundling full mermaid on server — check if mermaid.parse() works in Node.js without DOM polyfill
