import { useEffect, useMemo, useState } from "react";
import { useLocation } from "wouter";
import { FileDown, FileStack, Loader2, Plus, ShieldAlert, Trash2 } from "lucide-react";
import { useAuth } from "@/hooks/use-auth";
import { TskLogo } from "@/components/tsk/TskLogo";
import { Button } from "@/components/ui/button";
import { Card, CardContent, CardDescription, CardHeader, CardTitle } from "@/components/ui/card";
import { Input } from "@/components/ui/input";
import { Label } from "@/components/ui/label";
import { Textarea } from "@/components/ui/textarea";
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
  depositAmount,
  formatDateFr,
  formatMoney,
  lineTotalHt,
  subtotalHt,
  totalTtc,
  vatAmount,
} from "@/lib/tsk-documents/calc";
import {
  createDefaultDraft,
  loadDraftFromStorage,
  newLineItem,
  saveDraftToStorage,
} from "@/lib/tsk-documents/defaults";
import { generateTskDocumentPdf } from "@/lib/tsk-documents/pdf";
import {
  TSK_DOCUMENT_LABELS,
  type TskDocumentDraft,
  type TskDocumentKind,
  type TskLineItem,
} from "@/lib/tsk-documents/types";
import { cn } from "@/lib/utils";

const DOCUMENT_KINDS: TskDocumentKind[] = [
  "devis",
  "contrat",
  "facture",
  "facture_acompte",
  "validation_fin",
];

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
          className="grid gap-2 rounded-lg border border-[#A7A7A7]/30 p-3 md:grid-cols-[1fr_72px_120px_40px]"
        >
          <div className="space-y-1 md:col-span-1">
            <Label className="text-xs text-muted-foreground">Description</Label>
            <Input
              value={item.label}
              onChange={(e) => update(item.id, { label: e.target.value })}
            />
          </div>
          <div className="space-y-1">
            <Label className="text-xs text-muted-foreground">Qté</Label>
            <Input
              type="number"
              min={0}
              step={1}
              value={item.quantity}
              onChange={(e) =>
                update(item.id, { quantity: Number(e.target.value) || 0 })
              }
            />
          </div>
          <div className="space-y-1">
            <Label className="text-xs text-muted-foreground">P.U. HT (€)</Label>
            <Input
              type="number"
              min={0}
              step={0.01}
              value={item.unitPriceHt}
              onChange={(e) =>
                update(item.id, { unitPriceHt: Number(e.target.value) || 0 })
              }
            />
          </div>
          <div className="flex items-end justify-end">
            <Button
              type="button"
              variant="ghost"
              size="icon"
              className="text-destructive"
              onClick={() => onChange(items.filter((row) => row.id !== item.id))}
              disabled={items.length <= 1}
            >
              <Trash2 className="h-4 w-4" />
            </Button>
          </div>
          <p className="text-xs text-muted-foreground md:col-span-4">
            Ligne HT : {formatMoney(lineTotalHt(item))}
          </p>
        </div>
      ))}
      <Button
        type="button"
        variant="outline"
        size="sm"
        onClick={() => onChange([...items, newLineItem()])}
      >
        <Plus className="h-4 w-4" />
        Ajouter une ligne
      </Button>
    </div>
  );
}

