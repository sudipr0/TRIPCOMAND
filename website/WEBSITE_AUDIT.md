# TrailComand marketing website — audit (Phase M1)

**Date:** 2026-10-29
**Audited:** local `website/` on branch `main` @ `4dfd31f`, and live
`https://website-lac-six-89.vercel.app/`
**Product phase context:** Phase 13 (Public Marketing Website). Phase 10.7
(Pilot Readiness) is **not started** — this matters for several claims below.

---

## 1. What was inspected

| Area | Method |
| --- | --- |
| Repo state | `git rev-parse --show-toplevel`, `git status --short`, `git log`, `git show --stat 4dfd31f` |
| Workspace | `pnpm-workspace.yaml`, root `package.json`, `website/package.json`, `pnpm-lock.yaml` |
| Routes | All five pages + `not-found.tsx`, `robots.ts`, `sitemap.ts`, `icon.svg` |
| Config | `next.config.ts`, `.env.example`, `lib/site-config.ts`, `lib/page-metadata.ts` |
| Content | `lib/content.ts` (single source of copy + capability statuses) |
| Live site | Fetched `/`, `/robots.txt`, `/sitemap.xml`, `<head>` of `/` |
| External links | DNS + HTTPS reachability for every external href |
| Product truth | `AUDIT_AND_ROADMAP.md` §6.1/§6.2 (phase accounting), backend routes |

---

## 2. Existing strengths (preserve these)

1. **Honest capability labelling.** Three explicit statuses
   (`Available in development build` / `In development` / `Planned`), rendered as
   text + dot, never colour alone.
2. **Truly static, server-rendered.** All routes prerender; content is in the
   initial HTML, so crawlers and social unfurlers get real markup.
3. **Accessible by construction.** Skip link, landmarks, focus-visible rings,
   `aria-live` error summary, `<details>` FAQ (works without JS),
   reduced-motion handling.
4. **Truthful contact form.** Success is shown only on a real `2xx`; missing
   config falls back to `mailto` and *says so* rather than faking a send.
5. **No invented social proof.** No logos, testimonials, ratings, counts.
6. **Clean dependency surface.** No UI kit, no animation library, no analytics;
   seven hand-rolled SVG icons.
7. **Small, readable codebase** with copy isolated in `lib/content.ts`.
8. **Design tokens** are real tokens (Tailwind v4 `@theme`), not ad-hoc classes.

---

## 3. Critical issues

| # | Issue | Evidence | Why it matters |
| --- | --- | --- | --- |
| C1 | **Login goes to a domain that does not exist.** | `curl https://app.trailcomand.com/login` fails to resolve; `getent hosts` returns nothing. `example.com` returns 200, so DNS works. | Every header, mobile menu, hero and footer links here. This is the most visible broken link on the site and it actively damages credibility. |
| C2 | **`hello@trailcomand.com` is presented as a contact method but the domain has no DNS record.** | `getent hosts trailcomand.com` → nothing; no MX. | Two surfaces tell visitors to email an address that cannot receive mail. This is worse than showing no address. |
| C3 | **Production canonical/OG/sitemap are all switched off.** | Live `/robots.txt` has no `Sitemap:`; live `/sitemap.xml` is empty; live `<head>` has no `canonical`, `og:url` or `og:image`. | `NEXT_PUBLIC_SITE_URL` is unset in the Vercel project. The site is indexable but gives search engines no canonical and gives social platforms no card. |
| C4 | **FAQ overstates pilot maturity.** | Answer says the workflows "are used with real trips during the pilot". `AUDIT_AND_ROADMAP.md` §6.1: Phase 10.7 Pilot Readiness is **Not started**, and its own scope is "two pilot agencies". | This is a factual claim about customers that the evidence contradicts. Must be corrected. |

---

## 4. High-impact improvements

| # | Issue | Fix |
| --- | --- | --- |
| H1 | Hero leads with jargon; a first-time visitor cannot tell who it is for or what to do in 5 seconds. | Keep the H1 verbatim, add a plain-English "who it's for / what it does" line, and make the secondary CTA a real in-page jump to the preview. |
| H2 | Preview shows the *result* but not the four-step workflow the brief asks to make legible. | Restructure the mockup around: record → review impact → assign tasks → draft update, with a numbered step strip. |
| H3 | Contact form lacks qualifying fields (agency website, trip scale, main challenge) and has no consent acknowledgement. | Add optional website + operational scale, relabel message as the operational challenge, add a privacy acknowledgement checkbox. |
| H4 | Nav has no "Login" alternative that works. | Replace dead Login with a development-stage CTA until the app is deployed. |
| H5 | No privacy/terms pages, but a privacy note is inline. | Add accurate `/privacy` and `/terms` pages reflecting actual data practice, then link them. |
| H6 | Pricing page uses "£0" which implies a GBP commercial model that has not been set. | Replace with "No fee" wording; avoid inventing currency. |
| H7 | Preview is `aria-hidden` in full, so screen-reader users get only the caption. | Expose the four-step workflow as real text; keep only the decorative chrome hidden. |

