export interface ScenarioOption {
  id: string;
  label: string;
  description: string;
}

export const DEFAULT_SCENARIOS: ScenarioOption[] = [
  {
    id: "db_failure",
    label: "Database failure",
    description: "Postgres connection pool exhausted; 503s and max_connections errors.",
  },
  {
    id: "api_outage",
    label: "API outage",
    description: "Payments service pool saturated; gateway 503s and circuit breakers open.",
  },
  {
    id: "memory_leak",
    label: "Memory leak",
    description: "Worker heap growth and OOM; batch jobs fail after pod restart.",
  },
];

export function scenarioLabel(id: string | null, scenarios: ScenarioOption[]): string {
  if (!id) return "unknown";
  return scenarios.find((s) => s.id === id)?.label ?? id.replace(/_/g, " ");
}

export async function fetchScenarios(): Promise<ScenarioOption[]> {
  try {
    const res = await fetch("/scenarios");
    if (!res.ok) return DEFAULT_SCENARIOS;
    const data = (await res.json()) as { scenarios: unknown[] };
    const raw = data.scenarios;
    if (!Array.isArray(raw) || !raw.length) return DEFAULT_SCENARIOS;

    if (typeof raw[0] === "string") {
      return (raw as string[]).map((id) => {
        const known = DEFAULT_SCENARIOS.find((s) => s.id === id);
        return (
          known ?? {
            id,
            label: id.replace(/_/g, " ").replace(/\b\w/g, (c: string) => c.toUpperCase()),
            description: "",
          }
        );
      });
    }

    return raw
      .filter((s): s is ScenarioOption => {
        return (
          typeof s === "object" &&
          s !== null &&
          "id" in s &&
          typeof (s as ScenarioOption).id === "string"
        );
      })
      .map((s) => ({
        id: s.id,
        label: String((s as ScenarioOption).label || s.id.replace(/_/g, " ")),
        description: String((s as ScenarioOption).description ?? ""),
      }));
  } catch {
    return DEFAULT_SCENARIOS;
  }
}
