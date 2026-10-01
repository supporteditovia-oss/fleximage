import type { ReactNode } from "react";

type VideoStudioProLayoutProps = {
  controls: ReactNode;
  preview: ReactNode;
  actionBar: ReactNode;
};

/** Desktop : contrôles à gauche, preview à droite. Mobile : stack compact. */
export function VideoStudioProLayout({
  controls,
  preview,
  actionBar,
}: VideoStudioProLayoutProps) {
  return (
    <div className="via-studio-pro">
      <div className="via-studio-pro__grid">
        <div className="via-studio-pro__controls">{controls}</div>
        <div className="via-studio-pro__preview">{preview}</div>
      </div>
      <div className="via-studio-pro__action-bar">{actionBar}</div>
    </div>
  );
}
