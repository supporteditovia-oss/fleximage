import { useEffect, useRef, useState } from "react";
import { Link } from "wouter";
import {
  BarChart3,
  CheckCircle2,
  Eye,
  Heart,
  MessageCircle,
  MessageSquare,
  Mic,
  Play,
  Share2,
  Sparkles,
  Ticket,
} from "lucide-react";
import "./creators-page.css";

const WHATSAPP_NUMBER = "33688013215";
const WHATSAPP_DISPLAY = "06 88 01 32 15";
const WHATSAPP_TEXT =
  "Bonjour, je veux travailler avec LuxeFlexIA comme créateur de contenu.";
const WHATSAPP_HREF = `https://wa.me/${WHATSAPP_NUMBER}?text=${encodeURIComponent(WHATSAPP_TEXT)}`;

const STEPS = [
  {
    title: "Tu m'écris sur WhatsApp",
    text: "Présente-toi en deux lignes et dis-moi où tu publies : TikTok, Instagram, YouTube… Pas encore de compte ? Aucun souci, on en parle.",
  },
  {
    title: "On valide ensemble",
    text: "On discute du format des vidéos, de la rémunération et du paiement directement sur WhatsApp. Chaque créateur a son propre accord.",
  },
  {
    title: "Tu crées avec LuxeFlexIA",
    text: "Tu utilises le studio (image, voix, vidéo IA) pour faire des vidéos qui donnent envie d'essayer, puis tu les publies.",
  },
  {
    title: "Tu dis « luxeflexia.com » + ton code",
    text: "Tu reçois un <b>code personnel</b>. Dans tes vidéos, tu dis simplement <b>luxeflexia.com</b> et ton code : tes spectateurs le saisissent à l'inscription et tout est compté pour toi, même sans lien.",
  },
];

const BENEFITS = [
  { icon: Sparkles, title: "Le studio complet", text: "Image IA, vidéo IA et clonage vocal pour créer du contenu qui accroche." },
  { icon: Ticket, title: "Ton code perso", text: "Un code à dire dans tes vidéos. Pas besoin de lien ni de compte TikTok complet." },
  { icon: BarChart3, title: "Suivi de tes résultats", text: "On suit les inscriptions et clients que tu amènes grâce à ton code." },
  { icon: Mic, title: "Sans engagement", text: "Tu commences quand tu veux, tu t'arrêtes quand tu veux." },
];

const RULES = [
  "Indique clairement « partenariat / pub » sur tes vidéos (obligatoire en France).",
  "Pas de fausses promesses : montre de vrais résultats du studio.",
  "Pas d'utilisation de la photo d'une personne sans son accord.",
  "Le suivi se fait avec ton code : tu n'as rien à installer.",
];

const MARQUEE = [
  "Image IA",
  "Clonage vocal",
  "Vidéo IA",
  "Paiement aux vues",
  "Code personnel",
  "Sans engagement",
  "Suivi de tes résultats",
];

/** Ajoute `.is-in` quand l'élément entre dans l'écran. */
function useReveal<T extends HTMLElement>() {
  const ref = useRef<T | null>(null);
  useEffect(() => {
    const el = ref.current;
    if (!el) return;
    if (typeof IntersectionObserver === "undefined") {
      el.classList.add("is-in");
      return;
    }
    const io = new IntersectionObserver(
      (entries) => {
        for (const e of entries) {
          if (e.isIntersecting) {
            e.target.classList.add("is-in");
            io.unobserve(e.target);
          }
        }
      },
      { threshold: 0.15, rootMargin: "0px 0px -6% 0px" },
    );
    io.observe(el);
    return () => io.disconnect();
  }, []);
  return ref;
}

function Reveal({
  children,
  delay = 0,
  className = "",
}: {
  children: React.ReactNode;
  delay?: number;
  className?: string;
}) {
  const ref = useReveal<HTMLDivElement>();
  return (
    <div ref={ref} className={`cr-reveal ${className}`} style={{ ["--d" as string]: `${delay}ms` }}>
      {children}
    </div>
  );
}

