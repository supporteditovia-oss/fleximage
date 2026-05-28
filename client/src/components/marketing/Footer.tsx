import { useTranslation } from "react-i18next";

export default function Footer() {
  const { t } = useTranslation();

  return (
    <footer className="border-t border-border bg-white/45 py-8">
      <div className="max-w-7xl mx-auto px-4 flex flex-col items-center gap-4 text-center">
        <div className="flex items-center">
          <img src="/assets/larpking.png" alt="LarpKing" className="h-12 object-contain" />
        </div>

        <nav className="flex flex-wrap justify-center gap-6 text-sm text-muted-foreground">
          <a href="/mentions-legales" className="hover:text-foreground transition-colors">
            {t("footer.legal")}
          </a>
          <a href="/cgu" className="hover:text-foreground transition-colors">
            {t("footer.cgu")}
          </a>
          <a href="/cgv" className="hover:text-foreground transition-colors">
            {t("footer.cgv")}
          </a>
          <a href="/confidentialite" className="hover:text-foreground transition-colors">
            {t("footer.privacy")}
          </a>
        </nav>

        <p className="text-sm text-muted-foreground">
          {t("footer.copyright", { year: new Date().getFullYear() })}
        </p>
      </div>
    </footer>
  );
}
