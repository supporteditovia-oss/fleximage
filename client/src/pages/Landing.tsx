import * as React from "react";
import { Link } from "wouter";
import { Button } from "@/components/ui/button";
import { Accordion, AccordionContent, AccordionItem, AccordionTrigger } from "@/components/ui/accordion";
import { motion } from "framer-motion";
import { ArrowRight, CheckCircle2, Zap, Shield, Globe } from "lucide-react";
import { useAuth } from "@/hooks/use-auth";

function FloatingHeader() {
  const { user } = useAuth();
  
  return (
    <div className="fixed top-6 left-0 right-0 z-50 flex justify-center px-4 pointer-events-none">
      <motion.header 
        initial={{ y: -100, opacity: 0 }}
        animate={{ y: 0, opacity: 1 }}
        transition={{ type: "spring", stiffness: 100, damping: 20 }}
        className="bg-background/80 backdrop-blur-xl border border-border/50 pointer-events-auto flex items-center justify-between px-6 py-3 rounded-full w-full max-w-5xl shadow-xl shadow-black/5"
      >
        <div className="flex items-center gap-2">
          <Link href="/" className="flex items-center gap-2 pointer-events-auto cursor-pointer hover:opacity-80 transition-opacity">
            <div className="bg-primary/10 p-1.5 rounded-lg">
              <div className="bg-primary w-4 h-4 rounded-full" />
            </div>
            <span className="font-display font-bold text-xl tracking-tight">SaaSify</span>
          </Link>
        </div>

        <nav className="hidden md:flex items-center gap-8 text-sm font-medium text-muted-foreground">
          <a href="#features" className="hover:text-primary transition-colors">Fonctionnalités</a>
          <a href="#pricing" className="hover:text-primary transition-colors">Tarifs</a>
          <a href="#faq" className="hover:text-primary transition-colors">FAQ</a>
        </nav>

        <div className="flex items-center gap-3">
          {user ? (
            <Link href="/app">
              <Button size="sm" className="rounded-full px-6">App</Button>
            </Link>
          ) : (
            <>
              <Link href="/login">
                <Button variant="ghost" size="sm" className="rounded-full hidden sm:flex">Connexion</Button>
              </Link>
              <Link href="/register">
                <Button size="sm" className="rounded-full px-6 shadow-lg shadow-primary/20">Démarrer</Button>
              </Link>
            </>
          )}
        </div>
      </motion.header>
    </div>
  );
}

