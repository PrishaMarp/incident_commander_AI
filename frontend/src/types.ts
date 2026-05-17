export type TraceType =
  | "scenario_start"
  | "log_line"
  | "agent_start"
  | "agent_delta"
  | "agent_result"
  | "agent_complete"
  | "agent_error"
  | "incident_complete";

export interface TraceEvent {
  type: TraceType;
  scenario?: string;
  line?: string;
  agent?: string;
  model?: string;
  text?: string;
  payload?: TriagePayload;
  message?: string;
}

export interface TriagePayload {
  incident_type: string;
  severity: string;
  affected_services: string[];
  summary: string;
}

export type RunStatus = "idle" | "connecting" | "running" | "complete" | "error";

export interface TraceEntry {
  id: string;
  kind: "start" | "delta" | "result" | "complete" | "error" | "notice";
  agent: string;
  model?: string;
  text?: string;
  payload?: TriagePayload;
  message?: string;
  at: number;
}
