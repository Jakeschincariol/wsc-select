# Design System — WSC Select

Type, colour and components are **inherited from the Westchester Sporting Club
investor-site DESIGN.md**, so WSC Select reads as the same club. Hero composition
follows explored variant B. The page rides on one persistent aerial-pitch film.

## Inherited from the club (do not diverge)
- **Display:** Playfair Display 500/600/700/800. Sentence case for statements.
- **Body/UI:** Public Sans 400/500/600.
- **Figures/labels:** IBM Plex Mono 400/500, uppercase, 0.16em, tabular-nums.
- **Parchment** `#F5F0E6` ground · tint `#EFE8D8` · **Ink** `#1A211B`
- **Club Green** `#24382E`, deep `#16241D` · **Tan** `#E8D9B4` · muted ink `#64705F`
- **Estate Gold** `#A8842C`, soft `#C1A254` — **consecration only**: the seal, dividing
  rules, key ticks, the one CTA. Never body text, never a background field.
- **Film layer** (content over the pitch): bg `#16241D`, ink parchment, muted `#B9C0B2`.
- **Radius 0 everywhere.** The seal is the only circle.

## The seal
The client's actual artwork, `assets/seal.png` — oak sprig, crossed swords, football,
EST. 2026. Shipped as white-on-transparent and used as a CSS **mask** with
`background-color: currentColor`, so one asset paints in any brand colour.

Provenance worth knowing: the supplied raster is clipped by ~2px on the right and is a
slight ellipse (1259 x 1300). It was cropped to the true ink bbox and normalised to a
circle. If a clean original ever appears, regenerate from it.

## The persistent field
One Seedance 2.5 aerial dusk pitch, `assets/field.mp4`, fixed behind the entire page
at `z-index: 0`; every content layer is explicitly lifted to `z-index: 1`.

- **Forward-only crossfade loop.** Never ping-pong: reversing a drone drift reads as the
  aircraft flying backwards. The tail dissolves into the head over 1.0s and the middle
  plays untouched, so motion is forward at every instant and the loop point measures
  1.07x a normal per-frame delta, i.e. indistinguishable from any other frame step.
- Native speed: every source frame shows exactly once. Slowing it duplicated 35% of
  frames and read as judder. 24fps, 4.08s, 1600px wide, CRF 24, 830KB.
- Audio track stripped. Poster `field-poster.jpg` (33KB).
- Scrims are **element backgrounds, never `::before` at negative z-index.** A background
  paints behind its own element's content by definition, which removes a whole class of
  stacking bug.
- Hero scrim is **raked** (100deg, .93 → .20): heavy behind the type on the left, nearly
  clear over the pitch on the right. Content bands sit at `rgba(22,36,29,.86)`.
- Paused when the tab is hidden, and never played under `prefers-reduced-motion`.

## Layout
Hero is variant B: the seal is the hero at `clamp(150px,17vw,248px)` and sits opposite
the statement in a two-column grid. Container `min(1240px, 100% - gutter*2)`.
Spacing scale 4/8/12/16/24/32/48/64/96/128/160.

## Components
Bar · hero · **two stacked layers** ("Your club" on parchment-tint, "WSC Select" on
**estate gold** and *wider*, because the width difference is what reads as laid-over) ·
**one shared `.row` component** used by both "what is added" and "what it costs" so the
two sections read as the same object — the added rows are native `<details>` (collapsible
with zero JS, keyboard accessible), the cost rows are the static variant · the `$0` ·
five-step run · the **level ladder** (six rungs climbing parchment → tan → gold-soft →
gold → green → green-deep, so the list literally rises) · nomination panel with underlined
fields · closing seal.

## Iconography
**Tactics-board grammar. Two marks, nothing else.**
- `i-run` — a play arrow: a line into a solid triangular head, as drawn on a coach's
  board. Used in every button and as the closed state of an expandable row.
- `i-mark` — the board's "O" player marker. It appears **only** as the open state of an
  expandable row, cross-fading from the arrow.

**No section eyebrows.** The small tracked mono labels above each heading are gone; the
`h2` carries the section on its own. Do not reintroduce them.

Removed, and not to be reintroduced: a glyph repeated across four cards, a tick on every
ledger row next to the word "Covered", a mini seal inside a card, an inline clock in a
paragraph. A repeated icon beside text that already says the thing is filler.

**No decorative micro-elements anywhere.** No dash before a label, no square before a
list item, no trailing rule on a link. These read as vibe-coded scatter.

## Contact
`team@WSC.com`. A phone number is wanted but has not been supplied; do not invent one.

## Hard rules
- The sport is **football (soccer)**. Never American football imagery.
- No invented content: no dollar figures, no ages, no schedules.
- **`.field` is the form-field class. Never reuse it for a layout container.** A collision
  gave six `<p class="field">` elements `position:fixed; inset:0` and they covered the
  entire page. This cost an hour.
- Banned: divider rules used as decoration, pill/chip labels, uppercase display walls,
  outlined secondary buttons, icons in circles, stock photography.

## Decisions log
| Date | Decision | Rationale |
|---|---|---|
| 2026-08-17 | v1 heritage-template and v2 dark-neon both rejected | AI defaults #1 and #2 |
| 2026-08-17 | Adopt the club's own investor-site system | WSC Select must read as the same club, and the brand already exists |
| 2026-08-17 | Variant B composition kept | The seal carries the hero, which is the honest answer to having no player photography |
| 2026-08-17 | Persistent Seedance aerial field | Solves "no imagery" without stock photography. 32.5 credits |
| 2026-08-17 | Scrims are backgrounds, not negative-z pseudo-elements | Removes the stacking-context failure mode entirely |