function DocumentPreview({ draft }: { draft: TskDocumentDraft }) {
  const sub = subtotalHt(draft.lineItems);
  const ttc = totalTtc(sub, draft.vatRate);

  return (
    <div
      className="rounded-xl border border-[#A7A7A7]/40 bg-white p-6 text-[#0B0B0C] shadow-sm"
      style={{ fontFamily: TSK_BRAND.fonts.primary }}
    >
      <div className="border-b border-[#A7A7A7]/50 pb-4">
        <TskLogo theme="light" className="h-9" />
      </div>
      <div className="mt-4 flex items-start justify-between gap-4">
        <h2 className="text-lg font-semibold tracking-tight">
          {TSK_DOCUMENT_LABELS[draft.kind]}
        </h2>
        <p className="text-xs text-[#A7A7A7]">Réf. {draft.reference}</p>
      </div>
      <p className="mt-2 text-sm text-[#A7A7A7]">{draft.projectTitle}</p>
      <div className="mt-6 grid gap-6 text-sm md:grid-cols-2">
        <div>
          <p className="text-[10px] font-semibold uppercase tracking-wider text-[#A7A7A7]">
            Émetteur
          </p>
          <p className="mt-1 font-medium">{draft.issuer.company}</p>
          <p>{draft.issuer.addressLine1}</p>
          <p>{draft.issuer.addressLine2}</p>
        </div>
        <div>
          <p className="text-[10px] font-semibold uppercase tracking-wider text-[#A7A7A7]">
            Client
          </p>
          <p className="mt-1 font-medium">{draft.client.company}</p>
          <p>{draft.client.contactName}</p>
          <p>{draft.client.email}</p>
        </div>
      </div>
      {draft.kind !== "validation_fin" && (
        <div className="mt-6 overflow-hidden rounded-lg border border-[#0B0B0C]/10">
          <table className="w-full text-left text-xs">
            <thead className="bg-[#0B0B0C] text-white">
              <tr>
                <th className="px-3 py-2 font-medium">Description</th>
                <th className="px-3 py-2">Qté</th>
                <th className="px-3 py-2 text-right">Total HT</th>
              </tr>
            </thead>
            <tbody>
              {draft.lineItems.map((item) => (
                <tr key={item.id} className="border-t border-[#A7A7A7]/20">
                  <td className="px-3 py-2">{item.label}</td>
                  <td className="px-3 py-2">{item.quantity}</td>
                  <td className="px-3 py-2 text-right">
                    {formatMoney(lineTotalHt(item))}
                  </td>
                </tr>
              ))}
            </tbody>
          </table>
          <div className="space-y-1 border-t border-[#A7A7A7]/20 px-3 py-3 text-xs">
            <div className="flex justify-between">
              <span className="text-[#A7A7A7]">Total HT</span>
              <span>{formatMoney(sub)}</span>
            </div>
            <div className="flex justify-between font-semibold">
              <span>Total TTC</span>
              <span>{formatMoney(ttc)}</span>
            </div>
            {draft.kind === "facture_acompte" && (
              <div className="flex justify-between text-[#A7A7A7]">
                <span>Acompte ({draft.depositPercent} %)</span>
                <span>{formatMoney(depositAmount(draft))} HT</span>
              </div>
            )}
          </div>
        </div>
      )}
      <p className="mt-4 text-[10px] text-[#A7A7A7]">
        Émis le {formatDateFr(draft.issueDate)} · {TSK_BRAND.name} uniquement
      </p>
    </div>
  );
}

