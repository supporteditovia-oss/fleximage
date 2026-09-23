import { useMemo, useState } from "react";
import { useLocation } from "wouter";
import {
  Building2,
  CheckCircle2,
  FileDown,
  Loader2,
  Plus,
  ShieldAlert,
  Trash2,
  Workflow,
} from "lucide-react";
import { useAuth } from "@/hooks/use-auth";
import { useTskDocumentsStore } from "@/hooks/use-tsk-documents-store";
import { TskLogo } from "@/components/tsk/TskLogo";
import { Button } from "@/components/ui/button";
import { Card, CardContent, CardDescription, CardHeader, CardTitle } from "@/components/ui/card";
import { Input } from "@/components/ui/input";
import { Label } from "@/components/ui/label";
import { Textarea } from "@/components/ui/textarea";
import { Tabs, TabsContent, TabsList, TabsTrigger } from "@/components/ui/tabs";
import {
  Select,
  SelectContent,
  SelectItem,
  SelectTrigger,
  SelectValue,
} from "@/components/ui/select";
import { useToast } from "@/hooks/use-toast";
import { TSK_BRAND } from "@/lib/tsk-brand/constants";
import {
  depositAmountHt,
  formatDateFr,
  formatMoney,
  remainingBalanceHt,
  subtotalHt,
  totalTtc,
  vatAmount,
} from "@/lib/tsk-documents/calc";
import { DEPOSIT_PRESETS, newLineItem } from "@/lib/tsk-documents/project-factory";
import { nextDocumentNumber } from "@/lib/tsk-documents/numbering";
import {
  buildTskProjectPdf,
  downloadPdfFile,
  generateTskCgvPdf,
  generateTskProjectPdf,
} from "@/lib/tsk-documents/pdf";
import { canRunAction, workflowProgress } from "@/lib/tsk-documents/workflow";
import {
  TSK_DOCUMENT_LABELS,
  TSK_WORKFLOW_LABELS,
  type DepositMode,
  type TskDocumentKind,
  type TskLineItem,
  type TskProject,
} from "@/lib/tsk-documents/types";
import { cn } from "@/lib/utils";

function LineItemsEditor({
  items,
  onChange,
}: {
  items: TskLineItem[];
  onChange: (items: TskLineItem[]) => void;
}) {
  const update = (id: string, patch: Partial<TskLineItem>) => {
    onChange(items.map((item) => (item.id === id ? { ...item, ...patch } : item)));
  };
  return (
    <div className="space-y-3">
      {items.map((item) => (
        <div
          key={item.id}
          className="grid gap-2 rounded-lg border border-[#A7A7A7]/35 p-3 md:grid-cols-[1fr_70px_110px_36px]"
        >
          <Input
            value={item.label}
            placeholder="Prestation"
            onChange={(e) => update(item.id, { label: e.target.value })}
          />
          <Input
            type="number"
            min={0}
            value={item.quantity}
            onChange={(e) => update(item.id, { quantity: Number(e.target.value) || 0 })}
          />
          <Input
            type="number"
            min={0}
            step={0.01}
            value={item.unitPriceHt}
            onChange={(e) =>
              update(item.id, { unitPriceHt: Number(e.target.value) || 0 })
            }
          />
          <Button
            type="button"
            variant="ghost"
            size="icon"
            disabled={items.length <= 1}
            onClick={() => onChange(items.filter((r) => r.id !== item.id))}
          >
            <Trash2 className="h-4 w-4 text-destructive" />
          </Button>
        </div>
      ))}
      <Button type="button" variant="outline" size="sm" onClick={() => onChange([...items, newLineItem()])}>
        <Plus className="h-4 w-4" /> Ligne
      </Button>
    </div>
  );
}

