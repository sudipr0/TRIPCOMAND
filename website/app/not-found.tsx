import type { Metadata } from "next";
import Link from "next/link";
import { ButtonLink } from "@/components/ui/button";
import { TrailMark } from "@/components/ui/icons";
import { primaryNav, routes } from "@/lib/site-config";

export const metadata: Metadata = {
  title: "Page not found",
  robots: { index: false, follow: true },
};

export default function NotFound() {
  return (
    <main id="main" className="flex flex-1 items-center">
      <div className="container-page py-20 lg:py-28">
        <div className="mx-auto max-w-xl">
          <TrailMark className="size-10" />
          <p className="mt-6 font-mono text-xs tracking-[0.1em] text-ink-subtle uppercase">
            Error 404
          </p>
          <h1 className="mt-2 text-[2rem] leading-[1.12] font-semibold tracking-[-0.03em] text-ink sm:text-[2.5rem]">
            This route does not go anywhere.
          </h1>
          <p className="mt-3 text-[1.0625rem] leading-7 text-ink-muted">
            The page you asked for is not on this site. It may have moved, or the link may
            be out of date.
          </p>

          <div className="mt-8 flex flex-col gap-3 sm:flex-row">
            <ButtonLink href={routes.home} size="lg">
              Back to the homepage
            </ButtonLink>
            <ButtonLink href={routes.contact} variant="secondary" size="lg">
              Request a pilot
            </ButtonLink>
          </div>

          <nav aria-label="Site pages" className="mt-10 border-t border-line pt-6">
            <p className="text-xs font-semibold tracking-[0.08em] text-ink-subtle uppercase">
              Try one of these
            </p>
            <ul className="mt-3 flex flex-wrap gap-x-5 gap-y-2">
              {primaryNav.map((item) => (
                <li key={item.key}>
                  <Link
                    href={item.href}
                    className="rounded text-sm text-forest underline decoration-sage-line underline-offset-4 hover:decoration-forest"
                  >
                    {item.label}
                  </Link>
                </li>
              ))}
            </ul>
          </nav>
        </div>
      </div>
    </main>
  );
}
