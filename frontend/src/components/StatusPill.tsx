import type { RunStatus } from "../types";

const LABELS: Record<RunStatus, string> = {
  idle: "Standby",
  connecting: "Connecting…",
  running: "Incident active",
  complete: "Resolved",
  error: "Error",
};

const DOT: Record<RunStatus, string> = {
  idle: "bg-[var(--color-muted)]",
  connecting: "bg-[var(--color-warn)] animate-pulse-dot",
  running: "bg-[var(--color-danger)] animate-pulse-dot",
  complete: "bg-[var(--color-success)]",
  error: "bg-[var(--color-danger)]",
};

export function StatusPill({ status }: { status: RunStatus }) {
  return (
    <span className="inline-flex items-center gap-2 rounded-full border border-[var(--color-panel-border)] bg-[var(--color-panel)] px-3 py-1 text-xs font-medium text-[var(--color-muted)]">
      <span className={`h-2 w-2 rounded-full ${DOT[status]}`} />
      {LABELS[status]}
    </span>
  );
}
