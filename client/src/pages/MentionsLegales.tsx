import { Card, CardContent } from "@/components/ui/card";
import { Link } from "wouter";

export default function MentionsLegales() {
  return (
    <div className="min-h-screen bg-background py-20 px-4">
      <div className="max-w-3xl mx-auto space-y-8">
        <Link href="/" className="text-primary hover:underline">
          ← Retour à l'accueil
        </Link>
        <h1 className="text-4xl font-display font-bold">Mentions Légales</h1>

        <Card>
          <CardContent className="pt-6 space-y-6 text-muted-foreground text-sm leading-relaxed">
            <p className="text-xs text-muted-foreground/60">Dernière mise à jour : 13 mars 2026</p>

            <section>
              <h2 className="text-lg font-bold text-foreground mb-2">1. Éditeur du site</h2>
              <p>Le site TurboPrank accessible à l'adresse turboprank.com est édité par :</p>
              <ul className="list-none mt-2 space-y-1">
                <li><strong className="text-foreground">Nom :</strong> GUS</li>
                <li><strong className="text-foreground">Statut :</strong> Auto-entrepreneur (Entreprise Individuelle)</li>
                <li><strong className="text-foreground">SIRET :</strong> 100 452 200 00015</li>
                <li><strong className="text-foreground">Adresse :</strong> 11 rue de Bourgogne, 38000 Grenoble, France</li>
                <li><strong className="text-foreground">Email :</strong> prankturbo@gmail.com</li>
              </ul>
            </section>

            <section>
              <h2 className="text-lg font-bold text-foreground mb-2">2. Directeur de la publication</h2>
              <p>Le directeur de la publication est GUS, joignable à l'adresse prankturbo@gmail.com.</p>
            </section>

            <section>
              <h2 className="text-lg font-bold text-foreground mb-2">3. Hébergeur</h2>
              <p>Le site est hébergé par :</p>
              <ul className="list-none mt-2 space-y-1">
                <li><strong className="text-foreground">Nom :</strong> Railway Corporation</li>
                <li><strong className="text-foreground">Site web :</strong> railway.com</li>
                <li><strong className="text-foreground">Adresse :</strong> 548 Market Street, San Francisco, CA 94104, États-Unis</li>
              </ul>
            </section>

            <section>
              <h2 className="text-lg font-bold text-foreground mb-2">4. Propriété intellectuelle</h2>
              <p>
                L'ensemble du contenu du site TurboPrank (textes, graphismes, images, logos, icônes, logiciels) est la propriété exclusive de GUS ou de ses partenaires et est protégé par les lois françaises et internationales relatives à la propriété intellectuelle.
              </p>
              <p className="mt-2">
                Toute reproduction, représentation, modification ou exploitation non autorisée de tout ou partie du site est interdite et constitue une contrefaçon sanctionnée par les articles L.335-2 et suivants du Code de la propriété intellectuelle.
              </p>
            </section>

            <section>
              <h2 className="text-lg font-bold text-foreground mb-2">5. Limitation de responsabilité</h2>
              <p>
                GUS s'efforce d'assurer l'exactitude des informations diffusées sur le site, mais ne saurait être tenu responsable des omissions, inexactitudes ou carences dans la mise à jour de celles-ci.
              </p>
              <p className="mt-2">
                L'éditeur ne pourra être tenu responsable des dommages directs ou indirects causés au matériel de l'utilisateur lors de l'accès au site, résultant de l'utilisation d'un matériel non conforme ou de l'apparition d'un bug ou d'une incompatibilité.
              </p>
            </section>

            <section>
              <h2 className="text-lg font-bold text-foreground mb-2">6. Contact</h2>
              <p>
                Pour toute question relative aux mentions légales du site, vous pouvez nous contacter à l'adresse : prankturbo@gmail.com.
              </p>
            </section>
          </CardContent>
        </Card>
      </div>
    </div>
  );
}
