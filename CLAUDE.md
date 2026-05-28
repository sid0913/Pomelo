# Pomelo

AI-native personalized course platform. Next.js (App Router) + Supabase + Claude API.

## Skill routing

When the user's request matches an available skill, invoke it via the Skill tool. When in doubt, invoke the skill.

Key routing rules:
- Product ideas/brainstorming → invoke /office-hours
- Strategy/scope → invoke /plan-ceo-review
- Architecture → invoke /plan-eng-review
- Design system/plan review → invoke /design-consultation or /plan-design-review
- Full review pipeline → invoke /autoplan
- Bugs/errors → invoke /investigate
- QA/testing site behavior → invoke /qa or /qa-only
- Code review/diff check → invoke /review
- Visual polish → invoke /design-review
- Ship/deploy/PR → invoke /ship or /land-and-deploy
- Save progress → invoke /context-save
- Resume context → invoke /context-restore

## Design System
Always read DESIGN.md before making any visual or UI decisions.
All font choices, colors, spacing, and aesthetic direction are defined there.
Do not deviate without explicit user approval.
In QA mode, flag any code that doesn't match DESIGN.md.

Key rules at a glance:
- Fonts: Fraunces (display/headings) + Outfit (body/UI) + Geist Mono (data)
- Brand color: #C2410C (scholarly orange) — buttons, active states, progress
- Amber #D97706 = AI presence only (streaming cursor, verb shimmer, loading states)
- Background: #FAFAF9 — light-only, no dark mode
- Qualifying chat exception: full-screen #1A1410 bg with centered #FFFDF5 card
- Component library: Shadcn/ui + Tailwind (not MUI, not Mantine)