export default function AdminDocuments() {
  const { isAdmin, isLoading } = useAuth();
  const [, setLocation] = useLocation();
  const { toast } = useToast();
  const {
    store,
    hydrated,
    activeProject,
    setSettings,
    setActiveProjectId,
    saveProject,
    createNewProject,
    runWorkflow,
    ensureCgvNumber,
    deleteProject,
  } = useTskDocumentsStore();
  const [generating, setGenerating] = useState(false);

  const totals = useMemo(() => {
    if (!activeProject) return null;
    const sub = subtotalHt(activeProject.lineItems);
    return {
      sub,
      ttc: totalTtc(sub, activeProject.vatRate),
      deposit: depositAmountHt(activeProject),
      balance: remainingBalanceHt(activeProject),
    };
  }, [activeProject]);

  const patchProject = (patch: Partial<TskProject>) => {
    if (!activeProject) return;
    saveProject({ ...activeProject, ...patch });
  };

  const assignNumber = (
    project: TskProject,
    kind: TskDocumentKind,
  ): { project: TskProject; counters: typeof store.counters; settings: typeof store.settings } => {
    let p = project;
    let counters = store.counters;
    let settings = store.settings;
    const map: Partial<Record<TskDocumentKind, keyof TskProject>> = {
      devis: "quoteNumber",
      contrat: "contractNumber",
      facture_acompte: "depositInvoiceNumber",
      facture: "finalInvoiceNumber",
      bon_livraison: "deliveryDocNumber",
    };
    const field = map[kind];
    if (field && !p[field]) {
      const next = nextDocumentNumber(kind, counters);
      counters = next.counters;
      p = { ...p, [field]: next.number };
      saveProject(p);
    }
    if (kind === "cgv" && !settings.cgvNumber) {
      settings = ensureCgvNumber();
    }
    return { project: p, counters, settings };
  };

  const downloadPdf = async (project: TskProject, kind: TskDocumentKind) => {
    setGenerating(true);
    try {
      const prepared = assignNumber(project, kind);
      if (kind === "cgv") {
        await generateTskCgvPdf(prepared.settings);
      } else {
        await generateTskProjectPdf(prepared.project, prepared.settings, kind);
      }
      toast({ title: "PDF téléchargé", description: TSK_DOCUMENT_LABELS[kind] });
    } catch (e) {
      toast({
        variant: "destructive",
        title: "Erreur PDF",
        description: e instanceof Error ? e.message : "Échec",
      });
    } finally {
      setGenerating(false);
    }
  };

  const runAndDownload = (action: Parameters<typeof runWorkflow>[0]) => {
    const result = runWorkflow(action);
    if (!result?.docKind) return;
    void downloadPdf(result.project, result.docKind);
  };

  const ALL_DOC_KINDS: TskDocumentKind[] = [
    "devis",
    "contrat",
    "facture_acompte",
    "facture",
    "bon_livraison",
    "cgv",
  ];

  const downloadAllSixPdfs = async () => {
    if (!activeProject) {
      toast({
        variant: "destructive",
        title: "Aucun projet",
        description: "Créez ou sélectionnez un projet TSK Digital.",
      });
      return;
    }
    setGenerating(true);
    try {
      let project = activeProject;
      let settings = store.settings;
      for (const kind of ALL_DOC_KINDS) {
        const prepared = assignNumber(project, kind);
        project = prepared.project;
        settings = prepared.settings;
        const built = await buildTskProjectPdf(project, settings, kind);
        downloadPdfFile(built.filename, built.buffer);
        await new Promise((r) => window.setTimeout(r, 600));
      }
      toast({
        title: "6 PDF TSK Digital",
        description: "Téléchargements lancés sur votre appareil (dossier Téléchargements).",
      });
    } catch (e) {
      toast({
        variant: "destructive",
        title: "Erreur",
        description: e instanceof Error ? e.message : "Échec génération",
      });
    } finally {
      setGenerating(false);
    }
  };

  if (!isAdmin && !isLoading) {
    return (
      <div className="flex min-h-[60vh] flex-col items-center justify-center gap-4">
        <ShieldAlert className="h-14 w-14 text-destructive" />
        <h1 className="text-2xl font-semibold">Accès refusé</h1>
        <Button onClick={() => setLocation("/generate")}>Retour</Button>
      </div>
    );
  }

  if (!hydrated) {
    return (
      <div className="flex min-h-[40vh] items-center justify-center">
        <Loader2 className="h-8 w-8 animate-spin text-muted-foreground" />
      </div>
    );
  }

  const s = store.settings;
  const logoPreview = s.logoDataUrl || undefined;

  return (
    <div className="container max-w-6xl space-y-6 py-6">
      <div className="flex flex-col gap-4 md:flex-row md:items-end md:justify-between">
        <div className="space-y-2">
          <TskLogo variant="print" src={logoPreview} className="h-10" />
          <h1 className="text-3xl font-bold tracking-tight">Documents TSK Digital</h1>
          <p className="max-w-2xl text-sm text-muted-foreground">
            Fond blanc, mise en page premium, six PDF métier complets. Logo officiel uniquement.
            Devis → contrat → acompte → facture → livraison · CGV séparées.
          </p>
        </div>
        <Button onClick={createNewProject} className="bg-[#0B0B0C] text-white hover:bg-[#0B0B0C]/90">
          <Plus className="h-4 w-4" /> Nouveau projet
        </Button>
      </div>

      <Card className="border-[#E8E8E8] bg-[#FAFAFA]">
        <CardHeader className="pb-2">
          <CardTitle className="text-base">Télécharger sur votre ordinateur</CardTitle>
          <CardDescription>
            Les PDF <strong>TSK Digital</strong> ne sont pas publiés sur LuxeFlexIA. Ils sont
            générés dans votre navigateur et enregistrés localement (aucune mise en ligne publique).
            Autorisez les téléchargements multiples si le navigateur le demande.
          </CardDescription>
        </CardHeader>
        <CardContent className="flex flex-wrap gap-2">
          <Button
            type="button"
            className="bg-[#0B0B0C] text-white hover:bg-[#0B0B0C]/90"
            disabled={generating || !activeProject}
            onClick={() => void downloadAllSixPdfs()}
          >
            {generating ? (
              <Loader2 className="h-4 w-4 animate-spin" />
            ) : (
              <FileDown className="h-4 w-4" />
            )}
            Télécharger les 6 PDF (projet actif)
          </Button>
        </CardContent>
      </Card>

      <Tabs defaultValue="workflow" className="space-y-4">
        <TabsList>
          <TabsTrigger value="workflow">Workflow</TabsTrigger>
          <TabsTrigger value="settings">Paramètres entreprise</TabsTrigger>
          <TabsTrigger value="templates">Contrat & maintenance</TabsTrigger>
        </TabsList>

        <TabsContent value="workflow" className="space-y-4">
          <div className="grid gap-4 lg:grid-cols-[280px_1fr]">
            <Card>
              <CardHeader className="pb-2">
                <CardTitle className="text-sm">Projets</CardTitle>
              </CardHeader>
              <CardContent className="space-y-2">
                {store.projects.length === 0 && (
                  <p className="text-xs text-muted-foreground">Aucun projet — créez un devis.</p>
                )}
                {store.projects.map((p) => (
                  <div
                    key={p.id}
                    className={cn(
                      "flex items-start gap-2 rounded-lg border p-2 text-left",
                      store.activeProjectId === p.id && "border-[#0B0B0C] bg-muted/40",
                    )}
                  >
                    <button
                      type="button"
                      className="min-w-0 flex-1 text-left"
                      onClick={() => setActiveProjectId(p.id)}
                    >
                      <p className="truncate text-sm font-medium">{p.projectTitle}</p>
                      <p className="text-[10px] text-muted-foreground">
                        {p.quoteNumber ?? "Sans n°"} · {TSK_WORKFLOW_LABELS[p.workflowStep]}
                      </p>
                    </button>
                    <Button
                      type="button"
                      variant="ghost"
                      size="icon"
                      className="shrink-0"
                      onClick={() => deleteProject(p.id)}
                    >
                      <Trash2 className="h-3.5 w-3.5" />
                    </Button>
                  </div>
                ))}
              </CardContent>
            </Card>

            {!activeProject ? (
              <Card>
                <CardContent className="py-12 text-center text-muted-foreground">
                  Sélectionnez ou créez un projet pour démarrer le workflow.
                </CardContent>
              </Card>
            ) : (
              <div className="space-y-4">
                <Card>
                  <CardHeader>
                    <CardTitle className="flex items-center gap-2 text-base">
                      <Workflow className="h-4 w-4" />
                      Pipeline · {workflowProgress(activeProject.workflowStep)} %
                    </CardTitle>
                    <CardDescription>{TSK_WORKFLOW_LABELS[activeProject.workflowStep]}</CardDescription>
                  </CardHeader>
                  <CardContent className="flex flex-wrap gap-2">
                    <Button
                      size="sm"
                      disabled={!canRunAction(activeProject, "create_quote_number") || generating}
                      onClick={() => runAndDownload("create_quote_number")}
                    >
                      1. Créer devis (PDF)
                    </Button>
                    <Button
                      size="sm"
                      variant="outline"
                      disabled={!canRunAction(activeProject, "mark_quote_sent")}
                      onClick={() => runWorkflow("mark_quote_sent")}
                    >
                      2. Devis envoyé
                    </Button>
                    <Button
                      size="sm"
                      variant="outline"
                      disabled={!canRunAction(activeProject, "prepare_contract") || generating}
                      onClick={() => runAndDownload("prepare_contract")}
                    >
                      3. Contrat (PDF)
                    </Button>
                    <Button
                      size="sm"
                      variant="outline"
                      disabled={!canRunAction(activeProject, "issue_deposit_invoice") || generating}
                      onClick={() => runAndDownload("issue_deposit_invoice")}
                    >
                      4. Facture acompte
                    </Button>
                    <Button
                      size="sm"
                      variant="outline"
                      disabled={!canRunAction(activeProject, "mark_deposit_paid")}
                      onClick={() => runWorkflow("mark_deposit_paid")}
                    >
                      5. Acompte reçu
                    </Button>
                    <Button
                      size="sm"
                      variant="outline"
                      disabled={!canRunAction(activeProject, "issue_final_invoice") || generating}
                      onClick={() => runAndDownload("issue_final_invoice")}
                    >
                      6. Facture finale
                    </Button>
                    <Button
                      size="sm"
                      variant="outline"
                      disabled={!canRunAction(activeProject, "issue_delivery_doc") || generating}
                      onClick={() => runAndDownload("issue_delivery_doc")}
                    >
                      7. Bon de livraison
                    </Button>
                    <Button
                      size="sm"
                      variant="ghost"
                      disabled={generating}
                      onClick={() => activeProject && void downloadPdf(activeProject, "cgv")}
                    >
                      CGV (PDF)
                    </Button>
                  </CardContent>
                </Card>

                {totals && (
                  <div className="grid gap-3 sm:grid-cols-4">
                    {[
                      ["Total HT", formatMoney(totals.sub)],
                      ["Total TTC", formatMoney(totals.ttc)],
                      ["Acompte HT", formatMoney(totals.deposit)],
                      ["Solde HT", formatMoney(totals.balance)],
                    ].map(([k, v]) => (
                      <Card key={k}>
                        <CardContent className="pt-4">
                          <p className="text-[10px] uppercase text-[#A7A7A7]">{k}</p>
                          <p className="text-lg font-semibold">{v}</p>
                        </CardContent>
                      </Card>
                    ))}
                  </div>
                )}

                <Card>
                  <CardHeader>
                    <CardTitle className="text-base">Projet & client</CardTitle>
                  </CardHeader>
                  <CardContent className="grid gap-3 md:grid-cols-2">
                    <div className="space-y-2 md:col-span-2">
                      <Label>Titre du projet</Label>
                      <Input
                        value={activeProject.projectTitle}
                        onChange={(e) => patchProject({ projectTitle: e.target.value })}
                      />
                    </div>
                    <div className="space-y-2 md:col-span-2">
                      <Label>Description</Label>
                      <Textarea
                        rows={2}
                        value={activeProject.projectDescription}
                        onChange={(e) => patchProject({ projectDescription: e.target.value })}
                      />
                    </div>
                    <div className="space-y-2">
                      <Label>Client — société</Label>
                      <Input
                        value={activeProject.client.company}
                        onChange={(e) =>
                          patchProject({
                            client: { ...activeProject.client, company: e.target.value },
                          })
                        }
                      />
                    </div>
                    <div className="space-y-2">
                      <Label>Contact</Label>
                      <Input
                        value={activeProject.client.contactName}
                        onChange={(e) =>
                          patchProject({
                            client: { ...activeProject.client, contactName: e.target.value },
                          })
                        }
                      />
                    </div>
                    <div className="space-y-2">
                      <Label>E-mail client</Label>
                      <Input
                        value={activeProject.client.email}
                        onChange={(e) =>
                          patchProject({
                            client: { ...activeProject.client, email: e.target.value },
                          })
                        }
                      />
                    </div>
                    <div className="space-y-2">
                      <Label>Date d&apos;émission</Label>
                      <Input
                        type="date"
                        value={activeProject.issueDate}
                        onChange={(e) => patchProject({ issueDate: e.target.value })}
                      />
                    </div>
                    <div className="space-y-2 md:col-span-2">
                      <Label>Prestations</Label>
                      <LineItemsEditor
                        items={activeProject.lineItems}
                        onChange={(lineItems) => patchProject({ lineItems })}
                      />
                    </div>
                    <div className="space-y-2">
                      <Label>Acompte</Label>
                      <Select
                        value={activeProject.depositMode}
                        onValueChange={(v) =>
                          patchProject({ depositMode: v as DepositMode })
                        }
                      >
                        <SelectTrigger>
                          <SelectValue />
                        </SelectTrigger>
                        <SelectContent>
                          {DEPOSIT_PRESETS.map((p) => (
                            <SelectItem key={p.id} value={p.id}>
                              {p.label}
                            </SelectItem>
                          ))}
                        </SelectContent>
                      </Select>
                    </div>
                    {activeProject.depositMode === "percent_custom" && (
                      <div className="space-y-2">
                        <Label>% personnalisé</Label>
                        <Input
                          type="number"
                          value={activeProject.depositPercent}
                          onChange={(e) =>
                            patchProject({ depositPercent: Number(e.target.value) || 0 })
                          }
                        />
                      </div>
                    )}
                    {activeProject.depositMode === "amount_custom" && (
                      <div className="space-y-2">
                        <Label>Montant acompte HT (€)</Label>
                        <Input
                          type="number"
                          value={activeProject.depositCustomAmountHt}
                          onChange={(e) =>
                            patchProject({
                              depositCustomAmountHt: Number(e.target.value) || 0,
                            })
                          }
                        />
                      </div>
                    )}
                    <div className="space-y-2">
                      <Label>Statut facture acompte</Label>
                      <Select
                        value={activeProject.depositInvoiceStatus}
                        onValueChange={(v) =>
                          patchProject({
                            depositInvoiceStatus: v as "pending" | "paid",
                          })
                        }
                      >
                        <SelectTrigger>
                          <SelectValue />
                        </SelectTrigger>
                        <SelectContent>
                          <SelectItem value="pending">En attente</SelectItem>
                          <SelectItem value="paid">Payée</SelectItem>
                        </SelectContent>
                      </Select>
                    </div>
                    <div className="space-y-2">
                      <Label>Statut facture finale</Label>
                      <Select
                        value={activeProject.finalInvoiceStatus}
                        onValueChange={(v) =>
                          patchProject({
                            finalInvoiceStatus: v as "pending" | "paid",
                          })
                        }
                      >
                        <SelectTrigger>
                          <SelectValue />
                        </SelectTrigger>
                        <SelectContent>
                          <SelectItem value="pending">En attente</SelectItem>
                          <SelectItem value="paid">Payée</SelectItem>
                        </SelectContent>
                      </Select>
                    </div>
                  </CardContent>
                </Card>

                <Card className="border-[#E8E8E8] bg-white text-[#0B0B0C] shadow-sm">
                  <CardHeader>
                    <CardTitle className="text-sm">Aperçu en-tête (fond blanc)</CardTitle>
                  </CardHeader>
                  <CardContent>
                    <div className="rounded-lg border border-[#E8E8E8] bg-white px-4 py-4">
                      <TskLogo variant="print" src={logoPreview} className="h-8" />
                    </div>
                    <p className="mt-3 text-xs text-[#A7A7A7]">
                      {activeProject.quoteNumber ?? "DV-…"} · {formatDateFr(activeProject.issueDate)}{" "}
                      · TVA {activeProject.vatRate} % · TTC {totals ? formatMoney(totals.ttc) : "—"}
                    </p>
                  </CardContent>
                </Card>

                <div className="flex flex-wrap gap-2">
                  {(Object.keys(TSK_DOCUMENT_LABELS) as TskDocumentKind[]).map((kind) => (
                    <Button
                      key={kind}
                      variant="outline"
                      size="sm"
                      disabled={generating}
                      onClick={() => void downloadPdf(activeProject, kind)}
                    >
                      <FileDown className="h-3.5 w-3.5" />
                      {TSK_DOCUMENT_LABELS[kind]}
                    </Button>
                  ))}
                </div>
              </div>
            )}
          </div>
        </TabsContent>

        <TabsContent value="settings">
          <Card>
            <CardHeader>
              <CardTitle className="flex items-center gap-2">
                <Building2 className="h-4 w-4" />
                Coordonnées & logo
              </CardTitle>
              <CardDescription>
                Enregistrées automatiquement — utilisées sur tous les PDF.
              </CardDescription>
            </CardHeader>
            <CardContent className="grid gap-4 md:grid-cols-2">
              <div className="space-y-2 md:col-span-2">
                <Label>Logo (PNG recommandé — laisser vide pour le logo officiel)</Label>
                <Input
                  type="file"
                  accept="image/png,image/jpeg,image/webp"
                  onChange={(e) => {
                    const file = e.target.files?.[0];
                    if (!file) return;
                    const reader = new FileReader();
                    reader.onload = () =>
                      setSettings({ ...s, logoDataUrl: String(reader.result) });
                    reader.readAsDataURL(file);
                  }}
                />
                <div className="rounded-lg border border-[#E8E8E8] bg-white inline-block px-4 py-3">
                  <TskLogo variant="print" src={logoPreview} className="h-8" />
                </div>
                <p className="text-xs text-muted-foreground">
                  Les PDF utilisent fond blanc. Le fichier officiel est automatiquement adapté
                  pour l&apos;impression (sans bandeau noir).
                </p>
              </div>
              {(
                [
                  ["company", "Raison sociale"],
                  ["addressLine1", "Adresse"],
                  ["postalCode", "Code postal"],
                  ["city", "Ville"],
                  ["phone", "Téléphone"],
                  ["email", "E-mail"],
                  ["siret", "SIRET"],
                  ["vatNumber", "N° TVA"],
                  ["iban", "IBAN"],
                  ["bic", "BIC"],
                ] as const
              ).map(([key, label]) => (
                <div key={key} className="space-y-2">
                  <Label>{label}</Label>
                  <Input
                    value={s[key]}
                    onChange={(e) => setSettings({ ...s, [key]: e.target.value })}
                  />
                </div>
              ))}
              <div className="space-y-2 md:col-span-2">
                <Label>Conditions de paiement (devis)</Label>
                <Textarea
                  rows={3}
                  value={s.paymentConditionsText}
                  onChange={(e) =>
                    setSettings({ ...s, paymentConditionsText: e.target.value })
                  }
                />
              </div>
              <div className="space-y-2">
                <Label>Nom signataire TSK</Label>
                <Input
                  value={s.signatureIssuerName}
                  onChange={(e) =>
                    setSettings({ ...s, signatureIssuerName: e.target.value })
                  }
                />
              </div>
              <div className="space-y-2">
                <Label>Fonction / mention signature</Label>
                <Input
                  value={s.signatureIssuerTitle}
                  onChange={(e) =>
                    setSettings({ ...s, signatureIssuerTitle: e.target.value })
                  }
                />
              </div>
            </CardContent>
          </Card>
        </TabsContent>

        <TabsContent value="templates" className="space-y-4">
          <Card>
            <CardHeader>
              <CardTitle>Conditions Générales de Vente (CGV)</CardTitle>
              <CardDescription>
                Document PDF séparé · n° {s.cgvNumber ?? "auto à la 1ère génération"}
              </CardDescription>
            </CardHeader>
            <CardContent className="space-y-3">
              {(Object.keys(s.cgvSections) as (keyof typeof s.cgvSections)[]).map((key) => (
                <div key={key} className="space-y-1">
                  <Label className="capitalize">{key.replace(/([A-Z])/g, " $1")}</Label>
                  <Textarea
                    rows={3}
                    value={s.cgvSections[key]}
                    onChange={(e) =>
                      setSettings({
                        ...s,
                        cgvSections: { ...s.cgvSections, [key]: e.target.value },
                      })
                    }
                  />
                </div>
              ))}
              <Button
                type="button"
                variant="outline"
                disabled={generating}
                onClick={() => activeProject && void downloadPdf(activeProject, "cgv")}
              >
                <FileDown className="h-4 w-4" /> Télécharger les CGV
              </Button>
            </CardContent>
          </Card>
          {activeProject && (
            <Card>
              <CardHeader>
                <CardTitle>Contrat & livraison (projet actif)</CardTitle>
              </CardHeader>
              <CardContent className="space-y-3">
                {(Object.keys(activeProject.contractClauses) as (keyof typeof activeProject.contractClauses)[]).map(
                  (key) => (
                    <div key={key} className="space-y-1">
                      <Label className="capitalize">{key.replace(/([A-Z])/g, " $1")}</Label>
                      <Textarea
                        rows={2}
                        value={activeProject.contractClauses[key]}
                        onChange={(e) =>
                          patchProject({
                            contractClauses: {
                              ...activeProject.contractClauses,
                              [key]: e.target.value,
                            },
                          })
                        }
                      />
                    </div>
                  ),
                )}
                <Label>Checklist bon de livraison</Label>
                <Textarea
                  rows={4}
                  value={activeProject.deliveryChecklist}
                  onChange={(e) => patchProject({ deliveryChecklist: e.target.value })}
                />
                <Label>Texte de validation client</Label>
                <Textarea
                  rows={2}
                  value={activeProject.deliveryNotes}
                  onChange={(e) => patchProject({ deliveryNotes: e.target.value })}
                />
              </CardContent>
            </Card>
          )}
        </TabsContent>
      </Tabs>

      <p className="flex items-center gap-2 text-xs text-muted-foreground">
        <CheckCircle2 className="h-3.5 w-3.5" />
        Numérotation automatique · DV / CT / FA / FC / BL / CGV — année {store.counters.year}
      </p>
    </div>
  );
}
