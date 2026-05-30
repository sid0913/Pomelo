# Design System — Pomelo

## Product Context
- **What this is:** AI-native personalized course platform. Maps what a professional already knows, then generates a structured course around the gap.
- **Who it's for:** Domain professionals with a specific adjacent knowledge gap and professional stakes (archetype: bioinformatician who needs molecular biology foundations).
- **Space/industry:** Edtech — deliberately not a MOOC, not an AI chat tool. A new category.
- **Project type:** Web app — qualifying chat → chapter plan → per-chapter learning + quiz + habit loop.
- **Memorable thing:** "Neither the cold MOOC catalog nor the sprawling AI chat. This is how learning was supposed to feel online, but never did."

## Aesthetic Direction
- **Direction:** Scholarly Warmth — the visual language of a brilliant human mentor. Warm earth tones, typographic contrast between serif display and sans body, zero gamification chrome.
- **Decoration level:** Intentional — subtle warmth in surfaces (warm whites vs pure white), no stock photo heroes, no icon grids. Typography and color carry the weight.
- **Mood:** A well-lit desk at the right time of day. Serious work, warmly done. Not a gamified app, not a corporate catalog.
- **Anti-patterns avoided:** No Duolingo-style playfulness, no Coursera-style institutional blue, no AI-slop purple gradients, no 3-column feature grids.

## Typography
- **Display/Chapter titles:** Fraunces (variable, `opsz` 9–144) — warm serif, optical-size aware. No edtech product uses this. Signals intellectual weight without feeling academic or stiff. Use at `h1`/`h2` sizes only, never for body text.
- **Body/UI/Labels:** Outfit — warm geometric sans, approachable, reads well at 14–15px. Slightly larger than typical UI fonts to match the warm, spacious feel.
- **Data/Numbers/Progress:** Geist Mono with `tabular-nums` — precise, clean for chapter counts, streaks, completion percentages.
- **Code examples:** JetBrains Mono
- **Loading:** Google Fonts CDN. Add to `<head>`:
  ```html
  <link href="https://fonts.googleapis.com/css2?family=Fraunces:ital,opsz,wght@0,9..144,300..900;1,9..144,300..900&family=Outfit:wght@300..600&family=Geist+Mono:wght@400;500&display=swap" rel="stylesheet">
  ```
- **CSS variables:**
  ```css
  --font-display: 'Fraunces', Georgia, serif;
  --font-body: 'Outfit', system-ui, sans-serif;
  --font-data: 'Geist Mono', monospace;
  --font-code: 'JetBrains Mono', monospace;
  ```
- **Scale:**
  | Role | Size | Weight | Line-height |
  |------|------|--------|-------------|
  | Hero | 48–52px | 700 | 1.1 |
  | Chapter title | 32px | 600 | 1.2 |
  | Course name | 22px | 600 italic | 1.3 |
  | Section heading | 18px | 600 | 1.3 |
  | Body copy | 16px | 400 | 1.75 |
  | UI label | 14–15px | 400–500 | 1.5 |
  | Caption/meta | 13px | 400 | 1.5 |
  | Overline | 11px | 600 uppercase | — |

## Color
- **Approach:** Restrained — one brand accent, warm neutrals, amber reserved for AI presence only.
- **Background:** `#FAFAF9` (stone-50) — warm off-white, easy on the eyes during extended reading.
- **Surface:** `#FFFFFF`
- **Surface warm:** `#FFFDF5` — for cards and panels, slightly warmer than pure white.
- **Surface raised:** `#F5F4EF` — hover states, secondary sections.
- **Text primary:** `#1C1917` (stone-900)
- **Text secondary:** `#57534E` (stone-600)
- **Text muted:** `#78716C` (stone-500)
- **Text light:** `#A8A29E` (stone-400) — placeholders, disabled states.
- **Brand/Action:** `#C2410C` (orange-700) — scholarly terracotta. Buttons, active states, selected options, progress bars. Not amber — amber is for AI only.
- **Brand hover:** `#9A3412` (orange-800)
- **Brand light:** `#FEF3EC` — selected option backgrounds, badge fills.
- **AI presence/streaming:** `#D97706` (amber-600) — streaming cursor blink, verb shimmer gradient, any "AI is thinking" state. This color = AI. Do not use it for non-AI UI elements.
- **Border:** `#E7E5E4` (stone-200)
- **Border light:** `#F5F4EF` (stone-100)
- **Success:** `#15803D` (green-700) / light: `#F2FAF5`
- **Error:** `#DC2626` (red-600) / light: `#FEF5F5`
- **Dark mode:** None. Light-only product.
- **Exception — qualifying chat screen only:** Background `#1A1410` (Warm Ember), with a centered light card (`#FFFDF5`) floating on it. This is a deliberate one-screen contrast: the intake feels like stepping into a focused consultation room. All other screens stay light.

## Spacing
- **Base unit:** 8px
- **Density:** Comfortable — reading-optimized, not the tight density of a dashboard tool.
- **Scale:**
  | Token | Value |
  |-------|-------|
  | 2xs | 2px |
  | xs | 4px |
  | sm | 8px |
  | md | 16px |
  | lg | 24px |
  | xl | 32px |
  | 2xl | 48px |
  | 3xl | 64px |

