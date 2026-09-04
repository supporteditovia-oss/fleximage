import { useEffect, useMemo, useState } from "react";
import { Link } from "wouter";
import { useTranslation } from "react-i18next";
import { useAuth } from "@/hooks/use-auth";
import { setDocumentMeta } from "@/lib/document-meta";
import { setAppLanguage } from "@/i18n";
import { resolvePreferredLocale, type AppLocale } from "@shared/locales";
import {
  readStudioMode,
  writeStudioMode,
  type StudioMode,
} from "@/lib/v2-experience";
import "./landing-v2.css";

const EDITORIAL = [
  {
    id: "automobile",
    position: "editorial-position-1",
    n: "01",
    label: "Automobile",
    generated: "/assets/landing-v2/automobile-generated.jpg",
    original: "/assets/landing-v2/automobile-original.jpg",
    generatedAlt: "BMW grise créée à partir de la photo d’une Volkswagen",
  },
  {
    id: "lifestyle",
    position: "editorial-position-2",
    n: "02",
    label: "Lifestyle",
    generated: "/assets/landing-v2/garage-generated.jpg",
    original: "/assets/landing-v2/garage-original.jpg",
    generatedAlt: "Garage transformé avec deux voitures de prestige roses",
  },
  {
    id: "station",
    position: "editorial-position-3",
    n: "03",
    label: "Automobile",
    generated: "/assets/landing-v2/station-generated.jpg",
    original: "/assets/landing-v2/station-original.jpg",
    generatedAlt: "Renault transformée en BMW noire à une station-service",
  },
  {
    id: "dubai",
    position: "editorial-position-4",
    n: "04",
    label: "Voyage",
    generated: "/assets/landing-v2/dubai-generated.jpg",
    original: "/assets/landing-v2/dubai-original.jpg",
    generatedAlt: "Portrait transformé en scène au volant à Dubaï",
  },
] as const;

const FAQ = [
  {
    q: "Qu’est-ce que LuxeFlexIA ?",
    a: "LuxeFlexIA est un studio créatif basé sur l’IA. À partir d’une simple photo, tu peux créer des scènes ultra-réalistes dans l’univers que tu imagines. Tu peux également créer une voix IA à partir d’un court extrait audio, puis générer un vocal à partir du texte que tu écris.",
  },
  {
    q: "Comment fonctionne la création d’image ?",
    a: "Importe une photo, décris la scène que tu veux créer, choisis ton format puis lance la génération. LuxeFlexIA transforme le décor et l’ambiance tout en préservant ton identité.",
  },
  {
    q: "Comment fonctionne la création de voix IA ?",
    a: "Ajoute un court extrait de ta voix, écris ton message et LuxeFlexIA génère un nouveau vocal avec cette voix.",
  },
  {
    q: "De combien de secondes d’audio ai-je besoin ?",
    a: "Quelques secondes d’audio clair permettent de commencer. Un extrait propre, sans musique ni bruit de fond, donnera un résultat plus fidèle.",
  },
  {
    q: "Mes images et mes voix restent-elles privées ?",
    a: "Oui. Tes fichiers, tes voix et tes créations restent associés à ton espace personnel LuxeFlexIA.",
  },
] as const;

const WAVE = [10, 16, 9, 22, 14, 27, 17, 11, 23, 31, 18, 12, 25, 19, 8, 17, 29, 20, 12, 24, 14, 9, 19, 12];
const MINI_WAVE = [7, 12, 18, 9, 24, 15, 29, 18, 12, 22, 30, 14, 9, 20, 12, 7];

function BrandLink({ className = "" }: { className?: string }) {
  return (
    <a className={`brand ${className}`.trim()} href="#top" aria-label="LuxeFlexIA, accueil">
      <span className="brand-mark" aria-hidden>
        ◇
      </span>
      <span>
        LuxeFlex<span>IA</span>
      </span>
    </a>
  );
}

