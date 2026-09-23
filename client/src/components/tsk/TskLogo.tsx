import { TSK_BRAND } from "@/lib/tsk-brand/constants";
import { cn } from "@/lib/utils";

type TskLogoProps = {
  variant?: "horizontal" | "mark";
  theme?: "light" | "dark" | "mono";
  className?: string;
  alt?: string;
};

const horizontalSrc: Record<NonNullable<TskLogoProps["theme"]>, string> = {
  light: TSK_BRAND.assets.logoHorizontal,
  dark: TSK_BRAND.assets.logoHorizontalOnDark,
  mono: TSK_BRAND.assets.logoHorizontalMono,
};

const markSrc: Record<NonNullable<TskLogoProps["theme"]>, string> = {
  light: TSK_BRAND.assets.logoMark,
  dark: TSK_BRAND.assets.logoMarkOnDark,
  mono: TSK_BRAND.assets.logoMarkMono,
};

export function TskLogo({
  variant = "horizontal",
  theme = "light",
  className,
  alt = TSK_BRAND.name,
}: TskLogoProps) {
  const src = variant === "mark" ? markSrc[theme] : horizontalSrc[theme];
  return (
    <img
      src={src}
      alt={alt}
      className={cn(
        variant === "mark" ? "h-12 w-12" : "h-8 w-auto max-w-[200px]",
        className,
      )}
      draggable={false}
    />
  );
}
