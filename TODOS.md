# TODOs

## Test coverage

- [ ] Integration tests for `app/api/qualifying-chat/route.ts` — requires MSW or a real Supabase test instance; skipped in v0.2.0 due to infra cost
- [ ] Integration tests for `app/(app)/courses/new/page.tsx` qualifying wizard — multi-step state machine needs MSW to mock `/api/qualifying-chat`; current coverage ~55%, below 60% gate

## Hardening (deferred from adversarial review)

- [ ] Clamp `truncateToTurns` in the API route: validate `0 ≤ truncateToTurns ≤ session.turns.length` to prevent negative-slice edge cases
- [ ] Add Zod refinement on `finish_qualifying` tool output (chapters array non-empty, `estimated_minutes` > 0) before inserting to DB
- [ ] Double-submit guard on qualifying wizard: disable form / set in-flight flag so rapid taps can't fire two concurrent requests
- [ ] Orphaned course cleanup: if `chapters.insert` fails after `courses.insert`, roll back or queue a cleanup job
- [ ] Stale chips on back-to-Q5: when user navigates back to Q5 via back button, existing chips reflect old session state — decide whether to clear or restore