export default function LandingV2() {
  const { user } = useAuth();
  const { i18n } = useTranslation();
  const loggedIn = Boolean(user);
  const startHref = loggedIn ? "/create" : "/register";
  const loginHref = loggedIn ? "/create" : "/login";

  const [mode, setMode] = useState<StudioMode>(() => readStudioMode());
  const [ratio, setRatio] = useState<"9:16" | "16:9" | "1:1">("16:9");
  const [imagePrompt, setImagePrompt] = useState(
    "Mets-moi au volant d’une supercar à Monaco au coucher du soleil.",
  );
  const [voicePrompt, setVoicePrompt] = useState(
    "Bienvenue dans mon univers. Ici, chaque idée peut prendre vie.",
  );
  const [revealed, setRevealed] = useState<Record<string, boolean>>({});
  const [voicePlaying, setVoicePlaying] = useState(false);

  const currentLocale = resolvePreferredLocale(i18n.resolvedLanguage, "fr");

  useEffect(() => {
    setDocumentMeta({
      title: "LuxeFlexIA — Crée ce que tu imagines",
      description:
        "Transforme une simple photo en scène ultra-réaliste, ou crée une voix IA à partir de quelques secondes d’audio.",
      canonicalPath: "/",
    });
  }, []);

  const setLocale = (locale: AppLocale) => {
    if (locale === currentLocale) return;
    setAppLanguage(locale, { trackSignupLocale: !user });
  };

  const handleMode = (next: StudioMode) => {
    setMode(next);
    writeStudioMode(next);
  };

  const toggleReveal = (id: string) => {
    setRevealed((prev) => ({ ...prev, [id]: !prev[id] }));
  };

  const studioKey = useMemo(() => mode, [mode]);

  return (
    <div className="landing-v2">
      <header className="site-header">
        <button
          className="locale"
          type="button"
          aria-label={`Langue : ${currentLocale === "fr" ? "français" : "anglais"}`}
          onClick={() => setLocale(currentLocale === "fr" ? "en" : "fr")}
        >
          <span className={currentLocale === "fr" ? "locale-active" : undefined}>FR</span>
          <span className={currentLocale === "en" ? "locale-active" : undefined}>EN</span>
        </button>
        <BrandLink />
        <nav className="header-actions" aria-label="Compte">
          <Link href={loginHref}>{loggedIn ? "Studio" : "Se connecter"}</Link>
          <Link className="header-cta" href={startHref}>
            {loggedIn ? "Ouvrir le studio" : "Créer un compte"}
          </Link>
        </nav>
      </header>

      <section className="hero" id="top">
        <p className="eyebrow">Le studio créatif, réinventé</p>
        <h1>
          Crée ce que
          <br />
          tu imagines.
        </h1>
        <p className="hero-copy">
          Transforme une simple photo en scène ultra-réaliste,
          <br /> ou crée une voix IA à partir de quelques secondes d’audio.
        </p>

        <div className="mode-switch" role="tablist" aria-label="Choisir le mode de création">
          <button
            type="button"
            role="tab"
            aria-selected={mode === "image"}
            className={mode === "image" ? "active" : ""}
            onClick={() => handleMode("image")}
          >
            Image IA
          </button>
          <button
            type="button"
            role="tab"
            aria-selected={mode === "voice"}
            className={mode === "voice" ? "active" : ""}
            onClick={() => handleMode("voice")}
          >
            Voix IA
          </button>
        </div>

        <div className={`studio-shell mode-${mode}`} key={studioKey}>
          {mode === "image" ? (
            <>
              <div className="studio-topline">
                <span>Image IA</span>
                <span>Photo → nouvelle scène</span>
              </div>
              <div className="studio-content">
                <section className="input-panel source-panel" aria-label="Image source">
                  <span className="field-index">01</span>
                  <div>
                    <p className="field-label">Ta photo</p>
                    <p className="field-help">Ajoute la photo que tu veux transformer</p>
                  </div>
                  <button
                    className="dropzone"
                    type="button"
                    onClick={() => {
                      window.location.href = startHref;
                    }}
                  >
                    <span className="upload-icon" aria-hidden>
                      ＋
                    </span>
                    <span>Ajouter une image</span>
                    <small>JPG ou PNG · 10 Mo max.</small>
                  </button>
                </section>
                <section className="input-panel prompt-panel" aria-label="Instruction">
                  <span className="field-index">02</span>
                  <div>
                    <label className="field-label" htmlFor="lv2-prompt">
                      Que veux-tu créer ?
                    </label>
                    <p className="field-help">Décris simplement la nouvelle scène</p>
                  </div>
                  <textarea
                    id="lv2-prompt"
                    aria-label="Description de l’image"
                    value={imagePrompt}
                    onChange={(e) => setImagePrompt(e.target.value)}
                  />
                  <div className="ratio-row" aria-label="Format de l’image">
                    <span>Format</span>
                    <div>
                      {(["9:16", "16:9", "1:1"] as const).map((r) => (
                        <button
                          key={r}
                          type="button"
                          className={ratio === r ? "selected" : ""}
                          onClick={() => setRatio(r)}
                        >
                          {r}
                        </button>
                      ))}
                    </div>
                  </div>
                </section>
              </div>
              <div className="studio-footer">
                <p>
                  <span>✦</span> Rendu en moins d’une minute
                </p>
                <Link className="primary-button" href={startHref}>
                  Créer l’image <span>↗</span>
                </Link>
              </div>
            </>
          ) : (
            <>
              <div className="studio-topline">
                <span>Voix IA</span>
                <span>Audio → nouveau vocal</span>
              </div>
              <div className="studio-content">
                <section className="input-panel source-panel" aria-label="Voix source">
                  <span className="field-index">01</span>
                  <div>
                    <p className="field-label">Ta voix</p>
                    <p className="field-help">Importe ou enregistre quelques secondes</p>
                  </div>
                  <button className="dropzone" type="button">
                    <span className="upload-icon" aria-hidden>
                      ＋
                    </span>
                    <span>Ajouter une voix</span>
                    <small>MP3, WAV ou M4A · 30 s min.</small>
                  </button>
                  <button className="record-link" type="button">
                    <span className="record-dot" /> Enregistrer maintenant
                  </button>
                </section>
                <section className="input-panel prompt-panel" aria-label="Instruction">
                  <span className="field-index">02</span>
                  <div>
                    <label className="field-label" htmlFor="lv2-voice-prompt">
                      Ton message
                    </label>
                    <p className="field-help">Que veux-tu lui faire dire ?</p>
                  </div>
                  <textarea
                    id="lv2-voice-prompt"
                    aria-label="Texte à prononcer"
                    value={voicePrompt}
                    onChange={(e) => setVoicePrompt(e.target.value)}
                  />
                  <div className="mini-wave" aria-label="Aperçu de la voix">
                    {MINI_WAVE.map((h, i) => (
                      <i key={i} style={{ height: `${h}px` }} />
                    ))}
                    <span>0:08</span>
                  </div>
                </section>
              </div>
              <div className="studio-footer">
                <p>
                  <span>✦</span> Voix privée et sécurisée
                </p>
                <Link className="primary-button" href={startHref}>
                  Générer la voix <span>↗</span>
                </Link>
              </div>
            </>
          )}
        </div>

        <p className="hero-note">Aucune compétence technique. Seulement ton imagination.</p>
      </section>

      <section className="editorial-section" aria-labelledby="univers-title">
        <div className="section-heading">
          <p className="section-kicker">Univers</p>
          <h2 id="univers-title">
            Tout ce que
            <br />
            tu imagines.
          </h2>
          <div className="section-intro">
            <p>Importe une photo, décris simplement la scène et LuxeFlexIA crée le reste.</p>
            <span>Voitures · Voyages · Villas · Lifestyle</span>
          </div>
        </div>
        <div className="editorial-grid">
          {EDITORIAL.map((item) => (
            <figure
              key={item.id}
              className={`editorial-figure ${item.position} ${revealed[item.id] ? "show-original" : ""}`}
            >
              <img
                className="example-image example-generated"
                src={item.generated}
                alt={item.generatedAlt}
                loading="lazy"
              />
              <img
                className="example-image example-original"
                src={item.original}
                alt="Photo originale avant transformation"
                loading="lazy"
              />
              <button
                type="button"
                className="reveal-original"
                aria-pressed={Boolean(revealed[item.id])}
                onClick={() => toggleReveal(item.id)}
              >
                {revealed[item.id] ? "Voir le rendu" : "Voir l’original"}
              </button>
              <figcaption>
                <span>{item.n}</span>
                <strong>{item.label}</strong>
                <small>Créé avec LuxeFlexIA</small>
              </figcaption>
            </figure>
          ))}
        </div>
      </section>

      <section className="transformation-section" aria-labelledby="transform-title">
        <div className="transform-copy">
          <p className="section-kicker">Image IA</p>
          <h2 id="transform-title">
            D’une simple photo
            <br />à ton univers.
          </h2>
          <p>
            Une photo suffit. LuxeFlexIA préserve ton identité et transforme le décor, la tenue et
            l’ambiance selon ta demande.
          </p>
        </div>
        <div className="transform-card" aria-label="Exemple de transformation d’image">
          <div className="transform-image transform-before">
            <img
              src="/assets/landing-v2/portrait-car-original.jpg"
              alt="Photo originale d’un homme devant une voiture"
              loading="lazy"
            />
            <span>Photo originale</span>
          </div>
          <div className="transform-arrow" aria-hidden>
            →
          </div>
          <div className="transform-image transform-after">
            <img
              src="/assets/landing-v2/portrait-car-generated.jpg"
              alt="Scène LuxeFlexIA avec le même homme devant une voiture de prestige"
              loading="lazy"
            />
            <span>Créé avec LuxeFlexIA</span>
          </div>
        </div>
        <p className="transform-caption">
          <span>Une photo</span>
          <i />
          Identité préservée
          <i />
          Décor réinventé
        </p>
      </section>

      <section className="voice-section" aria-labelledby="voice-title">
        <div className="voice-inner">
          <div className="voice-copy">
            <p className="section-kicker">Voix IA</p>
            <h2 id="voice-title">
              Et maintenant,
              <br />
              donne-lui une voix.
            </h2>
            <ol className="voice-explanation">
              <li>Importe quelques secondes d’audio.</li>
              <li>Écris ce que tu veux lui faire dire.</li>
              <li>LuxeFlexIA génère le vocal.</li>
            </ol>
            <a
              className="light-button"
              href="#top"
              onClick={(e) => {
                e.preventDefault();
                handleMode("voice");
                document.getElementById("top")?.scrollIntoView({ behavior: "smooth" });
              }}
            >
              Créer une voix <span>↗</span>
            </a>
          </div>
          <div className={`voice-card ${voicePlaying ? "is-playing" : ""}`}>
            <div className="voice-card-top">
              <div className="voice-avatar">LF</div>
              <div>
                <strong>Ma voix</strong>
                <span>Clonage privé · Français</span>
              </div>
              <span className="voice-badge">Prête</span>
            </div>
            <div className="voice-steps" aria-label="Fonctionnement de la voix IA">
              <span>01 Importer</span>
              <i />
              <span>02 Écrire</span>
              <i />
              <span>03 Générer</span>
            </div>
            <p className="voice-quote">« Bienvenue dans mon univers. »</p>
            <div className="voice-player">
              <button
                type="button"
                aria-label="Lire la voix"
                onClick={() => setVoicePlaying((p) => !p)}
              >
                {voicePlaying ? "❚❚" : "▶"}
              </button>
              <div className="voice-wave" aria-hidden>
                {WAVE.map((h, i) => (
                  <i key={i} style={{ height: `${h}px` }} />
                ))}
              </div>
              <span>0:00 / 0:12</span>
            </div>
            <div className="voice-card-footer">
              <span>Naturelle</span>
              <i /> <span>Claire</span>
              <i /> <span>À toi</span>
            </div>
          </div>
        </div>
      </section>

      <section className="proof-section" aria-label="Avantages LuxeFlexIA">
        <div className="proof-item">
          <span>01</span>
          <h3>Ultra réaliste</h3>
          <p>Des détails, des textures et une lumière qui semblent vrais.</p>
        </div>
        <i className="proof-dot" />
        <div className="proof-item">
          <span>02</span>
          <h3>Rapide</h3>
          <p>De ton idée à un rendu prêt à partager, sans complexité.</p>
        </div>
        <i className="proof-dot" />
        <div className="proof-item">
          <span>03</span>
          <h3>Privé</h3>
          <p>Tes images, ta voix et tes créations restent ton espace.</p>
        </div>
      </section>

      <section className="cta-section" id="commencer" aria-labelledby="cta-title">
        <p className="section-kicker">Ton prochain univers commence ici</p>
        <h2 id="cta-title">
          Prêt à créer ce
          <br />
          que tu imagines&nbsp;?
        </h2>
        <Link className="gold-button" href={startHref}>
          Commencer <span>↗</span>
        </Link>
      </section>

      <section className="faq-section" aria-labelledby="faq-title">
        <div className="faq-heading">
          <p className="section-kicker">Questions</p>
          <h2 id="faq-title">
            L’essentiel,
            <br />
            simplement.
          </h2>
        </div>
        <div className="faq-list">
          {FAQ.map((item) => (
            <details key={item.q}>
              <summary>
                {item.q}
                <span>＋</span>
              </summary>
              <p>{item.a}</p>
            </details>
          ))}
        </div>
      </section>

      <footer className="site-footer" id="connexion">
        <BrandLink className="footer-brand" />
        <p>Crée ce que tu imagines.</p>
        <nav aria-label="Liens légaux">
          <a href="/confidentialite">Confidentialité</a>
          <a href="/cgu">Conditions</a>
          <a href="mailto:support.luxeflexia@gmail.com">Contact</a>
        </nav>
        <small>© {new Date().getFullYear()} LuxeFlexIA</small>
      </footer>
    </div>
  );
}
