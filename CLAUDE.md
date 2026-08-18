# WSC Select

Static single-page site. No framework, no build step, no npm.

```bash
python3 -m http.server 4780 --directory "$HOME/Claude Code/wsc-select"
```

- `index.html` — the site
- `DESIGN.md` — the design system. Read it before any visual change; it is law.
- `tools/getfont.sh` — pulls any Google Fonts or Fontshare family into self-hosted woff2

## The rules most easily broken here

1. **Estate gold is consecration only**: the seal, the one CTA, the accordion marks,
   the active-nav indicator, the band-change rule. Never body text, never a field.
2. **No decorative micro-elements.** No dash before a label, no square before a list
   item, no trailing rule on a link, no glyph repeated across sibling items.
3. **Two marks only**, both tactics-board notation: the play arrow (`i-run`) and the
   "O" player marker (`i-mark`, open state of an expandable row only).
4. **No section eyebrows.** The `h2` carries the section.
5. **Every animated element's CSS default is its finished state**, so "no JS" and
   "finished" render identically. Never write a rule that hides content by default.
6. **No invented content.** No dollar figures, no ages, no schedules, no phone number.

Banned: pill and chip labels, uppercase display walls, outlined secondary buttons,
icons inside circles, decorative gradients, stock photography.

## Gotchas
- **`.field` is the form-field class.** Never reuse it for a layout container. The
  background film is `.filmbed`. A collision once gave six form `<p class="field">`
  elements `position:fixed; inset:0` and they covered the entire page.
- Scrims are element **backgrounds**, never `::before` at negative z-index. The film
  sits at `z-index:0`; `main`, `.band`, `.hero` and `.foot` are lifted to `z-index:1`.
- `body` must have **no background**: an opaque body paints straight over the film.
- **Editing CSS with regex has bitten twice.** Removing a rule by pattern ate the
  neighbouring line break and welded two selectors into a descendant selector that
  silently never matched. After any scripted CSS edit, grep that the rules you expect
  still exist at the start of a line.
- **`python3 -m http.server` sends no `Cache-Control`**, only `Last-Modified`, so a
  browser will happily serve a stale `styles.css` for minutes while you iterate and
  the change looks like it did not apply. Run `tools/stamp.sh` after any CSS/JS edit;
  it bumps the `?v=` on both links in `index.html`.
- The Claude Browser pane runs hidden: it pauses video, freezes transitions and
  mis-composites. Verify with `~/.claude/skills/gstack/browse/dist/browse` using
  `viewport 1440x900` + `screenshot --viewport`. A full-page capture resizes the
  viewport and breaks `100svh` centring, which looks like a bug and is not one.
