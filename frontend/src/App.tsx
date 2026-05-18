import { useEffect, useState } from "react";
import { LogPanel } from "./components/LogPanel";
import { StatusPill } from "./components/StatusPill";
import { SummaryPanel } from "./components/SummaryPanel";
import { TracePanel } from "./components/TracePanel";
import { fetchScenarios, useIncidentSocket } from "./hooks/useIncidentSocket";

export default function App() {
  const [scenarios, setScenarios] = useState<string[]>(["db_failure"]);
  const [selected, setSelected] = useState("db_failure");
  const incident = useIncidentSocket();

  useEffect(() => {
    fetchScenarios().then(setScenarios).catch(() => {});
  }, []);

  const isLive =
    incident.status === "connecting" || incident.status === "running";

  return (
    <div className="flex h-full min-h-screen flex-col bg-[var(--color-surface)]">
      <header className="shrink-0 border-b border-[var(--color-panel-border)] bg-[var(--color-panel)]/95 shadow-sm backdrop-blur-md">
        <div className="mx-auto flex max-w-[1920px] flex-wrap items-center gap-4 px-4 py-4 sm:px-6">
          <div className="flex min-w-0 flex-1 items-center gap-3">
            <div
              className="flex h-10 w-10 items-center justify-center rounded-xl text-[var(--color-on-brand)] shadow-lg"
              style={{
                background:
                  "linear-gradient(135deg, var(--color-brand-from), var(--color-brand-to))",
                boxShadow:
                  "0 8px 24px color-mix(in srgb, var(--color-brand-from) 35%, transparent)",
              }}
            >
              <svg className="h-5 w-5" fill="none" viewBox="0 0 24 24" stroke="currentColor" strokeWidth={2}>
                <path strokeLinecap="round" strokeLinejoin="round" d="M12 9v2m0 4h.01m-6.938 4h13.856c1.54 0 2.502-1.667 1.732-3L13.732 4c-.77-1.333-2.694-1.333-3.464 0L3.34 16c-.77 1.333.192 3 1.732 3z" />
              </svg>
            </div>
            <div>
              <h1 className="text-lg font-bold tracking-tight text-[var(--color-text)] sm:text-xl">
                Incident Commander AI
              </h1>
              <p className="text-xs text-[var(--color-muted)]">
                Autonomous multi-agent SRE · live demo
              </p>
            </div>
          </div>

          <StatusPill status={incident.status} />

          <div className="flex flex-wrap items-center gap-2">
            <label className="sr-only" htmlFor="scenario">
              Scenario
            </label>
            <select
              id="scenario"
              value={selected}
              disabled={incident.isRunning}
              onChange={(e) => setSelected(e.target.value)}
              className="rounded-lg border border-[var(--color-panel-border)] bg-[var(--color-surface-elevated)] px-3 py-2 text-sm text-[var(--color-text)] outline-none focus:border-[var(--color-accent)] focus:ring-1 focus:ring-[var(--color-accent)] disabled:opacity-50"
            >
              {scenarios.map((s) => (
                <option key={s} value={s}>
                  {s.replace(/_/g, " ")}
                </option>
              ))}
            </select>

            <button
              type="button"
              disabled={incident.isRunning}
              onClick={() => incident.start(selected)}
              className="rounded-lg px-5 py-2 text-sm font-semibold text-[var(--color-on-brand)] shadow-md transition disabled:cursor-not-allowed disabled:opacity-50"
              style={{
                background:
                  "linear-gradient(90deg, var(--color-brand-from), var(--color-accent-dim))",
                boxShadow: "0 4px 14px color-mix(in srgb, var(--color-brand-from) 40%, transparent)",
              }}
            >
              {incident.isRunning ? "Running…" : "Start incident"}
            </button>

            {(incident.status === "complete" || incident.status === "error") && (
              <button
                type="button"
                onClick={incident.reset}
                className="rounded-lg border border-[var(--color-panel-border)] px-4 py-2 text-sm text-[var(--color-muted)] transition hover:border-[var(--color-accent)] hover:text-[var(--color-text)]"
              >
                Reset
              </button>
            )}
          </div>
        </div>

        {incident.error && (
          <div
            className="border-t px-4 py-2 text-center text-sm sm:px-6"
            style={{
              borderColor: "color-mix(in srgb, var(--color-danger) 30%, transparent)",
              background: "color-mix(in srgb, var(--color-danger) 12%, transparent)",
              color: "var(--color-danger)",
            }}
          >
            {incident.error}
          </div>
        )}
      </header>

      <main className="mx-auto flex min-h-0 w-full max-w-[1920px] flex-1 flex-col gap-3 p-3 sm:flex-row sm:p-4">
        <div className="flex min-h-[280px] flex-1 flex-col sm:min-h-0 sm:max-w-[32%]">
          <LogPanel logs={incident.logs} isLive={isLive} />
        </div>
        <div className="flex min-h-[320px] flex-1 flex-col sm:min-h-0 sm:max-w-[38%]">
          <TracePanel
            trace={incident.trace}
            rootCause={incident.rootCause}
            remediation={incident.remediation}
            activeAgent={incident.activeAgent}
            isLive={isLive}
          />
        </div>
        <div className="flex min-h-[280px] flex-1 flex-col sm:min-h-0 sm:max-w-[30%]">
          <SummaryPanel
            triage={incident.triage}
            rootCause={incident.rootCause}
            remediation={incident.remediation}
            comms={incident.comms}
            status={incident.status}
            activeAgent={incident.activeAgent}
          />
        </div>
      </main>

      <footer className="shrink-0 border-t border-[var(--color-panel-border)] px-4 py-2 text-center text-[10px] text-[var(--color-muted)]">
        Backend: <code className="font-mono text-[var(--color-accent-dim)]">python -m backend.api</code>
        {" · "}
        UI proxies WebSocket to port 8000
      </footer>
    </div>
  );
}
