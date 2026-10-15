import { useCallback, useEffect, useMemo, useRef, useState } from "react";
import { Copy, Loader2, Pause, Play, RefreshCw } from "lucide-react";
import { authFetch } from "@/lib/api";
import { Card, CardContent, CardDescription, CardHeader, CardTitle } from "@/components/ui/card";
import { Badge } from "@/components/ui/badge";
import { Button } from "@/components/ui/button";
import { useToast } from "@/hooks/use-toast";

type AdminVoiceEntry = {
  id: string;
  name: string;
  gender: "homme" | "femme";
  ageBand: string;
  styleFr: string;
  fishId: string;
  fishTitle: string | null;
  previewPath: string | null;
  commercialUseOk: boolean;
  curationStatus: string;
  active: boolean;
  ttsSpeed?: number;
};

type Payload = {
  version: number;
  testPhrase: string;
  entries: AdminVoiceEntry[];
  stats: {
    total: number;
    activeCount: number;
    targetActive: number;
    candidateCount: number;
    distinctFishIds: number;
    hommes: number;
    femmes: number;
    matureHommes: number;
    matureFemmes: number;
  };
};

type FilterKey = "all" | "homme" | "femme" | "active" | "candidate";

function previewSrc(entry: AdminVoiceEntry, version: number) {
  if (!entry.previewPath) return null;
  const sep = entry.previewPath.includes("?") ? "&" : "?";
  return `${entry.previewPath}${sep}v=${version}`;
}

