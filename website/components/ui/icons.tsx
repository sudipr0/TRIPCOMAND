/**
 * Hand-rolled icon set.
 *
 * Ten simple line icons do not justify an icon dependency, and keeping the SVG
 * inline means zero extra kilobytes, no client component, and consistent
 * stroke weights. Every icon is decorative by default (`aria-hidden`); context
 * is always provided by adjacent text.
 */
import type { ReactNode, SVGProps } from "react";

type IconProps = SVGProps<SVGSVGElement> & { title?: string };

function Svg({ title, children, ...props }: IconProps & { children: ReactNode }) {
  return (
    <svg
      viewBox="0 0 24 24"
      fill="none"
      stroke="currentColor"
      strokeWidth={1.6}
      strokeLinecap="round"
      strokeLinejoin="round"
      aria-hidden={title ? undefined : true}
      role={title ? "img" : undefined}
      focusable="false"
      {...props}
    >
      {title ? <title>{title}</title> : null}
      {children}
    </svg>
  );
}

export function ImpactIcon(props: IconProps) {
  return (
    <Svg {...props}>
      <circle cx="11" cy="11" r="6.5" />
      <path d="m20 20-4.2-4.2" />
      <path d="M8.5 11h5" />
      <path d="M11 8.5v5" />
    </Svg>
  );
}

export function TimelineIcon(props: IconProps) {
  return (
    <Svg {...props}>
      <path d="M6 3v18" />
      <circle cx="6" cy="7" r="1.8" />
      <circle cx="6" cy="16" r="1.8" />
      <path d="M10.5 7H19" />
      <path d="M10.5 16H16" />
    </Svg>
  );
}

export function OfflineIcon(props: IconProps) {
  return (
    <Svg {...props}>
      <path d="M4.5 9.5a10.5 10.5 0 0 1 15 0" />
      <path d="M7.5 13a6 6 0 0 1 9 0" />
      <path d="M10.6 16.6a1.9 1.9 0 0 1 2.8 0" />
      <circle cx="12" cy="19.5" r=".6" fill="currentColor" stroke="none" />
    </Svg>
  );
}

export function ChatIcon(props: IconProps) {
  return (
    <Svg {...props}>
      <path d="M20 15.4a2.6 2.6 0 0 1-2.6 2.6H8l-4 3v-3.4a2.6 2.6 0 0 1-1-2.1V6.6A2.6 2.6 0 0 1 5.6 4H17.4A2.6 2.6 0 0 1 20 6.6Z" />
      <path d="M8 9h8" />
      <path d="M8 12.5h5" />
    </Svg>
  );
}

export function GridIcon(props: IconProps) {
  return (
    <Svg {...props}>
      <rect x="3.5" y="4" width="17" height="16" rx="2" />
      <path d="M3.5 9.5h17" />
      <path d="M9 9.5V20" />
    </Svg>
  );
}

export function ReceiptIcon(props: IconProps) {
  return (
    <Svg {...props}>
      <path d="M5.5 3.5h13v16.2l-3-1.8-3.5 2-3.5-2-3 1.8Z" />
      <path d="M9 8h6" />
      <path d="M9 11.5h6" />
    </Svg>
  );
}

export function RecoveryIcon(props: IconProps) {
  return (
    <Svg {...props}>
      <path d="M3.5 12a8.5 8.5 0 1 0 2.7-6.2" />
      <path d="M3.5 4.5v4.2h4.2" />
      <path d="m9 12 2.2 2.2L15.5 10" />
    </Svg>
  );
}

export function CheckIcon(props: IconProps) {
  return (
    <Svg {...props}>
      <path d="m5 12.5 4.5 4.5L19 7" />
    </Svg>
  );
}

export function ArrowRightIcon(props: IconProps) {
  return (
    <Svg {...props}>
      <path d="M4.5 12h15" />
      <path d="m13.5 6 6 6-6 6" />
    </Svg>
  );
}

export function MenuIcon(props: IconProps) {
  return (
    <Svg {...props}>
      <path d="M4 7h16" />
      <path d="M4 12h16" />
      <path d="M4 17h16" />
    </Svg>
  );
}

export function CloseIcon(props: IconProps) {
  return (
    <Svg {...props}>
      <path d="m6 6 12 12" />
      <path d="m18 6-12 12" />
    </Svg>
  );
}

/**
 * Brand mark: two overlapping summit silhouettes with a route line to the peak.
 * The same artwork is used by `app/icon.svg` for the favicon, so the tab icon
 * and the header cannot drift apart.
 *
 * `filled` renders the solid glyph (favicon style); the default is a lighter
 * outline that sits well in a text lockup.
 */
export function TrailMark({
  className,
  filled = true,
}: {
  className?: string;
  filled?: boolean;
}) {
  return (
    <svg viewBox="0 0 32 32" className={className} aria-hidden="true" focusable="false">
      {filled ? (
        <>
          <rect width="32" height="32" rx="8" className="fill-forest" />
          <path d="M4.6 25 12.4 9.6l3.4 6.6 2.7-4.4L27.4 25Z" className="fill-canvas" />
          <path d="M14.2 25 19 16.4 23.4 25Z" className="fill-sage-line" />
          <path d="M20.4 8.4v-3l3.6 1.5-3.6 1.5Z" className="fill-[#8FB39C]" />
        </>
      ) : (
        <>
          <path
            d="M4.6 25 12.4 9.6l3.4 6.6 2.7-4.4L27.4 25Z"
            fill="none"
            stroke="currentColor"
            strokeWidth="1.8"
            strokeLinejoin="round"
          />
          <path
            d="M14.2 25 19 16.4 23.4 25Z"
            fill="none"
            stroke="currentColor"
            strokeWidth="1.6"
            strokeLinejoin="round"
          />
          <path d="M20.4 8.4v-3l3.6 1.5-3.6 1.5Z" fill="currentColor" />
        </>
      )}
    </svg>
  );
}
