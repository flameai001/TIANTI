"use client";

import { motion, useReducedMotion } from "framer-motion";
import { cn } from "@/lib/cn";

interface PublicRevealProps {
  children: React.ReactNode;
  className?: string;
  delay?: number;
  y?: number;
}

export function PublicReveal({ children, className, delay = 0, y = 24 }: PublicRevealProps) {
  const prefersReducedMotion = useReducedMotion();

  return (
    <motion.div
      className={cn(className)}
      initial={prefersReducedMotion ? false : { opacity: 0, y }}
      whileInView={prefersReducedMotion ? undefined : { opacity: 1, y: 0 }}
      viewport={{ once: true, amount: 0.2 }}
      transition={{ duration: 0.55, delay, ease: [0.22, 1, 0.36, 1] }}
    >
      {children}
    </motion.div>
  );
}
