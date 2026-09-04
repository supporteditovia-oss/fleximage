import {
  BarChart3,
  Car,
  Landmark,
  Plane,
  ShoppingBag,
  Sparkles,
  Trophy,
  UtensilsCrossed,
  Waves,
  Ship,
  Home,
  Watch,
  Gem,
  Bike,
  Palmtree,
  Wallet,
} from "lucide-react";
import type { ElementType } from "react";
import {
  DEFAULT_LOCALE,
  type AppLocale,
  normalizeLocale,
} from "@shared/locales";

type LarpChipDescriptor = {
  id: string;
  icon: ElementType;
};

type LarpChipContent = {
  label: string;
  example: string;
};

type LarpLocaleContent = {
  chips: Record<string, LarpChipContent>;
  ideas: string[];
};

const larpChipDescriptors: LarpChipDescriptor[] = [
  { id: "chrome", icon: ShoppingBag },
  { id: "supercar", icon: Car },
  { id: "dubaiUrus", icon: Car },
  { id: "dubaiMarina", icon: Waves },
  { id: "jetSki", icon: Bike },
  { id: "yacht", icon: Ship },
  { id: "shopifyTrophy", icon: Trophy },
  { id: "restaurant", icon: UtensilsCrossed },
  { id: "monaco", icon: Landmark },
  { id: "jet", icon: Plane },
  { id: "dashboard", icon: BarChart3 },
  { id: "watch", icon: Watch },
  { id: "villa", icon: Home },
  { id: "palm", icon: Palmtree },
  { id: "shopping", icon: Gem },
  { id: "nightlife", icon: Sparkles },
  { id: "money", icon: Wallet },
];

