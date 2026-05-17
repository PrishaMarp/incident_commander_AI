import { useEffect, useRef } from "react";
import type { TraceEntry } from "../types";
import { Panel } from "./Panel";

const AGENT_LABELS: Record<string, string> = {
  triage: "Triage Agent",
  root_cause: "Root Cause Agent",
  orchestrator: "Orchestrator",
};

function AgentIcon({ agent }: { agent: string }) {
  const label = agent === "triage" ? "T" : agent === "root_cause" ? "R" : "•";
  return (
    <span
      className="flex h-7 w-7 shrink-0 items-center justify-center rounded-full text-xs font-bold"
      style={{
        background: "color-mix(in srgb, var(--color-agent) 22%, transparent)",
        color: "var(--color-agent)",
      }}
    >
      {label}
    </span>
  );
}

function TraceCard({ entry }: { entry: TraceEntry }) {
  const name = AGENT_LABELS[entry.agent] ?? entry.agent;

  if (entry.kind === "start") {
    return (
      <div className="trace-agent-start animate-fade-in flex gap-3 rounded-lg border p-3">
        <AgentIcon agent={entry.agent} />
        <div className="min-w-0 flex-1">
          <p className="text-sm font-medium" style={{ color: "var(--color-agent)" }}>
            {name} started
          </p>
          {entry.model && (
            <p className="mt-0.5 font-mono text-xs text-[var(--color-muted)]">{entry.model}</p>
          )}
          <p className="mt-1 text-xs text-[var(--color-muted)]">Reasoning…</p>
        </div>
      </div>
    );
  }

  if (entry.kind === "result" && entry.payload) {
    const p = entry.payload;
    return (
      <div className="trace-triage animate-fade-in rounded-lg border p-3">
        <p className="mb-2 text-sm font-medium" style={{ color: "var(--color-triage)" }}>
          {name} — classification
        </p>
        <dl className="grid grid-cols-2 gap-2 text-xs">
          <div>
            <dt className="text-[var(--color-muted)]">Type</dt>
            <dd className="font-mono text-[var(--color-text)]">{p.incident_type}</dd>
          </div>
          <div>
            <dt className="text-[var(--color-muted)]">Severity</dt>
            <dd className="font-mono text-[var(--color-text)]">{p.severity}</dd>
          </div>
        </dl>
      </div>
    );
  }

  if (entry.kind === "complete") {
    return (
      <p className="animate-fade-in pl-10 text-xs" style={{ color: "var(--color-success)" }}>
        ✓ {name} finished
      </p>
    );
  }

  if (entry.kind === "error") {
    return (
      <div
        className="animate-fade-in rounded-lg border p-3 text-sm"
        style={{
          borderColor: "color-mix(in srgb, var(--color-danger) 40%, transparent)",
          background: "color-mix(in srgb, var(--color-danger) 12%, transparent)",
          color: "var(--color-danger)",
        }}
      >
        <span className="font-medium">{name}:</span> {entry.message}
      </div>
    );
  }

  if (entry.kind === "notice" && entry.text) {
    return (
      <p className="animate-fade-in pl-10 text-xs text-[var(--color-warn)]">{entry.text.trim()}</p>
    );
  }

  return null;
}

export function TracePanel({
  trace,
  rootCause,
  activeAgent,
  isLive,
}: {
  trace: TraceEntry[];
  rootCause: string;
  activeAgent: string | null;
  isLive: boolean;
}) {
  const bottomRef = useRef<HTMLDivElement>(null);

  useEffect(() => {
    bottomRef.current?.scrollIntoView({ behavior: "smooth" });
  }, [trace.length, rootCause.length]);

  const streamingRootCause =
    rootCause.length > 0 || activeAgent === "root_cause";

  return (
    <Panel
      title="Agent trace"
      subtitle="Live reasoning — not just final output"
      icon={
        <svg className="h-4 w-4" fill="none" viewBox="0 0 24 24" stroke="currentColor" strokeWidth={2}>
          <path strokeLinecap="round" strokeLinejoin="round" d="M9.75 17L9 20l-1 1h8l-1-1-.75-3M3 13h18M5 17h14a2 2 0 002-2V5a2 2 0 00-2-2H5a2 2 0 00-2 2v10a2 2 0 002 2z" />
        </svg>
      }
    >
      <div className="scroll-panel h-full space-y-3 overflow-y-auto p-3">
        {trace.length === 0 && !streamingRootCause ? (
          <p className="px-2 py-8 text-center text-sm text-[var(--color-muted)]">
            Agent steps will stream here as triage and root-cause run…
          </p>
        ) : (
          <>
            {trace.map((e) => (
              <TraceCard key={e.id} entry={e} />
            ))}
            {streamingRootCause && (
              <div className="trace-root animate-fade-in rounded-lg border p-3">
                <div className="mb-2 flex items-center gap-2">
                  <AgentIcon agent="root_cause" />
                  <p className="text-sm font-medium" style={{ color: "var(--color-root)" }}>
                    Root Cause Agent
                    {isLive && activeAgent === "root_cause" && (
                      <span
                        className="ml-2 inline-block h-1.5 w-1.5 rounded-full animate-pulse-dot"
                        style={{ background: "var(--color-root)" }}
                      />
                    )}
                  </p>
                </div>
                <pre className="max-h-64 overflow-y-auto whitespace-pre-wrap font-sans text-xs leading-relaxed text-[var(--color-muted)]">
                  {rootCause || "Analyzing hypotheses…"}
                </pre>
              </div>
            )}
          </>
        )}
        <div ref={bottomRef} />
      </div>
    </Panel>
  );
}
