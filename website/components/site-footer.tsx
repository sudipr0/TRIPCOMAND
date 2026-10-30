import Link from "next/link";
import Image from "next/image";
import { contactEmail, legalNav, loginUrl, primaryNav, routes } from "@/lib/site-config";
import officialLogo from "@/docs/logoforweb.png";

export function SiteFooter() {
  return (
    <footer className="mt-auto border-t border-navy-line bg-navy text-on-navy">
      <div className="container-page py-12 lg:py-14">
        <div className="grid gap-10 md:grid-cols-[minmax(0,1.6fr)_minmax(0,1fr)] lg:gap-16">
          <div className="max-w-md">
            <Link
              href={routes.home}
              className="inline-flex rounded-md bg-white px-3 py-2"
              aria-label="TrailComand home"
            >
              <Image
                src={officialLogo}
                sizes="180px"
                alt="TrailComand logo"
                className="h-10 w-auto"
              />
            </Link>
            <p className="mt-4 text-sm leading-6 text-on-navy-muted">
              An operations platform for trekking and adventure travel agencies that helps
              teams record trip disruptions, understand what they affect, and coordinate
              recovery in one place. Built for complex, multi-day trips. Currently in
              development.
            </p>
            <p className="mt-4 text-xs leading-5 text-on-navy-subtle">
              This site is the product&rsquo;s public website. The TrailComand application
              is a separate, private workspace that is not publicly accessible while it is
              being built.
            </p>
          </div>

          <div className="grid grid-cols-2 gap-8">
            <nav aria-label="Footer">
              <h2 className="font-display text-xs font-semibold tracking-[0.1em] text-on-navy-subtle uppercase">
                Product
              </h2>
              <ul className="mt-4 space-y-2.5">
                {primaryNav.map((item) => (
                  <li key={item.key}>
                    <Link
                      href={item.href}
                      className="inline-flex min-h-8 items-center rounded text-sm text-on-navy-muted transition-colors hover:text-white"
                    >
                      {item.label}
                    </Link>
                  </li>
                ))}
              </ul>
            </nav>

            <div>
              <h2 className="font-display text-xs font-semibold tracking-[0.1em] text-on-navy-subtle uppercase">
                Access
              </h2>
              <ul className="mt-4 space-y-2.5">
                <li>
                  <Link
                    href={routes.contact}
                    className="inline-flex min-h-8 items-center rounded text-sm text-on-navy-muted transition-colors hover:text-white"
                  >
                    Request a pilot
                  </Link>
                </li>
                {/* Login and email appear only when genuinely configured:
                    the app is not deployed and no mailbox is monitored yet. */}
                {loginUrl ? (
                  <li>
                    <a
                      href={loginUrl}
                      rel="noopener"
                      className="inline-flex min-h-8 items-center rounded text-sm text-on-navy-muted transition-colors hover:text-white"
                    >
                      Login
                    </a>
                  </li>
                ) : null}
                {contactEmail ? (
                  <li>
                    <a
                      href={`mailto:${contactEmail}`}
                      className="inline-flex min-h-8 items-center rounded text-sm break-all text-on-navy-muted transition-colors hover:text-white"
                    >
                      {contactEmail}
                    </a>
                  </li>
                ) : null}
              </ul>
            </div>
          </div>
        </div>

        <div className="mt-12 flex flex-col gap-4 border-t border-navy-line pt-6 text-sm text-on-navy-subtle sm:flex-row sm:items-center sm:justify-between">
          <p>© 2026 TrailComand. All rights reserved.</p>
          <div className="flex flex-wrap items-center gap-x-5 gap-y-1">
            {legalNav.map((item) => (
              <Link
                key={item.key}
                href={item.href}
                className="inline-flex min-h-8 items-center rounded text-on-navy-muted transition-colors hover:text-white"
              >
                {item.label}
              </Link>
            ))}
            <p className="inline-flex items-center gap-2">
              <span
                aria-hidden="true"
                className="size-1.5 rounded-full bg-teal-on-navy"
              />
              Product in development
            </p>
          </div>
        </div>
      </div>
    </footer>
  );
}
