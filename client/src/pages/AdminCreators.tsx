import { useEffect, useState } from "react";
import { useMutation, useQuery, useQueryClient } from "@tanstack/react-query";
import { useLocation } from "wouter";
import { Copy, Link2, Plus } from "lucide-react";
import { useAuth } from "@/hooks/use-auth";
import { authFetch } from "@/lib/api";
import { Button } from "@/components/ui/button";
import { Input } from "@/components/ui/input";
import { Skeleton } from "@/components/ui/skeleton";
import { Card, CardContent, CardDescription, CardHeader, CardTitle } from "@/components/ui/card";

type CreatorRow = {
  code: string;
  name: string;
  active: boolean;
  createdAt: string;
  signups: number;
  payers: number;
  payments: number;
  revenueCents: number;
  lastSignupAt: string | null;
  rateCents: number;
  views: number;
  paidCents: number;
  earnedCents: number;
  owedCents: number;
};

/** Champ numérique modifiable : enregistre à la sortie du champ. */
function NumCell({
  value,
  onSave,
  suffix,
  width = "w-24",
}: {
  value: number;
  onSave: (n: number) => void;
  suffix?: string;
  width?: string;
}) {
  const [text, setText] = useState(String(value));
  useEffect(() => setText(String(value)), [value]);
  return (
    <span className="inline-flex items-center gap-1">
      <Input
        className={`h-8 ${width} text-right`}
        inputMode="decimal"
        value={text}
        onChange={(e) => setText(e.target.value.replace(",", "."))}
        onBlur={() => {
          const n = Number(text);
          if (Number.isFinite(n) && n >= 0 && n !== value) onSave(n);
          else setText(String(value));
        }}
      />
      {suffix ? <span className="text-xs text-muted-foreground">{suffix}</span> : null}
    </span>
  );
}

function euro(cents: number): string {
  return (cents / 100).toLocaleString("fr-FR", { style: "currency", currency: "EUR" });
}

function creatorLink(code: string): string {
  return `${window.location.origin}/c/${code}`;
}

async function api<T>(method: string, body?: unknown): Promise<T> {
  const res = await authFetch("/api/admin/creators", {
    method,
    headers: { "Content-Type": "application/json" },
    body: body ? JSON.stringify(body) : undefined,
  });
  const data = await res.json().catch(() => ({}));
  if (!res.ok) throw new Error(data?.message || "Erreur");
  return data as T;
}

