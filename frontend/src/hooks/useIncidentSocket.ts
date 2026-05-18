import { useCallback, useEffect, useRef, useState } from "react";
import type { CommsPayload, RunStatus, TraceEntry, TraceEvent, TriagePayload } from "../types";

let entryId = 0;
function nextId() {
  return `e-${++entryId}`;
}

/** Serverless (e.g. Vercel) has no WebSocket; production bundle uses SSE unless overridden. */
function preferSse(): boolean {
  const flag = import.meta.env.VITE_USE_SSE as string | undefined;
  if (flag === "false") return false;
  if (flag === "true") return true;
  return Boolean(import.meta.env.PROD);
}

function wsUrl(scenario: string): string {
  const base = import.meta.env.VITE_WS_URL as string | undefined;
  if (base) {
    const sep = base.includes("?") ? "&" : "?";
    return `${base}${sep}scenario=${encodeURIComponent(scenario)}`;
  }
  const proto = window.location.protocol === "https:" ? "wss:" : "ws:";
  return `${proto}//${window.location.host}/ws/incident?scenario=${encodeURIComponent(scenario)}`;
}

function sseUrl(scenario: string): string {
  const wsBase = import.meta.env.VITE_WS_URL as string | undefined;
  if (wsBase) {
    const httpish = wsBase.replace(/^wss:/i, "https:").replace(/^ws:/i, "http:");
    const u = new URL(httpish.split("?")[0]);
    u.pathname = "/sse/incident";
    u.search = "";
    u.searchParams.set("scenario", scenario);
    return u.href;
  }
  const origin = typeof window !== "undefined" ? window.location.origin : "";
  return `${origin}/sse/incident?scenario=${encodeURIComponent(scenario)}`;
}

function parseSseBuffer(buffer: string): { events: TraceEvent[]; rest: string } {
  const events: TraceEvent[] = [];
  let rest = buffer;
  let idx: number;
  while ((idx = rest.indexOf("\n\n")) >= 0) {
    const block = rest.slice(0, idx);
    rest = rest.slice(idx + 2);
    for (const line of block.split("\n")) {
      if (line.startsWith("data:")) {
        const payload = line.slice(5).trim();
        if (payload) {
          try {
            events.push(JSON.parse(payload) as TraceEvent);
          } catch {
            /* skip */
          }
        }
      }
    }
  }
  return { events, rest };
}

export interface IncidentState {
  status: RunStatus;
  scenario: string | null;
  logs: string[];
  trace: TraceEntry[];
  triage: TriagePayload | null;
  rootCause: string;
  remediation: string;
  comms: CommsPayload | null;
  error: string | null;
  activeAgent: string | null;
}

const initial: IncidentState = {
  status: "idle",
  scenario: null,
  logs: [],
  trace: [],
  triage: null,
  rootCause: "",
  remediation: "",
  comms: null,
  error: null,
  activeAgent: null,
};

type Connection =
  | { kind: "ws"; socket: WebSocket }
  | { kind: "sse"; abort: AbortController };

