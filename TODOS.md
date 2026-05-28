# TODOs

## Test coverage

- [ ] Integration tests for `app/api/qualifying-chat/route.ts` — requires MSW or a real Supabase test instance; skipped in v0.2.0 due to infra cost
- [ ] Integration tests for `app/(app)/courses/new/page.tsx` qualifying wizard — multi-step state machine needs MSW to mock `/api/qualifying-chat`; current coverage ~55%, below 60% gate

## Exit button hardening (deferred from v0.2.1 adversarial review)

- [ ] AbortController: cancel in-flight `/api/qualifying-chat` fetch when user clicks Exit, to prevent stale fetch callbacks from running after navigation
- [ ] Server-side session cleanup: call API to mark `qualifying_session` as `status: "abandoned"` on exit, to prevent unbounded DB growth from orphaned sessions
- [ ] Exit confirmation dialog: warn user before discarding mid-wizard progress (UX decision — depends on whether resume flow is added)

## Auth flow hardening (deferred from v0.4.0.0 adversarial review)

- [ ] Sign-out error feedback: `SignOutButton.handleSignOut` ignores `{error}` returned by `supabase.auth.signOut()` — add error check and show inline error text if signOut fails
- [ ] Q5 `data.done === false` case: `handleContinue` in qualifying wizard has no `else` branch when the API returns `done: false` — UI freezes in "loading" phase with no recovery path
- [ ] Stale `sessionId` on Q5 re-answers: the Q5 final submission does not pass `truncateToTurns`, so if the user edited a prior answer the course is generated from inconsistent conversation history

## Hardening (deferred from adversarial review)

- [ ] Clamp `truncateToTurns` in the API route: validate `0 ≤ truncateToTurns ≤ session.turns.length` to prevent negative-slice edge cases
- [ ] Add Zod refinement on `finish_qualifying` tool output (chapters array non-empty, `estimated_minutes` > 0) before inserting to DB
- [ ] Double-submit guard on qualifying wizard: disable form / set in-flight flag so rapid taps can't fire two concurrent requests
- [ ] Orphaned course cleanup: if `chapters.insert` fails after `courses.insert`, roll back or queue a cleanup job
- [ ] Stale chips on back-to-Q5: when user navigates back to Q5 via back button, existing chips reflect old session state — decide whether to clear or restore

## Visual learning (deferred from /autoplan visual-learning review)

- [ ] Revisit AI image generation when per-image cost drops below $0.01 (currently ~$0.04/image with DALL-E 3)
- [ ] Add learner modality preference to qualifying conversation: "Are you more of a visual learner or do you prefer reading?" — use response to weight diagram/callout vs text ratio (v2)
- [ ] Move marker syntax spec to `lib/markers.ts` so `buildChapterPrompt` and `parseCards` share the source of truth — prevents silent prompt/parser drift (v2 refactor)
- [ ] Chapter completion rate baseline: instrument and record before shipping visual upgrade, then re-measure after 10+ chapters to validate impact
- [ ] Evaluate @mermaid-js/parser as server-side validator vs bundling full mermaid on server — check if mermaid.parse() works in Node.js without DOM polyfill