const larpContentByLocale: Record<AppLocale, LarpLocaleContent> = {
  fr: {
    chips: {
      chrome: {
        label: "Chrome Hearts",
        example:
          "Fais-moi sortir de Chrome Hearts avec trois sacs et une tenue full black",
      },
      supercar: {
        label: "Supercar",
        example:
          "Mets-moi au volant d'une Lamborghini devant le Casino de Monte-Carlo",
      },
      dubaiUrus: {
        label: "Urus Dubai",
        example: "Mets-moi dans une Urus Mansory rose a Dubai",
      },
      dubaiMarina: {
        label: "Golfe Dubai",
        example:
          "Mets-moi au golfe a Dubai Marina avec des yachts, ambiance influenceurs",
      },
      jetSki: {
        label: "Jet-ski",
        example: "Mets-moi sur un jet-ski a Dubai Marina",
      },
      yacht: {
        label: "Yacht",
        example: "Mets-moi sur un yacht a Dubai avec vue marina",
      },
      shopifyTrophy: {
        label: "Trophees Shopify",
        example: "Mets-moi sur un lit avec plusieurs trophees Shopify",
      },
      restaurant: {
        label: "Restaurant luxe",
        example:
          "Fais-moi diner chez Caviar Kaspia avec montre apparente et flash discret",
      },
      monaco: {
        label: "Monaco",
        example: "Mets-moi devant l'Hotel de Paris Monaco en outfit quiet luxury",
      },
      jet: {
        label: "Jet prive",
        example: "Fais-moi monter dans un jet prive direction Dubai, ambiance ultra VIP",
      },
      dashboard: {
        label: "Dashboard revenus",
        example: "Cree un dashboard Shopify a 87k cette semaine sur mon laptop",
      },
      watch: {
        label: "Montre hype",
        example: "Mets-moi une Rolex Daytona au poignet avec ticket de caisse Goyard",
      },
      villa: {
        label: "Villa luxe",
        example: "Mets-moi devant une villa de luxe a Dubai Palm Jumeirah",
      },
      palm: {
        label: "Palm Dubai",
        example: "Mets-moi sur la Palm Jumeirah a Dubai au coucher du soleil",
      },
      shopping: {
        label: "Shopping luxe",
        example: "Fais-moi sortir de Louis Vuitton avec plein de sacs a Dubai Mall",
      },
      nightlife: {
        label: "Table VIP",
        example: "Fais-moi en table VIP a Saint-Tropez avec bouteilles et baddies",
      },
      money: {
        label: "Cash flex",
        example: "Mets-moi avec des liasses de cash sur une table de luxe",
      },
    },
    ideas: [
      "Mets-moi dans une Urus Mansory rose a Dubai",
      "Mets-moi au golfe a Dubai Marina avec des yachts",
      "Mets-moi sur un lit avec plusieurs trophees Shopify",
      "Mets-moi sur un jet-ski a Dubai Marina",
      "Mets-moi sur un yacht a Dubai avec vue marina",
      "Mets-moi devant une villa de luxe a Dubai Palm Jumeirah",
      "Fais-moi sortir de Chrome Hearts avec trois sacs",
      "Mets-moi au volant d'une Lamborghini a Monaco",
      "Fais-moi diner chez Caviar Kaspia",
      "Mets-moi devant le Casino de Monte-Carlo",
      "Fais-moi monter dans un jet prive direction Dubai",
      "Cree un dashboard Shopify a 87k cette semaine",
      "Mets-moi une Rolex Daytona au poignet",
      "Fais-moi en table VIP a Saint-Tropez",
      "Fais-moi sortir de Louis Vuitton a Dubai Mall",
      "Mets-moi sur la Palm Jumeirah au coucher du soleil",
      "Mets-moi avec des liasses de cash sur une table de luxe",
      "Mets-moi au volant d'une G63 noire a Dubai",
      "Mets-moi en restaurant etoile avec vue mer",
      "Mets-moi dans une suite palace a Dubai",
      "Mets-moi en shopping a Avenue Montaigne Paris",
      "Mets-moi sur un bateau a Monaco Port Hercules",
      "Mets-moi devant le Burj Khalifa de nuit",
      "Mets-moi en table VIP a Cannes avec vue mer",
    ],
  },
  en: {
    chips: {
      chrome: {
        label: "Chrome Hearts",
        example:
          "Make me walk out of Chrome Hearts with three bags and a full black fit",
      },
      supercar: {
        label: "Supercar",
        example:
          "Put me behind the wheel of a Lamborghini outside Casino de Monte-Carlo",
      },
      dubaiUrus: {
        label: "Urus Dubai",
        example: "Put me in a pink Mansory Urus in Dubai",
      },
      dubaiMarina: {
        label: "Dubai gulf",
        example:
          "Put me at Dubai Marina gulf with yachts, influencer vibes",
      },
      jetSki: {
        label: "Jet ski",
        example: "Put me on a jet ski at Dubai Marina",
      },
      yacht: {
        label: "Yacht",
        example: "Put me on a yacht in Dubai with marina view",
      },
      shopifyTrophy: {
        label: "Shopify trophies",
        example: "Put me on a bed with several Shopify trophies",
      },
      restaurant: {
        label: "Luxury dinner",
        example:
          "Make me dine at Caviar Kaspia with a visible watch and subtle flash",
      },
      monaco: {
        label: "Monaco",
        example: "Put me outside Hotel de Paris Monaco in a quiet luxury outfit",
      },
      jet: {
        label: "Private jet",
        example: "Make me board a private jet to Dubai with an ultra VIP mood",
      },
      dashboard: {
        label: "Revenue dashboard",
        example: "Create a Shopify dashboard showing 87k this week on my laptop",
      },
      watch: {
        label: "Hype watch",
        example: "Put a Rolex Daytona on my wrist with a Goyard receipt",
      },
      villa: {
        label: "Luxury villa",
        example: "Put me in front of a luxury villa on Dubai Palm Jumeirah",
      },
      palm: {
        label: "Palm Dubai",
        example: "Put me on Palm Jumeirah in Dubai at sunset",
      },
      shopping: {
        label: "Luxury shopping",
        example: "Make me leave Louis Vuitton with lots of bags at Dubai Mall",
      },
      nightlife: {
        label: "VIP table",
        example: "Make me at a Saint-Tropez VIP table with bottles and baddies",
      },
      money: {
        label: "Cash flex",
        example: "Put me with stacks of cash on a luxury table",
      },
    },
    ideas: [
      "Put me in a pink Mansory Urus in Dubai",
      "Put me at Dubai Marina gulf with yachts",
      "Put me on a bed with several Shopify trophies",
      "Put me on a jet ski at Dubai Marina",
      "Put me on a yacht in Dubai with marina view",
      "Put me in front of a luxury villa on Dubai Palm Jumeirah",
      "Make me walk out of Chrome Hearts with three bags",
      "Put me behind the wheel of a Lamborghini in Monaco",
      "Make me dine at Caviar Kaspia",
      "Put me outside Casino de Monte-Carlo",
      "Make me board a private jet to Dubai",
      "Create a Shopify dashboard showing 87k this week",
      "Put a Rolex Daytona on my wrist",
      "Make me at a Saint-Tropez VIP table",
      "Make me leave Louis Vuitton at Dubai Mall",
      "Put me on Palm Jumeirah at sunset",
      "Put me with stacks of cash on a luxury table",
      "Put me in a black G63 in Dubai",
      "Put me in a Michelin restaurant with sea view",
      "Put me in a Dubai palace suite",
      "Put me shopping on Avenue Montaigne Paris",
      "Put me on a boat in Monaco Port Hercules",
      "Put me in front of Burj Khalifa at night",
      "Put me at a Cannes VIP table with sea view",
    ],
  },
  es: {
    chips: {
      chrome: {
        label: "Chrome Hearts",
        example:
          "Hazme salir de Chrome Hearts con tres bolsas y un outfit full black",
      },
      supercar: {
        label: "Supercoche",
        example:
          "Ponme al volante de un Lamborghini frente al Casino de Monte-Carlo",
      },
      dubaiUrus: {
        label: "Urus Dubai",
        example: "Ponme en un Urus Mansory rosa en Dubai",
      },
      dubaiMarina: {
        label: "Golfo Dubai",
        example:
          "Ponme en el golfo de Dubai Marina con yates, vibes de influencers",
      },
      jetSki: {
        label: "Jet ski",
        example: "Ponme en un jet ski en Dubai Marina",
      },
      yacht: {
        label: "Yate",
        example: "Ponme en un yate en Dubai con vista a la marina",
      },
      shopifyTrophy: {
        label: "Trofeos Shopify",
        example: "Ponme en una cama con varios trofeos Shopify",
      },
      restaurant: {
        label: "Cena de lujo",
        example:
          "Hazme cenar en Caviar Kaspia con reloj visible y flash sutil",
      },
      monaco: {
        label: "Monaco",
        example: "Ponme delante del Hotel de Paris Monaco con outfit quiet luxury",
      },
      jet: {
        label: "Jet privado",
        example: "Hazme subir a un jet privado rumbo a Dubai, ambiente ultra VIP",
      },
      dashboard: {
        label: "Dashboard ingresos",
        example: "Crea un dashboard de Shopify con 87k esta semana en mi laptop",
      },
      watch: {
        label: "Reloj hype",
        example: "Ponme un Rolex Daytona en la muneca con recibo de Goyard",
      },
      villa: {
        label: "Villa lujo",
        example: "Ponme frente a una villa de lujo en Dubai Palm Jumeirah",
      },
      palm: {
        label: "Palm Dubai",
        example: "Ponme en Palm Jumeirah en Dubai al atardecer",
      },
      shopping: {
        label: "Shopping lujo",
        example: "Hazme salir de Louis Vuitton con muchas bolsas en Dubai Mall",
      },
      nightlife: {
        label: "Mesa VIP",
        example: "Hazme en una mesa VIP en Saint-Tropez con botellas y baddies",
      },
      money: {
        label: "Cash flex",
        example: "Ponme con fajos de cash en una mesa de lujo",
      },
    },
    ideas: [
      "Ponme en un Urus Mansory rosa en Dubai",
      "Ponme en el golfo de Dubai Marina con yates",
      "Ponme en una cama con varios trofeos Shopify",
      "Ponme en un jet ski en Dubai Marina",
      "Ponme en un yate en Dubai con vista a la marina",
      "Ponme frente a una villa de lujo en Dubai Palm Jumeirah",
      "Hazme salir de Chrome Hearts con tres bolsas",
      "Ponme al volante de un Lamborghini en Monaco",
      "Hazme cenar en Caviar Kaspia",
      "Ponme frente al Casino de Monte-Carlo",
      "Hazme subir a un jet privado rumbo a Dubai",
      "Crea un dashboard de Shopify con 87k esta semana",
      "Ponme un Rolex Daytona en la muneca",
      "Hazme en una mesa VIP en Saint-Tropez",
      "Hazme salir de Louis Vuitton en Dubai Mall",
      "Ponme en Palm Jumeirah al atardecer",
      "Ponme con fajos de cash en una mesa de lujo",
      "Ponme en un G63 negro en Dubai",
      "Ponme en un restaurante con estrella y vista al mar",
      "Ponme en una suite palace en Dubai",
      "Ponme de shopping en Avenue Montaigne Paris",
      "Ponme en un barco en Monaco Port Hercules",
      "Ponme frente al Burj Khalifa de noche",
      "Ponme en una mesa VIP en Cannes con vista al mar",
    ],
  },
  de: {
    chips: {
      chrome: {
        label: "Chrome Hearts",
        example:
          "Lass mich mit drei Taschen aus Chrome Hearts kommen, full black Outfit",
      },
      supercar: {
        label: "Supercar",
        example: "Setz mich in einen Lamborghini vor dem Casino de Monte-Carlo",
      },
      dubaiUrus: {
        label: "Urus Dubai",
        example: "Setz mich in einen rosa Mansory Urus in Dubai",
      },
      dubaiMarina: {
        label: "Dubai Golf",
        example:
          "Setz mich an den Dubai Marina Golf mit Yachten, Influencer-Vibes",
      },
      jetSki: {
        label: "Jetski",
        example: "Setz mich auf einen Jetski an der Dubai Marina",
      },
      yacht: {
        label: "Yacht",
        example: "Setz mich auf eine Yacht in Dubai mit Marina-Blick",
      },
      shopifyTrophy: {
        label: "Shopify Trophäen",
        example: "Setz mich auf ein Bett mit mehreren Shopify-Trophäen",
      },
      restaurant: {
        label: "Luxus-Dinner",
        example:
          "Lass mich bei Caviar Kaspia essen, mit sichtbarer Uhr und dezentem Blitz",
      },
      monaco: {
        label: "Monaco",
        example: "Stell mich vor das Hotel de Paris Monaco im Quiet-Luxury-Outfit",
      },
      jet: {
        label: "Privatjet",
        example: "Lass mich in einen Privatjet nach Dubai steigen, ultra VIP Stimmung",
      },
      dashboard: {
        label: "Revenue-Dashboard",
        example: "Erstelle ein Shopify-Dashboard mit 87k diese Woche auf meinem Laptop",
      },
      watch: {
        label: "Hype-Uhr",
        example: "Setz mir eine Rolex Daytona ans Handgelenk mit Goyard-Quittung",
      },
      villa: {
        label: "Luxusvilla",
        example: "Stell mich vor eine Luxusvilla auf Dubai Palm Jumeirah",
      },
      palm: {
        label: "Palm Dubai",
        example: "Stell mich auf Palm Jumeirah in Dubai bei Sonnenuntergang",
      },
      shopping: {
        label: "Luxus-Shopping",
        example: "Lass mich Louis Vuitton mit vielen Taschen in Dubai Mall verlassen",
      },
      nightlife: {
        label: "VIP-Tisch",
        example: "Lass mich an einem VIP-Tisch in Saint-Tropez sitzen, mit Flaschen und Baddies",
      },
      money: {
        label: "Cash flex",
        example: "Setz mich mit Cash-Stapeln an einen Luxustisch",
      },
    },
    ideas: [
      "Setz mich in einen rosa Mansory Urus in Dubai",
      "Setz mich an den Dubai Marina Golf mit Yachten",
      "Setz mich auf ein Bett mit mehreren Shopify-Trophäen",
      "Setz mich auf einen Jetski an der Dubai Marina",
      "Setz mich auf eine Yacht in Dubai mit Marina-Blick",
      "Stell mich vor eine Luxusvilla auf Dubai Palm Jumeirah",
      "Lass mich mit drei Taschen aus Chrome Hearts kommen",
      "Setz mich in einen Lamborghini in Monaco",
      "Lass mich bei Caviar Kaspia essen",
      "Stell mich vor das Casino de Monte-Carlo",
      "Lass mich in einen Privatjet nach Dubai steigen",
      "Erstelle ein Shopify-Dashboard mit 87k diese Woche",
      "Setz mir eine Rolex Daytona ans Handgelenk",
      "Lass mich an einem VIP-Tisch in Saint-Tropez sitzen",
      "Lass mich Louis Vuitton in Dubai Mall verlassen",
      "Stell mich auf Palm Jumeirah bei Sonnenuntergang",
      "Setz mich mit Cash-Stapeln an einen Luxustisch",
      "Setz mich in einen schwarzen G63 in Dubai",
      "Setz mich in ein Sternerestaurant mit Meerblick",
      "Setz mich in eine Palace-Suite in Dubai",
      "Lass mich auf der Avenue Montaigne in Paris shoppen",
      "Setz mich auf ein Boot in Monaco Port Hercules",
      "Stell mich nachts vor den Burj Khalifa",
      "Lass mich an einem VIP-Tisch in Cannes mit Meerblick sitzen",
    ],
  },
};

