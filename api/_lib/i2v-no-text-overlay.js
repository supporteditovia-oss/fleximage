/**
 * I2V — interdiction absolue de texte / sous-titres incrustés (provider + post-traitement).
 * La parole est uniquement dans audio_url, jamais répétée dans le prompt visuel.
 */

const I2V_NO_ONSCREEN_TEXT_LOCK =
  "CRITICAL OUTPUT RULE: absolutely zero on-screen text — no subtitles, no captions, " +
  "no closed captions, no burned-in lettering, no karaoke lyrics, no watermark text, " +
  "no UI overlays, no garbled typography. Clean video frames only. " +
  "Speech is audio-only from the provided track; lip sync only, never display the words.";

const I2V_NO_ONSCREEN_TEXT_LOCK_FR =
  "RÈGLE ABSOLUE : aucun texte à l'écran — pas de sous-titres, pas de légendes, " +
  "pas de charabia typographique, pas de filigrane textuel. Image vidéo totalement propre. " +
  "La parole est uniquement dans la piste audio ; sync labiale sans afficher les mots.";

/** Métadonnées studio — toujours false (ignore toute valeur client). */
function normalizeI2VTextOverlayFlags(meta) {
  const base = meta && typeof meta === "object" ? { ...meta } : {};
  const patch = {
    subtitles_enabled: false,
    draw_text: false,
    subtitle_style: null,
    subtitle_position: null,
    overlay_text: null,
    subtitles_pending: false,
  };
  if (base.workflow === "image_to_video") {
    patch.i2v_no_onscreen_text_rev = 2;
  }
  return { ...base, ...patch };
}

/**
 * @param {string} prompt
 * @returns {string}
 */
function appendI2VNoOnScreenTextLock(prompt) {
  const base = String(prompt || "").trim();
  const locks = `${I2V_NO_ONSCREEN_TEXT_LOCK} ${I2V_NO_ONSCREEN_TEXT_LOCK_FR}`;
  if (!base) return locks.slice(0, 5000);
  const combined = `${base} ${locks}`;
  return combined.length <= 5000 ? combined : `${base.slice(0, 4800)} ${locks}`.slice(0, 5000);
}

module.exports = {
  I2V_NO_ONSCREEN_TEXT_LOCK,
  I2V_NO_ONSCREEN_TEXT_LOCK_FR,
  normalizeI2VTextOverlayFlags,
  appendI2VNoOnScreenTextLock,
};
