import * as React from "react";
import { useLocation } from "wouter";
import { Button } from "@/components/ui/button";
import { motion } from "framer-motion";
import {
  ChevronDown,
  Plus,
  X,
  Shuffle,
  Sparkles,
  ArrowRight,
} from "lucide-react";
import { prankChips, prankIdeas } from "@/lib/prank-data";
import { useTypewriterPlaceholder } from "@/hooks/use-typewriter";

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
  const typewriterRef = useTypewriterPlaceholder(prompt, prankIdeas);

  const shuffleIdea = () => {
    const random = prankChips[Math.floor(Math.random() * prankChips.length)];
    setPrompt(random.example);
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
    <section className="relative h-[100svh] overflow-hidden flex flex-col items-center px-4">
      {/* Abstract Background Shapes */}
      <div className="absolute top-1/2 left-1/2 -translate-x-1/2 -translate-y-1/2 w-[600px] h-[600px] bg-primary/5 rounded-full blur-3xl -z-10" />
      <div className="absolute top-0 right-0 w-[400px] h-[400px] bg-secondary/3 rounded-full blur-3xl -z-10" />
      <div className="absolute bottom-0 left-0 w-[350px] h-[350px] bg-secondary/2 rounded-full blur-3xl -z-10" />

      <motion.div
        variants={containerVariants}
        initial="hidden"
        animate="visible"
        className="flex flex-col items-center justify-center w-full flex-1"
      >
        <div className="w-full flex flex-col items-center gap-4 md:gap-6 pt-14 md:pt-14">
        {/* Title area */}
        <div className="relative flex flex-col items-center justify-center">
          <motion.h1
            variants={itemVariants}
            className="font-display text-4xl md:text-6xl font-bold leading-[1.1] tracking-tight text-center"
          >
            Crée des <span className="bg-gradient-to-r from-primary to-secondary bg-clip-text text-transparent">pranks</span> hyper réalistes
          </motion.h1>
          <motion.div
            variants={{ hidden: { opacity: 0 }, visible: { opacity: 0.7 } }}
            className="hidden min-[380px]:block absolute top-[38.2px] md:top-full md:-mt-2 right-0 mr-2 min-[500px]:mr-16 md:mr-40 pointer-events-none"
          >
            <svg
              viewBox="0 0 512 512"
              preserveAspectRatio="xMidYMid meet"
              className="animate-arrow-bounce h-[92px] md:h-[112px] w-auto text-secondary"
            >
              <g
                transform="translate(512,512) scale(-0.1,-0.1)"
                fill="currentColor"
                stroke="none"
              >
                <path d="M1016 4325 c-11 -11 -14 -28 -11 -58 3 -23 10 -89 16 -147 25 -243 85 -516 167 -760 156 -465 380 -843 747 -1259 375 -427 866 -703 1595 -895 l125 -33 -60 -13 c-290 -59 -695 -192 -711 -234 -12 -30 47 -115 98 -142 37 -19 68 -18 125 7 196 86 588 187 868 224 136 18 146 26 115 90 -13 27 -39 59 -60 74 -44 30 -248 330 -385 565 -116 199 -111 192 -161 216 -83 41 -110 6 -65 -84 31 -63 218 -368 303 -493 35 -53 44 -73 33 -73 -24 0 -281 65 -452 115 -493 144 -836 321 -1102 569 -239 225 -432 476 -599 781 -222 406 -358 852 -402 1324 -15 160 -31 191 -113 226 -45 19 -52 19 -71 0z" />
              </g>
            </svg>
          </motion.div>
        </div>

        {/* Bottom group: drop zone + input + prank ideas */}
        <div className="flex flex-col items-center gap-3 md:gap-4 w-full mt-[0.5rem] md:mt-[3rem] pb-8 md:pb-10">
          {/* Image upload grid */}
          <motion.div
            variants={itemVariants}
            className="w-full flex justify-center px-4 -mb-7 md:-mb-8"
          >
            <div className="flex items-end justify-center gap-2 md:gap-3 w-full max-w-md">
              {images.map((img, i) => (
                <div
                  key={i}
                  className="relative flex-shrink-1 min-w-0 h-[min(40vh,340px)] md:h-[min(47vh,420px)] aspect-[9/16]"
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
                    <>
                      {draggedIndex !== i && (
                        <span className="hero-image-slot absolute inset-0 rounded-2xl pointer-events-none z-10" />
                      )}
                    <label
                      className={`group absolute inset-0 flex flex-col items-center justify-center gap-2 rounded-2xl border-2 cursor-pointer transition-all ${
                        draggedIndex === i
                          ? "border-primary bg-primary/10 border-solid"
                          : "border-transparent bg-card hover:bg-primary/5"
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
                              <Plus className="w-7 h-7 text-primary transition-colors" />
                            </div>
                            <p className="text-base md:text-lg font-medium text-muted-foreground group-hover:text-foreground transition-colors text-center px-2 whitespace-nowrap">
                              Met ton image ici
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
                    </>
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
                ref={typewriterRef}
                type="text"
                value={prompt}
                onChange={(e) => setPrompt(e.target.value)}
                placeholder="Décris ton prank…"
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
                className="shrink-0 w-8 h-8 rounded-full flex md:hidden items-center justify-center text-black bg-gradient-to-r from-primary to-secondary active:scale-95 transition-all"
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
              className="inline-flex items-center gap-2 px-4 py-2 rounded-full border border-border/40 bg-card/90 backdrop-blur text-sm font-semibold text-foreground hover:border-secondary/50 hover:text-secondary active:scale-95 transition-all"
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
                  className="p-3 rounded-2xl border border-border/40 bg-card shadow-xl"
                >
                  <div className="grid grid-cols-3 gap-1.5">
                    {prankChips.map((chip) => {
                      const Icon = chip.icon;
                      return (
                        <button
                          key={chip.id}
                          onClick={() => {
                            setPrompt(chip.example);
                            setAccordionOpen(false);
                          }}
                          className="flex items-center gap-2 px-3 h-10 rounded-full border border-border/40 bg-card hover:border-secondary/50 hover:bg-secondary/5 text-foreground text-xs font-medium transition-all focus:outline-none"
                        >
                          <Icon className="w-3.5 h-3.5 shrink-0 text-muted-foreground" />
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
                className="absolute bottom-0 left-0 right-0 bg-card rounded-t-[20px] px-5 pb-[max(2rem,env(safe-area-inset-bottom))] pt-3 shadow-2xl"
              >
                <div className="flex justify-center mb-3">
                  <div className="w-10 h-1 rounded-full bg-muted" />
                </div>
                <h3 className="text-base font-semibold text-center mb-4">Idées de pranks</h3>
                <div className="grid grid-cols-3 gap-1.5">
                  {prankChips.map((chip) => {
                    const Icon = chip.icon;
                    return (
                      <button
                        key={chip.id}
                        onClick={() => {
                          setPrompt(chip.example);
                          setAccordionOpen(false);
                        }}
                        className="flex items-center gap-1.5 px-2.5 h-10 rounded-full border border-border bg-card hover:border-secondary/50 hover:bg-secondary/5 text-foreground text-xs font-medium transition-all focus:outline-none"
                      >
                        <Icon className="w-3.5 h-3.5 shrink-0 text-muted-foreground" />
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
        </div>
      </motion.div>
    </section>
  );
}