export default function AdminCreators() {
  const { isAdmin } = useAuth();
  const [, setLocation] = useLocation();
  const qc = useQueryClient();
  const [name, setName] = useState("");
  const [code, setCode] = useState("");
  const [copied, setCopied] = useState<string | null>(null);

  const list = useQuery({
    queryKey: ["admin-creators"],
    queryFn: () => api<{ creators: CreatorRow[] }>("GET"),
    enabled: isAdmin,
    refetchInterval: 30_000,
  });

  const create = useMutation({
    mutationFn: () => api("POST", { name, code: code || undefined }),
    onSuccess: () => {
      setName("");
      setCode("");
      qc.invalidateQueries({ queryKey: ["admin-creators"] });
    },
  });

  const toggle = useMutation({
    mutationFn: (v: { code: string } & Record<string, unknown>) => api("PATCH", v),
    onSuccess: () => qc.invalidateQueries({ queryKey: ["admin-creators"] }),
  });

  const [assignEmail, setAssignEmail] = useState("");
  const [assignCode, setAssignCode] = useState("");
  const assign = useMutation({
    mutationFn: () => api("POST", { action: "assign", email: assignEmail, code: assignCode }),
    onSuccess: () => {
      setAssignEmail("");
      qc.invalidateQueries({ queryKey: ["admin-creators"] });
    },
  });

  if (!isAdmin) {
    return (
      <div className="flex min-h-[50vh] flex-col items-center justify-center gap-4 text-center">
        <h1 className="text-2xl font-semibold">Accès refusé</h1>
        <p className="text-muted-foreground">Réservé aux administrateurs.</p>
        <Button onClick={() => setLocation("/generate")}>Retour</Button>
      </div>
    );
  }

  const copy = async (key: string, text: string) => {
    try {
      await navigator.clipboard.writeText(text);
      setCopied(key);
      window.setTimeout(() => setCopied(null), 1800);
    } catch {
      /* ignore */
    }
  };

  const rows = list.data?.creators ?? [];
  const totals = rows.reduce(
    (a, r) => ({
      signups: a.signups + r.signups,
      payers: a.payers + r.payers,
      revenue: a.revenue + r.revenueCents,
      owed: a.owed + r.owedCents,
    }),
    { signups: 0, payers: 0, revenue: 0, owed: 0 },
  );

  return (
    <div className="mx-auto w-full max-w-5xl space-y-6 px-4 py-8">
      <div>
        <h1 className="flex items-center gap-2 text-2xl font-semibold">
          <Link2 className="h-6 w-6" /> Créateurs & liens
        </h1>
        <p className="text-sm text-muted-foreground">
          Un lien par créateur. Tu vois ici, toi seul, combien de personnes il t'a amenées et combien ont payé.
        </p>
      </div>

      <div className="grid gap-3 sm:grid-cols-2 lg:grid-cols-4">
        {[
          ["Inscrits via liens", String(totals.signups)],
          ["Clients payants", String(totals.payers)],
          ["Revenu généré", euro(totals.revenue)],
          ["Reste à payer aux créateurs", euro(totals.owed)],
        ].map(([label, value]) => (
          <Card key={label}>
            <CardHeader className="pb-2">
              <CardDescription>{label}</CardDescription>
              <CardTitle className="text-2xl">{value}</CardTitle>
            </CardHeader>
          </Card>
        ))}
      </div>

      <Card>
        <CardHeader>
          <CardTitle className="text-lg">Créer un lien</CardTitle>
          <CardDescription>Donne un nom au créateur ; le code est généré (ou choisis le tien).</CardDescription>
        </CardHeader>
        <CardContent>
          <form
            className="flex flex-col gap-2 sm:flex-row"
            onSubmit={(e) => {
              e.preventDefault();
              if (name.trim()) create.mutate();
            }}
          >
            <Input
              placeholder="Nom du créateur (ex. Karim TikTok)"
              value={name}
              onChange={(e) => setName(e.target.value)}
              maxLength={60}
            />
            <Input
              placeholder="Code (optionnel)"
              value={code}
              onChange={(e) => setCode(e.target.value)}
              maxLength={24}
              className="sm:w-48"
            />
            <Button type="submit" disabled={!name.trim() || create.isPending}>
              <Plus className="mr-1 h-4 w-4" /> Créer
            </Button>
          </form>
          {create.error ? (
            <p className="mt-2 text-sm text-destructive">{(create.error as Error).message}</p>
          ) : null}
        </CardContent>
      </Card>

      <Card>
        <CardHeader>
          <CardTitle className="text-lg">Rattacher un client à un créateur</CardTitle>
          <CardDescription>
            Pour un créateur sans lien : mets l'e-mail du client et choisis le créateur. Ses futurs paiements lui seront comptés.
          </CardDescription>
        </CardHeader>
        <CardContent>
          <form
            className="flex flex-col gap-2 sm:flex-row"
            onSubmit={(e) => {
              e.preventDefault();
              if (assignEmail.trim() && assignCode) assign.mutate();
            }}
          >
            <Input
              type="email"
              placeholder="E-mail du client"
              value={assignEmail}
              onChange={(e) => setAssignEmail(e.target.value)}
            />
            <select
              className="h-10 rounded-md border bg-background px-3 text-sm"
              value={assignCode}
              onChange={(e) => setAssignCode(e.target.value)}
            >
              <option value="">Créateur…</option>
              {rows.map((r) => (
                <option key={r.code} value={r.code}>
                  {r.name}
                </option>
              ))}
            </select>
            <Button type="submit" disabled={!assignEmail.trim() || !assignCode || assign.isPending}>
              Rattacher
            </Button>
          </form>
          {assign.isSuccess ? <p className="mt-2 text-sm text-green-600">Client rattaché.</p> : null}
          {assign.error ? (
            <p className="mt-2 text-sm text-destructive">{(assign.error as Error).message}</p>
          ) : null}
        </CardContent>
      </Card>

      <Card>
        <CardHeader>
          <CardTitle className="text-lg">Résultats par créateur</CardTitle>
          <CardDescription>
            Modifie le tarif, les vues et le montant déjà payé directement dans le tableau (il s'enregistre en sortant du champ).
          </CardDescription>
        </CardHeader>
        <CardContent className="overflow-x-auto">
          {list.isLoading ? (
            <Skeleton className="h-24 w-full" />
          ) : list.error ? (
            <p className="text-sm text-destructive">{(list.error as Error).message}</p>
          ) : rows.length === 0 ? (
            <p className="text-sm text-muted-foreground">Aucun lien pour l'instant. Crée le premier ci-dessus.</p>
          ) : (
            <table className="w-full min-w-[980px] text-sm">
              <thead>
                <tr className="border-b text-left text-muted-foreground">
                  <th className="py-2 pr-3">Créateur</th>
                  <th className="py-2 pr-3">Lien</th>
                  <th className="py-2 pr-3 text-right">Inscrits</th>
                  <th className="py-2 pr-3 text-right">Payants</th>
                  <th className="py-2 pr-3 text-right">Revenu</th>
                  <th className="py-2 pr-3 text-right">Conv.</th>
                  <th className="py-2 pr-3 text-right">€ / 1 000 vues</th>
                  <th className="py-2 pr-3 text-right">Vues</th>
                  <th className="py-2 pr-3 text-right">Déjà payé (€)</th>
                  <th className="py-2 pr-3 text-right">Reste à payer</th>
                  <th className="py-2 text-right">Actif</th>
                </tr>
              </thead>
              <tbody>
                {rows.map((r) => (
                  <tr key={r.code} className="border-b last:border-0">
                    <td className="py-2 pr-3 font-medium">{r.name}</td>
                    <td className="py-2 pr-3">
                      <Button
                        size="sm"
                        variant="outline"
                        onClick={() => copy(r.code, creatorLink(r.code))}
                      >
                        <Copy className="mr-1 h-3.5 w-3.5" />
                        {copied === r.code ? "Copié !" : `/c/${r.code}`}
                      </Button>
                    </td>
                    <td className="py-2 pr-3 text-right">{r.signups}</td>
                    <td className="py-2 pr-3 text-right">{r.payers}</td>
                    <td className="py-2 pr-3 text-right">{euro(r.revenueCents)}</td>
                    <td className="py-2 pr-3 text-right">
                      {r.signups ? `${Math.round((r.payers / r.signups) * 100)}%` : "—"}
                    </td>
                    <td className="py-2 pr-3 text-right">
                      <NumCell
                        width="w-20"
                        value={r.rateCents / 100}
                        onSave={(n) => toggle.mutate({ code: r.code, rateCents: Math.round(n * 100) })}
                      />
                    </td>
                    <td className="py-2 pr-3 text-right">
                      <NumCell
                        width="w-28"
                        value={r.views}
                        onSave={(n) => toggle.mutate({ code: r.code, views: Math.round(n) })}
                      />
                    </td>
                    <td className="py-2 pr-3 text-right">
                      <NumCell
                        width="w-20"
                        value={r.paidCents / 100}
                        onSave={(n) => toggle.mutate({ code: r.code, paidCents: Math.round(n * 100) })}
                      />
                    </td>
                    <td className="py-2 pr-3 text-right font-medium">{euro(r.owedCents)}</td>
                    <td className="py-2 text-right">
                      <Button
                        size="sm"
                        variant={r.active ? "secondary" : "outline"}
                        onClick={() => toggle.mutate({ code: r.code, active: !r.active })}
                      >
                        {r.active ? "Oui" : "Non"}
                      </Button>
                    </td>
                  </tr>
                ))}
              </tbody>
            </table>
          )}
        </CardContent>
      </Card>
    </div>
  );
}
