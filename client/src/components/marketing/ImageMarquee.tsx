import * as React from "react";

const row1 = [
  { bg: "bg-gradient-to-br from-blue-100 to-blue-200", label: "PV Stationnement" },
  { bg: "bg-gradient-to-br from-pink-100 to-pink-200", label: "Échographie" },
  { bg: "bg-gradient-to-br from-amber-100 to-amber-200", label: "Ticket Loto" },
  { bg: "bg-gradient-to-br from-green-100 to-green-200", label: "Lettre Officielle" },
  { bg: "bg-gradient-to-br from-purple-100 to-purple-200", label: "Rupture SMS" },
  { bg: "bg-gradient-to-br from-red-100 to-red-200", label: "Convocation" },
];

const row2 = [
  { bg: "bg-gradient-to-br from-teal-100 to-teal-200", label: "Diplôme Raté" },
  { bg: "bg-gradient-to-br from-orange-100 to-orange-200", label: "Invitation VIP" },
  { bg: "bg-gradient-to-br from-indigo-100 to-indigo-200", label: "Achat Immobilier" },
  { bg: "bg-gradient-to-br from-rose-100 to-rose-200", label: "Flirt Suspect" },
  { bg: "bg-gradient-to-br from-cyan-100 to-cyan-200", label: "Retrait Permis" },
  { bg: "bg-gradient-to-br from-lime-100 to-lime-200", label: "Découvert Banque" },
];

function MarqueeCard({ bg, label }: { bg: string; label: string }) {
  return (
    <div className={`flex-shrink-0 w-48 h-72 md:w-56 md:h-80 rounded-2xl ${bg} flex items-end p-4`}>
      <span className="text-xs font-semibold text-foreground/70 bg-white/60 backdrop-blur rounded-full px-3 py-1">
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
