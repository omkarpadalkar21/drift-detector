import * as React from "react";
import { cn } from "@/lib/utils";
import { Severity } from "@/types/contracts";

interface SeverityBadgeProps {
  severity: Severity;
  className?: string;
}

const severityConfig = {
  critical: {
    bg: "bg-severity-critical/10 hover:bg-severity-critical/15",
    text: "text-severity-critical border-severity-critical/30",
    label: "Critical",
  },
  high: {
    bg: "bg-severity-high/10 hover:bg-severity-high/15",
    text: "text-severity-high border-severity-high/30",
    label: "High",
  },
  medium: {
    bg: "bg-severity-medium/10 hover:bg-severity-medium/15",
    text: "text-severity-medium border-severity-medium/30",
    label: "Medium",
  },
  low: {
    bg: "bg-severity-low/10 hover:bg-severity-low/15",
    text: "text-severity-low border-severity-low/30",
    label: "Low",
  },
};

export function SeverityBadge({ severity, className }: SeverityBadgeProps) {
  const config = severityConfig[severity] || severityConfig.low;

  return (
    <span
      className={cn(
        "inline-flex items-center rounded-full border px-2.5 py-0.5 text-xs font-semibold transition-colors duration-150 uppercase tracking-wider select-none",
        config.bg,
        config.text,
        className
      )}
    >
      {config.label}
    </span>
  );
}
