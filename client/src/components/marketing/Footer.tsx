export default function Footer() {
  return (
    <footer className="py-8 border-t border-border">
      <div className="max-w-7xl mx-auto px-4 flex flex-col items-center gap-4 text-center">
        <div className="flex items-center">
          <img src="/assets/turboprank.png" alt="TurboPrank" className="h-10 object-contain" />
        </div>

        <nav className="flex flex-wrap justify-center gap-6 text-sm text-muted-foreground">
          <a href="/mentions-legales" className="hover:text-primary transition-colors">
            Mentions Légales
          </a>
          <a href="/cgu" className="hover:text-primary transition-colors">
            CGU
          </a>
          <a href="/cgv" className="hover:text-primary transition-colors">
            CGV
          </a>
          <a href="/confidentialite" className="hover:text-primary transition-colors">
            Confidentialité
          </a>
        </nav>

        <p className="text-sm text-muted-foreground">
          © 2026 TurboPRANK. Tous droits réservés.
        </p>
      </div>
    </footer>
  );
}
