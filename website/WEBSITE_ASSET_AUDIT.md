# TrailComand marketing website — image asset audit

**Date:** 2026-10-29
**Scope:** every raster/vector asset in `website/docs/`, `website/public/`, and the
repository image sources that could feed the marketing site (`docs/evidence/`).
**Method:** `identify` for real format/dimensions, then **visual inspection of each
file** (not filename inference). Files were opened and looked at before being
judged. Where a file could not be inspected it is marked as such.

---

## 1. What exists

| File                                      | Format | Dimensions | Size    | Alpha | Intended purpose (as authored)                                     |
| ----------------------------------------- | ------ | ---------- | ------- | ----- | ------------------------------------------------------------------ |
| `website/docs/logoforweb.png`             | PNG    | 735×401    | 102 KB  | yes   | Brand logo, "for web" — compass-in-peak mark + wordmark + tagline   |
| `website/docs/screenshots/home-1440.png`  | PNG    | 1440×~2600 | 651 KB  | no    | Screenshot of **this marketing site** at 1440px                    |
| `website/docs/screenshots/features-1024.png` | PNG | 1024×~2400 | 705 KB | no | Screenshot of **this marketing site** `/features` at 1024px        |
| `website/public/social-card.png`          | PNG    | 1200×630   | 66 KB   | no    | Open Graph / Twitter share card (in use)                           |
| `website/public/icon.svg`                 | SVG    | 32×32      | <1 KB   | yes   | Favicon, matches `TrailMark` in `components/ui/icons.tsx`          |
| `website/public/favicon.ico`              | SVG-in-.ico | 32×32   | <2 KB   | yes   | Legacy favicon fallback                                            |
| `docs/evidence/phase-12-ai-draft-modal.png` | PNG  | 1280×1104  | 146 KB  | no    | Phase 12 evidence: AI traveler-update modal over a disruption page |

**There are no product screenshots in `website/docs/`.** The folder contains a
logo and *screenshots of the marketing site itself*, which cannot be used as
product imagery (a marketing page picturing itself is circular, and the captures
are of an older design).

The only genuine screenshots of the **TrailComand application** live in
`docs/evidence/` at the repository root, outside `website/`. They were captured
for internal phase evidence, not for marketing.

---

## 2. Visual inspection — what each file actually shows

### `website/docs/logoforweb.png` — **suitable (needs a crop)**

610px-wide artwork on a transparent 735×401 canvas: a green mountain silhouette
with a compass rose (N/E/S/W) rising from it, above a serif "Trailcomand"
wordmark with a blue "C", and the strapline "Trekking & Mountain Travel
Operations" (small, partly clipped at the bottom edge).

- **Verdict:** authentic brand asset. The *icon* (peak + compass) is strong and
  should not be replaced. The wordmark is a serif face and a different
  capitalisation ("Trailcomand", not "TrailComand"), the strapline is clipped,
  and there is a large transparent margin.
- **Use:** the mark as a **brand/identity visual only** (e.g. a footer or about-
  page detail). Not usable as a product screenshot, and not dropped into the
  hero — the site's own `TrailMark` SVG is already a clean derivative of it and
  is the correct header/favicon artwork.
- **Needs:** crop to the mark + wordmark (drop the clipped strapline), trim
  margins, and serve a resized copy. Do **not** overwrite the original.

### `website/docs/screenshots/home-1440.png` / `features-1024.png` — **not usable**

Full-page captures of this marketing website at earlier design revisions. They
contain no application UI.

- **Verdict:** not product imagery, misleading as such, and stale. Leave in place
  as historical documentation; do not ship them.

### `docs/evidence/phase-12-ai-draft-modal.png` — **genuine product screenshot, not safe as-is**

