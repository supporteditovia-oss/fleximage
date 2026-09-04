/**
 * CURRENT (2026) appearance cards for frequently requested public figures.
 * Injected when the name is detected — name-only must still look like the real person.
 * Keep cards SHORT (OneShot prompt max ~3000). Sync with server/lib/celebrity-likeness.ts
 */

function normalize(text) {
  return String(text || "")
    .normalize("NFD")
    .replace(/[\u0300-\u036f]/g, "")
    .toLowerCase();
}

/** Compact one-liner cards — exact likeness, current look. */
function shortCard(who, details) {
  return `${who} — exact real likeness NOW (2026): ${details} Drop-of-water match to recent photos — never a generic stand-in.`;
}

/** @type {Array<{ id: string, match: RegExp, label: string, card: string }>} */
const CELEBRITY_CARDS = [
  {
    id: "maes",
    match: /\b(maes|mahes)\b/,
    label: "Maes",
    card:
      "MAES 2026: medium-tan Maghrebi, athletic. HAIR faded sides + longer wet-look SIDE PART (gel) — NEVER bald/buzz/braids unless asked. " +
      "Short goatee + thin mustache; often thin blue-tint glasses. No 47 RECORDS/OMERTA logos in scene.",
  },
  {
    id: "ademo",
    match: /\b(ademo|ade\s*mo)\b/,
    label: "Ademo",
    card: shortCard(
      "ADEMO (PNL)",
      "slim face, thick brows, FULLER dark beard than N.O.S, often cap/beanie.",
    ),
  },
  {
    id: "nos",
    match: /\b(n\.o\.s\.?|n\s*\.\s*o\s*\.\s*s\.?)\b/,
    label: "N.O.S",
    card: shortCard(
      "N.O.S (PNL)",
      "slender Maghrebi face (thinner than Ademo), THIN mustache + small soul patch, often bun/top-knot or backwards plaid cap — never Ademo's thicker beard, never a random lookalike.",
    ),
  },
  {
    id: "pnl",
    match: /\b(pnl|que\s*la\s*famille)\b/,
    label: "PNL",
    card:
      "PNL BOTH twins 2026: ADEMO thicker beard/cap; N.O.S thinner face/bun — two distinct faces, never merged.",
  },
  {
    id: "werenoi",
    match: /\b(werenoi|wrenoi|waranoi)\b/,
    label: "Werenoi",
    card: shortCard(
      "WERENOI (FR rapper)",
      "recognizable Werenoi face/hair/beard as in recent clips — not a random lookalike.",
    ),
  },
  {
    id: "damso",
    match: /\b(damso)\b/,
    label: "Damso",
    card: shortCard("DAMSO", "exact present-day Damso face, hair, beard."),
  },
  {
    id: "zkr",
    match: /\b(zkr)\b/,
    label: "ZKR",
    card: shortCard("ZKR", "exact present-day ZKR face and style."),
  },
  {
    id: "plk",
    match: /\b(plk)\b/,
    label: "PLK",
    card: shortCard("PLK", "exact present-day PLK face, hair, style."),
  },
  {
    id: "ninho",
    match: /\b(ninho)\b/,
    label: "Ninho",
    card: shortCard("NINHO", "exact present-day face, haircut, beard."),
  },
  {
    id: "niska",
    match: /\b(niska)\b/,
    label: "Niska",
    card: shortCard("NISKA", "exact present-day face and hair."),
  },
  {
    id: "booba",
    match: /\b(booba)\b/,
    label: "Booba",
    card: shortCard(
      "BOOBA",
      "present-day bald/shaved look + face/tattoos as now — not 2000s young Booba.",
    ),
  },
  {
    id: "gims",
    match: /\b(gims|maitre\s*gims|metro\s*gims)\b/,
    label: "Gims",
    card: shortCard("GIMS", "current 2024–2026 look — not early Sexion era unless asked."),
  },
  {
    id: "sdm",
    match: /\b(sdm)\b/,
    label: "SDM",
    card: shortCard("SDM", "exact present-day face and style."),
  },
  {
    id: "tiakola",
    match: /\b(tiakola|tia\s*kola)\b/,
    label: "Tiakola",
    card: shortCard("TIAKOLA", "exact present-day face and hair."),
  },
  {
    id: "kaaris",
    match: /\b(kaaris)\b/,
    label: "Kaaris",
    card: shortCard("KAARIS", "exact present-day face, beard, build."),
  },
  {
    id: "sch",
    match: /\b(sch)\b/,
    label: "SCH",
    card: shortCard("SCH", "exact present-day face and style."),
  },
  {
    id: "jul",
    match: /\b(jul)\b/,
    label: "Jul",
    card: shortCard(
      "JUL (Marseille rapper)",
      "exact present-day Jul face, short hair/beard as in recent clips — instantly recognizable, never a random lookalike.",
    ),
  },
  {
    id: "djadjadinaz",
    match: /\b(djadja\s*(et|&|and)?\s*dinaz|djadja|dinaz)\b/,
    label: "Djadja & Dinaz",
    card:
      "DJADJA & DINAZ (FR duo) — exact 2026 likeness, never lookalikes. " +
      "DJADJA: broader face, short groomed beard+mustache, often black baseball cap + black tee; friendly smile. " +
      "DINAZ: longer dark hair slicked back/tied, thinner face, thin mustache + light stubble, NATURAL almond dark eyes (symmetric, sharp — NEVER weird/deformed/uneven eyes), often light yellow Nike tee + crossbody bag. " +
      "If BOTH named: two DISTINCT men. If only one name: that member only.",
  },
  {
    id: "gazo",
    match: /\b(gazo)\b/,
    label: "Gazo",
    card: shortCard("GAZO", "exact present-day face and style."),
  },
  {
    id: "koba",
    match: /\b(koba\s*lad|kobalad)\b/,
    label: "Koba LaD",
    card: shortCard("KOBA LAD", "exact present-day face."),
  },
  {
    id: "heuss",
    match: /\b(heuss(\s*l'?enfoire)?|heuss)\b/,
    label: "Heuss",
    card: shortCard("HEUSS L'ENFOIRÉ", "exact present-day face."),
  },
  {
    id: "rk",
    match: /\b(rk)\b/,
    label: "RK",
    card: shortCard("RK", "exact present-day face."),
  },
  {
    id: "naps",
    match: /\b(naps)\b/,
    label: "Naps",
    card: shortCard("NAPS", "exact present-day face."),
  },
  {
    id: "lacrim",
    match: /\b(lacrim)\b/,
    label: "Lacrim",
    card: shortCard("LACRIM", "exact present-day face."),
  },
  {
    id: "mhd",
    match: /\b(mhd)\b/,
    label: "MHD",
    card: shortCard("MHD", "exact present-day face."),
  },
  {
    id: "hamza",
    match: /\b(hamza)\b/,
    label: "Hamza",
    card: shortCard("HAMZA", "exact present-day face."),
  },
  {
    id: "josman",
    match: /\b(josman)\b/,
    label: "Josman",
    card: shortCard("JOSMAN", "exact present-day face."),
  },
  {
    id: "kerchak",
    match: /\b(kerchak)\b/,
    label: "Kerchak",
    card: shortCard("KERCHAK", "exact present-day face."),
  },
  {
    id: "fave",
    match: /\b(fave|fav[eé])\b/,
    label: "Favé",
    card: shortCard("FAVÉ", "exact present-day face."),
  },
  {
    id: "uzi",
    match: /\b(uzi)\b/,
    label: "Uzi",
    card: shortCard("UZI (FR rap)", "exact present-day face."),
  },
  {
    id: "gradur",
    match: /\b(gradur)\b/,
    label: "Gradur",
    card: shortCard("GRADUR", "exact present-day face."),
  },
  {
    id: "rohff",
    match: /\b(rohff)\b/,
    label: "Rohff",
    card: shortCard("ROHFF", "exact present-day face."),
  },
  {
    id: "lafouine",
    match: /\b(la\s*fouine|fouine)\b/,
    label: "La Fouine",
    card: shortCard("LA FOUINE", "exact present-day face."),
  },
  {
    id: "sofiane",
    match: /\b(sofiane)\b/,
    label: "Sofiane",
    card: shortCard("SOFIANE", "exact present-day face."),
  },
  {
    id: "rimk",
    match: /\b(rim'?k|rimk)\b/,
    label: "Rim'K",
    card: shortCard("RIM'K", "exact present-day face."),
  },
  {
    id: "aya",
    match: /\b(aya\s*nakamura)\b/,
    label: "Aya Nakamura",
    card: shortCard("AYA NAKAMURA", "exact present-day face."),
  },
  {
    id: "dadju",
    match: /\b(dadju)\b/,
    label: "Dadju",
    card: shortCard("DADJU", "exact present-day face."),
  },
  {
    id: "centralcee",
    match: /\b(central\s*cee)\b/,
    label: "Central Cee",
    card: shortCard("CENTRAL CEE", "exact present-day face."),
  },
  {
    id: "freeze",
    match: /\b(freeze\s*corleone)\b/,
    label: "Freeze Corleone",
    card: shortCard("FREEZE CORLEONE", "exact present-day face/style."),
  },
  {
    id: "ashe22",
    match: /\b(ashe\s*22|asche\s*22|ash[eé]\s*22)\b/,
    label: "Ashe 22",
    card: shortCard("ASHE 22", "exact present-day face."),
  },
  {
    id: "leto",
    match: /\b(leto)\b/,
    label: "Leto",
    card: shortCard("LETO", "exact present-day face."),
  },
  {
    id: "nekfeu",
    match: /\b(nekfeu)\b/,
    label: "Nekfeu",
    card: shortCard("NEKFEU", "exact present-day face."),
  },
  {
    id: "orelsan",
    match: /\b(orelsan)\b/,
    label: "Orelsan",
    card: shortCard("ORELSAN", "exact present-day face."),
  },
  {
    id: "vald",
    match: /\b(vald)\b/,
    label: "Vald",
    card: shortCard("VALD", "exact present-day face."),
  },
  {
    id: "klm",
    match: /\b(klm)\b/,
    label: "KLM",
    card: shortCard("KLM (FR rap)", "exact present-day recognizable likeness."),
  },
  {
    id: "badbad",
    match: /\b(bad\s*bad|badbad|badsbad)\b/,
    label: "BadBad",
    card: shortCard("BADBAD", "exact present-day recognizable likeness as known publicly."),
  },
  {
    id: "kalash",
    match: /\b(kalash(\s*criminel)?)\b/,
    label: "Kalash",
    card: shortCard("KALASH / KALASH CRIMINEL", "exact present-day face."),
  },
  {
    id: "sixnine",
    match: /\b(6ix9ine|sixnine|tekashi)\b/,
    label: "6ix9ine",
    card: shortCard(
      "6IX9INE",
      "rainbow/iconic Tekashi look OR current known look if specified — exact real person.",
    ),
  },
  {
    id: "popsmoke",
    match: /\b(pop\s*smoke)\b/,
    label: "Pop Smoke",
    card: shortCard(
      "POP SMOKE",
      "exact real Pop Smoke likeness (can be deceased — still accurate face/braids/build as known).",
    ),
  },
  {
    id: "travis",
    match: /\b(travis\s*scott)\b/,
    label: "Travis Scott",
    card: shortCard("TRAVIS SCOTT", "exact present-day face."),
  },
  {
    id: "drake",
    match: /\b(drake)\b/,
    label: "Drake",
    card: shortCard("DRAKE", "exact present-day face."),
  },
  {
    id: "mbappe",
    match: /\b(mbappe|kylian)\b/,
    label: "Mbappé",
    card:
      "MBAPPÉ 2026 — exact real Kylian Mbappé likeness NOW: sharp cheekbones, current fade haircut, athletic build, Real Madrid / France era face — never teenage PSG kid unless asked. " +
      "Standing NEXT TO the subject at correct scale — friendly arm on shoulder OK, both smiling at camera OK. " +
      "Same indoor/outdoor light, grain, and contact shadows as the uploaded photo — never CGI, never stock cutout, never burnt AI skin.",
  },
  {
    id: "messi",
    match: /\b(messi|lionel\s*messi)\b/,
    label: "Messi",
    card: shortCard("MESSI", "exact present-day Lionel Messi face/hair — not a lookalike."),
  },
  {
    id: "rihanna",
    match: /\b(rihanna)\b/,
    label: "Rihanna",
    card: shortCard("RIHANNA", "exact present-day Rihanna face, hair, features — not a generic model."),
  },
  {
    id: "elon",
    match: /\b(elon(?:\s*musk)?|\bmusk\b)\b/,
    label: "Elon Musk",
    card: shortCard("ELON MUSK", "exact present-day Elon Musk face/hairline — not a generic balding extra."),
  },
  {
    id: "macron",
    match: /\b(macron|emmanuel\s*macron)\b/,
    label: "Macron",
    card: shortCard("MACRON", "exact present-day face/age."),
  },
];

/**
 * Fallback when user names a rapper/celeb not in the card list.
 * @returns {string}
 */
const GENERIC_NAMED_FIGURE_STOP =
  /^(moi|me|him|her|them|the|this|that|these|those|a|an|sur|dans|avec|photo|image|gauche|droite|cote|next|beside|subject|uploaded|barbe|beard|moustache|mustache|bouc|goatee|stubble|poils?|menton|visage|volant|voiture|urus|lambo|lamborghini|bmw|mercedes|mansory|cuir|noir|jaune|auto|car|siege|seat|kmh|vitesse|un|une|des|le|la|les|du|de|en|et|au|aux|femme|meuf|fille|woman|girl|homme|mec|gars|guy|man|copine|copain|pote|derriere|behind|escalier|stair(?:case|s)?|marches?|steps?|beton|rampe|mur|plafond|sol|floor|ceiling|porte|fenetre|meuble|canape|table|chaise|fauteuil|lit|lampe|miroir|tableau|tapis|plante|arbre|piscine|balcon|terrasse|rolex|montre|bague|collier|lunettes|casquette|chapeau|veste|pantalon|objet|object|requested)$/i;

function stripLeadingArticles(name) {
  return String(name || "")
    .trim()
    .replace(/^(un|une|des|le|la|les|l'|du|de\s+la|de\s+l'|de|the|a|an|this|that)\s+/i, "")
    .trim();
}

function isGenericNamedFigureStop(name) {
  const cleaned = stripLeadingArticles(name);
  if (!cleaned || cleaned.length < 2) return true;
  const first = cleaned.split(/\s+/)[0];
  if (GENERIC_NAMED_FIGURE_STOP.test(first)) return true;
  if (GENERIC_NAMED_FIGURE_STOP.test(cleaned)) return true;
  return /\b(volant|voiture|urus|lambo|bmw|mercedes|mansory|cuir|km|siege|interieur|dashboard|escalier|marches?|beton|mur|plafond|sol)\b/i.test(
    cleaned,
  );
}

function buildGenericNamedFigureInjection(text) {
  const named = [];
  const patterns = [
    /\b(?:rappeur|rapper|artiste|chanteur|chanteuse|singer)\s+([a-z0-9][a-z0-9 .'-]{1,30})/gi,
    /\b(?:ajoute|ajouter|mets|mettre|put|add|avec|remplace\w*\s+(?:par|avec)|place)\s+(?:le\s+|la\s+|l'|un\s+|une\s+|des\s+)?(?:rappeur\s+|rapper\s+|chanteur\s+|singer\s+)?([a-z0-9][a-z0-9 .'-]{1,24})\b/gi,
  ];
  for (const re of patterns) {
    let m;
    const r = new RegExp(re.source, re.flags);
    while ((m = r.exec(text)) !== null) {
      const name = stripLeadingArticles(
        String(m[1] || "")
          .trim()
          .replace(/\s+/g, " ")
          .slice(0, 40),
      );
      if (name && !isGenericNamedFigureStop(name)) {
        named.push(name);
      }
    }
  }
  const unique = [...new Set(named.map((n) => n.toLowerCase()))];
  if (unique.length === 0) return "";
  return (
    ` NAMED PERSON LOCK: render ${unique.join(", ")} with extreme real-world likeness ` +
    `(exact face/hair/body as publicly known — living or deceased). Never invent a different person.`
  );
}

/**
 * @returns {string} empty if none detected
 */
function buildCelebrityAppearanceInjection(prompt) {
  const text = normalize(prompt);
  if (!text) return "";

  const hits = [];
  for (const entry of CELEBRITY_CARDS) {
    if (entry.match.test(text)) hits.push(entry);
  }

  const ids = new Set(hits.map((h) => h.id));
  const filtered = hits.filter((h) => {
    if (ids.has("pnl") && (h.id === "ademo" || h.id === "nos")) {
      return /\b(ademo|n\.o\.s\.?)\b/.test(text);
    }
    return true;
  });

  let out = "";
  if (filtered.length > 0) {
    const bodies = filtered.map((h) => h.card).join(" ");
    out =
      ` CELEBRITY IDENTITY LOCK (${filtered.map((h) => h.label).join(" + ")}): ${bodies} ` +
      "CRITICAL: exact real person — never generic bald substitute. " +
      "If a celeb reference photo is uploaded: FACE/HAIR only — never copy logos/props into the base scene.";
  }

  // Prefer specific cards; also catch unknown named rappers/singers.
  if (filtered.length === 0) {
    out += buildGenericNamedFigureInjection(text);
  }

  return out;
}

function hasCelebrityAppearanceInjection(prompt) {
  return Boolean(buildCelebrityAppearanceInjection(prompt));
}

module.exports = {
  CELEBRITY_CARDS,
  buildCelebrityAppearanceInjection,
  hasCelebrityAppearanceInjection,
  normalizeCelebrityText: normalize,
};