function resolveLarpLocale(locale: string | null | undefined): AppLocale {
  return normalizeLocale(locale) ?? DEFAULT_LOCALE;
}

export function getLarpChipsForLocale(locale: string | null | undefined): {
  id: string;
  icon: ElementType;
  label: string;
  example: string;
}[] {
  const localizedContent = larpContentByLocale[resolveLarpLocale(locale)];

  return larpChipDescriptors.map((descriptor) => ({
    ...descriptor,
    label: localizedContent.chips[descriptor.id]?.label ?? descriptor.id,
    example: localizedContent.chips[descriptor.id]?.example ?? "",
  }));
}

export function getLarpIdeasForLocale(
  locale: string | null | undefined,
): string[] {
  return larpContentByLocale[resolveLarpLocale(locale)].ideas;
}

/** Full pool for the shuffle / random-idea button. */
export function getRandomPromptPoolForLocale(
  locale: string | null | undefined,
): string[] {
  const ideas = getLarpIdeasForLocale(locale);
  const chipExamples = getLarpChipsForLocale(locale)
    .map((chip) => chip.example)
    .filter(Boolean);
  return Array.from(new Set([...ideas, ...chipExamples]));
}

export const larpChips = getLarpChipsForLocale(DEFAULT_LOCALE);

export const larpIdeas = getLarpIdeasForLocale(DEFAULT_LOCALE);
