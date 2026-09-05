import type { CSSProperties } from "react";

/** Fond animé luxe pour /modeles sur desktop. */
export function ModelesScene({ previewUrl }: { previewUrl: string }) {
  return (
    <div className="tpl-scene" aria-hidden>
      <img className="tpl-scene__ambient" src={previewUrl} alt="" />
      <img
        className="tpl-scene__ambient tpl-scene__ambient--echo"
        src={previewUrl}
        alt=""
      />
      <div className="tpl-scene__veil" />
      <div className="tpl-scene__spotlight" />
      <div className="tpl-scene__rays" />
      <div className="tpl-scene__shimmer" />
      <div className="tpl-scene__glow tpl-scene__glow--gold" />
      <div className="tpl-scene__glow tpl-scene__glow--violet" />
      <div className="tpl-scene__glow tpl-scene__glow--warm" />
      <div className="tpl-scene__particles">
        {Array.from({ length: 22 }, (_, i) => (
          <span
            key={i}
            className="tpl-scene__particle"
            style={{ "--p": i } as CSSProperties}
          />
        ))}
      </div>
      <div className="tpl-scene__lines">
        <span className="tpl-scene__line tpl-scene__line--left" />
        <span className="tpl-scene__line tpl-scene__line--right" />
      </div>
    </div>
  );
}
