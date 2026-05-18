import { useCallback, useState } from "react";
import type { CommsPayload } from "../types";
import { copyText } from "../utils/clipboard";
import {
  buildIncidentReportMarkdown,
  downloadMarkdownReport,
  incidentReportFilename,
  type IncidentReportInput,
} from "../utils/incidentReport";

function ActionBtn({
  label,
  onClick,
  disabled,
  title,
}: {
  label: string;
  onClick: () => void;
  disabled?: boolean;
  title?: string;
}) {
  return (
    <button
      type="button"
      title={title}
      disabled={disabled}
      onClick={onClick}
      className="rounded-md border border-[var(--color-panel-border)] bg-[var(--color-surface-elevated)] px-2 py-1 text-[10px] font-medium text-[var(--color-muted)] transition hover:border-[var(--color-accent)] hover:text-[var(--color-text)] disabled:cursor-not-allowed disabled:opacity-40"
    >
      {label}
    </button>
  );
}

export function SummaryHeaderActions({
  reportInput,
  canExport,
}: {
  reportInput: IncidentReportInput;
  canExport: boolean;
}) {
  const [exportLabel, setExportLabel] = useState("Export");

  const onExport = useCallback(() => {
    const md = buildIncidentReportMarkdown(reportInput);
    downloadMarkdownReport(md, incidentReportFilename(reportInput.scenario));
    setExportLabel("Downloaded");
    window.setTimeout(() => setExportLabel("Export"), 2000);
  }, [reportInput]);

  return (
    <ActionBtn
      label={exportLabel}
      onClick={onExport}
      disabled={!canExport}
      title="Download markdown incident report"
    />
  );
}

export function CopySlackButton({ comms }: { comms: CommsPayload }) {
  const [label, setLabel] = useState("Copy");

  const onCopy = useCallback(async () => {
    const text = `*${comms.channel}*\n\n${comms.message.trim()}`;
    const ok = await copyText(text);
    setLabel(ok ? "Copied!" : "Failed");
    window.setTimeout(() => setLabel("Copy"), 2000);
  }, [comms]);

  return (
    <ActionBtn label={label} onClick={onCopy} title="Copy Slack message to clipboard" />
  );
}
