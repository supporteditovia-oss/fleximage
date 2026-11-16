import { MessageCircle } from "lucide-react";
import { Button } from "@/components/ui/button";

const WHATSAPP_NUMBER = "33688013215";
const WHATSAPP_TEXT =
  "Bonjour, je veux devenir créateur LuxeFlexIA et être payé aux vues.";

export default function CreatorsPublic() {
  const href = `https://wa.me/${WHATSAPP_NUMBER}?text=${encodeURIComponent(WHATSAPP_TEXT)}`;
  return (
    <main className="mx-auto flex min-h-screen w-full max-w-2xl flex-col justify-center gap-6 px-5 py-12">
      <h1 className="text-3xl font-semibold">Deviens créateur LuxeFlexIA</h1>
      <p className="text-muted-foreground">
        Fais des vidéos avec LuxeFlexIA (TikTok, Reels, Shorts) et sois payé en fonction des vues.
        Tu reçois ton lien personnel, et tu es aussi récompensé quand les personnes que tu amènes deviennent clientes.
      </p>
      <ul className="list-disc space-y-2 pl-5 text-sm">
        <li>Paiement aux 1 000 vues, avec un plafond par vidéo.</li>
        <li>Un lien personnel pour suivre tes résultats.</li>
        <li>Mention « pub / partenariat » obligatoire sur chaque vidéo.</li>
        <li>Pas d'engagement : tu commences quand tu veux.</li>
      </ul>
      <Button asChild size="lg" className="w-full sm:w-auto">
        <a href={href} target="_blank" rel="noopener noreferrer">
          <MessageCircle className="mr-2 h-5 w-5" /> Me contacter sur WhatsApp
        </a>
      </Button>
    </main>
  );
}
