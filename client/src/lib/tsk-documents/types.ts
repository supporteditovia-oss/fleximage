export type TskDocumentKind =
  | "devis"
  | "contrat"
  | "facture_acompte"
  | "facture"
  | "bon_livraison"
  | "cgv";

export type TskLineItem = {
  id: string;
  label: string;
  quantity: number;
  unitPriceHt: number;
};

export type TskClient = {
  company: string;
  contactName: string;
  addressLine1: string;
  postalCode: string;
  city: string;
  email: string;
  phone: string;
};

export type TskContractClauses = {
  object: string;
  scope: string;
  deliverables: string;
  schedule: string;
  deliveryDelay: string;
  revisionsIncluded: string;
  clientObligations: string;
  providerObligations: string;
  paymentTerms: string;
  latePayment: string;
  intellectualProperty: string;
  confidentiality: string;
  maintenance: string;
  termination: string;
  forceMajeure: string;
  applicableLaw: string;
};

export type TskCgvSections = {
  scope: string;
  payments: string;
  deposit: string;
  deadlines: string;
  liability: string;
  intellectualProperty: string;
  hosting: string;
  maintenance: string;
  termination: string;
  confidentiality: string;
  applicableLaw: string;
};

export type TskOrgSettings = {
  logoDataUrl: string;
  company: string;
  addressLine1: string;
  postalCode: string;
  city: string;
  email: string;
  phone: string;
  siret: string;
  vatNumber: string;
  iban: string;
  bic: string;
  defaultVatRate: number;
  defaultPaymentTermsDays: number;
  defaultQuoteValidityDays: number;
  defaultDepositPercent: number;
  paymentConditionsText: string;
  signatureIssuerName: string;
  signatureIssuerTitle: string;
  contractClauses: TskContractClauses;
  cgvSections: TskCgvSections;
  cgvNumber: string | null;
};

export type TskWorkflowStep =
  | "quote_draft"
  | "quote_sent"
  | "contract_ready"
  | "deposit_invoiced"
  | "deposit_paid"
  | "final_invoiced"
  | "delivered"
  | "closed";

export type DepositMode =
  | "percent_20"
  | "percent_30"
  | "percent_40"
  | "percent_custom"
  | "amount_custom";

export type InvoicePaymentStatus = "pending" | "paid";

export type TskProject = {
  id: string;
  createdAt: string;
  updatedAt: string;
  workflowStep: TskWorkflowStep;
  client: TskClient;
  projectTitle: string;
  projectDescription: string;
  lineItems: TskLineItem[];
  vatRate: number;
  quoteValidityDays: number;
  paymentTermsDays: number;
  issueDate: string;
  dueDate: string;
  deliveryDate: string;
  depositMode: DepositMode;
  depositPercent: number;
  depositCustomAmountHt: number;
  depositInvoiceStatus: InvoicePaymentStatus;
  finalInvoiceStatus: InvoicePaymentStatus;
  quoteNumber: string | null;
  contractNumber: string | null;
  depositInvoiceNumber: string | null;
  finalInvoiceNumber: string | null;
  deliveryDocNumber: string | null;
  contractClauses: TskContractClauses;
  deliveryChecklist: string;
  deliveryNotes: string;
  notes: string;
};

export type TskDocumentCounters = {
  year: number;
  devis: number;
  contrat: number;
  facture_acompte: number;
  facture: number;
  bon_livraison: number;
  cgv: number;
};

export type TskDocumentsStore = {
  version: 3;
  settings: TskOrgSettings;
  counters: TskDocumentCounters;
  projects: TskProject[];
  activeProjectId: string | null;
};

export const TSK_DOCUMENT_LABELS: Record<TskDocumentKind, string> = {
  devis: "Devis",
  contrat: "Contrat de prestation",
  facture_acompte: "Facture d'acompte",
  facture: "Facture finale",
  bon_livraison: "Bon de livraison / Validation",
  cgv: "Conditions Générales de Vente",
};

export const TSK_DOCUMENT_PREFIX: Record<keyof TskDocumentCounters, string> = {
  year: "",
  devis: "DV",
  contrat: "CT",
  facture_acompte: "FA",
  facture: "FC",
  bon_livraison: "BL",
  cgv: "CGV",
};

export const TSK_WORKFLOW_LABELS: Record<TskWorkflowStep, string> = {
  quote_draft: "Devis en cours",
  quote_sent: "Devis envoyé",
  contract_ready: "Contrat prêt",
  deposit_invoiced: "Acompte facturé",
  deposit_paid: "Acompte reçu",
  final_invoiced: "Facture finale émise",
  delivered: "Livraison validée",
  closed: "Projet clôturé",
};
