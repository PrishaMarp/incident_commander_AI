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
    .slice(0, 220);

  return { cause: cause || null, confidence };
}

export function extractRemediationActions(text: string, max = 3): string[] {
  const section =
    text.match(/##\s*Immediate actions[^\n]*\n([\s\S]*?)(?=\n##|\n$)/i)?.[1] ??
    text.match(/immediate actions[^\n]*\n([\s\S]*?)(?=\n##|\n$)/i)?.[1] ??
    text;

  const lines = section.split("\n");
  const actions: string[] = [];

  for (const line of lines) {
    const trimmed = line.trim();
    const numbered = trimmed.match(/^\d+\.\s+(.+)/);
    const bulleted = trimmed.match(/^[-*•]\s+(.+)/);
    const step = (numbered?.[1] ?? bulleted?.[1])?.replace(/\*\*/g, "").trim();
    if (step && step.length > 8) {
      actions.push(step.slice(0, 140));
      if (actions.length >= max) break;
    }
  }

  return actions;
}

export function severityEmoji(severity: string): string {
  const s = severity.toLowerCase();
  if (s.includes("sev1") || s.includes("critical") || s === "p0") return "🔴";
  if (s.includes("sev2") || s.includes("high") || s === "p1") return "🟠";
  if (s.includes("sev3") || s.includes("medium") || s === "p2") return "🟡";
  return "🔵";
}
