import * as React from "react";
import { Link, useLocation } from "wouter";
import { Button } from "@/components/ui/button";
import { motion } from "framer-motion";
import {
  ImageUp,
  SendHorizonal,
  ChevronDown,
  Search,
  Plus,
  X,
} from "lucide-react";
import { useAuth } from "@/hooks/use-auth";

function FloatingHeader() {
  const { user } = useAuth();

  return (
    <div className="fixed top-6 left-0 right-0 z-50 flex justify-center px-4 pointer-events-none">
      <motion.header
        initial={{ y: -100, opacity: 0 }}
        animate={{ y: 0, opacity: 1 }}
        transition={{ type: "spring", stiffness: 100, damping: 20 }}
        className="bg-background/80 backdrop-blur-xl border border-border/50 pointer-events-auto flex items-center justify-between px-6 py-3 rounded-full w-full md:max-w-[60%] shadow-xl shadow-black/5"
      >
        <div className="flex items-center gap-2">
          <Link
            href="/"
            className="flex items-center gap-2 pointer-events-auto cursor-pointer hover:opacity-80 transition-opacity"
          >
            <span
              className="inline-block text-xl font-extrabold tracking-tight select-none"
              style={{
                WebkitTextStroke: "1.5px black",
                paintOrder: "stroke fill",
              }}
            >
              <span className="text-secondary">Turbo</span>
              <span className="text-primary">Prank</span>
            </span>
          </Link>
        </div>

        <div className="flex items-center gap-3">
          {user ? (
            <Link href="/app">
              <Button size="sm" className="rounded-full px-6">
                App
              </Button>
            </Link>
          ) : (
            <>
              <Link href="/login">
                <Button
                  variant="ghost"
                  size="sm"
                  className="rounded-full hidden sm:flex"
                >
                  Connexion
                </Button>
              </Link>
              <Link href="/register">
                <Button
                  size="sm"
                  className="rounded-full px-6 shadow-lg shadow-primary/20"
                >
                  Démarrer
                </Button>
              </Link>
            </>
          )}
        </div>
      </motion.header>
    </div>
  );
}

