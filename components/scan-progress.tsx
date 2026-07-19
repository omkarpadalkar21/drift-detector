"use client";

import React, { useEffect, useState } from "react";
import { Check, Loader2, AlertTriangle } from "lucide-react";
import { motion, AnimatePresence } from "framer-motion";
import { Card, CardContent, CardHeader, CardTitle, CardDescription } from "@/components/ui/card";

interface ScanProgressProps {
  scanId: string;
  onComplete: (repoId: string) => void;
}

type ScanStage = "queued" | "cloning" | "mining" | "analyzing" | "completed" | "failed";

interface StageInfo {
  label: string;
  description: string;
}

const STAGES: Record<Exclude<ScanStage, "completed" | "failed">, StageInfo> = {
  queued: { label: "Queueing Scan", description: "Waiting for scan worker assignment..." },
  cloning: { label: "Cloning Repository", description: "Downloading git repository contents..." },
  mining: { label: "Mining Git History", description: "Extracting commit authors, files, and times..." },
  analyzing: { label: "Analyzing Drift", description: "Evaluating configuration state changes..." },
};

const STAGE_ORDER: Exclude<ScanStage, "completed" | "failed">[] = ["queued", "cloning", "mining", "analyzing"];

export function ScanProgress({ scanId, onComplete }: ScanProgressProps) {
  const [status, setStatus] = useState<ScanStage>("queued");
  const [error, setError] = useState<string | null>(null);
  const [progress, setProgress] = useState(10);
  const [, setRepoId] = useState<string | null>(null);

  useEffect(() => {
    let intervalId: NodeJS.Timeout | undefined = undefined;

    const checkStatus = async () => {
      try {
        const res = await fetch(`/api/scans/${scanId}`);
        if (!res.ok) {
          throw new Error("Failed to fetch scan details");
        }
        const data = await res.json();

        setStatus(data.status);
        setRepoId(data.repoId);

        if (data.status === "completed") {
          setProgress(100);
          clearInterval(intervalId);
          // Wait a short moment to show completion before transitioning
          setTimeout(() => {
            if (data.repoId) {
              onComplete(data.repoId);
            }
          }, 1000);
        } else if (data.status === "failed") {
          setProgress(100);
          setError(data.error || "Scan failed unexpectedly.");
          clearInterval(intervalId);
        } else {
          // Dynamic progress mapping
          if (data.status === "queued") setProgress(15);
          else if (data.status === "cloning") setProgress(40);
          else if (data.status === "mining") setProgress(65);
          else if (data.status === "analyzing") setProgress(88);
        }
      } catch (err: unknown) {
        console.error("Polling error:", err);
      }
    };

    // Initial check
    checkStatus();
    // Start polling
    intervalId = setInterval(checkStatus, 1500);

    return () => clearInterval(intervalId);
  }, [scanId, onComplete]);

  // Determine helper index for active state
  const currentStageIndex = STAGE_ORDER.indexOf(status as Exclude<ScanStage, "completed" | "failed">);
  const isFinished = status === "completed" || status === "failed";

  return (
    <Card className="w-full max-w-xl mx-auto border border-border bg-card mt-8 overflow-hidden shadow-md">
      <CardHeader className="border-b border-border/55 pb-4">
        <CardTitle className="text-xl font-bold flex items-center justify-between">
          <span>Drift Analysis in Progress</span>
          {status !== "completed" && status !== "failed" && (
            <Loader2 className="h-5 w-5 animate-spin text-primary" />
          )}
        </CardTitle>
        <CardDescription>
          Scan ID: <span className="font-mono text-xs">{scanId}</span>
        </CardDescription>
      </CardHeader>

      <CardContent className="pt-6 space-y-6">
        {/* Progress Bar Container */}
        <div className="space-y-2">
          <div className="flex justify-between text-xs text-muted-foreground font-semibold uppercase tracking-wider">
            <span>Progress</span>
            <span>{progress}%</span>
          </div>
          <div className="h-2 w-full bg-muted rounded-full overflow-hidden border border-border/20">
            <motion.div
              className={`h-full ${status === "failed" ? "bg-destructive" : "bg-primary"}`}
              initial={{ width: "10%" }}
              animate={{ width: `${progress}%` }}
              transition={{ duration: 0.3 }}
            />
          </div>
        </div>

        {/* Polling Stages Timeline */}
        {error ? (
          <div className="p-4 bg-destructive/10 border border-destructive/20 rounded-lg text-sm text-destructive flex items-start space-x-3">
            <AlertTriangle className="h-5 w-5 shrink-0 mt-0.5" />
            <div>
              <p className="font-semibold">Analysis Failed</p>
              <p className="text-xs text-destructive/80 mt-1">{error}</p>
            </div>
          </div>
        ) : (
          <div className="space-y-4 relative">
            {STAGE_ORDER.map((stageKey, index) => {
              const stage = STAGES[stageKey];

              // Compute state
              const isCompleted = isFinished || currentStageIndex > index;
              const isActive = status === stageKey;
              const isPending = !isCompleted && !isActive;

              return (
                <div
                  key={stageKey}
                  className={`flex items-start space-x-4 transition-all duration-300 ${
                    isPending ? "opacity-35" : "opacity-100"
                  }`}
                >
                  {/* Stage Icon */}
                  <div className="flex items-center justify-center mt-1">
                    {isCompleted ? (
                      <div className="h-6 w-6 rounded-full bg-emerald-500/10 border border-emerald-500/30 text-emerald-500 flex items-center justify-center">
                        <Check className="h-3.5 w-3.5" />
                      </div>
                    ) : isActive ? (
                      <div className="h-6 w-6 rounded-full bg-primary/10 border border-primary/30 text-primary flex items-center justify-center">
                        <Loader2 className="h-3.5 w-3.5 animate-spin" />
                      </div>
                    ) : (
                      <div className="h-6 w-6 rounded-full bg-muted border border-border text-muted-foreground flex items-center justify-center text-xs font-semibold select-none">
                        {index + 1}
                      </div>
                    )}
                  </div>

                  {/* Stage Info */}
                  <div className="flex-1 space-y-1">
                    <p className={`text-sm font-semibold leading-none ${isActive ? "text-primary" : "text-foreground"}`}>
                      {stage.label}
                    </p>
                    <p className="text-xs text-muted-foreground">{stage.description}</p>
                  </div>
                </div>
              );
            })}
          </div>
        )}

        <AnimatePresence>
          {status === "completed" && (
            <motion.div
              initial={{ opacity: 0, height: 0 }}
              animate={{ opacity: 1, height: "auto" }}
              className="text-center text-xs font-medium text-emerald-500 pt-2"
            >
              Scan Completed! Redirecting to report...
            </motion.div>
          )}
        </AnimatePresence>
      </CardContent>
    </Card>
  );
}
