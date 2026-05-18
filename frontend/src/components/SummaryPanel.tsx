import type { ReactNode } from "react";
import type { CommsPayload, RunStatus, TriagePayload } from "../types";
import {
  extractCausalChain,
  extractCommsField,
  extractConclusion,
  extractRemediationActions,
  extractStabilizationSteps,
  extractSymptom,
  extractVerificationSteps,
  severityEmoji,
  severityLabel,
} from "../utils/incidentSummary";
import { CopySlackButton, SummaryHeaderActions } from "./SummaryActions";
import { Panel } from "./Panel";
import { SeverityBadge } from "./SeverityBadge";
import { SlackPreview } from "./SlackPreview";
import type { IncidentReportInput } from "../utils/incidentReport";

function formatIncidentType(type: string) {
  return type.replace(/_/g, " ").replace(/\b\w/g, (c) => c.toUpperCase());
}

function SummarySection({
  title,
  subtitle,
  accent,
  children,
}: {
  title: string;
  subtitle?: string;
  accent?: string;
  children: ReactNode;
}) {
  return (
    <section
      className="rounded-lg border border-[var(--color-panel-border)] bg-[var(--color-surface-elevated)] overflow-hidden"
      style={
        accent
          ? { borderLeftWidth: 3, borderLeftColor: `var(${accent})` }
          : undefined
      }
    >
      <div className="border-b border-[var(--color-panel-border)] bg-white/60 px-3 py-2">
        <h3 className="text-xs font-semibold text-[var(--color-text)]">{title}</h3>
        {subtitle && <p className="mt-0.5 text-[10px] text-[var(--color-muted)]">{subtitle}</p>}
      </div>
      <div className="px-3 py-2.5">{children}</div>
    </section>
  );
}

function BulletList({ items, ordered }: { items: string[]; ordered?: boolean }) {
  const Tag = ordered ? "ol" : "ul";
  return (
    <Tag className={`space-y-2 ${ordered ? "list-none" : "list-none"}`}>
      {items.map((item, i) => (
        <li key={i} className="flex gap-2 text-sm leading-snug text-[var(--color-text)]">
          <span
            className="mt-0.5 flex h-5 w-5 shrink-0 items-center justify-center rounded-full text-[10px] font-semibold"
            style={{
              background: "color-mix(in srgb, var(--color-agent) 14%, transparent)",
              color: "var(--color-agent)",
            }}
          >
            {ordered ? i + 1 : "•"}
          </span>
          <span>{item}</span>
        </li>
      ))}
    </Tag>
  );
}

function ConfidenceBar({ value }: { value: number }) {
  return (
    <div className="mt-2">
      <div className="mb-1 flex justify-between text-[10px] text-[var(--color-muted)]">
        <span>Confidence</span>
        <span className="font-mono font-medium text-[var(--color-root)]">{value}%</span>
      </div>
      <div
        className="h-1.5 overflow-hidden rounded-full"
        style={{ background: "color-mix(in srgb, var(--color-panel-border) 80%, transparent)" }}
      >
        <div
          className="h-full rounded-full transition-all duration-500"
          style={{
            width: `${value}%`,
            background:
              value >= 75
                ? "var(--color-root)"
                : value >= 50
                  ? "var(--color-warn)"
                  : "var(--color-danger)",
          }}
        />
      </div>
    </div>
  );
}

function AgentProgress({
  triage,
  rootCause,
  remediation,
  comms,
  activeAgent,
  status,
}: {
  triage: TriagePayload | null;
  rootCause: string;
  remediation: string;
  comms: CommsPayload | null;
  activeAgent: string | null;
  status: RunStatus;
}) {
  const steps = [
    { key: "triage", label: "Triage", done: Boolean(triage) },
    {
      key: "root_cause",
      label: "Root cause",
      done: Boolean(rootCause) && activeAgent !== "root_cause",
    },
    {
      key: "remediation",
      label: "Remediation",
      done: Boolean(remediation) && activeAgent !== "remediation",
    },
    { key: "comms", label: "Comms", done: Boolean(comms) },
  ];

  return (
    <div className="flex flex-wrap gap-1.5">
      {steps.map((s) => {
        const running = activeAgent === s.key;
        const complete = s.done || (status === "complete" && s.key === "comms" && comms);
        return (
          <span
            key={s.key}
            className="rounded-full px-2 py-0.5 text-[10px] font-medium"
            style={{
              background: complete
                ? "color-mix(in srgb, var(--color-success) 18%, transparent)"
                : running
                  ? "color-mix(in srgb, var(--color-warn) 20%, transparent)"
                  : "color-mix(in srgb, var(--color-panel-border) 50%, transparent)",
              color: complete
                ? "var(--color-success)"
                : running
                  ? "var(--color-warn)"
                  : "var(--color-muted)",
            }}
          >
            {complete ? "✓ " : running ? "… " : ""}
            {s.label}
          </span>
        );
      })}
    </div>
  );
}

