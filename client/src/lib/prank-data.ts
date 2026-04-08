import {
  Ticket,
  Baby,
  MessageCircle,
  FileText,
  Trophy,
  ShieldAlert,
  Landmark,
  Car,
} from "lucide-react";
import type { ElementType } from "react";
import {
  DEFAULT_LOCALE,
  type AppLocale,
  normalizeLocale,
} from "@shared/locales";

type PrankChipDescriptor = {
  id: string;
  icon: ElementType;
};

type PrankChipContent = {
  label: string;
  example: string;
};

type PrankLocaleContent = {
  chips: Record<string, PrankChipContent>;
  ideas: string[];
};

const prankChipDescriptors: PrankChipDescriptor[] = [
  { id: "ticket", icon: Ticket },
  { id: "echo", icon: Baby },
  { id: "sms", icon: MessageCircle },
  { id: "lettre", icon: FileText },
  { id: "loto", icon: Trophy },
  { id: "police", icon: ShieldAlert },
  { id: "banque", icon: Landmark },
  { id: "permis", icon: Car },
];

const prankContentByLocale: Record<AppLocale, PrankLocaleContent> = {
  fr: {
    chips: {
      ticket: {
        label: "Ticket d'amende",
        example: "Envoie-moi un PV de stationnement realiste a mon nom",
      },
      echo: {
        label: "Fausse grossesse",
        example: "Cree une fausse echographie pour surprendre mon pere",
      },
      sms: {
        label: "Rupture SMS",
        example: "Une capture d'ecran de rupture par SMS drole",
      },
      lettre: {
        label: "Licenciement",
        example: "Une lettre de licenciement officielle et convaincante",
      },
      loto: {
        label: "Jackpot loto",
        example: "Un ticket gagnant au loto a 2 millions d'euros",
      },
      police: {
        label: "Convocation police",
        example: "Une fausse convocation au commissariat",
      },
      banque: {
        label: "Decouvert banque",
        example: "Un releve bancaire avec un decouvert enorme",
      },
      permis: {
        label: "Retrait de permis",
        example: "Une lettre de retrait de permis de conduire",
      },
    },
    ideas: [
      "Met un PV sur ma voiture...",
      "Fais en sorte que mon pote s'embrasse avec...",
      "Fais gagner mon pote au loto...",
      "Fais une fausse convocation a la police...",
      "Cree une fausse lettre de licenciement...",
      "Met le bordel dans cette maison...",
    ],
  },
  en: {
    chips: {
      ticket: {
        label: "Parking ticket",
        example: "Generate a realistic parking ticket with my name",
      },
      echo: {
        label: "Fake pregnancy",
        example: "Create a fake ultrasound image to prank my dad",
      },
      sms: {
        label: "Breakup text",
        example: "A funny breakup text screenshot",
      },
      lettre: {
        label: "Dismissal letter",
        example: "An official and convincing dismissal letter",
      },
      loto: {
        label: "Lottery jackpot",
        example: "A winning lottery ticket worth 2 million euros",
      },
      police: {
        label: "Police summons",
        example: "A fake police station summons",
      },
      banque: {
        label: "Bank overdraft",
        example: "A bank statement with a huge overdraft",
      },
      permis: {
        label: "License suspension",
        example: "A driving license suspension letter",
      },
    },
    ideas: [
      "Put a fake ticket on my car...",
      "Make my friend look like they kissed...",
      "Make my friend win the lottery...",
      "Create a fake police summons...",
      "Create a fake dismissal letter...",
      "Make this house look like chaos...",
    ],
  },
  es: {
    chips: {
      ticket: {
        label: "Multa de trafico",
        example: "Genera una multa de aparcamiento realista con mi nombre",
      },
      echo: {
        label: "Falso embarazo",
        example: "Crea una ecografia falsa para sorprender a mi padre",
      },
      sms: {
        label: "Ruptura por SMS",
        example: "Una captura divertida de ruptura por SMS",
      },
      lettre: {
        label: "Despido",
        example: "Una carta de despido oficial y convincente",
      },
      loto: {
        label: "Jackpot loteria",
        example: "Un billete de loteria ganador de 2 millones de euros",
      },
      police: {
        label: "Citacion policial",
        example: "Una falsa citacion a comisaria",
      },
      banque: {
        label: "Descubierto bancario",
        example: "Un extracto bancario con un descubierto enorme",
      },
      permis: {
        label: "Retirada de carnet",
        example: "Una carta de retirada del permiso de conducir",
      },
    },
    ideas: [
      "Pon una multa falsa en mi coche...",
      "Haz que mi amigo parezca que se beso con...",
      "Haz que mi amigo gane la loteria...",
      "Crea una citacion policial falsa...",
      "Crea una carta de despido falsa...",
      "Haz que esta casa parezca un caos...",
    ],
  },
  de: {
    chips: {
      ticket: {
        label: "Strafzettel",
        example: "Erstelle einen realistischen Strafzettel mit meinem Namen",
      },
      echo: {
        label: "Falsche Schwangerschaft",
        example: "Erstelle ein falsches Ultraschallbild fur einen Streich",
      },
      sms: {
        label: "Trennungs-SMS",
        example: "Ein lustiger Trennungs-SMS-Screenshot",
      },
      lettre: {
        label: "Kundigung",
        example: "Ein offizielles und glaubwurdiges Kundigungsschreiben",
      },
      loto: {
        label: "Lotto-Jackpot",
        example: "Ein Lottoschein mit 2 Millionen Euro Gewinn",
      },
      police: {
        label: "Polizei-Vorladung",
        example: "Eine gefalschte Vorladung zur Polizei",
      },
      banque: {
        label: "Bank-Dispo",
        example: "Ein Kontoauszug mit riesigem Minus",
      },
      permis: {
        label: "Fahrverbot",
        example: "Ein Schreiben zum Entzug der Fahrerlaubnis",
      },
    },
    ideas: [
      "Packe einen fake Strafzettel auf mein Auto...",
      "Lass es aussehen, als hatte mein Freund jemanden gekusst...",
      "Lass meinen Freund im Lotto gewinnen...",
      "Erstelle eine fake Polizei-Vorladung...",
      "Erstelle ein fake Kundigungsschreiben...",
      "Lass dieses Haus wie Chaos aussehen...",
    ],
  },
};

function resolvePrankLocale(locale: string | null | undefined): AppLocale {
  return normalizeLocale(locale) ?? DEFAULT_LOCALE;
}

export function getPrankChipsForLocale(locale: string | null | undefined): {
  id: string;
  icon: ElementType;
  label: string;
  example: string;
}[] {
  const localizedContent = prankContentByLocale[resolvePrankLocale(locale)];

  return prankChipDescriptors.map((descriptor) => ({
    ...descriptor,
    label: localizedContent.chips[descriptor.id]?.label ?? descriptor.id,
    example: localizedContent.chips[descriptor.id]?.example ?? "",
  }));
}

export function getPrankIdeasForLocale(
  locale: string | null | undefined,
): string[] {
  return prankContentByLocale[resolvePrankLocale(locale)].ideas;
}

export const prankChips = getPrankChipsForLocale(DEFAULT_LOCALE);

export const prankIdeas = getPrankIdeasForLocale(DEFAULT_LOCALE);
