import type { ReactNode } from "react";

type VideoStudioProLayoutProps = {
  head: ReactNode;
  media: ReactNode;
  editor: ReactNode;
  foot: ReactNode;
};

export function VideoStudioProLayout({
  head,
  media,
  editor,
  foot,
}: VideoStudioProLayoutProps) {
  return (
    <div className="via-studio-canvas">
      <div className="via-studio-canvas__head">{head}</div>
      <div className="via-studio-canvas__body">
        <div className="via-studio-canvas__media">{media}</div>
        <div className="via-studio-canvas__editor">{editor}</div>
      </div>
      <div className="via-studio-canvas__foot">{foot}</div>
    </div>
  );
}
