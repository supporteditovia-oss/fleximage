import { HTMLAttributes } from "react";
import clsx from "clsx";

type GlassCardProps = HTMLAttributes<HTMLDivElement> & {
  variant?: "glass" | "flat";
};

// Deux traitements distincts pour créer une hiérarchie visuelle :
// "glass" pour les widgets primaires (dashboard hero, POV engine),
// "flat" pour les listes secondaires (activité, tables) — pas la même carte partout.
export default function GlassCard({ variant = "glass", className, children, ...props }: GlassCardProps) {
  return (
    <div
      className={clsx(
        "rounded-2xl p-5",
        variant === "glass" ? "lux-glass" : "lux-card",
        className
      )}
      {...props}
    >
      {children}
    </div>
  );
}
