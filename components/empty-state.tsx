import React from "react";
import { FolderOpen } from "lucide-react";
import { Button } from "@/components/ui/button";

interface EmptyStateProps {
  title: string;
  description: string;
  icon?: React.ReactNode;
  actionText?: string;
  onAction?: () => void;
}

export function EmptyState({
  title,
  description,
  icon = <FolderOpen className="h-10 w-10 text-muted-foreground" />,
  actionText,
  onAction,
}: EmptyStateProps) {
  return (
    <div className="flex flex-col items-center justify-center p-8 text-center border border-dashed border-border rounded-xl bg-card/45 min-h-[300px] select-none">
      <div className="flex items-center justify-center w-16 h-16 rounded-full bg-muted/65 border border-border/80 mb-4">
        {icon}
      </div>
      <h3 className="text-lg font-semibold tracking-tight">{title}</h3>
      <p className="text-sm text-muted-foreground mt-2 max-w-sm leading-relaxed">
        {description}
      </p>
      {actionText && onAction && (
        <Button onClick={onAction} className="mt-6 font-medium cursor-pointer" size="sm">
          {actionText}
        </Button>
      )}
    </div>
  );
}