---

## 5. Product claims requiring verification

| Claim on site | Status | Action |
| --- | --- | --- |
| "Core workflows are used with real trips during the pilot" (FAQ) | **Unsupported** — Phase 10.7 not started | Reword to development status |
| "3-month pilot for 3 trekking agencies" | Owner intention, restated in the brief | Keep, but frame as "proposed/available on request", not a guaranteed entitlement |
| "Commercial pricing discussed after the pilot" | Owner intention | Keep (it promises nothing) |
| Feature statuses | Set from reading backend modules in Phase 13 | Re-verified this pass, see §7 |
| `hello@trailcomand.com` | **Not real** (no DNS/MX) | Replace with the contact form as the only channel |
| `app.trailcomand.com/login` | **Not deployed** | Remove until verified live |
| "Designed for trekking and adventure travel operations" | Marketing positioning | Fine, it is a statement of intent, not a claim |

---

## 6. Broken or unverified external links

| Link | Where | Result |
| --- | --- | --- |
| `https://app.trailcomand.com/login` | Header, hero, mobile menu, footer | **NXDOMAIN — dead** |
| `mailto:hello@trailcomand.com` | Contact page, footer | **Domain has no DNS/MX — dead** |
| All internal routes | Nav, footer, CTAs, 404 | OK (200) |
| `/favicon.ico`, `/icon.svg`, `/social-card.png` | Head / manifest | OK (200) |

---

## 7. Feature-status re-verification (this pass)

Checked against backend modules and `AUDIT_AND_ROADMAP.md`:

| Capability | Claimed status | Evidence | Verdict |
| --- | --- | --- | --- |
| Disruption recording + impact assessment | Available in development build | `backend/src/modules/disruption/*`; models `Disruption`, `ImpactAssessment` | Correct |
| Trip timeline / itinerary visibility | Available in development build | `trip` module, `ItineraryDay`, day status (Phase 10.5 done) | Correct |
| Recovery plans + tasks | Available in development build | `RecoveryPlan`, `RecoveryTask`, approve route | Correct |
| Supplier context | Available in development build | `supplier`, `SupplierBooking` | Correct |
| Traveler portal | **In development** | Surface 4 marked complete, but PWA/offline polish is Phase 19 | Correct (portal exists; framing as in-development is conservative and honest) |
| Offline field access | In development | Phase 19 explicitly pending | Correct |
| AI-assisted drafting | In development | Phase 12 done, but model config caveat in `PHASE_12_EVIDENCE_REPORT.md` §7 | Correct |
| Automatic supplier booking / messaging | Not claimed | No such integration exists | Correct |

No status changes required.

---

## 8. Lower-priority observations

- `website/VERCEL_DEPLOYMENT_FIX_REPORT.md` is a one-off ops report sitting in
  the app root; it is useful history but not product documentation.
- `public/favicon.ico` is an SVG under an `.ico` name (works in modern browsers).
- Copy repeats "in development" often. Some repetition is warranted for honesty;
  the homepage can consolidate it into one clearly placed status line.
- Hero animation is a single 480ms rise; acceptable, but the secondary content
  should never be gated behind it.

---

## 9. Recommended implementation order

1. **C1/C2 — remove dead destinations** (Login, mail address). Highest impact,
   lowest risk.
2. **C4/H1 — correct the pilot claim and rewrite the hero's supporting line.**
3. **H2/H7 — rebuild the preview around the four workflow steps** with real text
   exposed to assistive tech.
4. **H3 — extend the contact form** with qualifying fields and consent.
5. **H5 — add accurate `/privacy` and `/terms`**, link them in the footer.
6. **C3 — wire `NEXT_PUBLIC_SITE_URL`**, then verify canonical/sitemap/OG live.
7. **H6 — remove the `£0` currency artefact** on pricing.
8. Re-run audit passes: axe, Lighthouse, responsive sweep, link check.