export default function AdminDocuments() {
  const { isAdmin, isLoading } = useAuth();
  const [, setLocation] = useLocation();
  const { toast } = useToast();
  const [draft, setDraft] = useState<TskDocumentDraft>(() =>
    loadDraftFromStorage() ?? createDefaultDraft(),
  );
  const [generating, setGenerating] = useState(false);

  useEffect(() => {
    saveDraftToStorage(draft);
  }, [draft]);

  const totals = useMemo(() => {
    const sub = subtotalHt(draft.lineItems);
    return {
      sub,
      vat: vatAmount(sub, draft.vatRate),
      ttc: totalTtc(sub, draft.vatRate),
    };
  }, [draft.lineItems, draft.vatRate]);

  const patchDraft = (patch: Partial<TskDocumentDraft>) => {
    setDraft((prev) => ({ ...prev, ...patch }));
  };

  const patchIssuer = (field: keyof TskDocumentDraft["issuer"], value: string) => {
    setDraft((prev) => ({
      ...prev,
      issuer: { ...prev.issuer, [field]: value },
    }));
  };

  const patchClient = (field: keyof TskDocumentDraft["client"], value: string) => {
    setDraft((prev) => ({
      ...prev,
      client: { ...prev.client, [field]: value },
    }));
  };

  const handleGenerate = async () => {
    setGenerating(true);
    try {
      await generateTskDocumentPdf(draft);
      toast({
        title: "PDF généré",
        description: `${TSK_DOCUMENT_LABELS[draft.kind]} — ${TSK_BRAND.name}`,
      });
    } catch (error) {
      toast({
        variant: "destructive",
        title: "Échec de la génération",
        description: error instanceof Error ? error.message : "Erreur inconnue",
      });
    } finally {
      setGenerating(false);
    }
  };

  if (!isAdmin && !isLoading) {
    return (
      <div className="flex min-h-[60vh] flex-col items-center justify-center gap-4 text-center">
        <ShieldAlert className="h-14 w-14 text-destructive" />
        <h1 className="text-2xl font-semibold">Accès refusé</h1>
        <p className="text-muted-foreground">Réservé aux administrateurs.</p>
        <Button onClick={() => setLocation("/generate")}>Retour</Button>
      </div>
    );
  }

  return (
    <div className="container max-w-6xl space-y-6 py-6">
      <div className="flex flex-col gap-4 sm:flex-row sm:items-end sm:justify-between">
        <div className="space-y-2">
          <div className="flex items-center gap-3">
            <div className="rounded-lg bg-[#0B0B0C] px-3 py-2">
              <TskLogo theme="dark" className="h-7" />
            </div>
            <span className="text-xs uppercase tracking-[0.2em] text-[#A7A7A7]">
              B2B
            </span>
          </div>
          <h1 className="text-3xl font-bold tracking-tight">Documents</h1>
          <p className="max-w-2xl text-sm text-muted-foreground">
            Générez devis, contrats et factures au nom de{" "}
            <strong className="font-medium text-foreground">{TSK_BRAND.name}</strong>{" "}
            — identité indépendante, prête pour vos clients.
          </p>
        </div>
        <Button
          className={cn("bg-[#0B0B0C] text-white hover:bg-[#0B0B0C]/90")}
          onClick={() => void handleGenerate()}
          disabled={generating}
        >
          {generating ? (
            <Loader2 className="h-4 w-4 animate-spin" />
          ) : (
            <FileDown className="h-4 w-4" />
          )}
          Télécharger le PDF
        </Button>
      </div>

      <div className="grid gap-6 lg:grid-cols-[1.1fr_0.9fr]">
        <div className="space-y-6">
          <Card>
            <CardHeader>
              <CardTitle className="flex items-center gap-2 text-base">
                <FileStack className="h-4 w-4" />
                Type de document
              </CardTitle>
              <CardDescription>Un seul modèle, cinq sorties PDF brandées.</CardDescription>
            </CardHeader>
            <CardContent className="space-y-4">
              <div className="space-y-2">
                <Label>Document</Label>
                <Select
                  value={draft.kind}
                  onValueChange={(value) =>
                    patchDraft({ kind: value as TskDocumentKind })
                  }
                >
                  <SelectTrigger>
                    <SelectValue />
                  </SelectTrigger>
                  <SelectContent>
                    {DOCUMENT_KINDS.map((kind) => (
                      <SelectItem key={kind} value={kind}>
                        {TSK_DOCUMENT_LABELS[kind]}
                      </SelectItem>
                    ))}
                  </SelectContent>
                </Select>
              </div>
              <div className="grid gap-3 sm:grid-cols-2">
                <div className="space-y-2">
                  <Label>Référence</Label>
                  <Input
                    value={draft.reference}
                    onChange={(e) => patchDraft({ reference: e.target.value })}
                  />
                </div>
                <div className="space-y-2">
                  <Label>Date d&apos;émission</Label>
                  <Input
                    type="date"
                    value={draft.issueDate}
                    onChange={(e) => patchDraft({ issueDate: e.target.value })}
                  />
                </div>
                <div className="space-y-2 sm:col-span-2">
                  <Label>Intitulé du projet</Label>
                  <Input
                    value={draft.projectTitle}
                    onChange={(e) => patchDraft({ projectTitle: e.target.value })}
                  />
                </div>
                <div className="space-y-2 sm:col-span-2">
                  <Label>Description</Label>
                  <Textarea
                    value={draft.projectDescription}
                    onChange={(e) => patchDraft({ projectDescription: e.target.value })}
                    rows={3}
                  />
                </div>
              </div>
            </CardContent>
          </Card>

          <Card>
            <CardHeader>
              <CardTitle className="text-base">TSK Digital (émetteur)</CardTitle>
            </CardHeader>
            <CardContent className="grid gap-3 sm:grid-cols-2">
              {(
                [
                  ["company", "Raison sociale"],
                  ["email", "E-mail"],
                  ["phone", "Téléphone"],
                  ["siret", "SIRET"],
                  ["vat", "TVA"],
                  ["iban", "IBAN"],
                  ["bic", "BIC"],
                ] as const
              ).map(([key, label]) => (
                <div key={key} className="space-y-2">
                  <Label>{label}</Label>
                  <Input
                    value={draft.issuer[key]}
                    onChange={(e) => patchIssuer(key, e.target.value)}
                  />
                </div>
              ))}
              <div className="space-y-2 sm:col-span-2">
                <Label>Adresse ligne 1</Label>
                <Input
                  value={draft.issuer.addressLine1}
                  onChange={(e) => patchIssuer("addressLine1", e.target.value)}
                />
              </div>
              <div className="space-y-2 sm:col-span-2">
                <Label>Adresse ligne 2</Label>
                <Input
                  value={draft.issuer.addressLine2}
                  onChange={(e) => patchIssuer("addressLine2", e.target.value)}
                />
              </div>
            </CardContent>
          </Card>

          <Card>
            <CardHeader>
              <CardTitle className="text-base">Client</CardTitle>
            </CardHeader>
            <CardContent className="grid gap-3 sm:grid-cols-2">
              <div className="space-y-2">
                <Label>Société</Label>
                <Input
                  value={draft.client.company}
                  onChange={(e) => patchClient("company", e.target.value)}
                />
              </div>
              <div className="space-y-2">
                <Label>Contact</Label>
                <Input
                  value={draft.client.contactName}
                  onChange={(e) => patchClient("contactName", e.target.value)}
                />
              </div>
              <div className="space-y-2 sm:col-span-2">
                <Label>E-mail</Label>
                <Input
                  value={draft.client.email}
                  onChange={(e) => patchClient("email", e.target.value)}
                />
              </div>
              <div className="space-y-2 sm:col-span-2">
                <Label>Adresse</Label>
                <Input
                  value={draft.client.addressLine1}
                  onChange={(e) => patchClient("addressLine1", e.target.value)}
                />
              </div>
              <div className="space-y-2 sm:col-span-2">
                <Label>Ville</Label>
                <Input
                  value={draft.client.addressLine2}
                  onChange={(e) => patchClient("addressLine2", e.target.value)}
                />
              </div>
            </CardContent>
          </Card>

          {draft.kind !== "validation_fin" && (
            <Card>
              <CardHeader>
                <CardTitle className="text-base">Prestations & montants</CardTitle>
                <CardDescription>
                  Total TTC indicatif : {formatMoney(totals.ttc)}
                </CardDescription>
              </CardHeader>
              <CardContent className="space-y-4">
                <LineItemsEditor
                  items={draft.lineItems}
                  onChange={(lineItems) => patchDraft({ lineItems })}
                />
                <div className="grid gap-3 sm:grid-cols-3">
                  <div className="space-y-2">
                    <Label>TVA (%)</Label>
                    <Input
                      type="number"
                      value={draft.vatRate}
                      onChange={(e) =>
                        patchDraft({ vatRate: Number(e.target.value) || 0 })
                      }
                    />
                  </div>
                  <div className="space-y-2">
                    <Label>Acompte (%)</Label>
                    <Input
                      type="number"
                      value={draft.depositPercent}
                      onChange={(e) =>
                        patchDraft({ depositPercent: Number(e.target.value) || 0 })
                      }
                    />
                  </div>
                  <div className="space-y-2">
                    <Label>Délai paiement (j)</Label>
                    <Input
                      type="number"
                      value={draft.paymentTermsDays}
                      onChange={(e) =>
                        patchDraft({
                          paymentTermsDays: Number(e.target.value) || 0,
                        })
                      }
                    />
                  </div>
                </div>
              </CardContent>
            </Card>
          )}

          {draft.kind === "contrat" && (
            <Card>
              <CardHeader>
                <CardTitle className="text-base">Clauses contrat</CardTitle>
              </CardHeader>
              <CardContent className="space-y-3">
                <div className="space-y-2">
                  <Label>Périmètre</Label>
                  <Textarea
                    value={draft.contractScope}
                    onChange={(e) => patchDraft({ contractScope: e.target.value })}
                    rows={4}
                  />
                </div>
                <div className="space-y-2">
                  <Label>Durée</Label>
                  <Textarea
                    value={draft.contractDuration}
                    onChange={(e) => patchDraft({ contractDuration: e.target.value })}
                    rows={2}
                  />
                </div>
              </CardContent>
            </Card>
          )}

          {draft.kind === "validation_fin" && (
            <Card>
              <CardHeader>
                <CardTitle className="text-base">Checklist de validation</CardTitle>
              </CardHeader>
              <CardContent>
                <Textarea
                  value={draft.validationChecklist}
                  onChange={(e) => patchDraft({ validationChecklist: e.target.value })}
                  rows={6}
                />
              </CardContent>
            </Card>
          )}

          <Card>
            <CardHeader>
              <CardTitle className="text-base">Notes</CardTitle>
            </CardHeader>
            <CardContent>
              <Textarea
                value={draft.notes}
                onChange={(e) => patchDraft({ notes: e.target.value })}
                rows={3}
                placeholder="Mentions complémentaires sur le PDF…"
              />
            </CardContent>
          </Card>
        </div>

        <div className="space-y-4 lg:sticky lg:top-24 lg:self-start">
          <p className="text-xs font-medium uppercase tracking-wider text-[#A7A7A7]">
            Aperçu
          </p>
          <DocumentPreview draft={draft} />
          <p className="text-xs text-muted-foreground">
            Les PDF exportés n&apos;affichent que la marque {TSK_BRAND.name} et le logo
            officiel (aucune mention LuxeFlexIA).
          </p>
        </div>
      </div>
    </div>
  );
}
