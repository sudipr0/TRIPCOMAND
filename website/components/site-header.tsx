"use client";

import Link from "next/link";
import Image from "next/image";
import { usePathname } from "next/navigation";
import { useEffect, useId, useRef, useState } from "react";

import { cn } from "@/lib/cn";
import officialLogo from "@/docs/logoforweb.png";
import { primaryNav, routes } from "@/lib/site-config";
import { ButtonAnchor, ButtonLink } from "@/components/ui/button";
import { ArrowRightIcon, CloseIcon, MenuIcon } from "@/components/ui/icons";
import { loginUrl, PILOT_CTA_HREF, PILOT_CTA_LABEL } from "@/lib/site-config";

export function SiteHeader() {
  const pathname = usePathname();
  const [open, setOpen] = useState(false);
  const [openedOnPath, setOpenedOnPath] = useState(pathname);
  const panelId = useId();
  const toggleRef = useRef<HTMLButtonElement>(null);
  const panelRef = useRef<HTMLDivElement>(null);

  // Close on navigation. Done during render against the previous pathname (the
  // documented pattern) rather than in an effect, so the panel never paints on
  // the new route for a frame.
  if (pathname !== openedOnPath) {
    setOpenedOnPath(pathname);
    setOpen(false);
  }

  // Keyboard + focus management while the panel is open.
  useEffect(() => {
    if (!open) return;

    const panel = panelRef.current;
    const toggle = toggleRef.current;
    const firstLink = panel?.querySelector<HTMLElement>("a, button");

    firstLink?.focus();

    function onKeyDown(event: KeyboardEvent) {
      if (event.key === "Escape") {
        event.preventDefault();
        setOpen(false);
        toggle?.focus();
        return;
      }

      if (event.key !== "Tab" || !panel) return;

      // Keep focus inside the open panel (aria-expanded menu is a modal-ish overlay).
      const focusable = panel.querySelectorAll<HTMLElement>(
        'a[href], button:not([disabled]), [tabindex]:not([tabindex="-1"])',
      );
      if (focusable.length === 0) return;
      const first = focusable[0];
      const last = focusable[focusable.length - 1];

      if (event.shiftKey && document.activeElement === first) {
        event.preventDefault();
        last.focus();
      } else if (!event.shiftKey && document.activeElement === last) {
        event.preventDefault();
        first.focus();
      }
    }

    // Lock background scroll without a layout jump.
    const scrollbar = window.innerWidth - document.documentElement.clientWidth;
    const previousOverflow = document.body.style.overflow;
    const previousPadding = document.body.style.paddingRight;
    document.body.style.overflow = "hidden";
    if (scrollbar > 0) document.body.style.paddingRight = `${scrollbar}px`;

    document.addEventListener("keydown", onKeyDown);
    return () => {
      document.removeEventListener("keydown", onKeyDown);
      document.body.style.overflow = previousOverflow;
      document.body.style.paddingRight = previousPadding;
    };
  }, [open]);

  function isActive(href: string) {
    return pathname === href || pathname.startsWith(`${href}/`);
  }

  return (
    // No backdrop-filter here: a filtered ancestor becomes the containing block
    // for `position: fixed` descendants, which collapsed the mobile menu panel
    // to the header's height. An opaque canvas background is used instead.
    <header className="sticky top-0 z-50 border-b border-line bg-white/95 backdrop-blur-sm">
      <div className="container-page flex h-16 items-center justify-between gap-4 lg:h-[4.625rem]">
        <Link
          href={routes.home}
          aria-label="TrailComand home"
          className="group flex items-center rounded-lg px-1 py-1.5"
        >
          <Image
            priority
            src={officialLogo}
            alt="TrailComand logo"
            className="h-11 w-auto shrink-0 sm:h-12 lg:h-[3.25rem]"
          />
        </Link>

        <nav aria-label="Primary" className="hidden lg:block">
          <ul className="flex items-center gap-0.5">
            {primaryNav.map((item) => (
              <li key={item.key}>
                <Link
                  href={item.href}
                  aria-current={isActive(item.href) ? "page" : undefined}
                  className={cn(
                    "relative inline-flex h-9 items-center rounded-md px-3 text-[0.9375rem] transition-colors",
                    isActive(item.href)
                      ? "font-semibold text-navy after:absolute after:inset-x-3 after:-bottom-0.5 after:h-0.5 after:rounded-full after:bg-teal-strong"
                      : "text-ink-muted hover:bg-surface-sunken hover:text-navy",
                  )}
                >
                  {item.label}
                </Link>
              </li>
            ))}
          </ul>
        </nav>

        <div className="hidden items-center gap-3 lg:flex">
          {/* Login renders only when NEXT_PUBLIC_LOGIN_URL is configured. The
              app is not deployed yet, so a permanent "Login" link would be a
              dead end; the status chip tells visitors that honestly instead. */}
          {loginUrl ? (
            <ButtonAnchor
              size="sm"
              rel="noopener"
              href={loginUrl}
              variant="ghost"
              className="px-3 text-[0.9375rem] text-ink-muted"
            >
              Login
            </ButtonAnchor>
          ) : (
            <span className="inline-flex items-center gap-1.5 rounded-full border border-line bg-surface-sunken px-2.5 py-1 text-xs font-medium text-ink-muted">
              <span className="size-1.5 rounded-full bg-teal" aria-hidden="true" />
              App in development
            </span>
          )}
          <ButtonLink href={PILOT_CTA_HREF} size="sm" className="px-4">
            {PILOT_CTA_LABEL}
          </ButtonLink>
        </div>

        <button
          type="button"
          ref={toggleRef}
          aria-expanded={open}
          aria-controls={open ? panelId : undefined}
          onClick={() => setOpen((value) => !value)}
          aria-label={open ? "Close menu" : "Open menu"}
          className="-mr-2 inline-flex size-11 items-center justify-center rounded-lg text-ink-muted hover:bg-surface-sunken hover:text-navy focus-ring lg:hidden"
        >
          {open ? <CloseIcon className="size-6" /> : <MenuIcon className="size-6" />}
        </button>
      </div>

      {open ? (
        <div
          id={panelId}
          role="dialog"
          ref={panelRef}
          aria-modal="true"
          aria-label="Site menu"
          className="fixed inset-x-0 top-16 bottom-0 z-40 overflow-y-auto overscroll-contain border-t border-line bg-white lg:hidden"
        >
          <nav aria-label="Mobile" className="container-page pt-3 pb-8">
            <ul className="flex flex-col">
              {primaryNav.map((item) => (
                <li key={item.key} className="border-b border-line">
                  <Link
                    href={item.href}
                    aria-current={isActive(item.href) ? "page" : undefined}
                    className={cn(
                      "flex min-h-14 items-center justify-between font-display text-lg",
                      isActive(item.href)
                        ? "font-semibold text-teal-ink"
                        : "font-medium text-navy",
                    )}
                  >
                    {item.label}
                    <ArrowRightIcon
                      aria-hidden="true"
                      className="size-4 shrink-0 text-ink-subtle"
                    />
                  </Link>
                </li>
              ))}
              {loginUrl ? (
                <li className="border-b border-line">
                  <a
                    rel="noopener"
                    href={loginUrl}
                    className="flex min-h-14 items-center justify-between font-display text-lg font-medium text-navy"
                  >
                    Login
                    <ArrowRightIcon
                      aria-hidden="true"
                      className="size-4 shrink-0 text-ink-subtle"
                    />
                  </a>
                </li>
              ) : null}
            </ul>
            <ButtonLink href={PILOT_CTA_HREF} size="lg" className="mt-6 w-full">
              {PILOT_CTA_LABEL}
            </ButtonLink>
            <p className="mt-3 text-center text-sm text-ink-subtle">
              The application is still in development. Ask us about the pilot.
            </p>
          </nav>
        </div>
      ) : null}
    </header>
  );
}
