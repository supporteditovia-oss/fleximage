import { useTranslation } from "react-i18next";

export default function Footer() {
  const { t } = useTranslation();

  return (
    <footer className="py-8 border-t border-border">
      <div className="max-w-7xl mx-auto px-4 flex flex-col items-center gap-4 text-center">
        <div className="flex items-center">
          <img src="/assets/turboprank.png" alt="TurboPrank" className="h-10 object-contain" />
        </div>

        <nav className="flex flex-wrap justify-center gap-6 text-sm text-muted-foreground">
          <a href="/mentions-legales" className="hover:text-primary transition-colors">
            {t("footer.legal")}
          </a>
          <a href="/cgu" className="hover:text-primary transition-colors">
            {t("footer.cgu")}
          </a>
          <a href="/cgv" className="hover:text-primary transition-colors">
            {t("footer.cgv")}
          </a>
          <a href="/confidentialite" className="hover:text-primary transition-colors">
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
