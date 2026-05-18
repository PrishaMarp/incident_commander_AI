export function extractConclusion(text: string): {
  cause: string | null;
  confidence: number | null;
} {
  const block = text.match(/\*\*CONCLUSION\*\*\s*([\s\S]*?)(?:\n#|\n\*\*|$)/i);
  const raw = block?.[1]?.trim() ?? text.match(/CONCLUSION[:\s]+([\s\S]*?)(?:\n\n|$)/i)?.[1]?.trim();
  if (!raw) return { cause: null, confidence: null };

  const confidenceMatch = raw.match(/(\d{1,3})\s*%/);
  const confidence = confidenceMatch ? Math.min(100, Number(confidenceMatch[1])) : null;
  const cause = raw
    .replace(/\s*confidence[:\s]*\d{1,3}\s*%?/gi, "")
    .replace(/\s+/g, " ")
    .trim()
    .slice(0, 320);

  return { cause: cause || null, confidence };
}

function extractSection(text: string, heading: string): string {
  const escaped = heading.replace(/[.*+?^${}()|[\]\\]/g, "\\$&");
  const match = text.match(
    new RegExp(
      `##\\s*(?:\\d+\\.?\\s*)?${escaped}[^\\n]*\\n([\\s\\S]*?)(?=\\n##|\\n\\*\\*|$)`,
      "i"
    )
  );
  if (match?.[1]) return match[1].trim();
  const bold = text.match(
    new RegExp(`\\*\\*${escaped}\\*\\*\\s*\\n?([\\s\\S]*?)(?=\\n##|\\n\\*\\*|$)`, "i")
  );
  return bold?.[1]?.trim() ?? "";
}

export function extractListItems(section: string, max = 5): string[] {
  if (!section) return [];
  const items: string[] = [];
  for (const line of section.split("\n")) {
    const trimmed = line.trim();
    const numbered = trimmed.match(/^\d+\.\s+(.+)/);
    const bulleted = trimmed.match(/^[-*•]\s+(.+)/);
    const step = (numbered?.[1] ?? bulleted?.[1])?.replace(/\*\*/g, "").trim();
    if (step && step.length > 6) {
      items.push(step.slice(0, 220));
      if (items.length >= max) break;
    }
  }
  return items;
}

export function extractSymptom(rootCause: string): string | null {
  const section =
    extractSection(rootCause, "Immediate symptom") ||
    rootCause.match(/immediate symptom[:\s]*\n?([\s\S]*?)(?=\n#|\n\d+\.|$)/i)?.[1]?.trim();
  if (!section) return null;
  const line = section.split(/\n+/).find((p) => p.trim().length > 15);
  return line?.trim().slice(0, 280) ?? null;
}

export function extractCausalChain(rootCause: string): string | null {
  const section =
    extractSection(rootCause, "Causal chain") ||
    rootCause.match(/causal chain[:\s]*\n?([\s\S]*?)(?=\n#|\n\*\*|$)/i)?.[1]?.trim();
  if (!section) return null;
  const text = section.replace(/\*\*/g, "").trim();
  return text.slice(0, 280) || null;
}

export function extractRemediationActions(text: string, max = 4): string[] {
  const section =
    extractSection(text, "Immediate actions") ||
    text.match(/##\s*(?:\d+\.?\s*)?Immediate actions[^\n]*\n([\s\S]*?)(?=\n##|\n$)/i)?.[1]?.trim() ||
    "";
  return extractListItems(section, max);
}

export function extractStabilizationSteps(text: string, max = 3): string[] {
  return extractListItems(extractSection(text, "Stabilization"), max);
}

export function extractVerificationSteps(text: string, max = 3): string[] {
  return extractListItems(extractSection(text, "Verification"), max);
}

export function extractCommsField(message: string, field: string): string | null {
  const m = message.match(new RegExp(`\\*${field}:\\*\\s*([^\\n]+)`, "i"));
  return m?.[1]?.replace(/\*+/g, "").trim().slice(0, 240) ?? null;
}

export function severityEmoji(severity: string): string {
  const s = severity.toLowerCase();
  if (s.includes("sev1") || s.includes("critical") || s === "p0") return "🔴";
  if (s.includes("sev2") || s.includes("high") || s === "p1") return "🟠";
  if (s.includes("sev3") || s.includes("medium") || s === "p2") return "🟡";
  return "🔵";
}

export function severityLabel(severity: string): string {
  const s = severity.toLowerCase();
  if (s.includes("p1") || s.includes("sev1") || s.includes("critical")) return "Critical";
  if (s.includes("p2") || s.includes("sev2") || s.includes("high")) return "High";
  if (s.includes("p3") || s.includes("sev3") || s.includes("medium")) return "Medium";
  if (s.includes("p4") || s.includes("low")) return "Low";
  return severity;
}
