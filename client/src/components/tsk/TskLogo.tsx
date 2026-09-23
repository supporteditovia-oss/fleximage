import { TSK_BRAND } from "@/lib/tsk-brand/constants";
import { cn } from "@/lib/utils";

type TskLogoProps = {
  className?: string;
  /** Logo personnalisé (upload admin) — sinon logo officiel. */
  src?: string;
  alt?: string;
};

export function TskLogo({
  className,
  src,
  alt = TSK_BRAND.name,
}: TskLogoProps) {
  return (
    <img
      src={src?.trim() || TSK_BRAND.assets.logoOfficial}
      alt={alt}
      className={cn("h-8 w-auto max-w-[220px] object-contain", className)}
      draggable={false}
    />
  );
}
