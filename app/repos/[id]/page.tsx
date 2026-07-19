"use client";

import React, { useEffect, useState, useMemo } from "react";
import { Card, CardContent, CardHeader, CardTitle, CardDescription } from "@/components/ui/card";
import { Button } from "@/components/ui/button";
import { Skeleton } from "@/components/ui/skeleton";
import { AnimatedCounter } from "@/components/animated-counter";
import { ScanProgress } from "@/components/scan-progress";
import { ErrorState } from "@/components/error-state";
import { Finding, Severity } from "@/types/contracts";
import { FindingsTable } from "@/components/findings-table";
import {
  ArrowLeft,
  Calendar,
  AlertTriangle,
  Play,
  FileCode,
  TrendingUp,
  Zap,
} from "lucide-react";
import Link from "next/link";
import { useRouter } from "next/navigation";
import { motion, AnimatePresence, useReducedMotion } from "framer-motion";

interface RepoDetailResponse {
  id: string;
  url: string;
  name: string;
  last_scan_at: string | null;
  latest_drift_score: number | null;
  latest_report: {
    repo: string;
    drift_score: number;
    summary: {
      changes_scanned: number;
      critical: number;
      high: number;
      medium: number;
      low: number;
    };
    findings: Finding[];
    trend: { date: string; score: number }[];
  } | null;
}