## Layout
- **Approach:** Hybrid — grid-disciplined for the course dashboard, editorial breathing room for the landing page.
- **Chapter reading:** Single-column, max-width `680px`, `line-height: 1.75`. Optimal reading line length for sustained study.
- **Dashboard:** 2–3 column grid, max-width `1200px`.
- **Grid:** 12-column, 24px gutters on desktop, 16px on mobile.
- **Border radius:**
  | Token | Value |
  |-------|-------|
  | sm | 4px |
  | md | 8px |
  | lg | 12px |
  | xl | 14px |
  | full | 9999px |

## Component Library
- **Shadcn/ui + Tailwind.** Not MUI, not Mantine.
- Shadcn copies component source into the repo via CLI — you own every file, every component inherits your Tailwind design tokens. Radix UI primitives handle accessibility. No version conflicts, no fighting against a library's visual defaults.
- Install components: `npx shadcn@latest add <component>`

## Qualifying Chat — Special Treatment
The 5-question intake is the most important UX moment in the product. It gets its own visual vocabulary:

- **Background:** `#1A1410` (Warm Ember) — full-screen dark.
- **Widget:** Centered light card (`#FFFDF5`), `border-radius: 14px`, large shadow (`0 20px 60px rgba(0,0,0,0.55)`).
- **Question text:** Fraunces 19–22px, `#1C1917` — reads like a thoughtful question from a person, not a form field.
- **Answer options:** Lettered A–D with monospace badges. Selected state: `#FEF3EC` background, `#C2410C` badge, `#9A3412` text. Unselected: `#F5F4EF` badge, `#57534E` text.
- **"Type your own" option:** Below a hairline divider, `↩` badge with dashed border, Fraunces italic `#A8A29E`. Keyboard accessible, opens a textarea inline.
- **Navigation hint:** `↑ ↓  navigate  ·  ↵  select` in Geist Mono 11px, `#C9BFB5`, bottom-left of card.
- **Verb shimmer:** Logo in amber (`#D97706`). Below the card: "Pomelo is [shimmer]..." — gradient animates from muted to amber and back. This is the moment the AI feels alive. Preserve it in all future iterations.
- **Transition:** Cross-fade into this screen (250ms ease-in-out) from the light landing experience.
- **Max 5 questions.** Beyond 7 users reported feeling it was too long.

## Motion
- **Approach:** Intentional — only transitions that carry meaning or signal AI presence.
- **Easing:** enter `ease-out` / exit `ease-in` / move `ease-in-out`
- **Duration scale:**
  | Name | Range | Use |
  |------|-------|-----|
  | micro | 50–100ms | hover states, focus rings |
  | short | 150–250ms | page cross-fades, modals |
  | medium | 250–400ms | qualifying chat entrance |
  | long | 400–700ms | chapter reveal stagger |

- **Keep exactly — these are load-bearing:**
  - **Verb shimmer** (`verbShimmer` keyframe): AI "thinking" state. Gradient sweeps amber across muted text. Do not replace with a spinner.
  - **Chapter reveal stagger** (`slideIn` 0.3s ease-out, 60ms delay per card): Course plan landing after qualifying.
  - **Streaming cursor** (amber `#D97706` blink, 1.2s step-end): Live chapter generation. The cursor IS the amber — do not change the color.
- **Add:**
  - Qualifying chat entrance: `opacity 0→1` + subtle `translateY(4px→0)` over 250ms.
  - Page cross-fades: 150ms opacity transition between routes.

## Alerts & Notifications
Alerts should read like a mentor's note, not a system notification. Fraunces italic on the key phrase, warm tint backgrounds, no alarm icons.

- **Success:** `#F2FAF5` bg / `#1A5C36` text / `rgba(21,128,61,0.12)` border. Copy: *"Chapter done"* — well done, that's real progress.
- **Gentle nudge (daily goal):** `#FEF8EE` bg / `#7A4A0A` text / `rgba(194,65,12,0.12)` border. Copy: *"One chapter"* away from your goal today — whenever you're ready. No alarm icon.
- **Error:** `#FEF5F5` bg / `#991B1B` text / `rgba(220,38,38,0.10)` border. Copy: *"Link expired"* — request a new one and you'll be right back.
- **Info:** `#F5F4EF` bg / `#57534E` text / `#E7E5E4` border. Neutral warm, not blue.

## Decisions Log
| Date | Decision | Rationale |
|------|----------|-----------|
| 2026-05-28 | Fraunces display + Outfit body | No edtech product uses Fraunces. Signals intellectual weight without academia. Outfit is warmer and more approachable than Instrument Sans at UI sizes. |
| 2026-05-28 | Scholarly orange `#C2410C` as brand | Edtech converges on blue or green. Terracotta reads as warm and confident — chalk dust and margin notes. Pairs naturally with the stone palette. |
| 2026-05-28 | Qualifying chat: dark bg + light card | The 5-question intake is the product's most important moment. Dark treatment makes it feel like stepping into a consultation room, not filling out a form. |
| 2026-05-28 | Arrow-key navigable options in qualifying chat | Like Claude Code's option picker — structured choices (A–D) reduce cognitive load, with "↩ type your own" as the open-ended fallback. Max 5 questions. |
| 2026-05-28 | Shadcn/ui over Mantine/MUI | Shadcn copies source into the repo — full control, no visual DNA imported from another product. Every component inherits Tailwind tokens. |
| 2026-05-28 | No dark mode | Light-only product. The qualifying chat's dark bg is a deliberate single-screen exception, not a mode. Simplifies the design system. |
| 2026-05-28 | Amber `#D97706` = AI presence only | The streaming cursor, verb shimmer, and loading states all use amber. It becomes a learned signal: amber means the AI is working. Reserve it for this role. |
