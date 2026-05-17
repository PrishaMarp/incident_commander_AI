import type { ReactNode } from "react";

interface PanelProps {
  title: string;
  subtitle?: string;
  icon?: ReactNode;
  children: ReactNode;
  className?: string;
  footer?: ReactNode;
}

export function Panel({ title, subtitle, icon, children, className = "", footer }: PanelProps) {
  return (
    <section
      className={`flex min-h-0 flex-1 flex-col overflow-hidden rounded-xl border border-[var(--color-panel-border)] bg-[var(--color-panel)] shadow-md shadow-[#c4b5a018] ${className}`}
    >
      <header className="flex shrink-0 items-center gap-2 border-b border-[var(--color-panel-border)] px-4 py-3">
        {icon && (
          <span
            className="flex h-8 w-8 items-center justify-center rounded-lg text-[var(--color-accent)]"
            style={{ background: "color-mix(in srgb, var(--color-accent) 18%, transparent)" }}
          >
            {icon}
          </span>
        )}
        <div className="min-w-0 flex-1">
          <h2 className="text-sm font-semibold text-[var(--color-text)]">{title}</h2>
          {subtitle && (
            <p className="truncate text-xs text-[var(--color-muted)]">{subtitle}</p>
          )}
        </div>
        {footer}
      </header>
      <div className="min-h-0 flex-1 overflow-hidden">{children}</div>
    </section>
  );
}
