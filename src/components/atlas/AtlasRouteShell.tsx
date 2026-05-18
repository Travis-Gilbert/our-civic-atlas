import Link from "next/link";
import type { ReactNode } from "react";

type RouteAction = {
  href: string;
  label: string;
};

type AtlasRouteShellProps = {
  eyebrow: string;
  title: string;
  description: string;
  actions?: RouteAction[];
  children: ReactNode;
};

const ROUTE_LINKS = [
  { href: "/open-flint-atlas", label: "Map" },
  { href: "/open-flint-atlas/sources", label: "Sources" },
  { href: "/open-flint-atlas/contribute", label: "Contribute" },
  { href: "/open-flint-atlas/methodology", label: "Methodology" },
];

export function AtlasRouteShell({
  eyebrow,
  title,
  description,
  actions = [],
  children,
}: AtlasRouteShellProps) {
  return (
    <main className="relative h-screen overflow-y-auto px-4 py-5 md:px-8 md:py-7">
      <div className="mx-auto flex w-full max-w-6xl flex-col gap-6">
        <nav
          aria-label="Atlas route navigation"
          className="flex flex-wrap items-center gap-2"
        >
          {ROUTE_LINKS.map((item) => (
            <Link
              key={item.href}
              href={item.href}
              className="rounded-[4px] border px-3 py-2 font-mono text-[11px] uppercase tracking-[0.12em] transition-colors"
              style={{
                borderColor: "rgba(42, 36, 25, 0.12)",
                background: "rgba(246, 244, 238, 0.72)",
                color: "var(--ctx-ink-soft)",
              }}
            >
              {item.label}
            </Link>
          ))}
        </nav>

        <header
          className="rounded-[6px] border p-5 md:p-6"
          style={{
            borderColor: "rgba(42, 36, 25, 0.12)",
            background: "rgba(246, 244, 238, 0.78)",
            boxShadow: "var(--ctx-shadow-card)",
          }}
          data-fade-source
        >
          <p
            className="font-mono text-[10px] uppercase tracking-[0.16em]"
            style={{ color: "var(--ctx-ink-mute)" }}
          >
            {eyebrow}
          </p>
          <div className="mt-3 flex flex-col gap-4 md:flex-row md:items-end md:justify-between">
            <div className="max-w-3xl">
              <h1 className="font-display text-4xl leading-tight tracking-[0.005em] md:text-6xl">
                {title}
              </h1>
              <p
                className="mt-3 max-w-2xl text-[15px] leading-[1.65]"
                style={{ color: "var(--ctx-ink-soft)" }}
              >
                {description}
              </p>
            </div>
            {actions.length > 0 && (
              <div className="flex flex-wrap gap-2">
                {actions.map((action) => (
                  <Link
                    key={action.href}
                    href={action.href}
                    className="rounded-[4px] px-3 py-2 text-[13px] font-medium"
                    style={{
                      background: "var(--ctx-ink)",
                      color: "var(--ctx-paper)",
                    }}
                  >
                    {action.label}
                  </Link>
                ))}
              </div>
            )}
          </div>
        </header>

        {children}
      </div>
    </main>
  );
}

export function AtlasSection({
  title,
  children,
}: {
  title: string;
  children: ReactNode;
}) {
  return (
    <section
      className="rounded-[6px] border p-5"
      style={{
        borderColor: "rgba(42, 36, 25, 0.1)",
        background: "rgba(246, 244, 238, 0.7)",
      }}
      data-fade-source
    >
      <h2 className="text-lg font-semibold">{title}</h2>
      <div className="mt-4">{children}</div>
    </section>
  );
}

export function AtlasMetaGrid({ children }: { children: ReactNode }) {
  return (
    <dl className="grid gap-3 sm:grid-cols-2 lg:grid-cols-3">{children}</dl>
  );
}

export function AtlasMetaItem({
  label,
  value,
}: {
  label: string;
  value: ReactNode;
}) {
  return (
    <div>
      <dt
        className="font-mono text-[10px] uppercase tracking-[0.14em]"
        style={{ color: "var(--ctx-ink-mute)" }}
      >
        {label}
      </dt>
      <dd className="mt-1 text-[14px] leading-[1.5]">{value}</dd>
    </div>
  );
}

export function AtlasPillList({ items }: { items: readonly string[] }) {
  if (items.length === 0) {
    return <span style={{ color: "var(--ctx-ink-mute)" }}>none listed</span>;
  }

  return (
    <div className="flex flex-wrap gap-2">
      {items.map((item) => (
        <span
          key={item}
          className="rounded-[4px] border px-2 py-1 font-mono text-[10px] uppercase tracking-[0.1em]"
          style={{
            borderColor: "rgba(42, 36, 25, 0.1)",
            color: "var(--ctx-ink-soft)",
          }}
        >
          {item.replace(/_/g, " ")}
        </span>
      ))}
    </div>
  );
}
