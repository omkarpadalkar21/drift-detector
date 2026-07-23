"use client";

import React, { useEffect, useState, useMemo } from "react";
import { useReducedMotion } from "framer-motion";
import {
  AreaChart,
  Area,
  XAxis,
  YAxis,
  CartesianGrid,
  Tooltip,
  ResponsiveContainer,
  ReferenceDot,
} from "recharts";

interface TrendPoint {
  date: string;
  score: number;
}

interface TrendChartProps {
  trend: TrendPoint[];
}

export function TrendChart({ trend }: TrendChartProps) {
  const [mounted, setMounted] = useState(false);
  const shouldReduceMotion = useReducedMotion();

  useEffect(() => {
    setMounted(true);
  }, []);

  const { chartData, peakPoint, latestPoint } = useMemo(() => {
    if (!trend || trend.length === 0) {
      return { chartData: [], peakPoint: null, latestPoint: null };
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

    return {
      chartData: formatted,
      peakPoint: peak,
      latestPoint: latest,
    };
  }, [trend]);

  if (!mounted) {
    return (
      <div className="h-[360px] flex items-center justify-center border border-dashed border-border/80 rounded-lg bg-card/50">
        <span className="text-xs text-muted-foreground animate-pulse">Initializing analytics...</span>
      </div>
    );
  }

  if (chartData.length === 0) {
    return (
      <div className="h-[360px] flex items-center justify-center border border-dashed border-border/80 rounded-lg bg-card/50 text-xs text-muted-foreground">
        No trend data available.
      </div>
    );
  }

  return (
    <div className="w-full h-[360px] select-none">
      <ResponsiveContainer width="100%" height="100%">
        <AreaChart data={chartData} margin={{ top: 20, right: 35, left: -10, bottom: 0 }}>
          <defs>
            <linearGradient id="trendGradient" x1="0" y1="0" x2="0" y2="1">
              <stop offset="5%" stopColor="hsl(var(--primary))" stopOpacity={0.25} />
              <stop offset="95%" stopColor="hsl(var(--primary))" stopOpacity={0} />
            </linearGradient>
          </defs>
          <CartesianGrid strokeDasharray="3 3" vertical={false} stroke="var(--border)" opacity={0.35} />
          <XAxis
            dataKey="formattedDate"
            stroke="var(--muted-foreground)"
            fontSize={11}
            tickLine={false}
            axisLine={false}
            dy={8}
          />
          <YAxis
            stroke="var(--muted-foreground)"
            fontSize={11}
            tickLine={false}
            axisLine={false}
            domain={[0, 100]}
            tickFormatter={(v) => `${v}%`}
            dx={-8}
          />
          <Tooltip
            contentStyle={{
              backgroundColor: "var(--card)",
              borderColor: "var(--border)",
              borderRadius: "8px",
              color: "var(--foreground)",
              fontSize: "12px",
              boxShadow: "0 4px 6px -1px rgb(0 0 0 / 0.1)",
            }}
            formatter={(value: any) => [`${value}%`, "Drift Score"]}
            labelFormatter={(label) => `Scan Date: ${label}`}
          />
          <Area
            type="monotone"
            dataKey="score"
            stroke="hsl(var(--primary))"
            strokeWidth={3}
            fillOpacity={1}
            fill="url(#trendGradient)"
            isAnimationActive={!shouldReduceMotion}
          />

          {/* Peak point reference marker */}
          {peakPoint && (
            <ReferenceDot
              x={peakPoint.formattedDate}
              y={peakPoint.score}
              r={5}
              fill="var(--severity-critical)"
              stroke="var(--background)"
              strokeWidth={2}
              label={{
                value: `Peak: ${peakPoint.score.toFixed(0)}%`,
                position: "top",
                fill: "hsl(var(--foreground))",
                fontSize: 10,
                fontWeight: "600",
              }}
            />
          )}

          {/* Latest point reference marker */}
          {latestPoint && latestPoint.formattedDate !== peakPoint?.formattedDate && (
            <ReferenceDot
              x={latestPoint.formattedDate}
              y={latestPoint.score}
              r={5}
              fill="hsl(var(--primary))"
              stroke="var(--background)"
              strokeWidth={2}
              label={{
                value: `Current: ${latestPoint.score.toFixed(0)}%`,
                position: "top",
                fill: "hsl(var(--foreground))",
                fontSize: 10,
                fontWeight: "600",
              }}
            />
          )}
        </AreaChart>
      </ResponsiveContainer>
    </div>
  );
}
