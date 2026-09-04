import { Gem } from "lucide-react";
import { useTranslation } from "react-i18next";
import { BrandMark } from "@/components/BrandMark";
import { localeHref } from "@/lib/locale-href";

const FOOTER_HREFS = [
  { href: "/tous-les-generateurs", labelKey: "footer.generators" },
  { href: "/mentions-legales", labelKey: "footer.legal" },
  { href: "/cgu", labelKey: "footer.cgu" },
  { href: "/cgv", labelKey: "footer.cgv" },
  { href: "/confidentialite", labelKey: "footer.privacy" },
] as const;

export default function Footer() {
  const { t, i18n } = useTranslation();

  return (
    <footer className="border-t border-black/8 bg-[var(--lx-surface)] py-10">
      <div className="mx-auto flex max-w-7xl flex-col items-center gap-5 px-4 text-center">
        <div className="inline-flex items-center gap-2">
          <Gem
            className="h-5 w-5 text-[var(--lx-gold)]"
            strokeWidth={1.75}
            aria-hidden
          />
          <BrandMark className="text-xl font-semibold tracking-tight text-[var(--lx-ink)]" />
        </div>

        <nav
          className="flex flex-wrap justify-center gap-x-5 gap-y-2 text-sm text-[var(--lx-muted)]"
          aria-label={t("landing.footer.navAria")}
        >
          {FOOTER_HREFS.map((link, index) => (
            <span key={link.href} className="inline-flex items-center gap-5">
              <a
                href={localeHref(link.href, i18n.resolvedLanguage)}
                className="min-h-12 inline-flex items-center transition-colors hover:text-[var(--lx-ink)]"
              >
                {t(link.labelKey)}
              </a>
              {index < FOOTER_HREFS.length - 1 && (
                <span className="hidden text-black/20 sm:inline" aria-hidden>
                  |
                </span>
              )}
            </span>
          ))}
        </nav>

        <p className="text-sm text-[var(--lx-muted)]">
          {t("footer.copyright", { year: 2026 })}
        </p>
      </div>
    </footer>
  );
}