export function useIncidentSocket() {
  const [state, setState] = useState<IncidentState>(initial);
  const connectionRef = useRef<Connection | null>(null);

  const reset = useCallback(() => {
    setState(initial);
  }, []);

  const stop = useCallback(() => {
    const c = connectionRef.current;
    if (!c) return;
    if (c.kind === "ws") {
      c.socket.close();
    } else {
      c.abort.abort();
    }
    connectionRef.current = null;
  }, []);

  const handleEvent = useCallback((msg: TraceEvent) => {
    switch (msg.type) {
      case "scenario_start":
        setState((s) => ({
          ...s,
          status: "running",
          scenario: msg.scenario ?? s.scenario,
        }));
        break;

      case "log_line":
        if (msg.line) {
          setState((s) => ({ ...s, logs: [...s.logs, msg.line!] }));
        }
        break;

      case "agent_start":
        setState((s) => ({
          ...s,
          activeAgent: msg.agent ?? null,
          trace: [
            ...s.trace,
            {
              id: nextId(),
              kind: "start",
              agent: msg.agent ?? "unknown",
              model: msg.model,
              at: Date.now(),
            },
          ],
        }));
        break;

      case "agent_delta": {
        if (!msg.text || !msg.agent) break;
        const isNotice =
          msg.text.trim().startsWith("[") && msg.text.includes("quota");
        if (isNotice) {
          const agent = msg.agent;
          setState((s) => ({
            ...s,
            trace: [
              ...s.trace,
              {
                id: nextId(),
                kind: "notice" as const,
                agent,
                text: msg.text,
                at: Date.now(),
              },
            ],
          }));
          break;
        }
        if (msg.agent === "root_cause") {
          setState((s) => ({ ...s, rootCause: s.rootCause + msg.text }));
        } else if (msg.agent === "remediation") {
          setState((s) => ({ ...s, remediation: s.remediation + msg.text }));
        }
        break;
      }

      case "agent_result":
        if (msg.agent === "triage" && msg.payload) {
          setState((s) => ({
            ...s,
            triage: msg.payload as TriagePayload,
            trace: [
              ...s.trace,
              {
                id: nextId(),
                kind: "result",
                agent: "triage",
                payload: msg.payload,
                at: Date.now(),
              },
            ],
          }));
        } else if (msg.agent === "comms" && msg.payload) {
          setState((s) => ({
            ...s,
            comms: msg.payload as CommsPayload,
            trace: [
              ...s.trace,
              {
                id: nextId(),
                kind: "result",
                agent: "comms",
                payload: msg.payload,
                at: Date.now(),
              },
            ],
          }));
        }
        break;

      case "agent_complete":
        setState((s) => ({
          ...s,
          activeAgent: s.activeAgent === msg.agent ? null : s.activeAgent,
          trace: [
            ...s.trace,
            {
              id: nextId(),
              kind: "complete",
              agent: msg.agent ?? "unknown",
              at: Date.now(),
            },
          ],
        }));
        break;

      case "agent_error":
        setState((s) => ({
          ...s,
          status: "error",
          error: msg.message ?? "Unknown error",
          activeAgent: null,
          trace: [
            ...s.trace,
            {
              id: nextId(),
              kind: "error",
              agent: msg.agent ?? "unknown",
              message: msg.message,
              at: Date.now(),
            },
          ],
        }));
        break;

      case "incident_complete":
        setState((s) => ({
          ...s,
          status: "complete",
          activeAgent: null,
        }));
        break;

      default:
        break;
    }
  }, []);

  const start = useCallback(
    (scenario: string) => {
      stop();
      entryId = 0;
      setState({
        ...initial,
        status: "connecting",
        scenario,
      });

      if (preferSse()) {
        const abort = new AbortController();
        connectionRef.current = { kind: "sse", abort };

        void (async () => {
          try {
            const res = await fetch(sseUrl(scenario), {
              signal: abort.signal,
              headers: { Accept: "text/event-stream" },
            });
            if (!res.ok) {
              const text = await res.text().catch(() => "");
              setState((s) => ({
                ...s,
                status: "error",
                error: text || `Stream failed (${res.status})`,
              }));
              connectionRef.current = null;
              return;
            }
            setState((s) => (s.status === "connecting" ? { ...s, status: "running" } : s));

            const reader = res.body?.getReader();
            if (!reader) {
              setState((s) => ({
                ...s,
                status: "error",
                error: "No response body",
              }));
              connectionRef.current = null;
              return;
            }

            const decoder = new TextDecoder();
            let buf = "";
            while (true) {
              const { done, value } = await reader.read();
              if (done) break;
              buf += decoder.decode(value, { stream: true });
              const { events, rest } = parseSseBuffer(buf);
              buf = rest;
              for (const ev of events) {
                handleEvent(ev);
              }
            }

            setState((s) => {
              if (s.status === "running" || s.status === "connecting") {
                return { ...s, status: "error", error: s.error ?? "Stream ended unexpectedly" };
              }
              return s;
            });
          } catch (e) {
            if (abort.signal.aborted) return;
            setState((s) =>
              s.status === "complete"
                ? s
                : {
                    ...s,
                    status: "error",
                    error: e instanceof Error ? e.message : "Stream connection failed",
                  }
            );
          } finally {
            connectionRef.current = null;
          }
        })();
        return;
      }

      const ws = new WebSocket(wsUrl(scenario));
      connectionRef.current = { kind: "ws", socket: ws };

      ws.onopen = () => {
        setState((s) => (s.status === "connecting" ? { ...s, status: "running" } : s));
      };

      ws.onmessage = (ev) => {
        try {
          handleEvent(JSON.parse(ev.data) as TraceEvent);
        } catch {
          /* ignore malformed */
        }
      };

      ws.onerror = () => {
        setState((s) =>
          s.status === "complete"
            ? s
            : { ...s, status: "error", error: "WebSocket connection failed" }
        );
      };

      ws.onclose = () => {
        setState((s) => {
          if (s.status === "running" || s.status === "connecting") {
            return { ...s, status: "error", error: s.error ?? "Connection closed" };
          }
          return s;
        });
        connectionRef.current = null;
      };
    },
    [handleEvent, stop]
  );

  useEffect(() => () => stop(), [stop]);

  const isRunning =
    state.status === "connecting" || state.status === "running";

  return {
    ...state,
    start,
    stop,
    reset,
    isRunning,
  };
}

export async function fetchScenarios(): Promise<string[]> {
  const res = await fetch("/scenarios");
  if (!res.ok) return ["db_failure"];
  const data = (await res.json()) as { scenarios: string[] };
  return data.scenarios?.length ? data.scenarios : ["db_failure"];
}
