export type TskDocumentKind =
  | "devis"
  | "contrat"
  | "facture"
  | "facture_acompte"
  | "validation_fin";

export type TskLineItem = {
  id: string;
  label: string;
  quantity: number;
  unitPriceHt: number;
};

export type TskIssuer = {
  company: string;
  addressLine1: string;
  addressLine2: string;
  email: string;
  phone: string;
  siret: string;
  vat: string;
  iban: string;
  bic: string;
};

export type TskClient = {
  company: string;
  contactName: string;
  addressLine1: string;
  addressLine2: string;
  email: string;
};

export type TskDocumentDraft = {
  kind: TskDocumentKind;
  reference: string;
  projectTitle: string;
  projectDescription: string;
  issueDate: string;
  dueDate: string;
  vatRate: number;
  depositPercent: number;
  paymentTermsDays: number;
  quoteValidityDays: number;
  issuer: TskIssuer;
  client: TskClient;
  lineItems: TskLineItem[];
  contractScope: string;
  contractDuration: string;
  validationChecklist: string;
  notes: string;
};

export const TSK_DOCUMENT_LABELS: Record<TskDocumentKind, string> = {
  devis: "Devis",
  contrat: "Contrat de prestation",
  facture: "Facture",
  facture_acompte: "Facture d'acompte",
  validation_fin: "Validation de fin de projet",
};

export const TSK_DOCUMENT_FILENAME: Record<TskDocumentKind, string> = {
  devis: "TSK-Digital-Devis",
  contrat: "TSK-Digital-Contrat",
  facture: "TSK-Digital-Facture",
  facture_acompte: "TSK-Digital-Facture-Acompte",
  validation_fin: "TSK-Digital-Validation-Fin-Projet",
};
