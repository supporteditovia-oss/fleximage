import { Gem } from "lucide-react";

const FOOTER_LINKS = [
  {
    href: "/tous-les-generateurs",
    label: "Tous nos générateurs (Pranks, Luxe, Voyage)",
  },
  { href: "/mentions-legales", label: "Mentions légales" },
  { href: "/cgu", label: "CGU" },
  { href: "/cgv", label: "CGV" },
  { href: "/confidentialite", label: "Confidentialité" },
] as const;

export default function Footer() {
  return (
    <footer className="border-t border-black/8 bg-[var(--lx-surface)] py-10">
      <div className="mx-auto flex max-w-7xl flex-col items-center gap-5 px-4 text-center">
        <div className="inline-flex items-center gap-2">
          <Gem
            className="h-5 w-5 text-[var(--lx-gold)]"
            strokeWidth={1.75}
            aria-hidden
          />
          <span className="lx-display text-xl font-semibold tracking-tight text-[var(--lx-ink)]">
            Luxe<span className="text-[var(--lx-gold)]">Flex</span>IA
          </span>
        </div>

        <nav
          className="flex flex-wrap justify-center gap-x-5 gap-y-2 text-sm text-[var(--lx-muted)]"
          aria-label="Liens du site"
        >
          {FOOTER_LINKS.map((link, index) => (
            <span key={link.href} className="inline-flex items-center gap-5">
              <a
                href={link.href}
                className="min-h-12 inline-flex items-center transition-colors hover:text-[var(--lx-ink)]"
              >
                {link.label}
              </a>
              {index < FOOTER_LINKS.length - 1 && (
                <span className="hidden text-black/20 sm:inline" aria-hidden>
                  |
                </span>
              )}
            </span>
          ))}
        </nav>

        <p className="text-sm text-[var(--lx-muted)]">
          © 2026 LuxeFlexIA. Tous droits réservés.
        </p>
      </div>
    </footer>
  );
}
