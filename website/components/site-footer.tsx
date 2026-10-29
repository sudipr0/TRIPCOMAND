import Link from "next/link";
import { TrailMark } from "@/components/ui/icons";
import { loginUrl, primaryNav, routes, site } from "@/lib/site-config";

export function SiteFooter() {
  return (
    <footer className="mt-auto border-t border-line bg-surface-sunken">
      <div className="container-page py-12 lg:py-16">
        <div className="grid gap-10 md:grid-cols-[minmax(0,1.6fr)_minmax(0,1fr)] lg:gap-16">
          <div className="max-w-md">
            <Link
              href={routes.home}
              className="inline-flex items-center gap-2.5 rounded-md"
              aria-label="TrailComand home"
            >
              <TrailMark className="size-8 text-forest" />
              <span className="text-[1.0625rem] font-semibold tracking-[-0.02em] text-forest-ink">
                TrailComand
              </span>
            </Link>
            <p className="mt-4 text-sm leading-6 text-ink-muted">
              An operations platform for trekking and adventure travel agencies that helps
              teams record trip disruptions, understand what they affect, and coordinate
              recovery in one place. Built for complex, multi-day trips. Currently in
              development.
            </p>
          </div>

          <div className="grid grid-cols-2 gap-8">
            <nav aria-label="Footer">
              <h2 className="text-xs font-semibold tracking-[0.08em] text-ink uppercase">
                Product
              </h2>
              <ul className="mt-4 space-y-2.5">
                {primaryNav.map((item) => (
                  <li key={item.key}>
                    <Link
                      href={item.href}
                      className="rounded text-sm text-ink-muted transition-colors hover:text-forest-ink"
                    >
                      {item.label}
                    </Link>
                  </li>
                ))}
              </ul>
            </nav>

            <div>
              <h2 className="text-xs font-semibold tracking-[0.08em] text-ink uppercase">
                Access
              </h2>
              <ul className="mt-4 space-y-2.5">
                <li>
                  <a
                    href={loginUrl}
                    className="rounded text-sm text-ink-muted transition-colors hover:text-forest-ink"
                  >
                    Login
                  </a>
                </li>
                <li>
                  <a
                    href={`mailto:${site.contactEmail}`}
                    className="rounded text-sm break-all text-ink-muted transition-colors hover:text-forest-ink"
                  >
                    {site.contactEmail}
                  </a>
                </li>
              </ul>
            </div>
          </div>
        </div>

        <div className="mt-12 flex flex-col gap-3 border-t border-line pt-6 text-sm text-ink-subtle sm:flex-row sm:items-center sm:justify-between">
          <p>© 2026 TrailComand. All rights reserved.</p>
          <p>Product in development. Pilot terms are agreed in writing.</p>
        </div>
      </div>
    </footer>
  );
}