1280×1104 capture of the real application: the "AI traveler update" modal over a
disruption detail page, surface says "Draft only — nothing is sent". Behind it:
left sidebar navigation, disruption header, and an impact list naming
"E2E Traveler 1 TC-E2E-20261026", "E2E Traveler 2…", "Tenzing TestGuide … /
lead_guide", and the account "Demo Owner / owner@demo.com".

- **What is fine:** it is a *demo workspace* (`Demo Owner`, `@demo.com`, `E2E`
  test records) and the product copy in it is exactly aligned with the site's
  honest claims ("nothing is sent automatically", "Please review before sending").
- **What is not fine for marketing:** dozens of visible internal identifiers —
  record IDs (`DIS-2026-00…`, `TRP-2026-C…`), test-fixture naming (`E2E`,
  `TC-E2E-20261026`), staff names, an internal email, and a navigation menu of
  modules that are not built/in-scope. It also contains **real but outdated UI**
  from a development build, and tiny 11–12px text that will be illegible when
  scaled into a marketing card.
- **Verdict:** unsuitable for public display unmodified. Any sanitised copy would
  have to blur or replace ~15 distinct strings — that is manufacturing a new
  screenshot, not publishing an existing one, and it would risk misrepresenting
  what the build looks like. **Not used.**

### `website/public/social-card.png` — **in use, good**

Hand-built 1200×630 card: `TrailMark` icon + wordmark, the positioning headline,
the "in development" line, and a "Free pilot · 3 agencies" pill. Consistent with
the site's visual system and claims.

- **Verdict:** keep. It is the OG image every page emits once `NEXT_PUBLIC_SITE_URL`
  is set.

### `website/public/icon.svg` + `favicon.ico` — **in use, good**

Match the `TrailMark` component exactly.

---

## 3. Decision

1. **No authentic, publically-safe product screenshot exists in this repository.**
   The one real application capture is internal evidence with visible test data
   and internal identifiers.
2. Generating a fake dashboard, blurring a screenshot until it "looks fine", or
   repurposing a marketing-site capture as product imagery are all explicitly out
   of bounds.
3. Therefore the product preview stays **hand-built and explicitly labelled as
   illustrative** (real HTML/CSS, fictional demo data, zero image bytes, crisp at
   every width, no risk of exposing customer data or of drifting from the real UI).
   It is the honest option under the evidence available.
4. The logo is used where it adds brand credibility (about page identity strip and
   the footer-adjacent trust area are evaluated in `WEBSITE_AUDIT.md`); the
   existing `TrailMark` SVG remains the canonical mark in the header and favicon.
5. **All originals stay untouched.** No file in `website/docs/` or `docs/evidence/`
   was modified, moved or replaced.

## 4. Recommended owner action (out of scope here — needs a live build)

When Phase 10.7 / the pilot workspace exists with *realistic* sample data:

```bash
# 1. Use a NON-production workspace seeded with a believable, non-E2E trip.
# 2. Confirm no real customer names, emails, phone numbers or IDs are visible.
# 3. Capture at 1600px wide, 2× DPR, cropped to the app viewport (no browser chrome).
# 4. Export WebP at quality ~82 and AVIF, 1600w + 800w variants.
# 5. Drop into website/public/product/ and reference with next/image.
```

Then, and only then, replace the illustrative preview with the real capture and
relabel it "Product preview — development build".

---

## 5. Brand treatment decision — 2026-10-29 (focus + logo pass)

**Reference palette:** `--color-navy #14243A`, `--color-teal #16A6A0`,
`--color-teal-strong #0F817B` (interactive), `--color-teal-ink #0B6F6A` (links).

### 5.1 What the logo actually contains

`website/docs/logoforweb.png` is the **only** brand file in the repository
(searched the whole tree: no SVG/AI/EPS/PDF master exists, and the file is not
tracked in Git). Measured from its 6-colour quantised histogram:

| Element        | Colour                          | vs. theme              |
| -------------- | ------------------------------- | ---------------------- |
| Mountain body  | forest / sage greens (~#5B7F63) | not in theme           |
| Compass ring   | gold/amber (~#BCA06A)           | not in theme           |
| Wordmark "C"   | steel blue (~#4A82C4)           | not in theme           |
| Background     | white                           | matches light surfaces |

The mark (peak + compass rose) and the serif wordmark are functionally fine, but
the artwork is **green + gold + steel blue**, i.e. a different palette family
from the navy/teal interface.

### 5.2 Decision

**The logo is not recoloured.** Recolouring would create a brand variant that no
designer has approved, and the brief explicitly forbids silently recolouring an
official logo or distorting its proportions. Options were:

1. **Recolour to navy/teal** — rejected: invents an unapproved brand variant.
2. **Remove it from the site** — rejected: throws away the only authentic brand
   asset and leaves the About page with no identity anchor.
3. **Documented neutral treatment — chosen.** The artwork is presented as a
   framed brand plate on a white `bg-surface` card with a hairline border and
   the standard card shadow. It reads as a *brand specimen* ("this is the
   artwork we have") rather than as UI chrome competing with the navy/teal
   system, and the caption states plainly that a navy/teal variant is not yet
   signed off and that the header/favicon use the simplified derived mark.

Aspect ratio is preserved: asset is 1000×445, trimmed source 1000×443 → no
distortion. `width`/`height` are declared so layout never shifts, and
`next/image` serves a `w=640` variant (confirmed: 320×142 natural, not broken).

### 5.3 Unchanged and verified

- `docs/logoforweb.png` — **untouched**. Still 735×401, still untracked.
- `public/brand/trailcomand-logo.webp` — derived copy: trimmed of empty
  margins and of the strapline (**"Trusted Mountain Travel Operations"**, an
  unsubstantiated adoption claim), resized to 1000px wide, WebP q86, 44 KB.
- Header/favicon continue to use `TrailMark` / `app/icon.svg` (navy + teal).

### 5.4 Owner action to close this properly

Supply an approved vector master (`logo-navy.svg`) in navy `#14243A` + teal
`#16A6A0` with a stacked and horizontal lockup, plus a single-colour version for
favicon/print. Drop it in `website/public/brand/` and the About plate can be
un-framed and used as primary identity. Until then the current treatment stands.

---

## 6. Focus indicator system — 2026-10-29

A single token-driven ring replaces three ad-hoc colours (`teal-ink`,
`ink-muted`, `white`) that had been applied per component.

| Token                  | Value     | Purpose                       |
| ---------------------- | --------- | ----------------------------- |
| `--color-focus-ring`   | `#16A6A0` | outer accent band             |
| `--color-focus-halo`   | `#FFFFFF` | inner separator band          |

Applied as `outline: 2px teal` + `box-shadow: 0 0 0 2px white`, offset 2px.

**Why two bands:** a teal-only ring measured **1.77:1** on the hero/footer navy
— effectively invisible, and a real WCAG 1.4.11 failure. Raw teal is 6.56:1 on
navy but only 2.86:1 on white, so neither band works alone; at least one clears
3:1 on every surface, and the white band also survives on teal buttons.

**Verified:** 85 keyboard-focused elements across 5 pages produced exactly one
colour combination — `rgb(22,166,160)` outline + white halo — on backgrounds
white, `#F6F8FA`, `#EEF3F6`, navy `#14243A` and buttons.

**Two bugs found and fixed while verifying:**

1. Tailwind's `transition-colors` includes `outline-color`, so the ring faded in
   over 150ms and was invisible at the moment it mattered. Fixed with a
   utilities-layer rule that removes the transition on focus (the ring itself is
   untouched).
2. That fix initially failed because a `@layer components` rule can never beat a
   utilities rule regardless of source order — it had to move to
   `@layer utilities`. Worth remembering.

**Not changed:** no `outline: none` anywhere; the ring is additive and global
(`:focus-visible`), so it also covers links, inputs, summaries and the mobile
menu items that have no explicit class.
