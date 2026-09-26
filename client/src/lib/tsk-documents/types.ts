/** Types documentaires TSK Digital — PDF métier agence FR (v5). */

export type TskDocumentKind =
  | "devis"
  | "contrat"
  | "facture_acompte"
  | "facture_intermediaire"
  | "facture_finale"
  | "bon_livraison"
  | "contrat_maintenance"
  | "facture_maintenance";

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
  siret: string;
  vatNumber: string;
};

export type TskContractClauses = {
  documentHierarchy: string;
  object: string;
  scope: string;
  specificationsAnnex: string;
  deliverables: string;
  schedule: string;
  deliveryDelay: string;
  revisionsIncluded: string;
  acceptanceProcedure: string;
  clientObligations: string;
  providerObligations: string;
  paymentTerms: string;
  latePayment: string;
  intellectualProperty: string;
  gdprArticle28: string;
  aiToolsClause: string;
  accountsAndLicenses: string;
  amendmentsProcedure: string;
  liabilityCap: string;
  reversibility: string;
  confidentiality: string;
  maintenance: string;
  termination: string;
  forceMajeure: string;
  applicableLaw: string;
};

export type TskMaintenanceContract = {
  duration: string;
  support: string;
  updatesIncluded: string;
  hosting: string;
  renewal: string;
  pricingTerms: string;
  scope: string;
  slaTable: string;
  backupsPolicy: string;
  securityPolicy: string;
  performancePolicy: string;
  exclusions: string;
  hourlyRateExtra: string;
  terminationRestitution: string;
};

export type TskOrgSettings = {
  logoDataUrl: string;
  company: string;
  legalForm: string;
  addressLine1: string;
  postalCode: string;
  city: string;
  email: string;
  phone: string;
  siret: string;
  vatNumber: string;
  vatExempt293B: boolean;
  iban: string;
  bic: string;
  defaultVatRate: number;
  defaultPaymentTermsDays: number;
  defaultQuoteValidityDays: number;
  defaultDepositPercent: number;
  defaultIntermediatePercent: number;
  paymentConditionsText: string;
  signatureIssuerName: string;
  signatureIssuerTitle: string;
  contractClauses: TskContractClauses;
  maintenanceContract: TskMaintenanceContract;
};

export type TskWorkflowStep =
  | "quote_draft"
  | "quote_sent"
  | "contract_ready"
  | "deposit_invoiced"
  | "deposit_paid"
  | "intermediate_invoiced"
  | "intermediate_paid"
  | "final_invoiced"
  | "final_paid"
  | "delivered"
  | "maintenance_offered"
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
  /** Date signature devis / contrat / FA */
  signatureDate: string;
  intermediateInvoiceDate: string;
  deliveryDate: string;
  finalInvoiceDate: string;
  maintenanceContractDate: string;
  maintenanceInvoiceDate: string;
  /** @deprecated utiliser signatureDate */
  issueDate: string;
  dueDate: string;
  depositMode: DepositMode;
  depositPercent: number;
  depositCustomAmountHt: number;
  depositInvoiceStatus: InvoicePaymentStatus;
  depositPaidAt: string | null;
  useIntermediatePayment: boolean;
  intermediateMode: DepositMode;
  intermediatePercent: number;
  intermediateCustomAmountHt: number;
  intermediateMilestoneLabel: string;
  intermediateInvoiceStatus: InvoicePaymentStatus;
  intermediatePaidAt: string | null;
  finalInvoiceStatus: InvoicePaymentStatus;
  finalPaidAt: string | null;
  quoteNumber: string | null;
  contractNumber: string | null;
  depositInvoiceNumber: string | null;
  intermediateInvoiceNumber: string | null;
  finalInvoiceNumber: string | null;
  deliveryDocNumber: string | null;
  maintenanceContractNumber: string | null;
  maintenanceInvoiceNumber: string | null;
  maintenancePriceHt: number;
  maintenanceHourlyRateHt: number;
  maintenanceBilling: "monthly" | "annual";
  contractClauses: TskContractClauses;
  maintenanceContract: TskMaintenanceContract;
  deliveryUrlProduction: string;
  deliveryUrlStaging: string;
  deliveryTechnicalRef: string;
  deliveryReservesTemplate: string;
  deliveryChecklist: string;
  deliveryNotes: string;
  notes: string;
};

export type TskDocumentCounters = {
  year: number;
  devis: number;
  contrat: number;
  facture_acompte: number;
  facture_intermediaire: number;
  facture_finale: number;
  bon_livraison: number;
  contrat_maintenance: number;
  facture_maintenance: number;
};

export type TskDocumentsStore = {
  version: 5;
  settings: TskOrgSettings;
  counters: TskDocumentCounters;
  projects: TskProject[];
  activeProjectId: string | null;
};

export const TSK_DOCUMENT_LABELS: Record<TskDocumentKind, string> = {
  devis: "Devis (DV)",
  contrat: "Contrat de prestation (CT)",
  facture_acompte: "Facture d'acompte (FA)",
  facture_intermediaire: "Facture intermédiaire (FI)",
  facture_finale: "Facture finale / Solde (FS)",
  bon_livraison: "Bon de livraison / PV réception",
  contrat_maintenance: "Contrat de maintenance (CM)",
  facture_maintenance: "Facture de maintenance (FM)",
};

export const TSK_DOCUMENT_PREFIX: Record<keyof TskDocumentCounters, string> = {
  year: "",
  devis: "DV",
  contrat: "CT",
  facture_acompte: "FA",
  facture_intermediaire: "FI",
  facture_finale: "FS",
  bon_livraison: "PV",
  contrat_maintenance: "CM",
  facture_maintenance: "FM",
};

export const TSK_WORKFLOW_LABELS: Record<TskWorkflowStep, string> = {
  quote_draft: "Devis en cours",
  quote_sent: "Devis envoyé",
  contract_ready: "Contrat prêt",
  deposit_invoiced: "Acompte facturé",
  deposit_paid: "Acompte reçu",
  intermediate_invoiced: "Facture intermédiaire émise",
  intermediate_paid: "Paiement intermédiaire reçu",
  final_invoiced: "Facture finale émise",
  final_paid: "Solde reçu",
  delivered: "PV de réception signé",
  maintenance_offered: "Maintenance proposée",
  closed: "Projet clôturé",
};
