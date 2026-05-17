import { useEffect, useRef } from "react";
import { Panel } from "./Panel";

export function LogPanel({ logs, isLive }: { logs: string[]; isLive: boolean }) {
  const bottomRef = useRef<HTMLDivElement>(null);

  useEffect(() => {
    bottomRef.current?.scrollIntoView({ behavior: "smooth" });
  }, [logs.length]);

  return (
    <Panel
      title="Live log stream"
      subtitle={isLive ? "Ingesting simulated production logs" : "Waiting for incident"}
      icon={
        <svg className="h-4 w-4" fill="none" viewBox="0 0 24 24" stroke="currentColor" strokeWidth={2}>
          <path strokeLinecap="round" strokeLinejoin="round" d="M4 6h16M4 12h16M4 18h10" />
        </svg>
      }
      footer={
        isLive ? (
          <span
            className="rounded px-2 py-0.5 text-[10px] font-bold uppercase tracking-wider text-[var(--color-danger)]"
            style={{ background: "color-mix(in srgb, var(--color-danger) 22%, transparent)" }}
          >
            Live
          </span>
        ) : null
      }
    >
      <div className="scroll-panel h-full overflow-y-auto p-3 font-mono text-[11px] leading-relaxed">
        {logs.length === 0 ? (
          <p className="px-2 py-8 text-center text-sm text-[var(--color-muted)]">
            Logs will appear here as the simulation streams…
          </p>
        ) : (
          logs.map((line, i) => (
            <div
              key={i}
              className="animate-fade-in border-b border-[var(--color-panel-border)] py-1.5 text-[var(--color-log)] last:border-0"
            >
              {line}
            </div>
          ))
        )}
        <div ref={bottomRef} />
      </div>
    </Panel>
  );
}
