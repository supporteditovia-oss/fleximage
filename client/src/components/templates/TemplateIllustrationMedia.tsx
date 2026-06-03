import { cn } from "@/lib/utils";
import { isTemplateIllustrationVideo } from "@/lib/template-illustration";

type TemplateIllustrationMediaProps = {
  src: string;
  alt: string;
  className?: string;
};

export function TemplateIllustrationMedia({
  src,
  alt,
  className,
}: TemplateIllustrationMediaProps) {
  if (isTemplateIllustrationVideo(src)) {
    return (
      <video
        src={src}
        className={cn(className)}
        autoPlay
        muted
        loop
        playsInline
        preload="metadata"
        aria-label={alt}
      />
    );
  }

  return (
    <img src={src} alt={alt} className={cn(className)} loading="lazy" />
  );
}
