"use client";

import React, { useEffect, useState, useMemo } from "react";
import { Card, CardContent, CardHeader, CardTitle, CardDescription } from "@/components/ui/card";
import { Button } from "@/components/ui/button";
import { Skeleton } from "@/components/ui/skeleton";
import { ErrorState } from "@/components/error-state";
import {
  ArrowLeft,
  Calendar,
  TrendingUp,
  AlertTriangle,
  Award,
  Sparkles,
  Zap,
  Info,
} from "lucide-react";
import Link from "next/link";
import { useRouter } from "next/navigation";
import { motion, useReducedMotion } from "framer-motion";
import { TrendChart } from "@/components/trend-chart";

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
    findings: any[];
    trend: { date: string; score: number }[];
  } | null;
}

export default function RepoTrendPage({ params }: { params: Promise<{ id: string }> }) {
  const resolvedParams = React.use(params);
  const repoId = resolvedParams.id;
  const router = useRouter();

  const [repoData, setRepoData] = useState<RepoDetailResponse | null>(null);
  const [loading, setLoading] = useState(true);
  const [error, setError] = useState<string | null>(null);
  const [mounted, setMounted] = useState(false);

  // Accessibility checking for prefers-reduced-motion
  const shouldReduceMotion = useReducedMotion();

  const fetchRepoDetails = async () => {
    setLoading(true);
    setError(null);
    try {
      const res = await fetch(`/api/repos/${repoId}`);
      if (!res.ok) {
        if (res.status === 401) {
          router.push(`/sign-in?callbackUrl=/repos/${repoId}/trend`);
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
    setMounted(true);
  }, [repoId]);

  // Clean Chart Data & Peak/Latest Callout Calculations
  const { chartData, peakPoint, latestPoint, netChangeText, statusText, statusColor } = useMemo(() => {
    const trend = repoData?.latest_report?.trend;
    if (!trend || trend.length === 0) {
      return {
        chartData: [],
        peakPoint: null,
        latestPoint: null,
        netChangeText: "No data",
        statusText: "Stable",
        statusColor: "text-emerald-500 bg-emerald-500/10",
      };
    }

    const formatted = trend.map((pt) => {
      const date = new Date(pt.date);
      const formattedDate = date.toLocaleDateString("en-US", {
        month: "short",
        day: "numeric",
      });
      return {
        formattedDate,
        score: parseFloat((pt.score * 100).toFixed(1)),
        rawDate: date,
      };
    });

    // Find peak and latest points
    let peak = formatted[0];
    formatted.forEach((pt) => {
      if (pt.score > peak.score) {
        peak = pt;
      }
    });

    const latest = formatted[formatted.length - 1];

    // Calculate net change
    const firstScore = formatted[0].score;
    const lastScore = latest.score;
    const diff = lastScore - firstScore;
    const netChangeText =
      diff > 0
        ? `Increased by +${diff.toFixed(1)}%`
        : diff < 0
        ? `Decreased by ${diff.toFixed(1)}%`
        : "Unchanged";

    // Set status message based on current score
    let statusText = "Excellent (Low Drift)";
    let statusColor = "text-emerald-500 bg-emerald-500/10 border-emerald-500/20";
    if (lastScore >= 80) {
      statusText = "Critical Drift (Immediate Action)";
      statusColor = "text-severity-critical bg-severity-critical/10 border-severity-critical/20";
    } else if (lastScore >= 50) {
      statusText = "High Drift (Review Configuration)";
      statusColor = "text-severity-high bg-severity-high/10 border-severity-high/20";
    } else if (lastScore >= 20) {
      statusText = "Medium Drift (Monitor Closely)";
      statusColor = "text-severity-medium bg-severity-medium/10 border-severity-medium/20";
    }

    return {
      chartData: formatted,
      peakPoint: peak,
      latestPoint: latest,
      netChangeText,
      statusText,
      statusColor,
    };
  }, [repoData]);

  if (loading) {
    return (
      <div className="space-y-6">
        <Skeleton className="h-6 w-32" />
        <Skeleton className="h-10 w-2/3" />
        <div className="grid grid-cols-1 md:grid-cols-2 gap-6 pt-4">
          <Skeleton className="h-44 w-full" />
          <Skeleton className="h-44 w-full" />
        </div>
        <Skeleton className="h-96 w-full pt-6" />
      </div>
    );
  }

  if (error || !repoData) {
    return <ErrorState description={error || "Failed to load repo trend"} onRetry={fetchRepoDetails} />;
  }

  const report = repoData.latest_report;

  return (
    <div className="space-y-6">
      {/* Header Back Button */}
      <div>
        <Link
          href={`/repos/${repoId}`}
          className="inline-flex items-center text-sm font-medium text-muted-foreground hover:text-foreground transition-colors group cursor-pointer"
        >
          <ArrowLeft className="h-4 w-4 mr-1.5 transition-transform group-hover:-translate-x-1" />
          Back to Repo Findings
        </Link>
      </div>

      {/* Title */}
      <div className="border-b border-border/60 pb-6">
        <h1 className="text-3xl font-extrabold tracking-tight">Drift Trend Analysis</h1>
        <p className="text-sm text-muted-foreground mt-1.5">
          Historical drift performance analytics for repository <span className="font-semibold text-foreground">{repoData.name}</span>
        </p>
      </div>

      {!report || chartData.length === 0 ? (
        /* Empty State */
        <Card className="border border-border/80 bg-card p-12 text-center shadow-sm">
          <CardContent className="space-y-3 max-w-md mx-auto">
            <div className="mx-auto h-12 w-12 rounded-full bg-primary/10 text-primary flex items-center justify-center">
              <Zap className="h-6 w-6" />
            </div>
            <h3 className="text-lg font-bold text-foreground">No historical trend data</h3>
            <p className="text-sm text-muted-foreground">
              Run more scans on this repository to begin charting configuration drift changes over time.
            </p>
          </CardContent>
        </Card>
      ) : (
        /* Trend Visualization Layout */
        <div className="space-y-6">
          {/* Top Cards for stats and callouts */}
          <div className="grid grid-cols-1 md:grid-cols-2 gap-6">
            {/* Latest Peak Callout */}
            <Card className="border border-border bg-card shadow-sm relative overflow-hidden">
              <div className="absolute top-0 right-0 p-3 opacity-10">
                <Award className="h-12 w-12 text-primary" />
              </div>
              <CardHeader className="pb-2">
                <CardDescription className="font-bold text-xs uppercase tracking-wider text-muted-foreground">
                  Peak Drift Score Callout
                </CardDescription>
              </CardHeader>
              <CardContent className="space-y-1.5">
                {peakPoint && (
                  <div>
                    <span className="text-4xl font-black text-foreground">{peakPoint.score.toFixed(1)}%</span>
                    <span className="text-xs text-muted-foreground ml-2">recorded on {peakPoint.formattedDate}</span>
                  </div>
                )}
                <div className="text-xs text-muted-foreground leading-relaxed pt-1.5 flex items-start gap-1.5">
                  <Sparkles className="h-4 w-4 text-primary shrink-0 mt-0.5" />
                  <span>
                    The highest drift score represents the maximum configuration disparity detected in the scan history pool.
                  </span>
                </div>
              </CardContent>
            </Card>

            {/* Performance Stats Card */}
            <Card className="border border-border bg-card shadow-sm relative overflow-hidden">
              <div className="absolute top-0 right-0 p-3 opacity-10">
                <Info className="h-12 w-12 text-primary" />
              </div>
              <CardHeader className="pb-2">
                <CardDescription className="font-bold text-xs uppercase tracking-wider text-muted-foreground">
                  Performance Summary
                </CardDescription>
              </CardHeader>
              <CardContent className="space-y-3">
                <div className="flex flex-wrap gap-2">
                  <span className={`px-2.5 py-0.5 rounded-full border text-[10px] font-bold ${statusColor}`}>
                    {statusText}
                  </span>
                  <span className="px-2.5 py-0.5 rounded-full border border-border bg-muted/60 text-[10px] font-bold text-muted-foreground">
                    {netChangeText}
                  </span>
                </div>
                <p className="text-xs text-muted-foreground leading-relaxed">
                  Calculated across <span className="font-semibold text-foreground">{chartData.length} scans</span>. Lower drift score represents higher security compliance.
                </p>
              </CardContent>
            </Card>
          </div>

          {/* Recharts Area Chart */}
          <Card className="border border-border bg-card shadow-sm">
            <CardHeader className="pb-4">
              <CardTitle className="text-lg font-bold flex items-center gap-1.5">
                <TrendingUp className="h-5 w-5 text-primary" /> Compliance Progress Chart
              </CardTitle>
              <CardDescription>
                Drift score progress over time. Hover points for date details.
              </CardDescription>
            </CardHeader>
            <CardContent className="pt-2">
              <TrendChart trend={report.trend} />
            </CardContent>
          </Card>
        </div>
      )}
    </div>
  );
}
