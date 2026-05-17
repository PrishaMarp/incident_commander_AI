const STYLES: Record<string, string> = {
  P1: "text-[var(--color-danger)] border-[var(--color-danger)]",
  P2: "text-[var(--color-warn)] border-[var(--color-warn)]",
  P3: "text-[var(--color-accent)] border-[var(--color-accent-dim)]",
  P4: "text-[var(--color-muted)] border-[var(--color-panel-border)]",
};

const BG: Record<string, string> = {
  P1: "color-mix(in srgb, var(--color-danger) 20%, transparent)",
  P2: "color-mix(in srgb, var(--color-warn) 20%, transparent)",
  P3: "color-mix(in srgb, var(--color-accent) 18%, transparent)",
  P4: "color-mix(in srgb, var(--color-muted) 15%, transparent)",
};

export function SeverityBadge({ severity }: { severity: string }) {
  const key = severity.toUpperCase();
  const style = STYLES[key] ?? STYLES.P4;
  const bg = BG[key] ?? BG.P4;
  return (
    <span
      className={`inline-flex items-center rounded-md border px-2 py-0.5 text-xs font-semibold tracking-wide ${style}`}
      style={{ background: bg }}
    >
      {key}
    </span>
  );
}
