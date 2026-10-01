import { ChevronDown, Settings2 } from "lucide-react";
import type { ReactNode } from "react";

type VideoStudioAdvancedPanelProps = {
  open: boolean;
  onOpenChange: (open: boolean) => void;
  children: ReactNode;
};

export function VideoStudioAdvancedPanel({
  open,
  onOpenChange,
  children,
}: VideoStudioAdvancedPanelProps) {
  return (
    <div className="via-advanced">
      <button
        type="button"
        className="via-advanced__trigger"
        aria-expanded={open}
        onClick={() => onOpenChange(!open)}
      >
        <Settings2 className="h-4 w-4" aria-hidden />
        <span>Options</span>
        <ChevronDown
          className={`via-advanced__chev ${open ? "is-open" : ""}`}
          aria-hidden
        />
      </button>
      {open ? <div className="via-advanced__body">{children}</div> : null}
    </div>
  );
}