---

## 10. Out of scope for this pass

- Any backend/API change (Phase 14 is the proper home for lead capture).
- A custom domain or any paid service.
- Claiming the core product is deployed.
- Marking Phase 10.7 or any product phase complete.

---

## 11. Pass 2 — 2026-10-29 (premium redesign + image integration)

**Branch state at start of pass:** working tree already dirty with in-progress
backend changes (membership/permissions/AI modules) and earlier website work
(legal pages, contact form). **None of those were reverted, staged or edited.**

### 11.1 New findings this pass

| #   | Finding                                                                                                                                                                                                 | Severity |
| --- | ------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------- | -------- |
| C5  | **The contact page is a dead end in production.** With no `NEXT_PUBLIC_CONTACT_FORM_ENDPOINT` and no `NEXT_PUBLIC_CONTACT_EMAIL`, `/contact` renders "Online enquiries are not open yet." The site's only CTA — on every page — leads here. | Critical (conversion) |
| C6  | **`website/public/social-card.png` and the OG pipeline are switched off live**: `NEXT_PUBLIC_SITE_URL` is unset in the Vercel project, so live `/sitemap.xml` is empty, `robots.txt` has no `Sitemap:` line and no page emits `rel=canonical`. | High (SEO) |
| C7  | **The favicon still uses the retired forest-green palette** (`#1F5A43`) while the site moves to Midnight Navy — tab icon and header mark had already drifted. | Medium |
| H8  | **Status panel said workflows "are exercised during the pilot"**, contradicting the corrected "no pilot running yet" position. | High (claims) |
| H9  | **Preview legend was invisible.** The four-step legend under the hero preview used light-surface text tokens (`text-ink-subtle`, `text-ink-muted`) on the navy band, plus 10px micro-type inside the panel that was illegible at 1440px. | High (design) |
| H10 | **`app/icon.svg` and `TrailMark` disagreed** after the palette change; both are now navy + Alpine Teal. | Low |
| M1  | No structured data at all (no Organization/WebSite/FAQPage). | Medium (SEO) |
| M2  | `site.vercelUrl` recorded the old host, which now 307-redirects. | Low |
| M3  | Pricing said "Development pilot" with no statement of whether a pilot is running. | Medium (claims) |

### 11.2 What changed

- **Design system** (`app/globals.css`): Midnight Navy `#14243A`, Alpine Teal
  `#16A6A0`, cool light neutrals. Manrope (headings, `--font-display`) + Inter
  (body), loaded via `next/font/google` — self-hosted at build time, no
  third-party request. Teal used as a **button background** is `#0F817B`
  (`teal-strong`) because raw teal is 3.00:1 against white; `teal-ink` `#0B6F6A`
  carries links (5.64:1). Contrast was computed, not eyeballed.
- **Header**: navy mark + Manrope wordmark, teal underline on the active item,
  calm "App in development" chip, mobile menu nav now fixed (a missing `</Link>`
  was closing the list item early).
- **Hero**: navy band, H1 kept verbatim, tagline "When plans change, stay in
  command." as the support line, then one plain-English sentence, primary CTA,
  in-page preview jump, and three concrete capability chips.
- **Preview**: legible body sizes, navy eyebrow banner, step legend recoloured
  for the dark band, un-truncated trip title, doc comment now explains *why* it
  is built in markup (see `WEBSITE_ASSET_AUDIT.md`).
- **Footer**: navy, with an explicit line distinguishing this website from the
  private application.
- Closed `H8`–`H10`, `M1`–`M3` above.

### 11.3 Still open after this pass (owner action required)

1. **C5** — configure a form endpoint or a monitored mailbox. Until then the
   page is honest but cannot convert. This is the single highest-value fix left
   and it is a credentials/DNS decision, not a code change.
2. **C6** — set `NEXT_PUBLIC_SITE_URL=https://trailcomand.vercel.app` in the
   Vercel project and redeploy.
3. **Custom domain** — `trailcomand.com` still has no DNS record; nothing on the
   site depends on it, but `hello@trailcomand.com` remains unusable until it
   does.
4. **Brand artwork palette** — `logoforweb.png` is forest green; the site is
   navy/teal. The mark itself is reused unchanged and the wordmark is untouched;
   a recoloured brand file needs designer sign-off (see asset audit §4).
5. **Real product screenshot** — none is publikable yet (asset audit §3).
