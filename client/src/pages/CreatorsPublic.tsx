import { MessageCircle } from "lucide-react";
import { Link } from "wouter";
import { Button } from "@/components/ui/button";

const WHATSAPP_NUMBER = "33688013215";
const WHATSAPP_DISPLAY = "06 88 01 32 15";
const WHATSAPP_TEXT =
  "Bonjour, je veux travailler avec LuxeFlexIA comme créateur de contenu.";

const STEPS: { title: string; text: string }[] = [
  {
    title: "Tu m'écris sur WhatsApp",
    text: "Présente-toi en deux lignes et dis-moi où tu publies (TikTok, Instagram, YouTube…). Pas encore de compte ? Ce n'est pas grave, on en parle.",
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
    text: "Tu reçois un code personnel. Dans tes vidéos, tu dis simplement luxeflexia.com et ton code : tes spectateurs le saisissent à l'inscription (ou dans Paramètres) et tout est compté pour toi, même sans lien.",
  },
];

export default function CreatorsPublic() {
  const href = `https://wa.me/${WHATSAPP_NUMBER}?text=${encodeURIComponent(WHATSAPP_TEXT)}`;
  return (
    <main className="mx-auto flex min-h-screen w-full max-w-2xl flex-col gap-8 px-5 py-12">
      <div className="space-y-3">
        <Link href="/" className="text-sm text-muted-foreground hover:underline">
          ← Retour
        </Link>
        <h1 className="text-3xl font-semibold">Travailler avec LuxeFlexIA</h1>
        <p className="text-muted-foreground">
          Tu fais des vidéos, tu as une audience (même petite) ? Deviens créateur LuxeFlexIA : tu
          produis du contenu avec nos outils et tu es rémunéré. Voici comment ça se passe.
        </p>
      </div>

      <ol className="space-y-4">
        {STEPS.map((s, i) => (
          <li key={s.title} className="flex gap-4 rounded-xl border p-4">
            <span className="flex h-8 w-8 shrink-0 items-center justify-center rounded-full bg-primary/10 text-sm font-semibold">
              {i + 1}
            </span>
            <div>
              <h2 className="font-medium">{s.title}</h2>
              <p className="mt-1 text-sm text-muted-foreground">{s.text}</p>
            </div>
          </li>
        ))}
      </ol>

      <section className="space-y-2 text-sm">
        <h2 className="font-medium">Les règles</h2>
        <ul className="list-disc space-y-1 pl-5 text-muted-foreground">
          <li>Indique clairement « partenariat / pub » sur tes vidéos (obligatoire en France).</li>
          <li>Pas de fausses promesses : montre de vrais résultats du studio.</li>
          <li>Pas d'utilisation de la photo d'une personne sans son accord.</li>
          <li>Le suivi se fait avec ton code, tu n'as rien à installer.</li>
        </ul>
      </section>

      <div className="space-y-3">
        <Button asChild size="lg" className="w-full sm:w-auto">
          <a href={href} target="_blank" rel="noopener noreferrer">
            <MessageCircle className="mr-2 h-5 w-5" /> Me contacter sur WhatsApp
          </a>
        </Button>
        <p className="text-sm text-muted-foreground">WhatsApp : {WHATSAPP_DISPLAY}</p>
      </div>
    </main>
  );
}
