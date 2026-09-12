import { useEffect, useState } from "react";
import { Gem } from "lucide-react";
import { writeStudioMode } from "@/lib/v2-experience";
import { Link } from "wouter";
import { useTranslation } from "react-i18next";
import { useAuth } from "@/hooks/use-auth";
import { setDocumentMeta } from "@/lib/document-meta";
import { setAppLanguage } from "@/i18n";
import { resolvePreferredLocale, type AppLocale } from "@shared/locales";
import { LandingStudioWidget } from "@/components/landing/LandingStudioWidget";
import { LandingVideoShowcase } from "@/components/landing/LandingVideoShowcase";
import { LandingVoicePlayer } from "@/components/landing/LandingVoicePlayer";
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
    a: "LuxeFlexIA est un studio créatif basé sur l’IA. Transforme une photo en scène ultra-réaliste, anime une image en vidéo (Image → Vidéo), transforme une vidéo smartphone (Vidéo → Vidéo), ou génère un vocal IA à partir d’un court extrait audio.",
  },
  {
    q: "Comment fonctionne la vidéo IA ?",
    a: "Deux ateliers : Cinématique photo (Image → Vidéo) — une image fixe devient un plan en mouvement de 5 secondes ; Séquence transformée (Vidéo → Vidéo) — votre clip smartphone est réinventé (personnage, objet, véhicule) sans perdre l’angle caméra. Format vertical 9:16, rendu premium.",
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


function BrandLink({ className = "" }: { className?: string }) {
  return (
    <a className={`brand ${className}`.trim()} href="#top" aria-label="LuxeFlexIA, accueil">
      <span className="brand-mark" aria-hidden>
        <Gem className="brand-mark__gem" strokeWidth={1.75} />
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

  const [revealed, setRevealed] = useState<Record<string, boolean>>({});

  const currentLocale = resolvePreferredLocale(i18n.resolvedLanguage, "fr");

  useEffect(() => {
    setDocumentMeta({
      title: "LuxeFlexIA — Crée ce que tu imagines",
      description:
        "Image IA, Vidéo IA (Image→Vidéo & Vidéo→Vidéo) et clonage vocal — studio créatif tout-en-un pour photos et clips verticaux.",
      canonicalPath: "/",
    });
  }, []);

  const setLocale = (locale: AppLocale) => {
    if (locale === currentLocale) return;
    setAppLanguage(locale, { trackSignupLocale: !user });
  };

  const toggleReveal = (id: string) => {
    setRevealed((prev) => ({ ...prev, [id]: !prev[id] }));
  };

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
          {loggedIn ? (
            <Link className="header-cta" href="/create">
              Ouvrir le studio
            </Link>
          ) : (
            <Link className="header-cta" href="/register">
              S&apos;inscrire
            </Link>
          )}
        </nav>
      </header>

      <section className="hero" id="top">
        <p className="eyebrow">Studio · Image · Voix · Vidéo</p>
        <h1>
          Crée ce que
          <br />
          tu imagines.
        </h1>
        <p className="hero-copy">
          Photographies lifestyle, clips verticaux cinématiques et voix synthétique — le studio
          LuxeFlexIA, tel qu’à l’intérieur de l’application.
        </p>

        <div className="hero-mode-strip" aria-label="Modes du studio">
          <span className="hero-mode-pill">Image</span>
          <span className="hero-mode-pill">Voix</span>
          <span className="hero-mode-pill hero-mode-pill--accent">Vidéo</span>
        </div>

        <LandingStudioWidget />

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
            <p>Photo, vidéo ou voix — décris ce que tu imagines et LuxeFlexIA crée le reste.</p>
            <span>Image · Vidéo · Voix · Lifestyle</span>
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

      <section className="video-cinema-section" id="video-ia" aria-labelledby="video-title">
        <div className="video-cinema-inner">
          <div className="video-cinema-header">
            <p className="section-kicker">Studio Vidéo</p>
            <h2 id="video-title">
              Le mouvement,
              <br />
              en cinq secondes.
            </h2>
            <p className="video-cinema-lead">
              Deux ateliers de création pour le format vertical — esthétique cinéma, prêt à publier
              sur TikTok, Reels et Shorts.
            </p>
          </div>

          <LandingVideoShowcase />

          <div className="video-cinema-footer">
            <span className="video-cinema-specs">9:16 · 5 s · Rendu premium</span>
            <a
              className="light-button"
              href="#top"
              onClick={(e) => {
                e.preventDefault();
                writeStudioMode("video");
                document.getElementById("top")?.scrollIntoView({ behavior: "smooth" });
              }}
            >
              Ouvrir le studio vidéo <span>↗</span>
            </a>
          </div>
        </div>
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
                writeStudioMode("voice");
                document.getElementById("top")?.scrollIntoView({ behavior: "smooth" });
              }}
            >
              Créer une voix <span>↗</span>
            </a>
          </div>
          <LandingVoicePlayer variant="section" />
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
        <Link className="gold-button" href={loggedIn ? "/create" : "/register"}>
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
