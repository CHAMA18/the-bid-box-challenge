"use client";

import { motion, useReducedMotion } from "framer-motion";
import type { ReactNode } from "react";
import { cn } from "@/lib/utils";

/** Scroll-triggered reveal wrapper used across all sections. */
export function Reveal({
  children,
  delay = 0,
  y = 28,
  className,
}: {
  children: ReactNode;
  delay?: number;
  y?: number;
  className?: string;
}) {
  const reduce = useReducedMotion();
  return (
    <motion.div
      className={className}
      initial={reduce ? false : { opacity: 0, y }}
      whileInView={{ opacity: 1, y: 0 }}
      viewport={{ once: true, margin: "-80px" }}
      transition={{ duration: 0.7, delay, ease: [0.22, 1, 0.36, 1] }}
    >
      {children}
    </motion.div>
  );
}

/** Section eyebrow: red tick + mono label. */
export function Eyebrow({
  children,
  tone = "dark",
  className,
}: {
  children: ReactNode;
  tone?: "dark" | "light";
  className?: string;
}) {
  return (
    <p
      className={cn(
        "flex items-center gap-2.5 font-code text-[11px] font-semibold uppercase tracking-[0.28em]",
        tone === "dark" ? "text-ink-500" : "text-ink-300",
        className
      )}
    >
      <span
        className={cn("inline-block h-[2px] w-6", tone === "dark" ? "bg-brand-600" : "bg-brand-400")}
        aria-hidden="true"
      />
      {children}
    </p>
  );
}