export function SummaryPanel({
  scenario,
  scenarioLabel,
  logs,
  triage,
  rootCause,
  remediation,
  comms,
  status,
  activeAgent,
}: {
  scenario: string | null;
  scenarioLabel?: string | null;
  logs: string[];
  triage: TriagePayload | null;
  rootCause: string;
  remediation: string;
  comms: CommsPayload | null;
  status: RunStatus;
  activeAgent: string | null;
}) {
  const { cause, confidence } = extractConclusion(rootCause);
  const symptom = extractSymptom(rootCause);
  const causalChain = extractCausalChain(rootCause);
  const immediateActions = extractRemediationActions(remediation, 4);
  const stabilization = extractStabilizationSteps(remediation, 3);
  const verification = extractVerificationSteps(remediation, 3);
  const commsStatus = comms ? extractCommsField(comms.message, "Status") : null;

  const rootCauseReady =
    Boolean(cause || symptom) && activeAgent !== "root_cause" && Boolean(rootCause);
  const remediationReady =
    Boolean(remediation) &&
    activeAgent !== "remediation" &&
    (immediateActions.length > 0 || stabilization.length > 0 || verification.length > 0);
  const showSlack = Boolean(comms);
  const isComplete = status === "complete";

  const reportInput: IncidentReportInput = {
    scenario,
    scenarioLabel,
    triage,
    rootCause,
    remediation,
    comms,
    logs,
  };

  return (
    <Panel
      title="Incident summary"
      subtitle={isComplete ? "Full picture from all agents" : "Builds as specialists finish"}
      footer={
        <SummaryHeaderActions reportInput={reportInput} canExport={Boolean(triage)} />
      }
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
            A readable briefing appears here as each agent completes…
          </p>
        )}

        {triage && (
          <>
            <div
              className="rounded-lg border border-[var(--color-panel-border)] p-3"
              style={{ background: "var(--color-surface-elevated)" }}
            >
              <div className="mb-2 flex flex-wrap items-center gap-2">
                <SeverityBadge severity={triage.severity} />
                <span className="text-lg" title={severityLabel(triage.severity)}>
                  {severityEmoji(triage.severity)}
                </span>
                <span className="text-xs font-medium text-[var(--color-text)]">
                  {formatIncidentType(triage.incident_type)}
                </span>
                {commsStatus && (
                  <span
                    className="ml-auto rounded-full px-2 py-0.5 text-[10px] font-medium uppercase"
                    style={{
                      background: "color-mix(in srgb, var(--color-warn) 18%, transparent)",
                      color: "var(--color-warn)",
                    }}
                  >
                    {commsStatus.split("·")[0].trim()}
                  </span>
                )}
              </div>
              <AgentProgress
                triage={triage}
                rootCause={rootCause}
                remediation={remediation}
                comms={comms}
                activeAgent={activeAgent}
                status={status}
              />
            </div>

            <SummarySection title="What happened" subtitle="Triage agent" accent="--color-triage">
              <p className="text-sm leading-relaxed text-[var(--color-text)]">{triage.summary}</p>
              {triage.affected_services.length > 0 && (
                <div className="mt-3">
                  <p className="mb-1.5 text-[10px] font-medium uppercase tracking-wide text-[var(--color-muted)]">
                    Blast radius
                  </p>
                  <div className="flex flex-wrap gap-1">
                    {triage.affected_services.map((svc) => (
                      <code
                        key={svc}
                        className="rounded border border-[var(--color-panel-border)] bg-white px-1.5 py-0.5 font-mono text-[11px]"
                      >
                        {svc}
                      </code>
                    ))}
                  </div>
                </div>
              )}
            </SummarySection>
          </>
        )}

        {rootCauseReady && symptom && (
          <SummarySection title="Symptoms" subtitle="What users and systems saw" accent="--color-log">
            <p className="text-sm leading-relaxed text-[var(--color-text)]">{symptom}</p>
          </SummarySection>
        )}

        {rootCauseReady && cause && (
          <SummarySection title="Root cause" subtitle="Most likely explanation" accent="--color-root">
            <p className="text-sm leading-relaxed text-[var(--color-text)]">{cause}</p>
            {confidence != null && <ConfidenceBar value={confidence} />}
            {causalChain && (
              <p className="mt-3 border-t border-[var(--color-panel-border)] pt-3 text-xs leading-relaxed text-[var(--color-muted)]">
                <span className="font-medium text-[var(--color-text)]">Chain: </span>
                {causalChain}
              </p>
            )}
          </SummarySection>
        )}

        {remediationReady && immediateActions.length > 0 && (
          <SummarySection
            title="Immediate actions"
            subtitle="Next 15 minutes — on-call"
            accent="--color-triage"
          >
            <BulletList items={immediateActions} ordered />
          </SummarySection>
        )}

        {remediationReady && stabilization.length > 0 && (
          <SummarySection title="Stabilization" subtitle="Stop the bleeding">
            <BulletList items={stabilization} />
          </SummarySection>
        )}

        {remediationReady && verification.length > 0 && (
          <SummarySection title="Verify the fix" subtitle="How to confirm recovery">
            <BulletList items={verification} />
          </SummarySection>
        )}


        {status === "running" && triage && activeAgent && (
          <p className="text-center text-[11px] text-[var(--color-muted)]">
            {activeAgent === "root_cause" && "Analyzing root cause…"}
            {activeAgent === "remediation" && "Building remediation plan…"}
            {activeAgent === "comms" && "Drafting Slack update…"}
          </p>
        )}

        {showSlack && comms && (
          <div className="space-y-2">
            <div className="flex items-center justify-between gap-2">
              <p className="text-[10px] font-semibold uppercase tracking-wider text-[var(--color-muted)]">
                Slack draft · {comms.channel}
              </p>
              <CopySlackButton comms={comms} />
            </div>
            <SlackPreview channel={comms.channel} message={comms.message} status={comms.status} />
          </div>
        )}

        {isComplete && (
          <p
            className="text-center text-xs font-medium"
            style={{ color: "var(--color-success)" }}
          >
            Incident run complete
          </p>
        )}
      </div>
    </Panel>
  );
}
