import * as React from "react";

const row1 = [
  { bg: "bg-gradient-to-br from-blue-900/40 to-blue-800/30", label: "PV Stationnement" },
  { bg: "bg-gradient-to-br from-pink-900/40 to-pink-800/30", label: "Échographie" },
  { bg: "bg-gradient-to-br from-amber-900/40 to-amber-800/30", label: "Ticket Loto" },
  { bg: "bg-gradient-to-br from-green-900/40 to-green-800/30", label: "Lettre Officielle" },
  { bg: "bg-gradient-to-br from-purple-900/40 to-purple-800/30", label: "Rupture SMS" },
  { bg: "bg-gradient-to-br from-red-900/40 to-red-800/30", label: "Convocation" },
];

const row2 = [
  { bg: "bg-gradient-to-br from-teal-900/40 to-teal-800/30", label: "Diplôme Raté" },
  { bg: "bg-gradient-to-br from-orange-900/40 to-orange-800/30", label: "Invitation VIP" },
  { bg: "bg-gradient-to-br from-indigo-900/40 to-indigo-800/30", label: "Achat Immobilier" },
  { bg: "bg-gradient-to-br from-rose-900/40 to-rose-800/30", label: "Flirt Suspect" },
  { bg: "bg-gradient-to-br from-cyan-900/40 to-cyan-800/30", label: "Retrait Permis" },
  { bg: "bg-gradient-to-br from-lime-900/40 to-lime-800/30", label: "Découvert Banque" },
];

function MarqueeCard({ bg, label }: { bg: string; label: string }) {
  return (
    <div className={`flex-shrink-0 w-48 h-72 md:w-56 md:h-80 rounded-2xl ${bg} flex items-end p-4`}>
      <span className="text-xs font-semibold text-foreground/70 bg-white/10 backdrop-blur rounded-full px-3 py-1">
        {label}
      </span>
    </div>
  );
}

export default function ImageMarquee() {
  return (
    <section className="py-16 md:py-24 overflow-hidden">
      <div className="max-w-3xl mx-auto px-4 mb-10">
        <h2 className="font-display text-2xl md:text-3xl font-bold text-center">
          Des résultats <span className="bg-gradient-to-r from-primary to-secondary bg-clip-text text-transparent">bluffants</span>
        </h2>
        <p className="text-sm md:text-base text-muted-foreground text-center mt-2">
          Quelques exemples de pranks générés par nos utilisateurs
        </p>
      </div>

      <div className="marquee-row relative">
        <div className="flex gap-4 animate-marquee">
          {[...Array(2)].map((_, dupeIdx) => (
            <React.Fragment key={dupeIdx}>
              {row1.map((item, i) => (
                <MarqueeCard key={`${dupeIdx}-${i}`} bg={item.bg} label={item.label} />
              ))}
            </React.Fragment>
          ))}
        </div>
      </div>

      <div className="marquee-row relative mt-4">
        <div className="flex gap-4 animate-marquee-reverse">
          {[...Array(2)].map((_, dupeIdx) => (
            <React.Fragment key={dupeIdx}>
              {row2.map((item, i) => (
                <MarqueeCard key={`${dupeIdx}-${i}`} bg={item.bg} label={item.label} />
              ))}
            </React.Fragment>
          ))}
        </div>
      </div>
    </section>
  );
}