export default function RepoDetailPage({ params }: { params: Promise<{ id: string }> }) {
  const resolvedParams = React.use(params);
  const repoId = resolvedParams.id;
  const router = useRouter();
  const shouldReduceMotion = useReducedMotion();

  const [repoData, setRepoData] = useState<RepoDetailResponse | null>(null);
  const [loading, setLoading] = useState(true);
  const [error, setError] = useState<string | null>(null);

  // Scan trigger and status states
  const [scanningId, setScanningId] = useState<string | null>(null);
  const [triggeringScan, setTriggeringScan] = useState(false);

  const fetchRepoDetails = async () => {
    setLoading(true);
    setError(null);
    try {
      const res = await fetch(`/api/repos/${repoId}`);
      if (!res.ok) {
        if (res.status === 401) {
          router.push(`/sign-in?callbackUrl=/repos/${repoId}`);
          return;
        }
        if (res.status === 404) {
          throw new Error("Repository not found or access denied.");
        }
        throw new Error("Failed to load repository details.");
      }
      const data = await res.json();
      setRepoData(data);
    } catch (err: unknown) {
      setError(err instanceof Error ? err.message : "An unexpected error occurred.");
    } finally {
      setLoading(false);
    }
  };

  useEffect(() => {
    fetchRepoDetails();
  }, [repoId]);

  // Trigger scan API call
  const handleStartScan = async () => {
    if (!repoData || triggeringScan) return;
    setTriggeringScan(true);
    try {
      const res = await fetch("/api/scan", {
        method: "POST",
        headers: { "Content-Type": "application/json" },
        body: JSON.stringify({ url: repoData.url }),
      });
      if (!res.ok) {
        throw new Error("Failed to initialize scan.");
      }
      const data = await res.json();
      setScanningId(data.scan_id);
    } catch (err: unknown) {
      alert(err instanceof Error ? err.message : "Could not start scan.");
    } finally {
      setTriggeringScan(false);
    }
  };

  const onScanComplete = () => {
    setScanningId(null);
    fetchRepoDetails();
  };

  // Helper: Format Dates
  const formatDate = (dateStr: string | null) => {
    if (!dateStr) return "Never scanned";
    return new Date(dateStr).toLocaleString("en-US", {
      month: "short",
      day: "numeric",
      year: "numeric",
      hour: "2-digit",
      minute: "2-digit",
    });
  };

  // SVG Sparkline generator for Trend Points
  const trendSparklinePath = useMemo(() => {
    const trend = repoData?.latest_report?.trend;
    if (!trend || trend.length < 2) return "";
    const width = 500;
    const height = 100;
    const padding = 10;

    const xStep = (width - padding * 2) / (trend.length - 1);
    const points = trend.map((pt, idx) => {
      const x = padding + idx * xStep;
      // score is between 0 and 1
      const y = height - padding - pt.score * (height - padding * 2);
      return `${x.toFixed(1)},${y.toFixed(1)}`;
    });

    return `M ${points.join(" L ")}`;
  }, [repoData]);

  // Animation configuration
  const cardContainerVariants = {
    hidden: { opacity: 0 },
    show: {
      opacity: 1,
      transition: {
        staggerChildren: shouldReduceMotion ? 0 : 0.08,
      },
    },
  };

  const cardItemVariants = {
    hidden: { opacity: 0, y: shouldReduceMotion ? 0 : 15 },
    show: {
      opacity: 1,
      y: 0,
      transition: shouldReduceMotion
        ? { duration: 0 }
        : { type: "spring" as const, stiffness: 120, damping: 14 },
    },
  };

  if (loading) {
    return (
      <div className="space-y-6">
        <div className="flex items-center space-x-2">
          <Skeleton className="h-9 w-24" />
        </div>
        <div className="space-y-2">
          <Skeleton className="h-10 w-2/3" />
          <Skeleton className="h-4 w-1/3" />
        </div>
        <div className="grid grid-cols-1 md:grid-cols-3 gap-6 pt-4">
          <Skeleton className="h-32 w-full" />
          <Skeleton className="h-32 w-full" />
          <Skeleton className="h-32 w-full" />
        </div>
        <div className="pt-6">
          <Skeleton className="h-64 w-full" />
        </div>
      </div>
    );
  }

  if (error || !repoData) {
    return <ErrorState description={error || "Failed to load repo data"} onRetry={fetchRepoDetails} />;
  }

  const report = repoData.latest_report;

  return (
    <div className="space-y-6">
      {/* Back link & Actions */}
      <div className="flex flex-col sm:flex-row sm:items-center sm:justify-between gap-4">
        <Link
          href="/repos"
          className="inline-flex items-center text-sm font-medium text-muted-foreground hover:text-foreground transition-colors group cursor-pointer"
        >
          <ArrowLeft className="h-4 w-4 mr-1.5 transition-transform group-hover:-translate-x-1" />
          Back to Repositories
        </Link>

        {!scanningId && (
          <Button
            onClick={handleStartScan}
            disabled={triggeringScan}
            className="gap-2 cursor-pointer shadow-sm ml-auto sm:ml-0"
          >
            {triggeringScan ? (
              <span className="h-4 w-4 animate-spin rounded-full border-2 border-background border-t-foreground" />
            ) : (
              <Play className="h-4 w-4 fill-current" />
            )}
            Scan Now
          </Button>
        )}
      </div>

      {/* Header Info */}
      <div className="border-b border-border/60 pb-6">
        <h1 className="text-3xl font-extrabold tracking-tight">{repoData.name}</h1>
        <div className="flex flex-wrap items-center gap-x-6 gap-y-2 mt-2 text-sm text-muted-foreground">
          <span className="font-mono bg-muted/60 px-2 py-0.5 rounded text-xs select-all">{repoData.url}</span>
          <span className="flex items-center gap-1.5">
            <Calendar className="h-4 w-4" />
            Last Scanned: {formatDate(repoData.last_scan_at)}
          </span>
        </div>
      </div>

      {/* Scan in Progress UI */}
      {scanningId ? (
        <ScanProgress scanId={scanningId} onComplete={onScanComplete} />
      ) : !report ? (
        /* Empty Report State */
        <Card className="border border-border/80 bg-card p-12 text-center shadow-sm">
          <CardContent className="space-y-4 max-w-md mx-auto">
            <div className="mx-auto h-12 w-12 rounded-full bg-primary/10 text-primary flex items-center justify-center">
              <Zap className="h-6 w-6" />
            </div>
            <h3 className="text-lg font-bold text-foreground">No scans completed yet</h3>
            <p className="text-sm text-muted-foreground">
              We haven't analyzed this repository for configuration drift. Run a scan to discover security and architecture anomalies.
            </p>
            <Button onClick={handleStartScan} disabled={triggeringScan} className="cursor-pointer gap-2 mt-2">
              <Play className="h-4 w-4 fill-current" /> Run Initial Scan
            </Button>
          </CardContent>
        </Card>
      ) : (
        /* Report Presentation */
        <>
          {/* Summary Cards with Staggered Entrance */}
          <motion.div
            variants={cardContainerVariants}
            initial="hidden"
            animate="show"
            className="grid grid-cols-1 md:grid-cols-3 gap-6"
          >
            {/* Drift Score Card */}
            <motion.div variants={cardItemVariants}>
              <Card className="border border-border bg-card relative overflow-hidden shadow-sm h-full">
                <div className="absolute top-0 right-0 p-3 opacity-15">
                  <TrendingUp className="h-10 w-10 text-primary" />
                </div>
                <CardHeader className="pb-2">
                  <CardDescription className="font-bold text-xs uppercase tracking-wider text-muted-foreground">
                    Aggregate Drift Score
                  </CardDescription>
                </CardHeader>
                <CardContent className="space-y-3">
                  <div className="flex items-baseline space-x-2">
                    <span className="text-5xl font-black tracking-tight text-foreground">
                      <AnimatedCounter value={report.drift_score * 100} />
                    </span>
                    <span className="text-lg font-bold text-muted-foreground">%</span>
                  </div>
                  {/* Progress gauge */}
                  <div className="h-2 w-full bg-muted rounded-full overflow-hidden border border-border/20">
                    <motion.div
                      className={`h-full ${
                        report.drift_score >= 0.8
                          ? "bg-severity-critical"
                          : report.drift_score >= 0.5
                          ? "bg-severity-high"
                          : report.drift_score >= 0.2
                          ? "bg-severity-medium"
                          : "bg-emerald-500"
                      }`}
                      initial={{ width: 0 }}
                      animate={{ width: `${report.drift_score * 100}%` }}
                      transition={{ duration: 1.2, ease: "easeOut" }}
                    />
                  </div>
                </CardContent>
              </Card>
            </motion.div>

            {/* Findings Count Card */}
            <motion.div variants={cardItemVariants}>
              <Card className="border border-border bg-card relative overflow-hidden shadow-sm h-full">
                <div className="absolute top-0 right-0 p-3 opacity-15">
                  <AlertTriangle className="h-10 w-10 text-primary" />
                </div>
                <CardHeader className="pb-2">
                  <CardDescription className="font-bold text-xs uppercase tracking-wider text-muted-foreground">
                    Critical & High Findings
                  </CardDescription>
                </CardHeader>
                <CardContent className="space-y-1">
                  <div className="text-5xl font-black tracking-tight text-foreground">
                    <AnimatedCounter value={report.summary.critical + report.summary.high} />
                  </div>
                  <p className="text-xs text-muted-foreground font-medium pt-1">
                    <span className="text-severity-critical font-bold">{report.summary.critical}</span> Critical,{" "}
                    <span className="text-severity-high font-bold">{report.summary.high}</span> High findings.
                  </p>
                </CardContent>
              </Card>
            </motion.div>

            {/* Changes Scanned Card */}
            <motion.div variants={cardItemVariants}>
              <Card className="border border-border bg-card relative overflow-hidden shadow-sm h-full">
                <div className="absolute top-0 right-0 p-3 opacity-15">
                  <FileCode className="h-10 w-10 text-primary" />
                </div>
                <CardHeader className="pb-2">
                  <CardDescription className="font-bold text-xs uppercase tracking-wider text-muted-foreground">
                    Changes Scanned
                  </CardDescription>
                </CardHeader>
                <CardContent className="space-y-1">
                  <div className="text-5xl font-black tracking-tight text-foreground">
                    <AnimatedCounter value={report.summary.changes_scanned} />
                  </div>
                  <p className="text-xs text-muted-foreground font-medium pt-1">
                    Diff and configuration lines parsed.
                  </p>
                </CardContent>
              </Card>
            </motion.div>
          </motion.div>

          {/* Historical Trend Sparkline (Optional Premium Touch) */}
          {report.trend && report.trend.length >= 2 && (
            <Card className="border border-border bg-card shadow-sm p-4">
              <div className="flex flex-col sm:flex-row items-start sm:items-center justify-between gap-4 mb-4">
                <div>
                  <h3 className="font-bold text-sm text-foreground flex items-center gap-1.5">
                    <TrendingUp className="h-4 w-4 text-primary" /> Historical Drift Trend
                  </h3>
                  <p className="text-xs text-muted-foreground mt-0.5">
                    Aggregated drift score progression over the last 10 scans.
                  </p>
                </div>
                <div className="flex flex-wrap items-center gap-3">
                  <div className="flex items-center space-x-1 bg-muted/50 border border-border/40 px-2 py-0.5 rounded text-[10px] font-bold text-muted-foreground">
                    <span>Start: {(report.trend[0].score * 100).toFixed(0)}%</span>
                    <span>→</span>
                    <span>End: {(report.trend[report.trend.length - 1].score * 100).toFixed(0)}%</span>
                  </div>
                  <Link href={`/repos/${repoId}/trend`}>
                    <Button variant="outline" size="sm" className="text-xs font-semibold gap-1.5 cursor-pointer">
                      <TrendingUp className="h-3.5 w-3.5" /> View Trend Analytics
                    </Button>
                  </Link>
                </div>
              </div>
              <div className="relative h-20 w-full bg-muted/10 rounded border border-border/20 flex items-center justify-center p-2">
                <svg
                  className="w-full h-full text-primary"
                  viewBox="0 0 500 100"
                  preserveAspectRatio="none"
                  fill="none"
                >
                  {/* SVG Line */}
                  <motion.path
                    d={trendSparklinePath}
                    stroke="currentColor"
                    strokeWidth="3"
                    strokeLinecap="round"
                    strokeLinejoin="round"
                    initial={{ pathLength: 0 }}
                    animate={{ pathLength: 1 }}
                    transition={{ duration: 1.5, ease: "easeInOut" }}
                  />
                  {/* Grid helper dots */}
                  {report.trend.map((pt, idx) => {
                    const width = 500;
                    const height = 100;
                    const padding = 10;
                    const xStep = (width - padding * 2) / (report.trend.length - 1);
                    const cx = padding + idx * xStep;
                    const cy = height - padding - pt.score * (height - padding * 2);
                    return (
                      <circle
                        key={idx}
                        cx={cx}
                        cy={cy}
                        r="4.5"
                        className="fill-background stroke-primary stroke-2"
                      />
                    );
                  })}
                </svg>
              </div>
            </Card>
          )}

          {/* Findings Table */}
          <div className="pt-4">
            <FindingsTable findings={report.findings} />
          </div>
        </>
      )}
    </div>
  );
}
