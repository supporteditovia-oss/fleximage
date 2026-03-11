import * as React from "react";
import { useLocation } from "wouter";
import { Button } from "@/components/ui/button";
import { motion } from "framer-motion";
import {
  ImageUp,
  ChevronDown,
  Plus,
  X,
  Shuffle,
  Sparkles,
  ArrowRight,
  Ticket,
  Baby,
  MessageCircle,
  FileText,
  Trophy,
  ShieldAlert,
  Landmark,
  Car,
} from "lucide-react";

const prankChips: { id: string; icon: React.ElementType; label: string; example: string }[] = [
  { id: "ticket", icon: Ticket, label: "Ticket d'amende", example: "Envoie-moi un PV de stationnement réaliste à mon nom" },
  { id: "echo", icon: Baby, label: "Fausse grossesse", example: "Crée une fausse échographie pour surprendre mon père" },
  { id: "sms", icon: MessageCircle, label: "Rupture SMS", example: "Une capture d'écran de rupture par SMS drôle" },
  { id: "lettre", icon: FileText, label: "Licenciement", example: "Une lettre de licenciement officielle et convaincante" },
  { id: "loto", icon: Trophy, label: "Jackpot loto", example: "Un ticket gagnant au loto à 2 millions d'euros" },
  { id: "police", icon: ShieldAlert, label: "Convocation police", example: "Une fausse convocation au commissariat" },
  { id: "banque", icon: Landmark, label: "Découvert banque", example: "Un relevé bancaire avec un découvert énorme" },
  { id: "permis", icon: Car, label: "Retrait de permis", example: "Une lettre de retrait de permis de conduire" },
];

const prankIdeas = [
  "Flirte avec ma copine…",
  "Ces deux personnes s'embrassent…",
  "Mon pote a gagné au loto…",
  "Un PV sur la voiture de mon père…",
  "Ma sœur se fait virer de son boulot…",
  "Mon coloc a acheté une villa…",
];

const containerVariants = {
  hidden: { opacity: 0 },
  visible: { opacity: 1, transition: { staggerChildren: 0.1 } },
};

const itemVariants = {
  hidden: { y: 20, opacity: 0 },
  visible: { y: 0, opacity: 1 },
};

