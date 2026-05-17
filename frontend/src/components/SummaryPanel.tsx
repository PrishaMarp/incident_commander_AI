import type { TriagePayload } from "../types";
import { Panel } from "./Panel";
import { SeverityBadge } from "./SeverityBadge";

function formatIncidentType(type: string) {
  return type.replace(/_/g, " ").replace(/\b\w/g, (c) => c.toUpperCase());
}

export function SummaryPanel({
  triage,
  rootCause,
  status,
}: {
  triage: TriagePayload | null;
  rootCause: string;
  status: string;
}) {
  const conclusion = extractConclusion(rootCause);

  return (
    <Panel
      title="Incident summary"
      subtitle="Triage + ranked analysis"
      icon={
        <svg className="h-4 w-4" fill="none" viewBox="0 0 24 24" stroke="currentColor" strokeWidth={2}>
          <path strokeLinecap="round" strokeLinejoin="round" d="M9 12h6m-6 4h6m2 5H7a2 2 0 01-2-2V5a2 2 0 012-2h5.586a1 1 0 01.707.293l5.414 5.414a1 1 0 01.293.707V19a2 2 0 01-2 2z" />
        </svg>
      }
    >
      <div className="scroll-panel h-full overflow-y-auto p-4">
        {!triage && status === "idle" && (
          <p className="py-8 text-center text-sm text-[var(--color-muted)]">
            Summary and hypotheses appear after triage completes…
          </p>
        )}

        {triage && (
          <div className="mb-5 space-y-4">
            <div className="flex flex-wrap items-center gap-2">
              <SeverityBadge severity={triage.severity} />
              <span
                className="rounded-md px-2 py-0.5 font-mono text-xs text-[var(--color-muted)]"
                style={{ background: "color-mix(in srgb, var(--color-panel-border) 60%, transparent)" }}
              >
                {formatIncidentType(triage.incident_type)}
              </span>
            </div>

            <div>
              <h3 className="mb-1 text-xs font-semibold uppercase tracking-wider text-[var(--color-muted)]">
                Blast radius
              </h3>
              <div className="flex flex-wrap gap-1.5">
                {triage.affected_services.length > 0 ? (
                  triage.affected_services.map((svc) => (
                    <span
                      key={svc}
                      className="rounded border border-[var(--color-panel-border)] px-2 py-1 font-mono text-xs text-[var(--color-text)]"
                      style={{ background: "var(--color-surface-elevated)" }}
                    >
                      {svc}
                    </span>
                  ))
                ) : (
                  <span className="text-sm text-[var(--color-muted)]">No services identified</span>
                )}
              </div>
            </div>

            {triage.summary && (
              <div>
                <h3 className="mb-1 text-xs font-semibold uppercase tracking-wider text-[var(--color-muted)]">
                  Summary
                </h3>
                <p className="text-sm leading-relaxed text-[var(--color-text)]">{triage.summary}</p>
              </div>
            )}
          </div>
        )}

        {rootCause && (
          <div className="border-t border-[var(--color-panel-border)] pt-4">
            <h3 className="mb-2 text-xs font-semibold uppercase tracking-wider text-[var(--color-muted)]">
              Root cause analysis
            </h3>
            {conclusion && (
              <div
                className="mb-3 rounded-lg border p-3"
                style={{
                  borderColor: "color-mix(in srgb, var(--color-root) 35%, transparent)",
                  background: "color-mix(in srgb, var(--color-root) 10%, transparent)",
                }}
              >
                <p className="text-xs font-medium" style={{ color: "var(--color-root)" }}>
                  Conclusion
                </p>
                <p className="mt-1 text-sm leading-relaxed text-[var(--color-text)]">{conclusion}</p>
              </div>
            )}
            <div className="max-w-none text-[var(--color-muted)]">
              <pre className="whitespace-pre-wrap font-sans text-xs leading-relaxed">
                {rootCause.length > 1200
                  ? "…" + rootCause.slice(-1200)
                  : rootCause}
              </pre>
            </div>
          </div>
        )}
      </div>
    </Panel>
  );
}

function extractConclusion(text: string): string | null {
  const match = text.match(/\*\*CONCLUSION\*\*\s*([\s\S]*?)(?:\n#|\n\*\*|$)/i);
  if (match?.[1]) return match[1].trim().slice(0, 400);
  const alt = text.match(/CONCLUSION[:\s]+([^\n]+(?:\n(?!\n)[^\n]+)*)/i);
  return alt?.[1]?.trim().slice(0, 400) ?? null;
}
