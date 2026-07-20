import { cn } from "@/lib/utils";

type BrandMarkProps = {
  className?: string;
  accentClassName?: string;
};

/**
 * Always renders continuous LuxeFlexIA with no spaces.
 * Uses string children ({"Luxe"}) so JSX newlines never inject whitespace.
 */
export function BrandMark({
  className,
  accentClassName = "text-[var(--lx-gold)]",
}: BrandMarkProps) {
  return (
    <span
      className={cn(
        "lx-display lx-brand-mark whitespace-nowrap",
        className,
        // Keep last so call-site tracking-* cannot reopen gaps
        "tracking-[-0.045em]",
      )}
      aria-label="LuxeFlexIA"
    >
      {"Luxe"}
      <span className={cn("lx-brand-mark__accent", accentClassName)}>
        {"Flex"}
      </span>
      {"IA"}
    </span>
  );
}