export default function HeroSection() {
  const [, navigate] = useLocation();
  const [prompt, setPrompt] = React.useState("");
  const [images, setImages] = React.useState<(string | null)[]>([null]);
  const [draggedIndex, setDraggedIndex] = React.useState<number | null>(null);
  const [accordionOpen, setAccordionOpen] = React.useState(false);
  const [selectedChip, setSelectedChip] = React.useState<string | null>(null);
  const [socialCount, setSocialCount] = React.useState(12);
  const [placeholderText, setPlaceholderText] = React.useState("");
  const [ideaIndex, setIdeaIndex] = React.useState(0);

  // Animate social proof counter
  React.useEffect(() => {
    const interval = setInterval(() => {
      setSocialCount((prev) => {
        const delta = Math.random() < 0.5 ? 1 : 2;
        const next = prev + delta;
        return next > 30 ? 8 + Math.floor(Math.random() * 5) : next;
      });
    }, 3000 + Math.random() * 2000);
    return () => clearInterval(interval);
  }, []);

  // Typewriter animated placeholder
  React.useEffect(() => {
    if (prompt) return;
    let charIndex = 0;
    let deleting = false;
    const currentIdea = prankIdeas[ideaIndex];
    let timer: ReturnType<typeof setTimeout>;

    const tick = () => {
      if (!deleting) {
        charIndex++;
        setPlaceholderText(currentIdea.slice(0, charIndex));
        if (charIndex === currentIdea.length) {
          timer = setTimeout(() => { deleting = true; tick(); }, 1800);
          return;
        }
        timer = setTimeout(tick, 60);
      } else {
        charIndex--;
        setPlaceholderText(currentIdea.slice(0, charIndex));
        if (charIndex === 0) {
          setIdeaIndex((prev) => (prev + 1) % prankIdeas.length);
          return;
        }
        timer = setTimeout(tick, 30);
      }
    };
    tick();
    return () => clearTimeout(timer);
  }, [ideaIndex, prompt]);

  const shuffleIdea = () => {
    const random = prankChips[Math.floor(Math.random() * prankChips.length)];
    setPrompt(random.example);
    setSelectedChip(random.id);
  };

  const handleImageSelect = (index: number, file: File) => {
    const url = URL.createObjectURL(file);
    setImages((prev) => {
      const next: (string | null)[] = [...prev];
      next[index] = url;
      const allFilled = !next.includes(null);
      if (allFilled && next.length < 3) {
        next.push(null);
      }
      return next;
    });
  };

  const removeSlot = (index: number) => {
    setImages((prev) => {
      const next = prev.filter((_, i) => i !== index);
      return next.length === 0 ? [null] : next;
    });
  };

  const handleDragOver = (e: React.DragEvent, index: number) => {
    e.preventDefault();
    e.stopPropagation();
    setDraggedIndex(index);
  };

  const handleDragLeave = () => {
    setDraggedIndex(null);
  };

  const handleDrop = (e: React.DragEvent, index: number) => {
    e.preventDefault();
    e.stopPropagation();
    setDraggedIndex(null);
    const file = e.dataTransfer.files?.[0];
    if (file && file.type.startsWith("image/")) {
      handleImageSelect(index, file);
    }
  };

  return (
    <section className="relative h-screen max-h-screen overflow-hidden flex flex-col items-center px-4">
      {/* Abstract Background Shapes */}
      <div className="absolute top-1/2 left-1/2 -translate-x-1/2 -translate-y-1/2 w-[800px] h-[800px] bg-primary/10 rounded-full blur-3xl -z-10" />
      <div className="absolute top-0 right-0 w-[500px] h-[500px] bg-accent/10 rounded-full blur-3xl -z-10" />

      <motion.div
        variants={containerVariants}
        initial="hidden"
        animate="visible"
        className="flex flex-col items-center justify-between w-full h-full"
      >
        {/* Title area */}
        <div className="flex-1 flex flex-col items-center justify-center gap-5 pt-12 md:pt-16">
          <motion.h1
            variants={itemVariants}
            className="font-display text-4xl md:text-6xl font-bold leading-[1.1] tracking-tight text-center"
          >
            Crée des <span className="text-primary">pranks</span> hyper réalistes
          </motion.h1>

          <motion.p
            variants={itemVariants}
            className="text-sm md:text-lg text-muted-foreground text-center max-w-xs md:max-w-md"
          >
            Génère des images bluffantes en quelques secondes grâce à l'IA
          </motion.p>

          {/* Social proof badge */}
          <motion.div variants={itemVariants} className="mt-1">
            <div className="inline-flex items-center gap-2 px-4 py-1.5 rounded-full bg-muted/60 border border-border/50">
              <span className="relative flex h-2 w-2">
                <span className="animate-ping absolute inline-flex h-full w-full rounded-full bg-green-400 opacity-75" />
                <span className="relative inline-flex rounded-full h-2 w-2 bg-green-500" />
              </span>
              <span className="text-xs font-medium text-muted-foreground">
                <motion.span
                  key={socialCount}
                  initial={{ opacity: 0, y: -8 }}
                  animate={{ opacity: 1, y: 0 }}
                  transition={{ duration: 0.3 }}
                  className="inline-block font-semibold text-foreground"
                >
                  {socialCount}
                </motion.span>
                {" "}pranks créés à l'instant
              </span>
            </div>
          </motion.div>
        </div>

        {/* Bottom group: drop zone + input + prank ideas */}
        <div className="flex flex-col items-center gap-3 md:gap-4 w-full pb-6 md:pb-12">
          {/* Image upload grid */}
          <motion.div
            variants={itemVariants}
            className="w-full flex justify-center px-4 -mb-7 md:-mb-8"
          >
            <div className="flex items-end justify-center gap-2 md:gap-3 w-full max-w-md">
              {images.map((img, i) => (
                <div
                  key={i}
                  className="relative flex-shrink-1 min-w-0 h-[min(38vh,320px)] md:h-[min(45vh,400px)] aspect-[9/16]"
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
                    <label
                      className={`group absolute inset-0 flex flex-col items-center justify-center gap-2 rounded-2xl border-2 cursor-pointer transition-all ${
                        draggedIndex === i
                          ? "border-primary bg-primary/10 border-solid"
                          : "border-dashed border-border/60 bg-card/80 hover:border-primary/60 hover:bg-primary/5"
                      }`}
                      onDragOver={(e) => handleDragOver(e, i)}
                      onDragLeave={handleDragLeave}
                      onDrop={(e) => handleDrop(e, i)}
                    >
                      <input
                        type="file"
                        accept="image/*"
                        className="hidden"
                        onChange={(e) => {
                          const file = e.target.files?.[0];
                          if (file) handleImageSelect(i, file);
                        }}
                      />
                      {images.length === 1 && i === 0 ? (
                        draggedIndex === i ? (
                          <p className="text-sm font-semibold text-primary text-center px-2 whitespace-nowrap">
                            Lâche ici 👇
                          </p>
                        ) : (
                          <>
                            <div className="w-12 h-12 rounded-xl bg-primary/10 flex items-center justify-center group-hover:bg-primary/15 transition-colors">
                              <ImageUp className="w-7 h-7 text-primary transition-colors" />
                            </div>
                            <p className="text-[11px] font-medium text-muted-foreground group-hover:text-foreground transition-colors text-center px-2 whitespace-nowrap">
                              Clique ou glisse une image ici
                            </p>
                          </>
                        )
                      ) : (
                        draggedIndex === i ? (
                          <p className="text-xs font-semibold text-primary">👇</p>
                        ) : (
                          <Plus className="w-6 h-6 text-muted-foreground group-hover:text-primary transition-colors" />
                        )
                      )}
                    </label>
                  )}
                </div>
              ))}
            </div>
          </motion.div>

          {/* Text input */}
          <motion.div
            variants={itemVariants}
            className="relative z-10 w-full flex justify-center px-4"
          >
            <div className="flex items-center gap-2 md:gap-3 w-full max-w-md rounded-3xl border border-border/40 bg-card/90 backdrop-blur px-3 md:px-5 py-2.5 md:py-3.5 shadow-lg shadow-black/5 hover:border-border/60 focus-within:border-primary/50 focus-within:ring-2 focus-within:ring-primary/10 transition-all">
              <input
                type="text"
                value={prompt}
                onChange={(e) => setPrompt(e.target.value)}
                placeholder={placeholderText || "Décris ton prank…"}
                className="flex-1 bg-transparent text-sm outline-none placeholder:text-muted-foreground/70"
              />
              <button
                onClick={shuffleIdea}
                className="shrink-0 w-8 h-8 rounded-full flex items-center justify-center text-muted-foreground hover:text-primary hover:bg-primary/5 active:scale-90 transition-all"
                title="Idée aléatoire"
              >
                <Shuffle className="w-4 h-4" />
              </button>
              <button
                className="shrink-0 w-8 h-8 rounded-full flex md:hidden items-center justify-center text-white bg-primary hover:bg-primary/90 active:scale-95 transition-all"
                onClick={() => navigate("/register")}
                title="Créer"
              >
                <ArrowRight className="w-4 h-4" />
              </button>
              <Button
                size="sm"
                className="rounded-full h-9 px-5 shrink-0 text-xs font-semibold border-0 shadow-none active:scale-95 transition-transform hidden md:flex"
                onClick={() => navigate("/register")}
              >
                Créer
              </Button>
            </div>
          </motion.div>

          {/* Idées de pranks trigger */}
          <motion.div
            variants={itemVariants}
            className="relative w-full flex justify-center px-4"
          >
            <button
              onClick={() => setAccordionOpen(!accordionOpen)}
              className="inline-flex items-center gap-2 px-4 py-2 rounded-full border border-border/40 bg-card/90 backdrop-blur text-sm font-semibold text-foreground hover:border-primary/50 hover:text-primary active:scale-95 transition-all"
            >
              <Sparkles className="w-4 h-4" />
              Idées de pranks
              <motion.span
                animate={{ rotate: accordionOpen ? 180 : 0 }}
                transition={{ duration: 0.25 }}
                className="inline-flex"
              >
                <ChevronDown className="w-4 h-4" />
              </motion.span>
            </button>

            {/* Desktop dropdown */}
            {accordionOpen && (
              <div className="hidden md:block absolute bottom-full mb-3 w-full max-w-md z-50">
                <motion.div
                  initial={{ opacity: 0, y: 10 }}
                  animate={{ opacity: 1, y: 0 }}
                  transition={{ duration: 0.2 }}
                  className="p-3 rounded-2xl border border-border/40 bg-white shadow-xl"
                >
                  <div className="grid grid-cols-2 gap-2.5">
                    {prankChips.map((chip) => {
                      const Icon = chip.icon;
                      return (
                        <button
                          key={chip.id}
                          onClick={() => {
                            setPrompt(chip.example);
                            setSelectedChip(chip.id);
                            setAccordionOpen(false);
                          }}
                          className={`flex items-center gap-2.5 px-4 h-11 rounded-full border text-sm font-medium transition-all ${
                            selectedChip === chip.id
                              ? "border-primary bg-primary/10 text-primary"
                              : "border-border/40 bg-white hover:border-primary/50 hover:bg-primary/5 text-foreground"
                          }`}
                        >
                          <Icon className={`w-4 h-4 shrink-0 ${
                            selectedChip === chip.id ? "text-primary" : "text-muted-foreground"
                          }`} />
                          <span className="truncate">{chip.label}</span>
                        </button>
                      );
                    })}
                  </div>
                </motion.div>
              </div>
            )}
          </motion.div>

          {/* Mobile bottom sheet overlay */}
          {accordionOpen && (
            <div className="md:hidden fixed inset-0 z-50">
              <motion.div
                initial={{ opacity: 0 }}
                animate={{ opacity: 1 }}
                transition={{ duration: 0.2 }}
                className="absolute inset-0 bg-black/40"
                onClick={() => setAccordionOpen(false)}
              />
              <motion.div
                initial={{ y: "100%" }}
                animate={{ y: 0 }}
                transition={{ duration: 0.3, ease: [0.32, 0.72, 0, 1] }}
                className="absolute bottom-0 left-0 right-0 bg-white rounded-t-[20px] px-5 pb-8 pt-3 shadow-2xl"
              >
                <div className="flex justify-center mb-4">
                  <div className="w-10 h-1 rounded-full bg-gray-300" />
                </div>
                <div className="grid grid-cols-2 gap-2.5">
                  {prankChips.map((chip) => {
                    const Icon = chip.icon;
                    return (
                      <button
                        key={chip.id}
                        onClick={() => {
                          setPrompt(chip.example);
                          setSelectedChip(chip.id);
                          setAccordionOpen(false);
                        }}
                        className={`flex items-center gap-2.5 px-4 h-11 rounded-full border text-sm font-medium transition-all ${
                          selectedChip === chip.id
                            ? "border-primary bg-primary/10 text-primary"
                            : "border-gray-200 bg-white hover:border-primary/50 hover:bg-primary/5 text-foreground"
                        }`}
                      >
                        <Icon className={`w-4 h-4 shrink-0 ${
                          selectedChip === chip.id ? "text-primary" : "text-muted-foreground"
                        }`} />
                        <span className="truncate">{chip.label}</span>
                      </button>
                    );
                  })}
                </div>
              </motion.div>
            </div>
          )}

          {/* Desktop overlay to close dropdown */}
          {accordionOpen && (
            <div
              className="hidden md:block fixed inset-0 z-40"
              onClick={() => setAccordionOpen(false)}
            />
          )}
        </div>
      </motion.div>
    </section>
  );
}