/** Compteur animé (exemple illustratif dans le téléphone). */
function useCountUp(target: number, durationMs = 2600) {
  const [value, setValue] = useState(0);
  useEffect(() => {
    if (window.matchMedia?.("(prefers-reduced-motion: reduce)").matches) {
      setValue(target);
      return;
    }
    let raf = 0;
    let start = 0;
    const tick = (t: number) => {
      if (!start) start = t;
      const p = Math.min(1, (t - start) / durationMs);
      const eased = 1 - Math.pow(1 - p, 3);
      setValue(Math.round(target * eased));
      if (p < 1) raf = requestAnimationFrame(tick);
    };
    raf = requestAnimationFrame(tick);
    return () => cancelAnimationFrame(raf);
  }, [target, durationMs]);
  return value;
}

function WhatsAppIcon() {
  return <MessageCircle className="h-5 w-5" aria-hidden />;
}

export default function CreatorsPublic() {
  const views = useCountUp(1248000);

  useEffect(() => {
    const prev = document.title;
    document.title = "Travailler avec LuxeFlexIA";
    return () => {
      document.title = prev;
    };
  }, []);

  const spotlight = (e: React.MouseEvent<HTMLDivElement>) => {
    const r = e.currentTarget.getBoundingClientRect();
    e.currentTarget.style.setProperty("--mx", `${e.clientX - r.left}px`);
    e.currentTarget.style.setProperty("--my", `${e.clientY - r.top}px`);
  };

  return (
    <div className="cr">
      <div className="cr-bg" aria-hidden>
        <div className="cr-aurora cr-aurora--a" />
        <div className="cr-aurora cr-aurora--b" />
        <div className="cr-aurora cr-aurora--c" />
        <div className="cr-grid" />
        <div className="cr-grain" />
      </div>

      <div className="cr-wrap">
        <header className="cr-top">
          <Link href="/" className="cr-back">
            ← Retour
          </Link>
          <span className="cr-brand">LuxeFlexIA</span>
        </header>

        {/* ───── Hero ───── */}
        <section className="cr-hero">
          <div>
            <span className="cr-badge">
              <i /> Programme créateurs
            </span>
            <h1 className="cr-h1">
              Crée des vidéos. <span className="cr-shine">Fais-toi payer.</span>
            </h1>
            <p className="cr-lead">
              Tu fais des vidéos et tu as une audience, même petite ? Utilise <strong>LuxeFlexIA</strong> pour
              créer du contenu qui donne envie d'essayer, et deviens <strong>créateur partenaire</strong>.
            </p>
            <div className="cr-cta-row">
              <a className="cr-btn" href={WHATSAPP_HREF} target="_blank" rel="noopener noreferrer">
                <WhatsAppIcon /> Me contacter sur WhatsApp
              </a>
              <a className="cr-btn cr-btn--ghost" href="#comment">
                Voir comment ça marche
              </a>
            </div>
            <div className="cr-trust">
              <span>Sans engagement</span>
              <span>Sans lien nécessaire</span>
              <span>Réponse sur WhatsApp</span>
            </div>
          </div>

          <div className="cr-stage" aria-hidden>
            <div className="cr-chip cr-chip--views">
              <Eye size={20} />
              <div>
                {views.toLocaleString("fr-FR")}
                <small>vues (exemple)</small>
              </div>
            </div>
            <div className="cr-phone">
              <div className="cr-screen">
                <div className="cr-notch" />
                <div className="cr-play">
                  <Play size={26} fill="currentColor" />
                </div>
                <div className="cr-rail">
                  <div>
                    <Heart className="cr-heart" size={26} fill="currentColor" />
                    <span>248 k</span>
                  </div>
                  <div>
                    <MessageSquare size={24} />
                    <span>4 120</span>
                  </div>
                  <div>
                    <Share2 size={24} />
                    <span>9 872</span>
                  </div>
                </div>
                <div className="cr-screen-ui">
                  <div className="cr-caption">
                    Regarde ce que l'IA vient de faire 🤯 <b>luxeflexia.com</b> — code <b>TONCODE</b>
                  </div>
                </div>
              </div>
            </div>
            <div className="cr-chip cr-chip--code">
              <Ticket size={20} />
              <div>
                TONCODE
                <small>ton code personnel</small>
              </div>
            </div>
          </div>
        </section>
      </div>

      {/* ───── Bandeau ───── */}
      <div className="cr-marquee" aria-hidden>
        <div className="cr-marquee-track">
          {[...MARQUEE, ...MARQUEE].map((m, i) => (
            <span key={i}>{m}</span>
          ))}
        </div>
      </div>

      <div className="cr-wrap">
        {/* ───── Comment ça marche ───── */}
        <section className="cr-section" id="comment">
          <Reveal>
            <div className="cr-eyebrow">Comment ça marche</div>
            <h2 className="cr-h2">
              4 étapes, <span className="cr-shine">zéro prise de tête</span>
            </h2>
            <p className="cr-sub">
              Pas de formulaire compliqué : on se parle sur WhatsApp et on démarre.
            </p>
          </Reveal>
          <ol className="cr-steps">
            {STEPS.map((s, i) => (
              <li key={s.title}>
                <Reveal delay={i * 90} className="cr-step">
                  <div className="cr-step-num">{i + 1}</div>
                  <div className="cr-step-card">
                    <h3>{s.title}</h3>
                    <p dangerouslySetInnerHTML={{ __html: s.text }} />
                  </div>
                </Reveal>
              </li>
            ))}
          </ol>
        </section>

        {/* ───── Avantages ───── */}
        <section className="cr-section">
          <Reveal>
            <div className="cr-eyebrow">Ce que tu y gagnes</div>
            <h2 className="cr-h2">
              Tout pour <span className="cr-shine">créer et être suivi</span>
            </h2>
          </Reveal>
          <div className="cr-cards">
            {BENEFITS.map((b, i) => (
              <Reveal key={b.title} delay={i * 80}>
                <div className="cr-card" onMouseMove={spotlight}>
                  <div className="cr-card-ico">
                    <b.icon size={22} />
                  </div>
                  <h3>{b.title}</h3>
                  <p>{b.text}</p>
                </div>
              </Reveal>
            ))}
          </div>
        </section>

        {/* ───── Règles ───── */}
        <section className="cr-section">
          <Reveal>
            <div className="cr-eyebrow">Les règles</div>
            <h2 className="cr-h2">Simple et transparent</h2>
          </Reveal>
          <ul className="cr-rules">
            {RULES.map((r, i) => (
              <li key={r}>
                <Reveal delay={i * 70}>
                  <span style={{ display: "flex", gap: 12 }}>
                    <CheckCircle2 size={18} />
                    <span>{r}</span>
                  </span>
                </Reveal>
              </li>
            ))}
          </ul>
        </section>

        {/* ───── Appel final ───── */}
        <Reveal>
          <section className="cr-final">
            <div className="cr-final-inner">
              <h2>
                Prêt à <span className="cr-shine">commencer</span> ?
              </h2>
              <p>
                Écris-moi sur WhatsApp, on parle de ton projet et on voit ensemble comment travailler.
              </p>
              <a className="cr-btn" href={WHATSAPP_HREF} target="_blank" rel="noopener noreferrer">
                <WhatsAppIcon /> Ouvrir WhatsApp
              </a>
              <span className="cr-number">{WHATSAPP_DISPLAY}</span>
            </div>
          </section>
        </Reveal>

        <footer className="cr-foot">© LuxeFlexIA — Programme créateurs</footer>
      </div>

      <div className="cr-fab">
        <a className="cr-btn" href={WHATSAPP_HREF} target="_blank" rel="noopener noreferrer">
          <WhatsAppIcon /> WhatsApp
        </a>
      </div>
    </div>
  );
}
