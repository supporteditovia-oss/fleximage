import { AnimatePresence, motion } from "framer-motion";
import type { ReactNode } from "react";
import { cn } from "@/lib/utils";
import type { StudioMode } from "@/lib/v2-experience";

type StudioChassisProps = {
  mode: StudioMode;
  className?: string;
  children: ReactNode;
};

/** Shared visual frame — fixed height prevents layout shift between Image / Voix. */
export function StudioChassis({ mode, className, children }: StudioChassisProps) {
  return (
    <div
      className={cn(
        "lx-studio-chassis relative mx-auto w-full max-w-[420px] overflow-hidden rounded-[1.35rem] border border-[var(--lx-ink)]/6 bg-white/50",
        className,
      )}
    >
      <div className="relative min-h-[392px] md:min-h-[408px]">
        <AnimatePresence mode="wait">
          <motion.div
            key={mode}
            initial={{ opacity: 0 }}
            animate={{ opacity: 1 }}
            exit={{ opacity: 0 }}
            transition={{ duration: 0.28, ease: [0.4, 0, 0.2, 1] }}
            className="absolute inset-0 flex flex-col p-5 md:p-6"
          >
            {children}
          </motion.div>
        </AnimatePresence>
      </div>
    </div>
  );
}
