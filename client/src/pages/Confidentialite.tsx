import { Card, CardContent } from "@/components/ui/card";
import { Link } from "wouter";

export default function Confidentialite() {
  return (
    <div className="min-h-screen bg-background py-20 px-4">
      <div className="max-w-3xl mx-auto space-y-8">
        <Link href="/" className="text-primary hover:underline">← Retour à l'accueil</Link>
        <h1 className="text-4xl font-display font-bold">Politique de Confidentialité</h1>

        <Card>
          <CardContent className="pt-6 space-y-6 text-muted-foreground text-sm leading-relaxed">
            <p className="text-xs text-muted-foreground/60">Dernière mise à jour : 13 mars 2026</p>

            <section>
              <h2 className="text-lg font-bold text-foreground mb-2">1. Responsable du traitement</h2>
              <p>Le responsable du traitement des données personnelles est :</p>
              <ul className="list-none mt-2 space-y-1">
                <li><strong className="text-foreground">Nom :</strong> GUS</li>
                <li><strong className="text-foreground">Statut :</strong> Auto-entrepreneur (Entreprise Individuelle)</li>
                <li><strong className="text-foreground">SIRET :</strong> 100 452 200 00015</li>
                <li><strong className="text-foreground">Adresse :</strong> 11 rue de Bourgogne, 38000 Grenoble, France</li>
                <li><strong className="text-foreground">Email :</strong> prankturbo@gmail.com</li>
              </ul>
            </section>

            <section>
              <h2 className="text-lg font-bold text-foreground mb-2">2. Données collectées</h2>
              <p>Dans le cadre de l'utilisation du service TurboPrank, nous collectons les données suivantes :</p>
              <ul className="list-disc list-inside mt-2 space-y-1">
                <li><strong className="text-foreground">Données d'inscription :</strong> adresse email, mot de passe (hashé)</li>
                <li><strong className="text-foreground">Données d'utilisation :</strong> images soumises par l'utilisateur, images générées, historique des générations, prompts textuels</li>
                <li><strong className="text-foreground">Données techniques :</strong> adresse IP, type de navigateur, données de connexion</li>
                <li><strong className="text-foreground">Données de paiement :</strong> traitées par Stripe — nous ne stockons pas les informations bancaires</li>
              </ul>
            </section>

            <section>
              <h2 className="text-lg font-bold text-foreground mb-2">3. Finalités du traitement</h2>
              <p>Les données sont collectées pour les finalités suivantes :</p>
              <ul className="list-disc list-inside mt-2 space-y-1">
                <li>Fourniture et gestion du service TurboPrank</li>
                <li>Gestion des comptes utilisateurs</li>
                <li>Traitement des paiements et gestion des abonnements</li>
                <li>Amélioration du service et de l'expérience utilisateur</li>
                <li>Communication avec les utilisateurs (support, notifications liées au service)</li>
                <li>Respect des obligations légales</li>
              </ul>
            </section>

            <section>
              <h2 className="text-lg font-bold text-foreground mb-2">4. Base légale du traitement</h2>
              <p>Le traitement de vos données repose sur :</p>
              <ul className="list-disc list-inside mt-2 space-y-1">
                <li><strong className="text-foreground">L'exécution du contrat :</strong> le traitement est nécessaire à la fourniture du service auquel vous avez souscrit</li>
                <li><strong className="text-foreground">Le consentement :</strong> vous avez donné votre consentement lors de l'inscription et de l'acceptation des CGU</li>
                <li><strong className="text-foreground">L'intérêt légitime :</strong> amélioration du service, sécurité et prévention des abus</li>
              </ul>
            </section>

            <section>
              <h2 className="text-lg font-bold text-foreground mb-2">5. Durée de conservation</h2>
              <p>Les données sont conservées pendant les durées suivantes :</p>
              <ul className="list-disc list-inside mt-2 space-y-1">
                <li><strong className="text-foreground">Données de compte :</strong> pendant toute la durée de l'inscription, puis 3 ans après la suppression du compte</li>
                <li><strong className="text-foreground">Images soumises et générées :</strong> pendant toute la durée de l'inscription, supprimées à la suppression du compte</li>
                <li><strong className="text-foreground">Données de paiement :</strong> conformément aux obligations légales de conservation (10 ans pour les données comptables)</li>
                <li><strong className="text-foreground">Données techniques (logs) :</strong> 12 mois maximum</li>
              </ul>
            </section>

            <section>
              <h2 className="text-lg font-bold text-foreground mb-2">6. Partage avec des tiers</h2>
              <p>Vos données peuvent être partagées avec les sous-traitants suivants, nécessaires au fonctionnement du service :</p>
              <ul className="list-disc list-inside mt-2 space-y-1">
                <li><strong className="text-foreground">Supabase</strong> (authentification et base de données) — hébergé en Europe</li>
                <li><strong className="text-foreground">Stripe</strong> (traitement des paiements) — conforme PCI-DSS</li>
                <li><strong className="text-foreground">Cloudflare R2</strong> (stockage des images) — réseau mondial</li>
                <li><strong className="text-foreground">Kie.ai</strong> (génération d'images par IA) — les images soumises sont transmises pour traitement</li>
                <li><strong className="text-foreground">Railway</strong> (hébergement du serveur) — États-Unis</li>
              </ul>
              <p className="mt-2">
                Nous ne vendons jamais vos données personnelles à des tiers et ne les partageons pas à des fins publicitaires.
              </p>
            </section>

            <section>
              <h2 className="text-lg font-bold text-foreground mb-2">7. Cookies</h2>
              <p>
                TurboPrank utilise des cookies strictement nécessaires au fonctionnement du service (authentification, session utilisateur). Aucun cookie publicitaire ou de tracking n'est utilisé.
              </p>
            </section>

            <section>
              <h2 className="text-lg font-bold text-foreground mb-2">8. Vos droits (RGPD)</h2>
              <p>Conformément au Règlement Général sur la Protection des Données (RGPD), vous disposez des droits suivants :</p>
              <ul className="list-disc list-inside mt-2 space-y-1">
                <li><strong className="text-foreground">Droit d'accès :</strong> obtenir la confirmation que vos données sont traitées et en obtenir une copie</li>
                <li><strong className="text-foreground">Droit de rectification :</strong> demander la correction de vos données inexactes</li>
                <li><strong className="text-foreground">Droit de suppression :</strong> demander l'effacement de vos données personnelles</li>
                <li><strong className="text-foreground">Droit à la portabilité :</strong> recevoir vos données dans un format structuré et couramment utilisé</li>
                <li><strong className="text-foreground">Droit d'opposition :</strong> vous opposer au traitement de vos données dans certaines conditions</li>
                <li><strong className="text-foreground">Droit à la limitation du traitement :</strong> demander la suspension du traitement de vos données</li>
              </ul>
              <p className="mt-2">
                Pour exercer ces droits, contactez-nous à l'adresse : prankturbo@gmail.com. Nous nous engageons à répondre dans un délai de 30 jours.
              </p>
              <p className="mt-2">
                Vous disposez également du droit d'introduire une réclamation auprès de la CNIL (Commission Nationale de l'Informatique et des Libertés) : cnil.fr.
              </p>
            </section>

            <section>
              <h2 className="text-lg font-bold text-foreground mb-2">9. Sécurité</h2>
              <p>
                Nous mettons en œuvre des mesures techniques et organisationnelles appropriées pour protéger vos données contre tout accès non autorisé, modification, divulgation ou destruction. Les mots de passe sont hashés, les communications sont chiffrées via HTTPS, et l'accès aux données est strictement limité.
              </p>
            </section>

            <section>
              <h2 className="text-lg font-bold text-foreground mb-2">10. Mise à jour de la politique</h2>
              <p>
                La présente politique de confidentialité peut être modifiée à tout moment. Toute modification substantielle sera portée à la connaissance des utilisateurs. La date de dernière mise à jour figure en haut de cette page.
              </p>
            </section>

            <section>
              <h2 className="text-lg font-bold text-foreground mb-2">11. Contact</h2>
              <p>
                Pour toute question relative à la protection de vos données, contactez-nous à : prankturbo@gmail.com.
              </p>
            </section>
          </CardContent>
        </Card>
      </div>
    </div>
  );
}
