import { Card, CardContent } from "@/components/ui/card";
import { Link } from "wouter";

export default function CGV() {
  return (
    <div className="min-h-screen bg-background py-20 px-4">
      <div className="max-w-3xl mx-auto space-y-8">
        <Link href="/" className="text-primary hover:underline">← Retour à l'accueil</Link>
        <h1 className="text-4xl font-display font-bold">Conditions Générales de Vente</h1>

        <Card>
          <CardContent className="pt-6 space-y-6 text-muted-foreground text-sm leading-relaxed">
            <p className="text-xs text-muted-foreground/60">Dernière mise à jour : 13 mars 2026</p>

            <section>
              <h2 className="text-lg font-bold text-foreground mb-2">1. Objet</h2>
              <p>
                Les présentes Conditions Générales de Vente (ci-après « CGV ») régissent les modalités de souscription et d'utilisation des services payants proposés par TurboPrank, édité par GUS, auto-entrepreneur (SIRET : 100 452 200 00015), dont le siège est situé au 11 rue de Bourgogne, 38000 Grenoble, France.
              </p>
            </section>

            <section>
              <h2 className="text-lg font-bold text-foreground mb-2">2. Description du service</h2>
              <p>
                TurboPrank propose un service de génération d'images par intelligence artificielle. L'abonnement payant donne accès aux fonctionnalités suivantes :
              </p>
              <ul className="list-disc list-inside mt-2 space-y-1">
                <li>Images générées en haute définition sans filigrane</li>
                <li>50 crédits de génération par période d'abonnement</li>
                <li>Accès à l'ensemble des templates disponibles</li>
                <li>Historique complet des générations</li>
                <li>Téléchargement et partage des images</li>
              </ul>
            </section>

            <section>
              <h2 className="text-lg font-bold text-foreground mb-2">3. Prix</h2>
              <p>
                L'abonnement à TurboPrank est proposé au prix de <strong className="text-foreground">4,90 € TTC par semaine</strong>.
              </p>
              <p className="mt-2">
                GUS se réserve le droit de modifier les prix à tout moment. Toute modification de prix sera communiquée aux abonnés et n'entrera en vigueur qu'au prochain renouvellement de l'abonnement.
              </p>
              <p className="mt-2">
                En tant qu'auto-entrepreneur, GUS bénéficie de la franchise en base de TVA (article 293 B du CGI). La TVA n'est donc pas applicable.
              </p>
            </section>

            <section>
              <h2 className="text-lg font-bold text-foreground mb-2">4. Modalités de souscription</h2>
              <p>
                La souscription à l'abonnement s'effectue en ligne via le site turboprank.com. Le paiement est traité de manière sécurisée par Stripe, prestataire de paiement certifié PCI-DSS. L'abonnement est renouvelé automatiquement chaque semaine.
              </p>
              <p className="mt-2">
                En souscrivant, l'utilisateur accepte les présentes CGV ainsi que les Conditions Générales d'Utilisation (CGU) du service.
              </p>
            </section>

            <section>
              <h2 className="text-lg font-bold text-foreground mb-2">5. Droit de rétractation</h2>
              <p>
                Conformément à l'article L.221-28 du Code de la consommation, le droit de rétractation ne peut être exercé pour les contrats de fourniture de contenu numérique non fourni sur un support matériel dont l'exécution a commencé avec l'accord du consommateur.
              </p>
              <p className="mt-2">
                En utilisant le service après la souscription (génération d'images), l'utilisateur reconnaît renoncer expressément à son droit de rétractation pour les crédits consommés. Le droit de rétractation de 14 jours reste applicable si aucune génération n'a été effectuée.
              </p>
            </section>

            <section>
              <h2 className="text-lg font-bold text-foreground mb-2">6. Résiliation</h2>
              <p>
                L'utilisateur peut résilier son abonnement à tout moment depuis les paramètres de son compte ou en contactant prankturbo@gmail.com. La résiliation prend effet à la fin de la période d'abonnement en cours. L'utilisateur conserve l'accès au service jusqu'à cette date.
              </p>
              <p className="mt-2">
                Aucun remboursement au prorata ne sera effectué pour la période restante après la résiliation.
              </p>
            </section>

            <section>
              <h2 className="text-lg font-bold text-foreground mb-2">7. Remboursements</h2>
              <p>
                Les demandes de remboursement peuvent être adressées à prankturbo@gmail.com dans un délai de 14 jours suivant la souscription, sous réserve qu'aucun crédit de génération n'ait été utilisé. Chaque demande sera étudiée au cas par cas.
              </p>
            </section>

            <section>
              <h2 className="text-lg font-bold text-foreground mb-2">8. Responsabilité</h2>
              <p>
                GUS s'engage à fournir le service avec diligence. Toutefois, le service est fourni « en l'état » et GUS ne saurait garantir une disponibilité continue et sans interruption. En cas d'indisponibilité prolongée du service, les abonnés concernés pourront demander une compensation au prorata de la durée d'indisponibilité.
              </p>
            </section>

            <section>
              <h2 className="text-lg font-bold text-foreground mb-2">9. Service client</h2>
              <p>
                Pour toute question relative à votre abonnement, facturation ou demande de remboursement, contactez-nous à : prankturbo@gmail.com. Nous nous engageons à répondre sous 48 heures.
              </p>
            </section>

            <section>
              <h2 className="text-lg font-bold text-foreground mb-2">10. Droit applicable et litiges</h2>
              <p>
                Les présentes CGV sont soumises au droit français. En cas de litige, l'utilisateur est informé qu'il peut recourir à un médiateur de la consommation conformément aux articles L.611-1 et suivants du Code de la consommation. À défaut de résolution amiable, les tribunaux compétents de Grenoble seront seuls compétents.
              </p>
            </section>
          </CardContent>
        </Card>
      </div>
    </div>
  );
}
