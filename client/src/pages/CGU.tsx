import { Card, CardContent } from "@/components/ui/card";
import { Link } from "wouter";

export default function CGU() {
  return (
    <div className="min-h-screen bg-background py-20 px-4">
      <div className="max-w-3xl mx-auto space-y-8">
        <Link href="/" className="text-primary hover:underline">← Retour à l'accueil</Link>
        <h1 className="text-4xl font-display font-bold">Conditions Générales d'Utilisation</h1>

        <Card>
          <CardContent className="pt-6 space-y-6 text-muted-foreground text-sm leading-relaxed">
            <p className="text-xs text-muted-foreground/60">Dernière mise à jour : 13 mars 2026</p>

            <section>
              <h2 className="text-lg font-bold text-foreground mb-2">1. Objet</h2>
              <p>
                Les présentes Conditions Générales d'Utilisation (ci-après « CGU ») ont pour objet de définir les modalités et conditions d'utilisation du service TurboPrank, accessible à l'adresse turboprank.com, édité par GUS, auto-entrepreneur (SIRET : 100 452 200 00015), dont le siège est situé au 11 rue de Bourgogne, 38000 Grenoble, France.
              </p>
            </section>

            <section>
              <h2 className="text-lg font-bold text-foreground mb-2">2. Acceptation des CGU</h2>
              <p>
                L'inscription au service TurboPrank implique l'acceptation pleine et entière des présentes CGU. En vous inscrivant, vous reconnaissez avoir pris connaissance des présentes conditions et les acceptez sans réserve.
              </p>
            </section>

            <section>
              <h2 className="text-lg font-bold text-foreground mb-2">3. Description du service</h2>
              <p>
                TurboPrank est un service en ligne de génération d'images par intelligence artificielle à vocation humoristique (« pranks »). L'utilisateur peut soumettre des images et/ou des descriptions textuelles afin de générer des images modifiées par IA.
              </p>
              <p className="mt-2">
                Le service propose une première génération gratuite avec filigrane. L'accès aux images sans filigrane et aux fonctionnalités avancées est soumis à un abonnement payant dont les conditions sont détaillées dans les Conditions Générales de Vente (CGV).
              </p>
            </section>

            <section>
              <h2 className="text-lg font-bold text-foreground mb-2">4. Inscription et compte utilisateur</h2>
              <p>
                L'accès au service nécessite la création d'un compte utilisateur. L'utilisateur s'engage à fournir des informations exactes et à maintenir la confidentialité de ses identifiants de connexion. Tout accès au compte avec les identifiants de l'utilisateur est réputé effectué par ce dernier.
              </p>
              <p className="mt-2">
                L'utilisateur peut supprimer son compte à tout moment depuis les paramètres de son compte ou en contactant prankturbo@gmail.com.
              </p>
            </section>

            <section>
              <h2 className="text-lg font-bold text-foreground mb-2">5. Utilisation responsable du service</h2>
              <p>
                L'utilisateur s'engage à utiliser le service de manière responsable et conforme à la législation en vigueur. Il est strictement interdit d'utiliser TurboPrank pour :
              </p>
              <ul className="list-disc list-inside mt-2 space-y-1.5">
                <li>
                  <strong className="text-foreground">Utiliser l'image d'autrui sans son consentement</strong> — Il est interdit de soumettre des photos de personnes tierces sans avoir obtenu leur accord préalable explicite. Cela inclut les photos trouvées sur internet, les réseaux sociaux ou provenant de tiers.
                </li>
                <li>
                  <strong className="text-foreground">Enfreindre les droits d'auteur et la propriété intellectuelle</strong> — L'utilisation d'images protégées par le droit d'auteur, de marques déposées, ou de tout contenu soumis à des droits de propriété intellectuelle sans autorisation est interdite.
                </li>
                <li>
                  <strong className="text-foreground">Harceler, intimider ou nuire à autrui</strong> — La création de contenus visant à humilier, harceler, menacer ou porter atteinte à la dignité d'une personne est formellement interdite, y compris dans un contexte prétendument « humoristique ».
                </li>
                <li>
                  <strong className="text-foreground">Créer du contenu illégal</strong> — Cela inclut, sans s'y limiter : les contenus à caractère pédopornographique, les contenus incitant à la haine, à la violence ou à la discrimination, les contenus terroristes, les contenus diffamatoires ou injurieux.
                </li>
                <li>
                  <strong className="text-foreground">Générer des deepfakes malveillants</strong> — Il est interdit de créer des images trompeuses visant à faire croire qu'une personne a dit ou fait quelque chose qu'elle n'a pas dit ou fait, dans l'intention de lui nuire ou de manipuler l'opinion publique.
                </li>
                <li>
                  <strong className="text-foreground">Toute utilisation à des fins frauduleuses</strong> — Y compris l'usurpation d'identité, la fraude, l'escroquerie ou toute autre activité illicite.
                </li>
              </ul>
              <p className="mt-3">
                GUS se réserve le droit de suspendre ou supprimer sans préavis tout compte dont l'utilisation serait contraire aux présentes conditions, sans que cela ne donne lieu à un quelconque dédommagement.
              </p>
            </section>

            <section>
              <h2 className="text-lg font-bold text-foreground mb-2">6. Propriété intellectuelle</h2>
              <p>
                Le service TurboPrank, son interface, ses textes, graphismes et logiciels sont protégés par le droit de la propriété intellectuelle. L'utilisateur conserve la propriété des images qu'il soumet au service. Les images générées par le service peuvent être utilisées librement par l'utilisateur dans le respect des présentes CGU et de la législation en vigueur.
              </p>
            </section>

            <section>
              <h2 className="text-lg font-bold text-foreground mb-2">7. Responsabilité de l'utilisateur</h2>
              <p>
                L'utilisateur est seul responsable du contenu qu'il soumet au service et des images qu'il génère. Il garantit disposer de tous les droits nécessaires sur les contenus qu'il soumet et s'engage à indemniser GUS de toute réclamation de tiers liée à l'utilisation du service.
              </p>
            </section>

            <section>
              <h2 className="text-lg font-bold text-foreground mb-2">8. Limitation de responsabilité de l'éditeur</h2>
              <p>
                GUS ne saurait être tenu responsable des contenus générés par les utilisateurs via le service. GUS met en œuvre les moyens raisonnables pour assurer la disponibilité du service mais ne garantit pas une disponibilité continue et ininterrompue. Le service est fourni « en l'état ».
              </p>
              <p className="mt-2">
                En aucun cas GUS ne pourra être tenu responsable des dommages indirects, pertes de données, pertes de profit ou d'opportunités résultant de l'utilisation ou de l'impossibilité d'utiliser le service.
              </p>
            </section>

            <section>
              <h2 className="text-lg font-bold text-foreground mb-2">9. Modification des CGU</h2>
              <p>
                GUS se réserve le droit de modifier les présentes CGU à tout moment. Les utilisateurs seront informés de toute modification substantielle. L'utilisation continue du service après modification vaut acceptation des nouvelles CGU.
              </p>
            </section>

            <section>
              <h2 className="text-lg font-bold text-foreground mb-2">10. Droit applicable et juridiction</h2>
              <p>
                Les présentes CGU sont soumises au droit français. En cas de litige, et après tentative de résolution amiable, les tribunaux compétents de Grenoble seront seuls compétents.
              </p>
            </section>

            <section>
              <h2 className="text-lg font-bold text-foreground mb-2">11. Contact</h2>
              <p>
                Pour toute question relative aux présentes CGU, vous pouvez nous contacter à l'adresse : prankturbo@gmail.com.
              </p>
            </section>
          </CardContent>
        </Card>
      </div>
    </div>
  );
}
