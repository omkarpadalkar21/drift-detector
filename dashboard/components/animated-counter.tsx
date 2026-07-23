"use client";

import React, { useEffect } from "react";
import { animate, useMotionValue, useTransform, motion } from "framer-motion";

interface AnimatedCounterProps {
  value: number;
  duration?: number; // duration in seconds
  className?: string;
}

export function AnimatedCounter({ value, duration = 0.8, className }: AnimatedCounterProps) {
  const count = useMotionValue(0);
  const rounded = useTransform(count, (latest) => Math.round(latest));

  useEffect(() => {
    const controls = animate(count, value, { duration, ease: "easeOut" });
    return () => controls.stop();
  }, [value, duration, count]);

  return <motion.span className={className}>{rounded}</motion.span>;
}
