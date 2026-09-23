import { TSK_BRAND } from "@/lib/tsk-brand/constants";
import { cn } from "@/lib/utils";

type TskLogoProps = {
  className?: string;
  /** Logo uploadé dans l'admin (sinon logo officiel). */
  src?: string;
  /** Fond blanc → variante print ; fond sombre → logo source. */
  variant?: "print" | "screen";
  alt?: string;
};

export function TskLogo({
  className,
  src,
  variant = "print",
  alt = TSK_BRAND.name,
}: TskLogoProps) {
  const fallback =
    variant === "print"
      ? TSK_BRAND.assets.logoOfficialPrint
      : TSK_BRAND.assets.logoOfficial;
  return (
    <img
      src={src?.trim() || fallback}
      alt={alt}
      className={cn("h-9 w-auto max-w-[240px] object-contain object-left", className)}
      draggable={false}
    />
  );
}
