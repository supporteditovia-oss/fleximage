import { addBusinessDays, addCalendarDays, dueDateFromIssue } from "./dates";
import type { TskDocumentKind, TskProject } from "./types";

export function applySignatureSchedule(
  signatureDate: string,
  paymentTermsDays: number,
): Pick<
  TskProject,
  | "signatureDate"
  | "issueDate"
  | "intermediateInvoiceDate"
  | "deliveryDate"
  | "finalInvoiceDate"
  | "maintenanceContractDate"
  | "maintenanceInvoiceDate"
  | "dueDate"
> {
  const deliveryDate = addCalendarDays(signatureDate, 56);
  return {
    signatureDate,
    issueDate: signatureDate,
    intermediateInvoiceDate: addCalendarDays(signatureDate, 30),
    deliveryDate,
    finalInvoiceDate: addBusinessDays(deliveryDate, 8),
    maintenanceContractDate: deliveryDate,
    maintenanceInvoiceDate: addCalendarDays(deliveryDate, 30),
    dueDate: dueDateFromIssue(signatureDate, paymentTermsDays),
  };
}

const INVOICE_KINDS = new Set<TskDocumentKind>([
  "facture_acompte",
  "facture_intermediaire",
  "facture_finale",
  "facture_maintenance",
]);

export function documentIssueDate(project: TskProject, kind: TskDocumentKind): string {
  switch (kind) {
    case "devis":
    case "contrat":
    case "facture_acompte":
      return project.signatureDate || project.issueDate;
    case "facture_intermediaire":
      return project.intermediateInvoiceDate;
    case "bon_livraison":
      return project.deliveryDate;
    case "facture_finale":
      return project.finalInvoiceDate;
    case "contrat_maintenance":
      return project.maintenanceContractDate;
    case "facture_maintenance":
      return project.maintenanceInvoiceDate;
    default:
      return project.signatureDate || project.issueDate;
  }
}

export function documentDueDate(project: TskProject, kind: TskDocumentKind): string {
  const issue = documentIssueDate(project, kind);
  if (INVOICE_KINDS.has(kind)) {
    return dueDateFromIssue(issue, project.paymentTermsDays);
  }
  return project.dueDate;
}
