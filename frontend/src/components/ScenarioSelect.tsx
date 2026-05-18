import type { ScenarioOption } from "../utils/scenarios";

export function ScenarioSelect({
  scenarios,
  value,
  disabled,
  onChange,
}: {
  scenarios: ScenarioOption[];
  value: string;
  disabled?: boolean;
  onChange: (id: string) => void;
}) {
  return (
    <select
      id="scenario"
      value={value}
      disabled={disabled}
      onChange={(e) => onChange(e.target.value)}
      className="rounded-lg border border-[var(--color-panel-border)] bg-[var(--color-surface-elevated)] px-3 py-2 text-sm text-[var(--color-text)] outline-none focus:border-[var(--color-accent)] focus:ring-1 focus:ring-[var(--color-accent)] disabled:opacity-50"
    >
      {scenarios.map((s) => (
        <option key={s.id} value={s.id}>
          {s.label}
        </option>
      ))}
    </select>
  );
}
