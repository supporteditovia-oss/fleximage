import { useEffect } from "react";
import { Card, CardContent } from "@/components/ui/card";
import {
  getLegalContent,
  type LegalDocumentKey,
} from "@/lib/legal-content";
import { setRobotsMeta } from "@/lib/robots-meta";
import { useTranslation } from "react-i18next";
import { Link } from "wouter";

interface LegalPageLayoutProps {
  pageKey: LegalDocumentKey;
}

export default function LegalPageLayout({ pageKey }: LegalPageLayoutProps) {
  const { i18n } = useTranslation();
  const content = getLegalContent(i18n.resolvedLanguage);
  const doc = content.docs[pageKey];

  useEffect(() => {
    // Privacy + CGU must stay crawlable for Google OAuth brand verification.
    if (pageKey === "privacy" || pageKey === "cgu") {
      setRobotsMeta("index, follow");
    } else {
      setRobotsMeta("noindex, nofollow");
    }
    return () => setRobotsMeta(null);
  }, [pageKey]);

  return (
    <div className="min-h-screen bg-background py-20 px-4">
      <div className="max-w-3xl mx-auto space-y-8">
        <Link href="/" className="text-primary hover:underline">
          {"<- "}
          {content.backHome}
        </Link>
        <h1 className="text-4xl font-display font-bold">{doc.title}</h1>

        <Card>
          <CardContent className="pt-6 space-y-6 text-muted-foreground text-sm leading-relaxed">
            <p className="text-xs text-muted-foreground/60">{content.lastUpdated}</p>

            {doc.sections.map((section) => (
              <section key={section.id}>
                <h2 className="text-lg font-bold text-foreground mb-2">
                  {section.title}
                </h2>

                {section.paragraphs?.map((paragraph, index) => (
                  <p key={`${section.id}-p-${index}`} className={index > 0 ? "mt-2" : undefined}>
                    {paragraph}
                  </p>
                ))}

                {section.bullets && section.bullets.length > 0 && (
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
                            <strong className="text-foreground">{bullet.label}:</strong>{" "}
                            {bullet.text}
                          </>
                        ) : (
                          bullet.text
                        )}
                      </li>
                    ))}
                  </ul>
                )}
              </section>
            ))}
          </CardContent>
        </Card>
      </div>
    </div>
  );
}
