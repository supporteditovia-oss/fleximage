import { nextDocumentNumber } from "./numbering";
import { touchProject } from "./project-factory";
import type {
  TskDocumentCounters,
  TskDocumentKind,
  TskProject,
  TskWorkflowStep,
} from "./types";

export type WorkflowAction =
  | "create_quote_number"
  | "mark_quote_sent"
  | "prepare_contract"
  | "issue_deposit_invoice"
  | "mark_deposit_paid"
  | "issue_intermediate_invoice"
  | "mark_intermediate_paid"
  | "skip_intermediate"
  | "issue_final_invoice"
  | "mark_final_paid"
  | "issue_delivery_doc"
  | "issue_maintenance_contract"
  | "close_project";

const STEP_ORDER: TskWorkflowStep[] = [
  "quote_draft",
  "quote_sent",
  "contract_ready",
  "deposit_invoiced",
  "deposit_paid",
  "intermediate_invoiced",
  "intermediate_paid",
  "final_invoiced",
  "final_paid",
  "delivered",
  "maintenance_offered",
  "closed",
];

export function canRunAction(project: TskProject, action: WorkflowAction): boolean {
  switch (action) {
    case "create_quote_number":
      return !project.quoteNumber;
    case "mark_quote_sent":
      return Boolean(project.quoteNumber) && project.workflowStep === "quote_draft";
    case "prepare_contract":
      return project.workflowStep === "quote_sent" || project.workflowStep === "contract_ready";
    case "issue_deposit_invoice":
      return Boolean(project.contractNumber) && !project.depositInvoiceNumber;
    case "mark_deposit_paid":
      return Boolean(project.depositInvoiceNumber) && project.depositInvoiceStatus === "pending";
    case "issue_intermediate_invoice":
      return (
        project.depositInvoiceStatus === "paid" &&
        project.useIntermediatePayment &&
        !project.intermediateInvoiceNumber
      );
    case "mark_intermediate_paid":
      return (
        Boolean(project.intermediateInvoiceNumber) &&
        project.intermediateInvoiceStatus === "pending"
      );
    case "skip_intermediate":
      return (
        project.depositInvoiceStatus === "paid" &&
        project.useIntermediatePayment &&
        !project.intermediateInvoiceNumber
      );
    case "issue_final_invoice":
      if (project.depositInvoiceStatus !== "paid" || project.finalInvoiceNumber) return false;
      if (!project.useIntermediatePayment) return true;
      if (project.intermediateInvoiceNumber) {
        return project.intermediateInvoiceStatus === "paid";
      }
      return project.workflowStep === "intermediate_paid";
    case "mark_final_paid":
      return Boolean(project.finalInvoiceNumber) && project.finalInvoiceStatus === "pending";
    case "issue_delivery_doc":
      return project.finalInvoiceStatus === "paid" && !project.deliveryDocNumber;
    case "issue_maintenance_contract":
      return Boolean(project.deliveryDocNumber) && !project.maintenanceContractNumber;
    case "close_project":
      return Boolean(project.deliveryDocNumber);
    default:
      return false;
  }
}

export function applyWorkflowAction(
  project: TskProject,
  counters: TskDocumentCounters,
  action: WorkflowAction,
): { project: TskProject; counters: TskDocumentCounters; docKind?: TskDocumentKind } {
  let next = touchProject({ ...project });
  let nextCounters = counters;
  let docKind: TskDocumentKind | undefined;

  switch (action) {
    case "create_quote_number": {
      const { number, counters: c } = nextDocumentNumber("devis", counters);
      next.quoteNumber = number;
      next.workflowStep = "quote_draft";
      nextCounters = c;
      docKind = "devis";
      break;
    }
    case "mark_quote_sent":
      next.workflowStep = "quote_sent";
      break;
    case "prepare_contract": {
      if (!next.contractNumber) {
        const { number, counters: c } = nextDocumentNumber("contrat", nextCounters);
        next.contractNumber = number;
        nextCounters = c;
      }
      next.workflowStep = "contract_ready";
      docKind = "contrat";
      break;
    }
    case "issue_deposit_invoice": {
      const { number, counters: c } = nextDocumentNumber("facture_acompte", nextCounters);
      next.depositInvoiceNumber = number;
      next.depositInvoiceStatus = "pending";
      next.workflowStep = "deposit_invoiced";
      nextCounters = c;
      docKind = "facture_acompte";
      break;
    }
    case "mark_deposit_paid":
      next.depositInvoiceStatus = "paid";
      next.depositPaidAt = next.depositPaidAt ?? new Date().toISOString().slice(0, 10);
      next.workflowStep = "deposit_paid";
      break;
    case "issue_intermediate_invoice": {
      const { number, counters: c } = nextDocumentNumber("facture_intermediaire", nextCounters);
      next.intermediateInvoiceNumber = number;
      next.intermediateInvoiceStatus = "pending";
      next.workflowStep = "intermediate_invoiced";
      nextCounters = c;
      docKind = "facture_intermediaire";
      break;
    }
    case "mark_intermediate_paid":
      next.intermediateInvoiceStatus = "paid";
      next.intermediatePaidAt =
        next.intermediatePaidAt ?? new Date().toISOString().slice(0, 10);
      next.workflowStep = "intermediate_paid";
      break;
    case "skip_intermediate":
      next.workflowStep = "intermediate_paid";
      break;
    case "issue_final_invoice": {
      const { number, counters: c } = nextDocumentNumber("facture_finale", nextCounters);
      next.finalInvoiceNumber = number;
      next.finalInvoiceStatus = "pending";
      next.workflowStep = "final_invoiced";
      nextCounters = c;
      docKind = "facture_finale";
      break;
    }
    case "mark_final_paid":
      next.finalInvoiceStatus = "paid";
      next.finalPaidAt = next.finalPaidAt ?? new Date().toISOString().slice(0, 10);
      next.workflowStep = "final_paid";
      break;
    case "issue_delivery_doc": {
      const { number, counters: c } = nextDocumentNumber("bon_livraison", nextCounters);
      next.deliveryDocNumber = number;
      next.workflowStep = "delivered";
      nextCounters = c;
      docKind = "bon_livraison";
      break;
    }
    case "issue_maintenance_contract": {
      const { number, counters: c } = nextDocumentNumber("contrat_maintenance", nextCounters);
      next.maintenanceContractNumber = number;
      next.workflowStep = "maintenance_offered";
      nextCounters = c;
      docKind = "contrat_maintenance";
      break;
    }
    case "close_project":
      next.workflowStep = "closed";
      break;
  }

  return { project: next, counters: nextCounters, docKind };
}

export function workflowProgress(step: TskWorkflowStep): number {
  const idx = STEP_ORDER.indexOf(step);
  if (idx < 0) return 0;
  return Math.round(((idx + 1) / STEP_ORDER.length) * 100);
}
