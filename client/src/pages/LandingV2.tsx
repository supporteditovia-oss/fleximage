import { useEffect } from "react";
import { Gem } from "lucide-react";
import { writeStudioMode } from "@/lib/v2-experience";
import { Link } from "wouter";
import { useTranslation } from "react-i18next";
import { useAuth } from "@/hooks/use-auth";
import { setDocumentMeta } from "@/lib/document-meta";
import { applyLocaleFromSearch, setAppLanguage } from "@/i18n";
import {
  resolvePreferredLocale,
  type AppLocale,
  type UiLocale,
} from "@shared/locales";
import { LandingStudioWidget } from "@/components/landing/LandingStudioWidget";
import { LandingVideoShowcase } from "@/components/landing/LandingVideoShowcase";
import { LandingEditorialGrid } from "@/components/landing/LandingEditorialGrid";
import { LandingVoicePlayer } from "@/components/landing/LandingVoicePlayer";
import "./landing-v2.css";

const FAQ_KEYS = ["q1", "q2", "q3", "q4", "q5", "q6", "q7", "q8", "q9", "q10"] as const;
const LANDING_LOCALES: UiLocale[] = ["fr", "en", "es"];

function BrandLink({ className = "" }: { className?: string }) {
  const { t } = useTranslation();
  return (
    <a
      className={`brand ${className}`.trim()}
      href="#top"
      aria-label={t("landing:header.homeAria")}
    >
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
  const { t, i18n } = useTranslation();
  const loggedIn = Boolean(user);

  const currentLocale = resolvePreferredLocale(i18n.resolvedLanguage, "fr") as UiLocale;

  useEffect(() => {
    setDocumentMeta({
      title: t("landing:meta.title"),
      description: t("landing:meta.description"),
      canonicalPath: "/",
    });
  }, [t, i18n.resolvedLanguage]);

  const setLocale = (locale: AppLocale) => {
    if (locale === currentLocale) return;
    setAppLanguage(locale, { trackSignupLocale: !user });
  };

  const faqItems = FAQ_KEYS.map((key) => ({
    q: t(`landing:faq.${key}`),
    a: t(`landing:faq.a${key.slice(1)}`),
  }));

  return (
    <div className="landing-v2">
      <header className="site-header">
        <div
          className="locale locale--triple"
          role="group"
          aria-label={t("landing:header.localeAria")}
        >
          {LANDING_LOCALES.map((locale) => (
            <button
              key={locale}
              type="button"
              className={currentLocale === locale ? "locale-active" : undefined}
              aria-pressed={currentLocale === locale}
              onClick={() => setLocale(locale)}
            >
              {locale.toUpperCase()}
            </button>
          ))}
        </div>
        <BrandLink />
        <nav className="header-actions" aria-label="Compte">
          {loggedIn ? (
            <Link className="header-cta" href="/create">
              <span className="header-cta__long">{t("landing:header.openStudio")}</span>
              <span className="header-cta__short">{t("landing:header.studioShort")}</span>
            </Link>
          ) : (
            <>
              <Link className="header-link" href="/login">
                {t("landing:header.login")}
              </Link>
              <Link className="header-cta" href="/register">
                {t("landing:header.register")}
              </Link>
            </>
          )}
        </nav>
      </header>

      <section className="hero" id="top">
        <p className="eyebrow">{t("landing:hero.eyebrow")}</p>
        <h1>
          {t("landing:hero.titleLine1")}
          <br />
          {t("landing:hero.titleLine2")}
        </h1>
        <p className="hero-copy">{t("landing:hero.copy")}</p>

        <LandingStudioWidget />

        <p className="hero-note">{t("landing:hero.note")}</p>
      </section>

      <section className="editorial-section" aria-labelledby="univers-title">
        <div className="section-heading">
          <p className="section-kicker">{t("landing:editorial.kicker")}</p>
          <h2 id="univers-title">
            {t("landing:editorial.titleLine1")}
            <br />
            {t("landing:editorial.titleLine2")}
          </h2>
          <div className="section-intro">
            <p>{t("landing:editorial.intro")}</p>
            <span>{t("landing:editorial.tags")}</span>
          </div>
        </div>
        <LandingEditorialGrid />
      </section>

      <section className="transformation-section" aria-labelledby="transform-title">
        <div className="transform-copy">
          <p className="section-kicker">{t("landing:transform.kicker")}</p>
          <h2 id="transform-title">
            {t("landing:transform.titleLine1")}
            <br />
            {t("landing:transform.titleLine2")}
          </h2>
          <p>{t("landing:transform.copy")}</p>
        </div>
        <div
          className="transform-card"
          aria-label={t("landing:transform.cardAria")}
        >
          <div className="transform-image transform-before">
            <img
              src="/assets/landing-v2/portrait-car-original.jpg"
              alt={t("landing:transform.beforeAlt")}
              loading="lazy"
            />
            <span>{t("landing:transform.before")}</span>
          </div>
          <div className="transform-arrow" aria-hidden>
            →
          </div>
          <div className="transform-image transform-after">
            <img
              src="/assets/landing-v2/portrait-car-generated.jpg"
              alt={t("landing:transform.afterAlt")}
              loading="lazy"
            />
            <span>{t("landing:transform.after")}</span>
          </div>
        </div>
        <p className="transform-caption">
          <span>{t("landing:transform.captionPhoto")}</span>
          <i />
          {t("landing:transform.captionIdentity")}
          <i />
          {t("landing:transform.captionDecor")}
        </p>
      </section>

      <section className="video-cinema-section" id="video-ia" aria-labelledby="video-title">
        <div className="video-cinema-inner">
          <div className="video-cinema-header">
            <p className="section-kicker">{t("landing:video.kicker")}</p>
            <h2 id="video-title">
              {t("landing:video.titleLine1")}
              <br />
              {t("landing:video.titleLine2")}
            </h2>
            <p className="video-cinema-lead">{t("landing:video.lead")}</p>
          </div>

          <LandingVideoShowcase />

          <div className="video-cinema-footer">
            <span className="video-cinema-specs">{t("landing:video.specs")}</span>
            <a
              className="light-button"
              href="#top"
              onClick={(e) => {
                e.preventDefault();
                writeStudioMode("video");
                document.getElementById("top")?.scrollIntoView({ behavior: "smooth" });
              }}
            >
              {t("landing:video.cta")} <span>↗</span>
            </a>
          </div>
        </div>
      </section>

      <section className="voice-section" aria-labelledby="voice-title">
        <div className="voice-inner">
          <div className="voice-copy">
            <p className="section-kicker">{t("landing:voice.kicker")}</p>
            <h2 id="voice-title">
              {t("landing:voice.titleLine1")}
              <br />
              {t("landing:voice.titleLine2")}
            </h2>
            <ol className="voice-explanation">
              <li>{t("landing:voice.step1")}</li>
              <li>{t("landing:voice.step2")}</li>
              <li>{t("landing:voice.step3")}</li>
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
              {t("landing:voice.cta")} <span>↗</span>
            </a>
          </div>
          <LandingVoicePlayer variant="section" />
        </div>
      </section>

      <section className="proof-section" aria-label={t("landing:proof.aria")}>
        <div className="proof-item">
          <span>01</span>
          <h3>{t("landing:proof.item1Title")}</h3>
          <p>{t("landing:proof.item1Body")}</p>
        </div>
        <i className="proof-dot" />
        <div className="proof-item">
          <span>02</span>
          <h3>{t("landing:proof.item2Title")}</h3>
          <p>{t("landing:proof.item2Body")}</p>
        </div>
        <i className="proof-dot" />
        <div className="proof-item">
          <span>03</span>
          <h3>{t("landing:proof.item3Title")}</h3>
          <p>{t("landing:proof.item3Body")}</p>
        </div>
      </section>

      <section className="cta-section" id="commencer" aria-labelledby="cta-title">
        <p className="section-kicker">{t("landing:cta.kicker")}</p>
        <h2 id="cta-title">
          {t("landing:cta.titleLine1")}
          <br />
          {t("landing:cta.titleLine2")}
        </h2>
        <Link className="gold-button" href={loggedIn ? "/create" : "/register"}>
          {t("landing:cta.button")} <span>↗</span>
        </Link>
      </section>

      <section className="faq-section" aria-labelledby="faq-title">
        <div className="faq-heading">
          <p className="section-kicker">{t("landing:faq.kicker")}</p>
          <h2 id="faq-title">
            {t("landing:faq.titleLine1")}
            <br />
            {t("landing:faq.titleLine2")}
          </h2>
        </div>
        <div className="faq-list">
          {faqItems.map((item) => (
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
        <p>{t("landing:footer.tagline")}</p>
        <nav aria-label={t("landing:footer.legalAria")}>
          <a href="/confidentialite">{t("landing:footer.privacy")}</a>
          <a href="/cgu">{t("landing:footer.terms")}</a>
          <a href="mailto:support.luxeflexia@gmail.com">{t("landing:footer.contact")}</a>
        </nav>
        <small>© {new Date().getFullYear()} LuxeFlexIA</small>
      </footer>
    </div>
  );
}