export default function Landing() {
  const containerVariants = {
    hidden: { opacity: 0 },
    visible: { 
      opacity: 1,
      transition: { staggerChildren: 0.1 } 
    }
  };

  const itemVariants = {
    hidden: { y: 20, opacity: 0 },
    visible: { y: 0, opacity: 1 }
  };

  return (
    <div className="min-h-screen bg-background relative overflow-hidden">
      <FloatingHeader />

      {/* Hero Section */}
      <section className="relative min-h-screen flex items-center justify-center px-4 pt-32">
        {/* Abstract Background Shapes */}
        <div className="absolute top-1/2 left-1/2 -translate-x-1/2 -translate-y-1/2 w-[800px] h-[800px] bg-primary/10 rounded-full blur-3xl -z-10" />
        <div className="absolute top-0 right-0 w-[500px] h-[500px] bg-accent/10 rounded-full blur-3xl -z-10" />
        
        <motion.div 
          variants={containerVariants}
          initial="hidden"
          animate="visible"
          className="text-center max-w-4xl mx-auto space-y-8"
        >
          <motion.div variants={itemVariants} className="inline-flex items-center gap-2 px-4 py-2 rounded-full bg-secondary/50 border border-border/50 text-sm font-medium text-muted-foreground">
            <span className="relative flex h-2 w-2">
              <span className="animate-ping absolute inline-flex h-full w-full rounded-full bg-primary opacity-75"></span>
              <span className="relative inline-flex rounded-full h-2 w-2 bg-primary"></span>
            </span>
            La v2.0 est maintenant disponible
          </motion.div>
          
          <motion.h1 variants={itemVariants} className="font-display text-5xl md:text-7xl font-bold leading-[1.1] tracking-tight text-balance">
            Lancez votre prochain SaaS <br />
            <span className="text-gradient">plus vite que jamais</span>
          </motion.h1>
          
          <motion.p variants={itemVariants} className="text-xl text-muted-foreground max-w-2xl mx-auto leading-relaxed">
            Un boilerplate complet avec Supabase et une interface moderne pour lancer votre produit sans perdre de temps.
          </motion.p>
          
          <motion.div variants={itemVariants} className="flex flex-col sm:flex-row items-center justify-center gap-4 pt-4">
            <Link href="/register">
              <Button size="lg" className="rounded-full h-14 px-8 text-lg shadow-xl shadow-primary/25 hover:shadow-2xl hover:shadow-primary/30 transition-all hover:-translate-y-0.5">
                Commencer
                <ArrowRight className="ml-2 w-5 h-5" />
              </Button>
            </Link>
          </motion.div>
        </motion.div>
      </section>

      {/* Features Grid */}
      <section id="features" className="py-24 md:py-32 px-4 bg-secondary/30">
        <div className="max-w-7xl mx-auto">
          <div className="text-center mb-16 space-y-4">
            <h2 className="font-display text-3xl md:text-4xl font-bold">Tout ce dont vous avez besoin</h2>
            <p className="text-muted-foreground text-lg max-w-2xl mx-auto">
              Nous avons inclus toutes les fonctionnalités essentielles pour que vous n'ayez pas à les construire de zéro.
            </p>
          </div>

          <div className="grid md:grid-cols-3 gap-8">
            {[
              {
                icon: Zap,
                title: "Ultra Rapide",
                desc: "Basé sur Vite et React pour des chargements instantanés et un développement fluide."
              },
              {
                icon: Shield,
                title: "Sécurisé par Défaut",
                desc: "Authentification de niveau entreprise et politiques RLS via Supabase."
              },
              {
                icon: Globe,
                title: "Échelle Mondiale",
                desc: "Déployez n'importe où. Votre base de données et vos assets sont prêts pour le Edge."
              }
            ].map((feature, i) => (
              <div key={i} className="bg-card p-8 rounded-2xl border border-border/50 shadow-sm hover:shadow-md transition-all">
                <div className="w-12 h-12 rounded-xl bg-primary/10 flex items-center justify-center mb-6 text-primary">
                  <feature.icon className="w-6 h-6" />
                </div>
                <h3 className="font-display text-xl font-bold mb-3">{feature.title}</h3>
                <p className="text-muted-foreground leading-relaxed">{feature.desc}</p>
              </div>
            ))}
          </div>
        </div>
      </section>

      {/* Pricing Section */}
      <section id="pricing" className="py-24 md:py-32 px-4 relative overflow-hidden">
        <div className="absolute top-1/2 left-1/2 -translate-x-1/2 -translate-y-1/2 w-[600px] h-[600px] bg-primary/5 rounded-full blur-3xl -z-10" />
        
        <div className="max-w-7xl mx-auto">
          <div className="text-center mb-16 space-y-4">
            <h2 className="font-display text-3xl md:text-4xl font-bold">Des tarifs simples et transparents</h2>
            <p className="text-muted-foreground text-lg max-w-2xl mx-auto">
              Un seul plan, toutes les fonctionnalités incluses.
            </p>
          </div>

          <div className="max-w-md mx-auto">
            <div className="relative p-8 rounded-3xl border bg-card border-primary shadow-xl shadow-primary/5 transition-all duration-300 hover:shadow-2xl hover:-translate-y-1">
              <div className="absolute -top-4 left-1/2 -translate-x-1/2 px-4 py-1 bg-primary text-primary-foreground text-xs font-bold rounded-full uppercase tracking-widest shadow-lg">
                Pro
              </div>

              <div className="mb-8">
                <h3 className="font-display text-2xl font-bold mb-2">Pro</h3>
                <div className="flex items-baseline gap-1 mb-4">
                  <span className="text-4xl font-bold tracking-tight">29€</span>
                  <span className="text-muted-foreground">/mois</span>
                </div>
                <p className="text-muted-foreground text-sm leading-relaxed">Pour les projets sérieux et les équipes.</p>
              </div>

              <ul className="space-y-4 mb-8">
                {[
                  "Projets illimités",
                  "Analyses avancées",
                  "Support prioritaire",
                  "Domaines personnalisés",
                  "Sauvegardes quotidiennes"
                ].map((feature, j) => (
                  <li key={j} className="flex items-center gap-3 text-sm">
                    <CheckCircle2 className="w-5 h-5 shrink-0 text-primary" />
                    <span>{feature}</span>
                  </li>
                ))}
              </ul>

              <Link href="/register">
                <Button
                  className="w-full rounded-full h-12 text-base font-semibold transition-all shadow-lg shadow-primary/20"
                >
                  S'inscrire
                </Button>
              </Link>
            </div>
          </div>
        </div>
      </section>

      {/* FAQ Section */}
      <section id="faq" className="py-24 md:py-32 px-4">
        <div className="max-w-3xl mx-auto">
          <div className="text-center mb-16 space-y-4">
            <h2 className="font-display text-3xl md:text-4xl font-bold">Questions Fréquentes</h2>
            <p className="text-muted-foreground">Vous avez des questions ? Nous avons les réponses.</p>
          </div>

          <Accordion type="single" collapsible className="w-full space-y-4">
            {[
              { q: "Comment fonctionne l'abonnement ?", a: "L'accès à la plateforme nécessite un abonnement Pro à 29€/mois. Toutes les fonctionnalités sont incluses." },
              { q: "Dois-je utiliser Supabase ?", a: "Oui, cette pile est étroitement intégrée à Supabase pour l'authentification et la base de données. Cela vous fait gagner des semaines de travail backend." },
              { q: "Puis-je l'héberger sur Vercel ?", a: "Absolument. Le frontend est une application React standard qui peut être déployée sur Vercel, Netlify ou Replit." },
              { q: "Est-ce que ça inclut les paiements ?", a: "Pas nativement, mais il est très facile d'intégrer Stripe en utilisant leur SDK JS." }
            ].map((item, i) => (
              <AccordionItem key={i} value={`item-${i}`} className="border rounded-xl px-6 bg-card shadow-sm">
                <AccordionTrigger className="font-display font-medium text-lg py-6 hover:text-primary transition-colors">
                  {item.q}
                </AccordionTrigger>
                <AccordionContent className="text-muted-foreground pb-6 leading-relaxed">
                  {item.a}
                </AccordionContent>
              </AccordionItem>
            ))}
          </Accordion>
        </div>
      </section>

      {/* Footer */}
      <footer className="py-12 border-t border-border bg-card">
        <div className="max-w-7xl mx-auto px-4">
          <div className="flex flex-col md:flex-row justify-between items-center gap-6">
            <div className="flex items-center gap-2">
              <div className="bg-primary/10 p-1.5 rounded-lg">
                <div className="bg-primary w-3 h-3 rounded-full" />
              </div>
              <span className="font-display font-bold text-lg tracking-tight">SaaSify</span>
            </div>
            
            <nav className="flex flex-wrap justify-center gap-6 text-sm text-muted-foreground">
              <Link href="/mentions-legales" className="hover:text-primary transition-colors">Mentions Légales</Link>
              <Link href="/cgu" className="hover:text-primary transition-colors">CGU</Link>
              <Link href="/confidentialite" className="hover:text-primary transition-colors">Confidentialité</Link>
            </nav>

            <p className="text-sm text-muted-foreground">
              © 2026 SaaSify. Tous droits réservés.
            </p>
          </div>
        </div>
      </footer>
    </div>
  );
}
