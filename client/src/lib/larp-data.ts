import {
  BarChart3,
  Car,
  Landmark,
  Plane,
  ShoppingBag,
  Sparkles,
  Trophy,
  UtensilsCrossed,
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
  { id: "restaurant", icon: UtensilsCrossed },
  { id: "monaco", icon: Landmark },
  { id: "jet", icon: Plane },
  { id: "dashboard", icon: BarChart3 },
  { id: "watch", icon: Trophy },
  { id: "nightlife", icon: Sparkles },
];

const larpContentByLocale: Record<AppLocale, LarpLocaleContent> = {
  fr: {
    chips: {
      chrome: {
        label: "Chrome Hearts",
        example: "Fais-moi sortir de Chrome Hearts avec trois sacs et une tenue full black",
      },
      supercar: {
        label: "Supercar",
        example: "Mets-moi au volant d'une Lamborghini devant le Casino de Monte-Carlo",
      },
      restaurant: {
        label: "Restaurant luxe",
        example: "Fais-moi diner chez Caviar Kaspia avec montre apparente et flash discret",
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
      nightlife: {
        label: "Table VIP",
        example: "Fais-moi en table VIP a Saint-Tropez avec bouteilles et baddies",
      },
    },
    ideas: [
      "Fais-moi sortir de Chrome Hearts avec trois sacs...",
      "Mets-moi au volant d'une Lamborghini a Monaco...",
      "Fais-moi diner chez Caviar Kaspia...",
      "Mets-moi devant le Casino de Monte-Carlo...",
      "Fais-moi monter dans un jet prive direction Dubai...",
      "Cree un dashboard Shopify a 87k cette semaine...",
      "Mets-moi une Rolex Daytona au poignet...",
      "Fais-moi en table VIP a Saint-Tropez...",
    ],
  },
  en: {
    chips: {
      chrome: {
        label: "Chrome Hearts",
        example: "Make me walk out of Chrome Hearts with three bags and a full black fit",
      },
      supercar: {
        label: "Supercar",
        example: "Put me behind the wheel of a Lamborghini outside Casino de Monte-Carlo",
      },
      restaurant: {
        label: "Luxury dinner",
        example: "Make me dine at Caviar Kaspia with a visible watch and subtle flash",
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
      nightlife: {
        label: "VIP table",
        example: "Make me at a Saint-Tropez VIP table with bottles and baddies",
      },
    },
    ideas: [
      "Make me walk out of Chrome Hearts with three bags...",
      "Put me behind the wheel of a Lamborghini in Monaco...",
      "Make me dine at Caviar Kaspia...",
      "Put me outside Casino de Monte-Carlo...",
      "Make me board a private jet to Dubai...",
      "Create a Shopify dashboard showing 87k this week...",
      "Put a Rolex Daytona on my wrist...",
      "Make me at a Saint-Tropez VIP table...",
    ],
  },
  es: {
    chips: {
      chrome: {
        label: "Chrome Hearts",
        example: "Hazme salir de Chrome Hearts con tres bolsas y un outfit full black",
      },
      supercar: {
        label: "Supercoche",
        example: "Ponme al volante de un Lamborghini frente al Casino de Monte-Carlo",
      },
      restaurant: {
        label: "Cena de lujo",
        example: "Hazme cenar en Caviar Kaspia con reloj visible y flash sutil",
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
      nightlife: {
        label: "Mesa VIP",
        example: "Hazme en una mesa VIP en Saint-Tropez con botellas y baddies",
      },
    },
    ideas: [
      "Hazme salir de Chrome Hearts con tres bolsas...",
      "Ponme al volante de un Lamborghini en Monaco...",
      "Hazme cenar en Caviar Kaspia...",
      "Ponme frente al Casino de Monte-Carlo...",
      "Hazme subir a un jet privado rumbo a Dubai...",
      "Crea un dashboard de Shopify con 87k esta semana...",
      "Ponme un Rolex Daytona en la muneca...",
      "Hazme en una mesa VIP en Saint-Tropez...",
    ],
  },
  de: {
    chips: {
      chrome: {
        label: "Chrome Hearts",
        example: "Lass mich mit drei Taschen aus Chrome Hearts kommen, full black Outfit",
      },
      supercar: {
        label: "Supercar",
        example: "Setz mich in einen Lamborghini vor dem Casino de Monte-Carlo",
      },
      restaurant: {
        label: "Luxus-Dinner",
        example: "Lass mich bei Caviar Kaspia essen, mit sichtbarer Uhr und dezentem Blitz",
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
      nightlife: {
        label: "VIP-Tisch",
        example: "Lass mich an einem VIP-Tisch in Saint-Tropez sitzen, mit Flaschen und Baddies",
      },
    },
    ideas: [
      "Lass mich mit drei Taschen aus Chrome Hearts kommen...",
      "Setz mich in einen Lamborghini in Monaco...",
      "Lass mich bei Caviar Kaspia essen...",
      "Stell mich vor das Casino de Monte-Carlo...",
      "Lass mich in einen Privatjet nach Dubai steigen...",
      "Erstelle ein Shopify-Dashboard mit 87k diese Woche...",
      "Setz mir eine Rolex Daytona ans Handgelenk...",
      "Lass mich an einem VIP-Tisch in Saint-Tropez sitzen...",
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

export const larpChips = getLarpChipsForLocale(DEFAULT_LOCALE);

export const larpIdeas = getLarpIdeasForLocale(DEFAULT_LOCALE);
