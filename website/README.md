# TrailComand — public marketing website

The public marketing site for **TrailComand**, a travel operations and
disruption-recovery platform for trekking and adventure travel agencies.

This is a **separate application** from the main TrailComand product. Nothing
here imports from, or modifies, the backend, database, or frontend in the
repository root. The only shared thing is the pnpm workspace, which is why the
site can resolve `next` and `react` from the root `node_modules`.

- **Stack:** Next.js 16 (App Router, Cache Components), React 19, TypeScript,
  Tailwind CSS v4, Geist via `next/font`.
- **Runtime:** Node.js **>= 20** (matches the repo's `engines` field).
- **Package manager:** **pnpm** (the repository root uses `pnpm@9.0.0`).
- **Pages:** `/`, `/features`, `/pricing`, `/about`, `/contact` + a branded 404.

---

## 1. Quick start

```bash
cd ~/Sudipro/Client/TRIPCHANGE/website

pnpm install          # or: pnpm install --include-workspace-root=false
pnpm dev              # http://localhost:3000
```

Production:

```bash
pnpm build
pnpm start            # serves the production build on :3000
```

Checks:

```bash
pnpm typecheck        # tsc --noEmit
pnpm lint             # eslint .
pnpm format:check     # prettier --check
```

There is no test suite: this is a static marketing site with no business logic
worth unit-testing. The interactive parts (mobile menu, contact form) are
verified in a real browser — see §7.

> **Note on the workspace.** `website/` was added to `pnpm-workspace.yaml` so
> that `pnpm --filter website ...` works from the repo root. Next and React are
> installed at the workspace root so the site can be built in place; the root
> `package.json` scripts are unchanged and still build/test the main product
> only.

---

## 2. Configuration

All settings are **public** (`NEXT_PUBLIC_*`) and inlined at **build time**.
Copy `.env.example` to `.env.local` for local work, and set the same variables in
your hosting provider.

| Variable                            | Required                      | Effect when unset                                                                                                 |
| ----------------------------------- | ----------------------------- | ----------------------------------------------------------------------------------------------------------------- |
| `NEXT_PUBLIC_SITE_URL`              | For production                | No canonical tags, no absolute `og:url`/`og:image`, `/sitemap.xml` is empty, `robots.txt` omits the sitemap line. |
| `NEXT_PUBLIC_LOGIN_URL`             | No                            | Defaults to `https://app.trailcomand.com/login`.                                                                  |
| `NEXT_PUBLIC_CONTACT_FORM_ENDPOINT` | For the form to actually send | The contact form falls back to `mailto:` and says so.                                                             |
| `NEXT_PUBLIC_CONTACT_EMAIL`         | No                            | Defaults to `hello@trailcomand.com`.                                                                              |

### Why `NEXT_PUBLIC_SITE_URL` matters

A correct canonical URL and a valid sitemap both require an absolute origin. No
domain is invented in code. Set this once the real domain is confirmed, at build
time:

```bash
NEXT_PUBLIC_SITE_URL=https://trailcomand.com pnpm build
```

Then `/sitemap.xml` lists all five routes and each page emits
`<link rel="canonical">` plus absolute Open Graph and Twitter tags pointing at
`/social-card.png`.

---

## 3. Contact form — two delivery modes

The form validates on the client in both modes (required fields, email shape,
minimum message length), shows a focusable error summary, and links each error
back to its field.

### Mode A — form service (preferred)

1. Create a form at [Formspree](https://formspree.io) (or any CORS-enabled form
   service that accepts a JSON `POST`).
2. Set:

   ```bash
   NEXT_PUBLIC_CONTACT_FORM_ENDPOINT=https://formspree.io/f/xxxxxxxx
   ```

3. Rebuild. The endpoint is a **public form id, not a secret** — that is why it
   is safe in the browser bundle. Do not put SMTP credentials or API tokens here.

The form `POST`s JSON with `name`, `agency`, `email`, `message`, a `_subject`
line and a `source` field. The success screen appears **only** on a `2xx`
response. A non-`2xx` response or a network failure shows an error and keeps the
typed values, with a direct email link as a fallback.

### Mode B — mailto fallback (default)

With no endpoint configured, submitting opens the visitor's own mail client with
the enquiry pre-filled. The page states plainly that **nothing is sent until you
press send in your email app**, and points at the privacy note. This is
deliberately not presented as a success state.

### Privacy note

The contact page states what the details are used for, that they are not sold or
added to a marketing list, and that they can be deleted on request. It does not
claim any certification or compliance regime.

---

## 4. Going live

1. Point DNS at the host.
2. Set `NEXT_PUBLIC_SITE_URL` to the real `https://` origin **before building**.
3. Set `NEXT_PUBLIC_CONTACT_FORM_ENDPOINT` and verify a real submission arrives.
4. Confirm `https://app.trailcomand.com/login` is live, or override
   `NEXT_PUBLIC_LOGIN_URL` until it is.
5. Confirm `NEXT_PUBLIC_CONTACT_EMAIL` is a monitored mailbox.
6. Verify after deploy:
   - `/robots.txt` references the sitemap
   - `/sitemap.xml` returns the five URLs with your domain
   - `/no-such-route` renders the branded 404 (it returns HTTP **404**)
   - a test enquiry arrives

Deployment target is not fixed by this repo. Vercel, Netlify or any Node host
that runs `next build` + `next start` works; add `website/` as the project root
with `pnpm install && pnpm build`.

---

## 5. Structure

```
website/
├── app/
│   ├── layout.tsx            Root layout: fonts, metadata, header/footer, skip link
│   ├── page.tsx              Home
│   ├── globals.css           Design tokens + base layer
│   ├── icon.svg              Favicon (same artwork as the header brand mark)
│   ├── robots.ts             robots.txt (sitemap only when origin configured)
│   ├── sitemap.ts            sitemap.xml (empty until origin configured)
│   ├── not-found.tsx         Branded 404
│   ├── features/page.tsx
│   ├── pricing/page.tsx
│   ├── about/page.tsx
│   └── contact/page.tsx
├── components/
│   ├── site-header.tsx       Sticky header + accessible mobile menu (client)
│   ├── site-footer.tsx
│   ├── hero-section.tsx
│   ├── dashboard-preview.tsx HTML/CSS product mockup (illustrative, labelled)
│   ├── section-heading.tsx
│   ├── feature-card.tsx
│   ├── pilot-cta.tsx
│   ├── workflow-illustration.tsx
│   ├── contact-form.tsx      Client component: validation + delivery modes
│   ├── home/faq.tsx          <details> accordion, no JS
│   ├── home/workflow.tsx
│   └── ui/                   button, icons, status-badge, pilot-inline
├── lib/
│   ├── site-config.ts        Routes, nav, env parsing, login URL
│   ├── content.ts            All marketing copy + capability statuses
│   ├── page-metadata.ts      Per-page metadata without inventing a domain
│   └── cn.ts
├── public/
│   ├── social-card.png       OG/Twitter image (1200×630)
│   └── favicon.ico           Browser default request
├── .env.example
└── .prettierrc.json
```

Server Components by default. Client components are limited to the header
(menu state), the contact form, and the dismissible pilot strip.

---

## 6. Design system

Tokens live in `app/globals.css` under `@theme`:

| Token                                    | Value                             | Use                              |
| ---------------------------------------- | --------------------------------- | -------------------------------- |
| `canvas`                                 | `#FAF9F6`                         | Page background (warm off-white) |
| `surface` / `surface-sunken`             | `#FFFFFF` / `#F4F3EF`             | Cards / recessed panels          |
| `ink` / `ink-muted` / `ink-subtle`       | `#202923` / `#5C6660` / `#666F69` | Body text tiers                  |
| `forest` / `forest-hover` / `forest-ink` | `#1F5A43` / `#174633` / `#0F2F23` | Primary accent                   |
| `sage` / `sage-line`                     | `#EAF1EB` / `#C3D5C9`             | Soft green surfaces              |
| `line` / `line-strong`                   | `#E5E7E2` / `#D3D8D2`             | Borders                          |
| `amber` / `amber-soft`                   | `#8A5A10` / `#FBF3E4`             | Warnings, "in development"       |
| `danger`                                 | `#A3342C`                         | Form errors                      |

`ink-subtle` was darkened from `#767F79` to `#666F69` after a real contrast
check: the original failed AA (4.13:1 on white, 3.72:1 on the sunken surface).

Containers: `.container-page` (max 80rem) and `.container-narrow` (max 48rem),
with 20/32/40px gutters. Buttons come in `primary`, `secondary`, `ghost`,
`inverse` × `sm`/`md`/`lg`; every standalone CTA is ≥ 44px tall.

Capability status is always shown as **text + dot**, never colour alone:
`Available in development build` · `In development` · `Planned`.

Motion is limited to a 480ms fade/rise on the hero, fully disabled under
`prefers-reduced-motion: reduce`.

---

## 7. Content honesty rules

The product is **in development**. The copy was written against the actual
codebase, not the brief alone. Concretely:

- The dashboard preview is a CSS mockup, labelled **"Illustrative demo data"**
  in a banner and in its caption, and hidden from assistive tech as decorative
  with the caption carrying the meaning. No customer name, traveler or booking
  is real.
- No customer logos, counts, testimonials, ratings, awards or ROI claims.
- Nothing claims live integrations, real-time sync, automated recovery, or that
  the platform books suppliers or sends messages — it does neither.
- Offline traveler access is described as **in development**, not available.
- Every feature on `/features` carries a status badge and states its limits.
- No prices, tiers, discounts or refund terms are invented. The page states
  that commercial pricing is agreed after the pilot.
- No Privacy or Terms links exist in the footer, because those pages do not
  exist.

If a capability ships, update `lib/content.ts` (statuses and copy) — that is the
single source of truth for what the site claims.

---

## 8. Verification performed

Run against a production build (`next build` + `next start`) unless noted.

| Check                                                       | Result                                                                                                                                                                                                                        |
| ----------------------------------------------------------- | ----------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------- |
| `tsc --noEmit`                                              | PASS                                                                                                                                                                                                                          |
| `eslint .`                                                  | PASS (0 warnings)                                                                                                                                                                                                             |
| `next build`                                                | PASS, 9 static routes                                                                                                                                                                                                         |
| Route status codes                                          | `/`, `/features`, `/pricing`, `/about`, `/contact`, `/icon.svg`, `/social-card.png`, `/robots.txt`, `/sitemap.xml` → 200; unknown path → 404                                                                                  |
| Horizontal overflow at 320/375/768/1024/1440 on all 5 pages | none                                                                                                                                                                                                                          |
| Mobile menu                                                 | opens, traps focus, Escape closes and restores focus to the toggle, navigates and closes on click, body scroll locked                                                                                                         |
| Contact form                                                | empty submit → 4 field errors + focus on first invalid; bad email rejected; error clears on edit; mailto mode sends nothing and says so; endpoint mode: 2xx → success, 500 → error, network failure → error, values preserved |
| axe-core (WCAG 2.0/2.1 A + AA)                              | **0 violations**, 6 pages × 2 widths                                                                                                                                                                                          |
| Lighthouse                                                  | home 100/100/100 (a11y/best-practices/SEO), performance 92; contact & features 100/100/100                                                                                                                                    |
| Console errors / failed requests                            | none on any page (excluding the intentional 404 visit)                                                                                                                                                                        |

Lighthouse performance is measured locally without throttling against a release
build, so treat the number as directional rather than a field score.

### Screenshots

Full-page captures from the release build, in `docs/screenshots/`:

| File                            | View                  |
| ------------------------------- | --------------------- |
| `home-1440.png`                 | Home at 1440px        |
| `home-375.png` / `home-320.png` | Home at mobile widths |
| `features-1024.png`             | Features at 1024px    |
| `pricing-1440.png`              | Pricing at 1440px     |
| `about-1024.png`                | About at 1024px       |
| `contact-1440.png`              | Contact at 1440px     |
| `not-found-1440.png`            | Branded 404           |

### Known limitations

- The `legacy-javascript` Lighthouse flag is Next's own bootstrap/react-dom
  chunk, not application code; it is not worth hand-editing.
- `public/favicon.ico` is an SVG served under the `.ico` name. Every current
  browser accepts it; add a real multi-size ICO if you need legacy Windows
  icon support.
- The site is English (UK) only. No i18n is configured.
- No analytics or tracking scripts are included. Adding them requires a
  consent approach first.
