import type { CommsPayload, TriagePayload } from "../types";
import {
  extractCausalChain,
  extractConclusion,
  extractRemediationActions,
  extractStabilizationSteps,
  extractSymptom,
  extractVerificationSteps,
} from "./incidentSummary";

export interface IncidentReportInput {
  scenario: string | null;
  scenarioLabel?: string | null;
  triage: TriagePayload | null;
  rootCause: string;
  remediation: string;
  comms: CommsPayload | null;
  logs?: string[];
}

function mdList(items: string[]): string {
  if (!items.length) return "_None_\n";
  return items.map((item) => `- ${item}`).join("\n") + "\n";
}

function formatScenario(scenario: string | null): string {
  if (!scenario) return "unknown";
  return scenario.replace(/_/g, " ");
}

export function buildIncidentReportMarkdown(input: IncidentReportInput): string {
  const { scenario, scenarioLabel, triage, rootCause, remediation, comms, logs } = input;
  const lines: string[] = [];
  const generated = new Date().toISOString();
  const title = scenarioLabel?.trim() || formatScenario(scenario);

  lines.push(`# Incident report — ${title}`, "");
  if (scenario && scenarioLabel && scenario !== title) {
    lines.push(`_Scenario id: \`${scenario}\`_`, "");
  }
  lines.push(`_Generated ${generated}_`, "");

  if (triage) {
    lines.push("## Triage", "");
    lines.push(`| Field | Value |`, `| --- | --- |`);
    lines.push(`| Severity | ${triage.severity} |`);
    lines.push(`| Type | ${triage.incident_type.replace(/_/g, " ")} |`);
    lines.push(
      `| Affected services | ${triage.affected_services.length ? triage.affected_services.join(", ") : "—"} |`,
      ""
    );
    lines.push("### Summary", "", triage.summary, "");
  }

  if (rootCause.trim()) {
    const { cause, confidence } = extractConclusion(rootCause);
    const symptom = extractSymptom(rootCause);
    const chain = extractCausalChain(rootCause);

    lines.push("## Root cause", "");
    if (symptom) {
      lines.push("### Symptoms", "", symptom, "");
    }
    if (cause) {
      lines.push("### Conclusion", "", cause);
      if (confidence != null) lines.push("", `_Confidence: ${confidence}%_`);
      lines.push("");
    }
    if (chain) {
      lines.push("### Causal chain", "", chain, "");
    }
    lines.push("### Full analysis", "", rootCause.trim(), "");
  }

  if (remediation.trim()) {
    const immediate = extractRemediationActions(remediation, 8);
    const stabilization = extractStabilizationSteps(remediation, 6);
    const verification = extractVerificationSteps(remediation, 6);

    lines.push("## Remediation", "");
    if (immediate.length) {
      lines.push("### Immediate actions", "", mdList(immediate));
    }
    if (stabilization.length) {
      lines.push("### Stabilization", "", mdList(stabilization));
    }
    if (verification.length) {
      lines.push("### Verification", "", mdList(verification));
    }
    lines.push("### Full plan", "", remediation.trim(), "");
  }

  if (comms) {
    lines.push(`## Slack update (${comms.channel})`, "");
    if (comms.status) lines.push(`_Status: ${comms.status}_`, "");
    lines.push("```", comms.message.trim(), "```", "");
  }

  if (logs?.length) {
    const excerpt = logs.slice(-40);
    lines.push("## Log excerpt", "", "_Last 40 lines from simulation_", "", "```");
    lines.push(...excerpt);
    lines.push("```", "");
  }

  lines.push("---", "", "_Report produced by Incident Commander AI._", "");
  return lines.join("\n");
}

export function incidentReportFilename(scenario: string | null): string {
  const slug = (scenario ?? "incident").replace(/[^a-z0-9_-]+/gi, "-");
  const stamp = new Date().toISOString().slice(0, 16).replace(/[T:]/g, "-");
  return `incident-${slug}-${stamp}.md`;
}

export function downloadMarkdownReport(content: string, filename: string): void {
  const blob = new Blob([content], { type: "text/markdown;charset=utf-8" });
  const url = URL.createObjectURL(blob);
  const anchor = document.createElement("a");
  anchor.href = url;
  anchor.download = filename;
  anchor.click();
  URL.revokeObjectURL(url);
}
