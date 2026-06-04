import { cn } from "@/lib/utils";

interface CreditsTokenIconProps {
  className?: string;
}

/** Credit token mark — inlined so the header never depends on /assets/jeton.svg loading. */
export function CreditsTokenIcon({ className }: CreditsTokenIconProps) {
  return (
    <svg
      xmlns="http://www.w3.org/2000/svg"
      viewBox="0 0 512 512"
      aria-hidden
      className={cn("shrink-0 text-foreground", className)}
    >
      <path
        fill="currentColor"
        d="M48 350 88 126l112 102 56-178 56 178 112-102 40 224H48Z"
      />
      <rect x="72" y="378" width="368" height="76" rx="30" fill="currentColor" />
    </svg>
  );
}
