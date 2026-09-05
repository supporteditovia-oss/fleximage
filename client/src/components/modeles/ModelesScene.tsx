/** Fond luxe fixe pour /modeles desktop — ne change jamais entre les modèles. */
export function ModelesScene() {
  return (
    <div className="tpl-scene" aria-hidden>
      <div className="tpl-scene__base" />
      <div className="tpl-scene__mesh" />
      <div className="tpl-scene__spotlight" />
      <div className="tpl-scene__shimmer" />
      <div className="tpl-scene__glow tpl-scene__glow--gold" />
      <div className="tpl-scene__glow tpl-scene__glow--champagne" />
      <div className="tpl-scene__lines">
        <span className="tpl-scene__line tpl-scene__line--left" />
        <span className="tpl-scene__line tpl-scene__line--right" />
      </div>
      <div className="tpl-scene__corner tpl-scene__corner--tl" />
      <div className="tpl-scene__corner tpl-scene__corner--tr" />
      <div className="tpl-scene__corner tpl-scene__corner--bl" />
      <div className="tpl-scene__corner tpl-scene__corner--br" />
    </div>
  );
}
