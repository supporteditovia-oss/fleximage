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

export const prankChips: { id: string; icon: ElementType; label: string; example: string }[] = [
  { id: "ticket", icon: Ticket, label: "Ticket d'amende", example: "Envoie-moi un PV de stationnement réaliste à mon nom" },
  { id: "echo", icon: Baby, label: "Fausse grossesse", example: "Crée une fausse échographie pour surprendre mon père" },
  { id: "sms", icon: MessageCircle, label: "Rupture SMS", example: "Une capture d'écran de rupture par SMS drôle" },
  { id: "lettre", icon: FileText, label: "Licenciement", example: "Une lettre de licenciement officielle et convaincante" },
  { id: "loto", icon: Trophy, label: "Jackpot loto", example: "Un ticket gagnant au loto à 2 millions d'euros" },
  { id: "police", icon: ShieldAlert, label: "Convocation police", example: "Une fausse convocation au commissariat" },
  { id: "banque", icon: Landmark, label: "Découvert banque", example: "Un relevé bancaire avec un découvert énorme" },
  { id: "permis", icon: Car, label: "Retrait de permis", example: "Une lettre de retrait de permis de conduire" },
];

export const prankIdeas = [
  "Met un PV sur ma voiture…",
  "Fais en sorte que mon pote s'embrasse avec…",
  "Fais gagner mon pote au loto…",
  "Fait une fausse convocation a la police…",
  "Crée une fausse lettre de licenciement…",
  "Met le bordel dans cette maison…",
];