export function AdminI2VVoiceLibraryPanel() {
  const { toast } = useToast();
  const [data, setData] = useState<Payload | null>(null);
  const [loading, setLoading] = useState(true);
  const [filter, setFilter] = useState<FilterKey>("all");
  const [playingId, setPlayingId] = useState<string | null>(null);
  const audioRef = useRef<HTMLAudioElement | null>(null);

  const load = useCallback(async () => {
    setLoading(true);
    try {
      const res = await authFetch("/api/admin/i2v-voice-library");
      if (res.ok) {
        setData((await res.json()) as Payload);
      } else {
        toast({
          variant: "destructive",
          title: "Bibliothèque I2V",
          description: "Impossible de charger la liste admin.",
        });
      }
    } finally {
      setLoading(false);
    }
  }, [toast]);

  useEffect(() => {
    void load();
  }, [load]);

  const filtered = useMemo(() => {
    const list = data?.entries ?? [];
    switch (filter) {
      case "homme":
        return list.filter((e) => e.gender === "homme");
      case "femme":
        return list.filter((e) => e.gender === "femme");
      case "active":
        return list.filter((e) => e.active);
      case "candidate":
        return list.filter((e) => e.curationStatus === "candidate");
      default:
        return list;
    }
  }, [data?.entries, filter]);

  const stop = useCallback(() => {
    const el = audioRef.current;
    if (el) {
      el.pause();
      el.removeAttribute("src");
    }
    setPlayingId(null);
  }, []);

  const play = async (entry: AdminVoiceEntry) => {
    if (playingId === entry.id) {
      stop();
      return;
    }
    stop();
    const el = audioRef.current ?? new Audio();
    audioRef.current = el;
    el.onended = () => setPlayingId(null);
    setPlayingId(entry.id);

    const version = data?.version ?? 1;
    const local = previewSrc(entry, version);
    if (local) {
      el.src = local;
      try {
        await el.play();
        return;
      } catch {
        /* repli API */
      }
    }

    const res = await authFetch(
      `/api/larps/i2v-voice/preview?id=${encodeURIComponent(entry.id)}`,
    );
    if (!res.ok) {
      setPlayingId(null);
      toast({
        variant: "destructive",
        title: "Aperçu",
        description: "Synthèse indisponible pour cette voix.",
      });
      return;
    }
    const json = (await res.json()) as { audioUrl?: string };
    if (!json.audioUrl) {
      setPlayingId(null);
      return;
    }
    el.src = json.audioUrl;
    try {
      await el.play();
    } catch {
      setPlayingId(null);
    }
  };

  const copyFishId = async (entry: AdminVoiceEntry) => {
    try {
      await navigator.clipboard.writeText(entry.fishId);
      toast({ title: "Copié", description: entry.fishId });
    } catch {
      toast({ variant: "destructive", title: "Copie impossible" });
    }
  };

  const renderRow = (entry: AdminVoiceEntry) => {
    const isMature = entry.ageBand === "35-50";
    return (
      <li
        key={entry.id}
        className={`flex flex-wrap items-center gap-2 rounded-lg border px-3 py-2.5 text-sm ${
          entry.active ? "border-primary/25 bg-primary/[0.03]" : "bg-muted/20"
        }`}
      >
        <button
          type="button"
          className="inline-flex h-10 w-10 shrink-0 items-center justify-center rounded-full border bg-background shadow-sm transition hover:bg-muted/50"
          aria-label={`Écouter ${entry.name}`}
          onClick={() => void play(entry)}
        >
          {playingId === entry.id ? (
            <Pause className="h-4 w-4" />
          ) : (
            <Play className="h-4 w-4 pl-0.5" />
          )}
        </button>
        <div className="min-w-0 flex-1 basis-[12rem]">
          <p className="font-medium leading-snug">
            {entry.name}
            <span className="font-normal text-muted-foreground"> · {entry.styleFr}</span>
          </p>
          <p className="mt-0.5 text-xs text-muted-foreground">
            Fish : {entry.fishTitle || "—"}
          </p>
          <p className="truncate font-mono text-[10px] text-muted-foreground/80">
            {entry.fishId}
          </p>
        </div>
        <div className="flex flex-wrap items-center gap-1.5">
          <Badge variant="outline">{entry.gender === "homme" ? "H" : "F"}</Badge>
          {isMature ? (
            <Badge variant="secondary" className="text-[10px]">
              35–50 ans
            </Badge>
          ) : (
            <Badge variant="outline" className="text-[10px]">
              18–34 ans
            </Badge>
          )}
          <Badge variant={entry.active ? "default" : "secondary"}>
            {entry.active ? "active" : "inactive"}
          </Badge>
          <Badge
            variant="outline"
            className={
              entry.curationStatus === "final"
                ? "border-emerald-500/40 text-emerald-800 dark:text-emerald-300"
                : ""
            }
          >
            {entry.curationStatus}
          </Badge>
          {entry.commercialUseOk ? (
            <Badge variant="outline" className="text-[10px] text-emerald-700">
              commercial OK
            </Badge>
          ) : null}
          <Button
            type="button"
            variant="ghost"
            size="icon"
            className="h-8 w-8"
            title="Copier fishId"
            onClick={() => void copyFishId(entry)}
          >
            <Copy className="h-3.5 w-3.5" />
          </Button>
        </div>
      </li>
    );
  };

  const stats = data?.stats;

  return (
    <Card>
      <CardHeader className="flex flex-row flex-wrap items-start justify-between gap-3 space-y-0">
        <div>
          <CardTitle>Bibliothèque voix Image → Vidéo</CardTitle>
          <CardDescription className="mt-1 max-w-2xl">
            20 voix Fish distinctes · phrase test identique · valide les{" "}
            <strong>12 finales</strong> à l&apos;oreille (▶), puis ajuste{" "}
            <code className="text-xs">active</code> dans le JSON si besoin.
          </CardDescription>
        </div>
        <Button type="button" variant="outline" size="sm" disabled={loading} onClick={() => void load()}>
          <RefreshCw className={`mr-1.5 h-3.5 w-3.5 ${loading ? "animate-spin" : ""}`} />
          Actualiser
        </Button>
      </CardHeader>
      <CardContent className="space-y-4">
        <audio ref={audioRef} className="hidden" preload="none" />

        {loading && !data ? (
          <p className="text-sm text-muted-foreground">
            <Loader2 className="mr-1 inline h-4 w-4 animate-spin" />
            Chargement…
          </p>
        ) : null}

        {stats ? (
          <div className="grid gap-2 sm:grid-cols-2 lg:grid-cols-4">
            <div className="rounded-lg border bg-muted/30 px-3 py-2 text-sm">
              <p className="text-xs text-muted-foreground">Actives / cible</p>
              <p className="text-lg font-semibold tabular-nums">
                {stats.activeCount}
                <span className="text-muted-foreground"> / {stats.targetActive}</span>
              </p>
            </div>
            <div className="rounded-lg border bg-muted/30 px-3 py-2 text-sm">
              <p className="text-xs text-muted-foreground">Fish IDs distincts</p>
              <p className="text-lg font-semibold tabular-nums">
                {stats.distinctFishIds}
                <span className="text-muted-foreground"> / {stats.total}</span>
              </p>
            </div>
            <div className="rounded-lg border bg-muted/30 px-3 py-2 text-sm">
              <p className="text-xs text-muted-foreground">Hommes (matures)</p>
              <p className="text-lg font-semibold tabular-nums">
                {stats.hommes}
                <span className="text-muted-foreground"> ({stats.matureHommes} matures)</span>
              </p>
            </div>
            <div className="rounded-lg border bg-muted/30 px-3 py-2 text-sm">
              <p className="text-xs text-muted-foreground">Femmes (matures)</p>
              <p className="text-lg font-semibold tabular-nums">
                {stats.femmes}
                <span className="text-muted-foreground"> ({stats.matureFemmes} matures)</span>
              </p>
            </div>
          </div>
        ) : null}

        {data?.testPhrase ? (
          <div className="rounded-lg border border-dashed bg-muted/20 px-3 py-2.5">
            <p className="text-[10px] font-semibold uppercase tracking-wide text-muted-foreground">
              Phrase test (tous les MP3)
            </p>
            <p className="mt-1 text-sm italic leading-relaxed">« {data.testPhrase} »</p>
          </div>
        ) : null}

        <div className="flex flex-wrap gap-1.5" role="group" aria-label="Filtres">
          {(
            [
              ["all", "Toutes (20)"],
              ["homme", "Hommes"],
              ["femme", "Femmes"],
              ["active", "Actives"],
              ["candidate", "Candidates"],
            ] as const
          ).map(([key, label]) => (
            <button
              key={key}
              type="button"
              className={`rounded-full border px-3 py-1 text-xs font-semibold transition ${
                filter === key
                  ? "border-primary bg-primary/10 text-primary"
                  : "bg-background hover:bg-muted/50"
              }`}
              onClick={() => setFilter(key)}
            >
              {label}
            </button>
          ))}
        </div>

        <ul className="space-y-2">{filtered.map(renderRow)}</ul>

        {stats && stats.activeCount !== stats.targetActive ? (
          <p className="rounded-md border border-amber-500/30 bg-amber-500/10 px-3 py-2 text-xs text-amber-950 dark:text-amber-100">
            Objectif curation : <strong>{stats.targetActive} voix actives</strong> (6 hommes + 6
            femmes recommandé). Aujourd&apos;hui : {stats.activeCount} active
            {stats.activeCount > 1 ? "s" : ""}, {stats.candidateCount} candidate
            {stats.candidateCount > 1 ? "s" : ""} en réserve.
          </p>
        ) : null}

        <p className="text-xs leading-relaxed text-muted-foreground">
          MP3 locaux :{" "}
          <code className="text-[11px]">client/public/assets/i2v-voice-library/</code> · Regénérer :{" "}
          <code className="text-[11px]">node script/generate-i2v-voice-library-samples.mjs --all</code>{" "}
          · Source :{" "}
          <code className="text-[11px]">shared/i2v-voice-library.json</code>
          {data?.version != null ? ` (v${data.version})` : null}
        </p>
      </CardContent>
    </Card>
  );
}
