import { useEffect } from "react";
import { Gem } from "lucide-react";
import { Link } from "wouter";
import { Card, CardContent } from "@/components/ui/card";
import Footer from "@/components/marketing/Footer";
import type { LegalDocument } from "@/lib/legal-content";
import { PUBLIC_LEGAL_LAST_UPDATED } from "@/lib/legal-public-pages";
import { setRobotsMeta } from "@/lib/robots-meta";
import { setDocumentMeta } from "@/lib/document-meta";
import "@/pages/landing-v2.css";

export function PublicLegalPageLayout({
  document,
  canonicalPath,
}: {
  document: LegalDocument;
  canonicalPath: "/terms" | "/privacy";
}) {
  useEffect(() => {
    setDocumentMeta({
      title: document.title,
      description: `${document.title} — luxeflexia.com`,
      canonicalPath,
    });
    setRobotsMeta("index, follow, max-image-preview:large");
    return () => setRobotsMeta(null);
  }, [document.title, canonicalPath]);

  return (
    <div className="landing-v2 min-h-screen flex flex-col bg-[var(--lx-bg)] text-[var(--lx-ink)]">
      <header className="border-b border-black/8 bg-[var(--lx-surface)]/90 backdrop-blur-sm sticky top-0 z-10">
        <div className="mx-auto flex max-w-3xl items-center justify-between gap-4 px-4 py-4">
          <Link href="/" className="brand inline-flex items-center gap-2 no-underline">
            <span className="brand-mark" aria-hidden>
              <Gem className="brand-mark__gem" strokeWidth={1.75} />
            </span>
            <span>
              LuxeFlex<span>IA</span>
            </span>
          </Link>
          <Link
            href="/"
            className="text-sm text-[var(--lx-muted)] hover:text-[var(--lx-ink)]"
          >
            Accueil
          </Link>
        </div>
      </header>

      <main className="flex-1 py-12 px-4">
        <div className="max-w-3xl mx-auto space-y-6">
          <h1 className="text-3xl md:text-4xl font-display font-bold tracking-tight">
            {document.title}
          </h1>

          <Card className="border-black/8 bg-[var(--lx-surface)] shadow-sm">
            <CardContent className="pt-6 space-y-6 text-[var(--lx-muted)] text-sm leading-relaxed">
              <p className="text-xs opacity-70">{PUBLIC_LEGAL_LAST_UPDATED}</p>

              {document.sections.map((section) => (
                <section key={section.id}>
                  <h2 className="text-lg font-semibold text-[var(--lx-ink)] mb-2">
                    {section.title}
                  </h2>

                  {section.paragraphs?.map((paragraph, index) => (
                    <p
                      key={`${section.id}-p-${index}`}
                      className={index > 0 ? "mt-2" : undefined}
                    >
                      {paragraph}
                    </p>
                  ))}

                  {section.bullets && section.bullets.length > 0 ? (
                    <ul
                      className={
                        section.bulletStyle === "none"
                          ? "list-none mt-2 space-y-1"
                          : "list-disc list-inside mt-2 space-y-1.5"
                      }
                    >
                      {section.bullets.map((bullet, index) => (
                        <li key={`${section.id}-b-${index}`}>
                          {bullet.label ? (
                            <>
                              <strong className="text-[var(--lx-ink)]">
                                {bullet.label} :
                              </strong>{" "}
                              {bullet.text}
                            </>
                          ) : (
                            bullet.text
                          )}
                        </li>
                      ))}
                    </ul>
                  ) : null}
                </section>
              ))}
            </CardContent>
          </Card>
        </div>
      </main>

      <Footer />
    </div>
  );
}
