"use client";

import React, { useState } from "react";
import { useSession } from "@/lib/auth-client";
import { motion, AnimatePresence } from "framer-motion";
import { ShieldCheck, ShieldAlert, GitBranch, ArrowRight, Play, Globe, Loader2 } from "lucide-react";
import { Button } from "@/components/ui/button";
import { Input } from "@/components/ui/input";
import { Card, CardContent, CardDescription, CardHeader, CardTitle } from "@/components/ui/card";
import { ScanProgress } from "@/components/scan-progress";
import Link from "next/link";
import { useRouter } from "next/navigation";

export default function Home() {
  const { data: session, isPending } = useSession();
  const [scanUrl, setScanUrl] = useState("");
  const [scanId, setScanId] = useState<string | null>(null);
  const [loading, setLoading] = useState(false);
  const [error, setError] = useState<string | null>(null);

  const router = useRouter();

  const handleScanSubmit = async (e: React.FormEvent) => {
    e.preventDefault();
    if (!scanUrl) return;

    setLoading(true);
    setError(null);

    try {
      const res = await fetch("/api/scan", {
        method: "POST",
        headers: {
          "Content-Type": "application/json",
        },
        body: JSON.stringify({ url: scanUrl }),
      });

      const data = await res.json();

      if (!res.ok) {
        throw new Error(data.error || "Failed to initiate scan");
      }

      setScanId(data.scan_id);
    } catch (err: unknown) {
      const errorMessage = err instanceof Error ? err.message : "An unexpected error occurred.";
      setError(errorMessage);
    } finally {
      setLoading(false);
    }
  };

  const handleDemoFill = () => {
    setScanUrl("https://github.com/acme/payments-infra");
  };

  if (isPending) {
    return (
      <div className="flex flex-col items-center justify-center flex-1 py-32">
        <Loader2 className="h-8 w-8 animate-spin text-primary" />
        <p className="text-sm text-muted-foreground mt-2 animate-pulse">Loading dashboard...</p>
      </div>
    );
  }

  return (
    <div className="flex flex-col items-center justify-center flex-1 max-w-4xl mx-auto w-full py-12 md:py-24">
      <AnimatePresence mode="wait">
        {scanId ? (
          // Active Scan Progress Screen
          <motion.div
            key="progress"
            initial={{ opacity: 0, scale: 0.95 }}
            animate={{ opacity: 1, scale: 1 }}
            exit={{ opacity: 0, scale: 0.95 }}
            className="w-full animate-fadeIn"
          >
            <ScanProgress scanId={scanId} onComplete={(repoId) => router.push(`/repos/${repoId}`)} />
          </motion.div>
        ) : session?.user ? (
          // Authenticated Scanner Form
          <motion.div
            key="scanner-form"
            initial={{ opacity: 0, y: 15 }}
            animate={{ opacity: 1, y: 0 }}
            exit={{ opacity: 0, y: -15 }}
            className="w-full max-w-xl mx-auto space-y-6"
          >
            <Card className="border border-border bg-card shadow-md">
              <CardHeader className="text-center">
                <CardTitle className="text-2xl font-bold tracking-tight">Initiate Security Scan</CardTitle>
                <CardDescription>
                  Enter a Git repository URL to scan for infrastructure configuration drift
                </CardDescription>
              </CardHeader>
              <CardContent>
                <form onSubmit={handleScanSubmit} className="space-y-4">
                  {error && (
                    <div className="p-3 bg-destructive/10 border border-destructive/20 rounded-md text-xs text-destructive animate-fadeIn">
                      {error}
                    </div>
                  )}

                  <div className="space-y-2">
                    <label className="text-xs font-semibold text-muted-foreground uppercase tracking-wider block">
                      Repository URL
                    </label>
                    <div className="relative">
                      <Globe className="absolute left-3 top-2.5 h-4 w-4 text-muted-foreground" />
                      <Input
                        type="url"
                        placeholder="https://github.com/user/repo"
                        value={scanUrl}
                        onChange={(e) => setScanUrl(e.target.value)}
                        className="pl-9 bg-muted/20 border-border"
                        disabled={loading}
                        required
                      />
                    </div>
                  </div>

                  <Button type="submit" className="w-full font-medium cursor-pointer" disabled={loading || !scanUrl}>
                    {loading ? (
                      <>
                        <Loader2 className="h-4 w-4 animate-spin mr-2" />
                        Initiating...
                      </>
                    ) : (
                      <>
                        <Play className="h-4 w-4 mr-2" />
                        Start Scan
                      </>
                    )}
                  </Button>
                </form>

                <div className="mt-4 flex items-center justify-between text-xs text-muted-foreground">
                  <span>Demo Repository:</span>
                  <button
                    onClick={handleDemoFill}
                    className="text-primary hover:underline font-semibold flex items-center gap-1 cursor-pointer"
                  >
                    try the demo repo (acme/payments-infra) <ArrowRight className="h-3 w-3" />
                  </button>
                </div>
              </CardContent>
            </Card>
          </motion.div>
        ) : (
          // Unauthenticated Landing Page Screen
          <motion.div
            key="landing"
            initial={{ opacity: 0, y: 15 }}
            animate={{ opacity: 1, y: 0 }}
            exit={{ opacity: 0, y: -15 }}
            className="w-full flex flex-col items-center"
          >
            <div className="text-center space-y-6 max-w-2xl">
              {/* Badge */}
              <div className="inline-flex items-center space-x-2 px-3 py-1 rounded-full border border-border bg-muted/50 text-xs text-muted-foreground">
                <span className="relative flex h-2 w-2">
                  <span className="animate-ping absolute inline-flex h-full w-full rounded-full bg-emerald-400 opacity-75"></span>
                  <span className="relative inline-flex rounded-full h-2 w-2 bg-emerald-500"></span>
                </span>
                <span>System active: Monitoring Configuration Drift</span>
              </div>

              {/* Title */}
              <h1 className="text-4xl font-extrabold tracking-tight sm:text-5xl md:text-6xl text-foreground font-sans">
                Configuration Drift Security Scanner
              </h1>

              {/* Subtitle */}
              <p className="text-lg md:text-xl text-muted-foreground font-sans leading-relaxed">
                DriftGuard detects, analyzes, and remediates security misconfigurations and drift across your Git repositories in real-time.
              </p>

              {/* Actions */}
              <div className="flex flex-col sm:flex-row items-center justify-center gap-4 pt-4">
                <Link href="/sign-in" className="w-full sm:w-auto">
                  <Button size="lg" className="w-full sm:w-auto font-medium gap-2 cursor-pointer">
                    Get Started <ArrowRight className="h-4 w-4" />
                  </Button>
                </Link>
                <Link href="/api-docs" className="w-full sm:w-auto">
                  <Button variant="outline" size="lg" className="w-full sm:w-auto font-medium cursor-pointer">
                    Explore API Specs
                  </Button>
                </Link>
              </div>
            </div>

            {/* Feature Grid */}
            <div className="grid grid-cols-1 md:grid-cols-3 gap-6 w-full mt-16 md:mt-24">
              <div className="flex flex-col items-start p-6 rounded-xl border border-border bg-card hover:bg-muted/30 transition-all">
                <div className="p-3 bg-primary/10 rounded-lg border border-primary/20 text-primary mb-4">
                  <GitBranch className="h-6 w-6" />
                </div>
                <h3 className="font-semibold text-lg mb-2">Git-Level Auditing</h3>
                <p className="text-sm text-muted-foreground">
                  Automatically track history, commit authors, and timeline changes to pinpoint exactly when drift was introduced.
                </p>
              </div>

              <div className="flex flex-col items-start p-6 rounded-xl border border-border bg-card hover:bg-muted/30 transition-all">
                <div className="p-3 bg-severity-high/10 rounded-lg border border-severity-high/20 text-severity-high mb-4">
                  <ShieldAlert className="h-6 w-6" />
                </div>
                <h3 className="font-semibold text-lg mb-2">Severity Mapping</h3>
                <p className="text-sm text-muted-foreground">
                  Rank findings by severity (Critical, High, Medium, Low) and confidence metrics to focus on real security vulnerabilities.
                </p>
              </div>

              <div className="flex flex-col items-start p-6 rounded-xl border border-border bg-card hover:bg-muted/30 transition-all">
                <div className="p-3 bg-emerald-500/10 rounded-lg border border-emerald-500/20 text-emerald-500 mb-4">
                  <ShieldCheck className="h-6 w-6" />
                </div>
                <h3 className="font-semibold text-lg mb-2">LLM Remediations</h3>
                <p className="text-sm text-muted-foreground">
                  Get instant contextual AI explanations, custom security rules, and drop-in fixes to resolve drift before deployment.
                </p>
              </div>
            </div>
          </motion.div>
        )}
      </AnimatePresence>
    </div>
  );
}
