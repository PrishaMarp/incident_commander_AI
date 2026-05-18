/** Slack mrkdwn preview — parse and render on the same normalized string. */

import type { ReactNode } from "react";

function renderInline(text: string, keyPrefix: string): ReactNode[] {
  const parts: ReactNode[] = [];
  const re = /(`[^`]+`|\*[^*]+\*|_[^_]+_|<!here>|<@[^>]+>|<[^|>]+\|[^>]+>|https?:\/\/[^\s>]+)/g;
  let last = 0;
  let i = 0;
  let m: RegExpExecArray | null;

  while ((m = re.exec(text)) !== null) {
    if (m.index > last) parts.push(text.slice(last, m.index));
    const token = m[0];
    const k = `${keyPrefix}-${i++}`;

    if (token.startsWith("`")) {
      parts.push(
        <code
          key={k}
          className="rounded px-1 py-0.5 font-mono text-[11px]"
          style={{ background: "color-mix(in srgb, var(--color-accent) 12%, #f4f4f4)" }}
        >
          {token.slice(1, -1)}
        </code>
      );
    } else if (token.startsWith("*")) {
      parts.push(
        <strong key={k} className="font-semibold text-[#1d1c1d]">
          {token.slice(1, -1)}
        </strong>
      );
    } else if (token.startsWith("_")) {
      parts.push(
        <em key={k} className="text-[#616061]">
          {token.slice(1, -1)}
        </em>
      );
    } else if (token === "<!here>") {
      parts.push(
        <span
          key={k}
          className="rounded px-1 font-medium"
          style={{ background: "#e8f5fa", color: "#1264a3" }}
        >
          @here
        </span>
      );
    } else if (token.startsWith("<") && token.includes("|")) {
      const [url, label] = token.slice(1, -1).split("|");
      parts.push(
        <a key={k} href={url} className="text-[#1264a3] hover:underline" target="_blank" rel="noreferrer">
          {label}
        </a>
      );
    } else if (token.startsWith("http")) {
      parts.push(
        <a key={k} href={token} className="text-[#1264a3] hover:underline" target="_blank" rel="noreferrer">
          {token}
        </a>
      );
    } else {
      parts.push(token);
    }
    last = m.index + token.length;
  }

  if (last < text.length) parts.push(text.slice(last));
  return parts;
}

/** First line is headline (emoji + bold); rest is structured body. */
function renderLine(line: string, idx: number): ReactNode {
  const trimmed = line.trim();
  if (!trimmed) return <div key={idx} className="h-1" />;

  const headlineMatch = trimmed.match(/^([🔴🟠🟡🔵])\s+(\*.+\*)(?:\s+<!here>)?$/);
  if (headlineMatch) {
    const emoji = headlineMatch[1];
    const boldMatch = headlineMatch[2].match(/^\*([^*]+)\*$/);
    const hasHere = trimmed.includes("<!here>");
    return (
      <p key={idx} className="text-[#1d1c1d]">
        <span className="mr-1">{emoji}</span>
        {boldMatch ? (
          <strong className="font-semibold">{boldMatch[1]}</strong>
        ) : (
          renderInline(headlineMatch[2], `h${idx}`)
        )}
        {hasHere && (
          <span
            className="ml-1.5 rounded px-1 text-[11px] font-medium"
            style={{ background: "#e8f5fa", color: "#1264a3" }}
          >
            @here
          </span>
        )}
      </p>
    );
  }

  const isBullet = /^[•]\s/.test(trimmed) || /^\d+\.\s/.test(trimmed);
  const body = trimmed.replace(/^[•]\s/, "").replace(/^\d+\.\s/, "");
  const isLabelLine = /^\*[^*]+:\*/.test(body);

  return (
    <p
      key={idx}
      className={
        isBullet ? "pl-4 text-[#1d1c1d]" : isLabelLine ? "text-[#1d1c1d]" : "text-[#1d1c1d]"
      }
    >
      {isBullet && <span className="-ml-4 mr-2 inline-block w-3 text-[#616061]">•</span>}
      {renderInline(body, `l${idx}`)}
    </p>
  );
}

export function SlackPreview({
  channel,
  message,
  status,
}: {
  channel: string;
  message: string;
  status?: string;
}) {
  const lines = message.split("\n");

  return (
    <div
      className="overflow-hidden rounded-lg border text-[13px] leading-[1.45]"
      style={{
        borderColor: "#e8e8e8",
        background: "#ffffff",
        boxShadow: "0 1px 3px rgba(0,0,0,0.06)",
      }}
    >
      <div
        className="flex items-center gap-2 border-b px-3 py-2"
        style={{ borderColor: "#e8e8e8", background: "#f8f8f8" }}
      >
        <span className="text-base leading-none">💬</span>
        <span className="font-semibold text-[#1d1c1d]">{channel}</span>
        {status && (
          <span
            className="ml-auto rounded-full px-2 py-0.5 text-[10px] font-medium uppercase tracking-wide"
            style={{ background: "#fff4e5", color: "#9a6700" }}
          >
            {status}
          </span>
        )}
      </div>
      <div className="space-y-1.5 px-3 py-3">{lines.map((line, idx) => renderLine(line, idx))}</div>
    </div>
  );
}
