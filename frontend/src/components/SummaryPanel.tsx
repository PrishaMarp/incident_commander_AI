import type { CommsPayload, RunStatus, TriagePayload } from "../types";
import {
  extractConclusion,
  extractRemediationActions,
  severityEmoji,
} from "../utils/incidentSummary";
import { Panel } from "./Panel";
import { SeverityBadge } from "./SeverityBadge";
import { SlackPreview } from "./SlackPreview";

function formatIncidentType(type: string) {
  return type.replace(/_/g, " ").replace(/\b\w/g, (c) => c.toUpperCase());
}

function SummaryRow({
  label,
  children,
}: {
  label: string;
  children: React.ReactNode;
}) {
  return (
    <div className="rounded-lg border border-[var(--color-panel-border)] bg-[var(--color-surface-elevated)] px-3 py-2.5">
      <p className="mb-1 text-[10px] font-semibold uppercase tracking-wider text-[var(--color-muted)]">
        {label}
      </p>
      {children}
    </div>
  );
}

export function SummaryPanel({
  triage,
  rootCause,
  remediation,
  comms,
  status,
  activeAgent,
}: {
  triage: TriagePayload | null;
  rootCause: string;
  remediation: string;
  comms: CommsPayload | null;
  status: RunStatus;
  activeAgent: string | null;
}) {
  const { cause, confidence } = extractConclusion(rootCause);
  const actions = extractRemediationActions(remediation, 3);

  const rootCauseDone =
    Boolean(cause) &&
    activeAgent !== "root_cause" &&
    (Boolean(remediation) ||
      activeAgent === "remediation" ||
      activeAgent === "comms" ||
      status === "complete");
  const remediationDone =
    actions.length > 0 &&
    activeAgent !== "remediation" &&
    (activeAgent === "comms" || status === "complete" || Boolean(comms));
  const showSlack = Boolean(comms);
  const isComplete = status === "complete";

  return (
    <Panel
      title="Incident summary"
      subtitle={isComplete ? "Key facts after agent run" : "Updates as agents finish"}
      icon={
        <svg className="h-4 w-4" fill="none" viewBox="0 0 24 24" stroke="currentColor" strokeWidth={2}>
          <path
            strokeLinecap="round"
            strokeLinejoin="round"
            d="M9 12h6m-6 4h6m2 5H7a2 2 0 01-2-2V5a2 2 0 012-2h5.586a1 1 0 01.707.293l5.414 5.414a1 1 0 01.293.707V19a2 2 0 01-2 2z"
          />
        </svg>
      }
    >
      <div className="scroll-panel h-full space-y-3 overflow-y-auto p-3">
        {!triage && status === "idle" && (
          <p className="py-8 text-center text-sm text-[var(--color-muted)]">
            Headline facts appear here as each agent completes…
          </p>
        )}

        {triage && (
          <>
            <div className="flex flex-wrap items-center gap-2">
              <SeverityBadge severity={triage.severity} />
              <span className="text-lg leading-none" title={triage.severity}>
                {severityEmoji(triage.severity)}
              </span>
              <span
                className="rounded-md px-2 py-0.5 font-mono text-[10px] text-[var(--color-muted)]"
                style={{
                  background: "color-mix(in srgb, var(--color-panel-border) 60%, transparent)",
                }}
              >
                {formatIncidentType(triage.incident_type)}
              </span>
            </div>

            {triage.summary && (
              <SummaryRow label="What happened">
                <p className="line-clamp-3 text-sm leading-snug text-[var(--color-text)]">
                  {triage.summary}
                </p>
              </SummaryRow>
            )}

            {triage.affected_services.length > 0 && (
              <SummaryRow label="Affected">
                <div className="flex flex-wrap gap-1">
                  {triage.affected_services.map((svc) => (
                    <code
                      key={svc}
                      className="rounded border border-[var(--color-panel-border)] bg-white px-1.5 py-0.5 font-mono text-[11px] text-[var(--color-text)]"
                    >
                      {svc}
                    </code>
                  ))}
                </div>
              </SummaryRow>
            )}
          </>
        )}

        {rootCauseDone && cause && (
          <SummaryRow label="Likely root cause">
            <p className="text-sm leading-snug text-[var(--color-text)]">{cause}</p>
            {confidence != null && (
              <p className="mt-1.5 text-[11px] text-[var(--color-muted)]">
                Confidence{" "}
                <span className="font-mono font-medium text-[var(--color-root)]">{confidence}%</span>
              </p>
            )}
          </SummaryRow>
        )}

        {remediationDone && actions.length > 0 && (
          <SummaryRow label="Do now">
            <ul className="space-y-1.5">
              {actions.map((step, i) => (
                <li key={i} className="flex gap-2 text-sm leading-snug text-[var(--color-text)]">
                  <span className="shrink-0 font-mono text-[11px] text-[var(--color-muted)]">
                    {i + 1}.
                  </span>
                  <span>{step}</span>
                </li>
              ))}
            </ul>
          </SummaryRow>
        )}

        {status === "running" && triage && !showSlack && (
          <p className="text-center text-[11px] text-[var(--color-muted)]">
            {activeAgent === "root_cause" && "Root cause agent running…"}
            {activeAgent === "remediation" && "Remediation agent running…"}
            {activeAgent === "comms" && "Drafting Slack update…"}
            {!activeAgent && "Waiting for next agent…"}
          </p>
        )}

        {showSlack && comms && (
          <div className="space-y-2 pt-1">
            <p className="text-[10px] font-semibold uppercase tracking-wider text-[var(--color-muted)]">
              Slack update
            </p>
            <SlackPreview
              channel={comms.channel}
              message={comms.message}
              status={comms.status}
            />
          </div>
        )}

        {isComplete && !comms && (
          <p className="text-center text-xs text-[var(--color-muted)]">Incident complete.</p>
        )}
      </div>
    </Panel>
  );
}
