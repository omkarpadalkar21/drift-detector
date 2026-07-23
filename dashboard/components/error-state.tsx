import React from "react";
import { AlertCircle } from "lucide-react";
import { Button } from "@/components/ui/button";

interface ErrorStateProps {
  title?: string;
  description: string;
  actionText?: string;
  onRetry?: () => void;
}

export function ErrorState({
  title = "Something went wrong",
  description,
  actionText = "Try Again",
  onRetry,
}: ErrorStateProps) {
  return (
    <div className="flex flex-col items-center justify-center p-8 text-center border border-destructive/20 rounded-xl bg-destructive/5 min-h-[300px] select-none">
      <div className="flex items-center justify-center w-16 h-16 rounded-full bg-destructive/10 border border-destructive/20 text-destructive mb-4">
        <AlertCircle className="h-8 w-8" />
      </div>
      <h3 className="text-lg font-semibold tracking-tight text-destructive">{title}</h3>
      <p className="text-sm text-muted-foreground mt-2 max-w-sm leading-relaxed">
        {description}
      </p>
      {onRetry && (
        <Button
          onClick={onRetry}
          variant="outline"
          className="mt-6 font-medium cursor-pointer border-destructive/30 hover:bg-destructive/10 text-destructive hover:text-destructive"
          size="sm"
        >
          {actionText}
        </Button>
      )}
    </div>
  );
}