export default function Landing() {
  const [, navigate] = useLocation();
  const [search, setSearch] = React.useState("");
  const [prompt, setPrompt] = React.useState("");
  const [images, setImages] = React.useState<(string | null)[]>([null]);
  const examplesRef = React.useRef<HTMLElement>(null);

  const handleImageSelect = (index: number, file: File) => {
    const url = URL.createObjectURL(file);
    setImages((prev) => {
      const next = [...prev];
      next[index] = url;
      return next;
    });
  };

  const addSlot = () => {
    if (images.length < 3) setImages((prev) => [...prev, null]);
  };

  const removeSlot = (index: number) => {
    setImages((prev) => {
      const next = prev.filter((_, i) => i !== index);
      return next.length === 0 ? [null] : next;
    });
  };

  const containerVariants = {
    hidden: { opacity: 0 },
    visible: {
      opacity: 1,
      transition: { staggerChildren: 0.1 },
    },
  };

  const itemVariants = {
    hidden: { y: 20, opacity: 0 },
    visible: { y: 0, opacity: 1 },
  };

  const pranks = [
    {
      label: "Ticket d'amende",
      desc: "Un vrai PV de stationnement à ton nom",
      inputCount: 1,
      outputLabel: "PV",
    },
    {
      label: "Fausse grossesse",
      desc: "Une écho ultra-réaliste pour choquer la famille",
      inputCount: 2,
      outputLabel: "Echo",
    },
    {
      label: "Diplôme raté",
      desc: "Le relevé de notes qui fait peur",
      inputCount: 1,
      outputLabel: "Releve",
    },
    {
      label: "Rupture par SMS",
      desc: "Une capture d'écran qui fait tout péter",
      inputCount: 2,
      outputLabel: "SMS",
    },
    {
      label: "Invitation VIP",
      desc: "Soirée privée avec les stars",
      inputCount: 1,
      outputLabel: "Invite",
    },
    {
      label: "Lettre de licenciement",
      desc: "Un courrier officiel très convaincant",
      inputCount: 1,
      outputLabel: "Lettre",
    },
    {
      label: "Achat immobilier",
      desc: "Le compromis de vente de la villa",
      inputCount: 2,
      outputLabel: "Contrat",
    },
    {
      label: "Jackpot au loto",
      desc: "Le ticket gagnant à 2 millions",
      inputCount: 1,
      outputLabel: "Ticket",
    },
  ];

  const filtered = pranks.filter(
    (p) =>
      p.label.toLowerCase().includes(search.toLowerCase()) ||
      p.desc.toLowerCase().includes(search.toLowerCase()),
  );

  return (
    <div className="bg-background relative overflow-hidden">
      <FloatingHeader />

      {/* Hero Section */}
      <section className="relative h-screen max-h-screen overflow-hidden flex flex-col items-center px-4 pt-28 md:pt-32 gap-5">
        {/* Abstract Background Shapes */}
        <div className="absolute top-1/2 left-1/2 -translate-x-1/2 -translate-y-1/2 w-[800px] h-[800px] bg-primary/10 rounded-full blur-3xl -z-10" />
        <div className="absolute top-0 right-0 w-[500px] h-[500px] bg-accent/10 rounded-full blur-3xl -z-10" />

        <motion.div
          variants={containerVariants}
          initial="hidden"
          animate="visible"
          className="flex flex-col items-center gap-4 w-full"
        >
          {/* Title */}
          <motion.h1
            variants={itemVariants}
            className="font-display text-4xl md:text-5xl font-bold leading-[1.1] tracking-tight text-center"
          >
            Crée ton prank,
          </motion.h1>

          <div className="relative flex flex-col items-center w-full pb-14 -mt-2">
            {/* 9:16 image drop zone(s) + add button */}
            <motion.div
              variants={itemVariants}
              className="relative flex items-center justify-center gap-3 flex-shrink-0"
            >
              {images.map((img, i) => (
                <div
                  key={i}
                  className="relative flex-shrink-0"
                  style={{ height: "min(52vh, 440px)", aspectRatio: "9/16" }}
                >
                  {img ? (
                    <>
                      <img
                        src={img}
                        alt={`Image ${i + 1}`}
                        className="absolute inset-0 w-full h-full object-cover rounded-2xl"
                      />
                      <button
                        onClick={() => removeSlot(i)}
                        className="absolute top-2 right-2 z-10 w-6 h-6 rounded-full bg-black/50 text-white flex items-center justify-center hover:bg-black/70 transition-colors"
                      >
                        <X className="w-3.5 h-3.5" />
                      </button>
                    </>
                  ) : (
                    <label className="group absolute inset-0 flex flex-col items-center justify-center gap-3 rounded-2xl border-2 border-dashed border-border bg-card hover:border-primary hover:bg-primary/5 transition-all cursor-pointer">
                      <input
                        type="file"
                        accept="image/*"
                        className="hidden"
                        onChange={(e) => {
                          const file = e.target.files?.[0];
                          if (file) handleImageSelect(i, file);
                        }}
                      />
                      <div className="w-12 h-12 rounded-xl bg-muted flex items-center justify-center group-hover:bg-primary/10 transition-colors">
                        <ImageUp className="w-6 h-6 text-muted-foreground group-hover:text-primary transition-colors" />
                      </div>
                      <div className="text-center px-4">
                        <p className="text-sm font-medium text-foreground">
                          Dépose ton image
                        </p>
                        <p className="text-xs text-muted-foreground mt-0.5">
                          ou clique pour parcourir
                        </p>
                      </div>
                    </label>
                  )}
                </div>
              ))}

              {/* + button positioned absolutely so it doesn't shift the centered cards */}
              {images.length < 3 && (
                <button
                  onClick={addSlot}
                  className="absolute top-1/2 -translate-y-1/2 flex items-center justify-center w-10 h-10 rounded-xl border-2 border-dashed border-border bg-card hover:border-primary hover:bg-primary/5 text-muted-foreground hover:text-primary transition-all"
                  style={{ left: "100%", marginLeft: "12px" }}
                >
                  <Plus className="w-5 h-5" />
                </button>
              )}
            </motion.div>

            {/* Text input over the bottom edge of the card */}
            <motion.div
              variants={itemVariants}
              className="absolute bottom-4 z-20 w-full max-w-sm"
            >
              <div className="flex items-center gap-2 w-full rounded-2xl border border-border bg-card/95 backdrop-blur px-4 py-3 shadow-lg hover:border-primary focus-within:border-primary focus-within:ring-2 focus-within:ring-primary/20 transition-all">
                <input
                  type="text"
                  value={prompt}
                  onChange={(e) => setPrompt(e.target.value)}
                  placeholder="Décris ton prank…"
                  className="flex-1 bg-transparent text-sm outline-none placeholder:text-muted-foreground"
                />
                <Button
                  size="sm"
                  className="rounded-xl h-8 w-8 p-0 shrink-0"
                  onClick={() => navigate("/register")}
                >
                  <SendHorizonal className="w-4 h-4" />
                </Button>
              </div>
            </motion.div>
          </div>

          {/* Scroll arrow */}
          <motion.button
            variants={itemVariants}
            onClick={() =>
              examplesRef.current?.scrollIntoView({ behavior: "smooth" })
            }
            className="flex flex-col items-center gap-1 text-foreground hover:text-foreground transition-colors -mt-2 group"
          >
            <span className="inline-flex items-center gap-2 text-base md:text-lg font-semibold">
              Utiliser des pranks existants
              <ChevronDown className="w-5 h-5 animate-bounce" />
            </span>
          </motion.button>
        </motion.div>
      </section>

      {/* Pranks Gallery Section */}
      <section
        ref={examplesRef}
        className="h-screen max-h-screen flex flex-col px-4 py-10"
      >
        <div className="max-w-2xl mx-auto w-full flex flex-col h-full gap-6">
          <h2 className="font-display text-2xl md:text-3xl font-bold text-center flex-shrink-0">
            Choisis parmi les pranks existants
          </h2>

          {/* Search bar */}
          <div className="flex items-center gap-2 rounded-2xl border border-border bg-card px-4 py-3 shadow-sm focus-within:border-primary focus-within:ring-2 focus-within:ring-primary/20 transition-all flex-shrink-0">
            <Search className="w-4 h-4 text-muted-foreground shrink-0" />
            <input
              type="text"
              value={search}
              onChange={(e) => setSearch(e.target.value)}
              placeholder="Recherche un prank… ex: diplôme, amende"
              className="flex-1 bg-transparent text-sm outline-none placeholder:text-muted-foreground"
            />
          </div>

          {/* Scrollable list */}
          <div className="overflow-y-auto flex-1 space-y-3 pr-1">
            {filtered.length === 0 && (
              <p className="text-center text-muted-foreground text-sm py-8">
                Aucun prank trouvé.
              </p>
            )}
            {filtered.map((prank, i) => (
              <div
                key={i}
                onClick={() => navigate("/register")}
                className="group cursor-pointer flex items-center gap-5 rounded-2xl border border-border bg-card px-4 py-5 min-h-[132px] shadow-sm hover:shadow-md hover:border-primary/40 hover:-translate-y-0.5 transition-all"
              >
                {/* Before → After */}
                <div className="flex items-center gap-2.5 flex-shrink-0">
                  <div className="flex items-center gap-2">
                    <div className="h-24 aspect-[9/16] rounded-xl border border-border bg-muted/80 flex items-center justify-center text-[10px] font-semibold uppercase tracking-wide text-muted-foreground">
                      Input
                    </div>
                    {prank.inputCount === 2 && (
                      <>
                        <span className="text-muted-foreground text-sm font-semibold">
                          +
                        </span>
                        <div className="h-24 aspect-[9/16] rounded-xl border border-border bg-muted/80 flex items-center justify-center text-[10px] font-semibold uppercase tracking-wide text-muted-foreground">
                          Input
                        </div>
                      </>
                    )}
                  </div>
                  <span className="text-muted-foreground text-xs font-medium px-1">
                    →
                  </span>
                  <div className="h-24 aspect-[9/16] rounded-xl border border-primary/20 bg-primary/5 flex items-center justify-center text-[10px] font-semibold uppercase tracking-wide text-primary group-hover:bg-primary/10 transition-colors">
                    {prank.outputLabel}
                  </div>
                </div>
                {/* Info */}
                <div className="flex-1 min-w-0">
                  <p className="text-sm font-semibold truncate">
                    {prank.label}
                  </p>
                  <p className="text-xs text-muted-foreground leading-relaxed line-clamp-2">
                    {prank.desc}
                  </p>
                </div>
                <span className="text-xs text-primary font-semibold opacity-0 group-hover:opacity-100 transition-opacity flex-shrink-0">
                  Essayer →
                </span>
              </div>
            ))}
          </div>

          <div className="flex justify-center flex-shrink-0">
            <Link href="/register">
              <Button
                size="lg"
                className="rounded-full px-8 shadow-lg shadow-primary/20"
              >
                Voir tous les pranks
              </Button>
            </Link>
          </div>
        </div>
      </section>

      {/* Footer */}
      <footer className="py-6 border-t border-border bg-card max-h-screen overflow-hidden">
        <div className="max-w-7xl mx-auto px-4">
          <div className="flex flex-col md:flex-row justify-between items-center gap-6">
            <div className="flex items-center gap-2">
              <div className="bg-primary/10 p-1.5 rounded-lg">
                <div className="bg-primary w-3 h-3 rounded-full" />
              </div>
              <span className="font-display font-bold text-lg tracking-tight">
                TurboPRANK
              </span>
            </div>

            <nav className="flex flex-wrap justify-center gap-6 text-sm text-muted-foreground">
              <Link
                href="/mentions-legales"
                className="hover:text-primary transition-colors"
              >
                Mentions Légales
              </Link>
              <Link
                href="/cgu"
                className="hover:text-primary transition-colors"
              >
                CGU
              </Link>
              <Link
                href="/confidentialite"
                className="hover:text-primary transition-colors"
              >
                Confidentialité
              </Link>
            </nav>

            <p className="text-sm text-muted-foreground">
              © 2026 TurboPRANK. Tous droits réservés.
            </p>
          </div>
        </div>
      </footer>
    </div>
  );
}
