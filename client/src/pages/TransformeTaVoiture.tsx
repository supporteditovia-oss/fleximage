import { useCallback, useEffect, useRef, useState } from "react";
import { Loader2, Upload, Download, Car } from "lucide-react";
import { Button } from "@/components/ui/button";
import { Card, CardContent, CardHeader, CardTitle } from "@/components/ui/card";
import { Label } from "@/components/ui/label";
import {
  Select,
  SelectContent,
  SelectItem,
  SelectTrigger,
  SelectValue,
} from "@/components/ui/select";
import { Progress } from "@/components/ui/progress";
import { useToast } from "@/hooks/use-toast";
import { readVideoDurationSec, formatVideoDurationLabel } from "@/lib/video-duration";
import {
  CAR_VIDEO_INTERIOR_STYLES,
  CAR_VIDEO_VEHICLES,
  estimateCarVideoCredits,
  fetchCarVideoGeneration,
  startCarVideoGeneration,
  uploadCarVideoSource,
  validateCarVideoDuration,
  validateCarVideoFile,
  type CarVideoGenerationStatus,
  type CarVideoInteriorStyle,
  type CarVideoPlanType,
  type CarVideoVehicleId,
} from "@/lib/car-video-transform";
import "./transforme-ta-voiture.css";

export default function TransformeTaVoiture() {
  const { toast } = useToast();
  const fileRef = useRef<HTMLInputElement>(null);

  const [previewUrl, setPreviewUrl] = useState<string | null>(null);
  const [durationSec, setDurationSec] = useState<number | null>(null);
  const [uploadedVideoUrl, setUploadedVideoUrl] = useState<string | null>(null);
  const [planType, setPlanType] = useState<CarVideoPlanType>("exterior");
  const [vehicle, setVehicle] = useState<CarVideoVehicleId>("luxury_black_suv");
  const [interiorStyle, setInteriorStyle] =
    useState<CarVideoInteriorStyle>("black_leather");
  const [busy, setBusy] = useState(false);
  const [generationId, setGenerationId] = useState<string | null>(null);
  const [status, setStatus] = useState<CarVideoGenerationStatus | null>(null);
  const [statusLabel, setStatusLabel] = useState<string | null>(null);
  const [outputUrl, setOutputUrl] = useState<string | null>(null);
  const [progress, setProgress] = useState<number | null>(null);

  const onPickFile = async (file: File) => {
    const fileCheck = validateCarVideoFile(file);
    if (!fileCheck.ok) {
      toast({ variant: "destructive", title: "Fichier refusé", description: fileCheck.message });
      return;
    }
    let dur: number;
    try {
      dur = await readVideoDurationSec(file);
    } catch {
      toast({
        variant: "destructive",
        title: "Vidéo illisible",
        description: "Impossible de lire la durée de la vidéo.",
      });
      return;
    }
    const durCheck = validateCarVideoDuration(dur);
    if (!durCheck.ok) {
      toast({ variant: "destructive", title: "Durée invalide", description: durCheck.message });
      return;
    }

    if (previewUrl) URL.revokeObjectURL(previewUrl);
    setPreviewUrl(URL.createObjectURL(file));
    setDurationSec(dur);
    setUploadedVideoUrl(null);
    setGenerationId(null);
    setStatus(null);
    setOutputUrl(null);
  };

  const handleUploadAndPrepare = async () => {
    const file = fileRef.current?.files?.[0];
    if (!file || durationSec == null) return;
    setBusy(true);
    try {
      const url = await uploadCarVideoSource(file);
      setUploadedVideoUrl(url);
      toast({ title: "Vidéo ajoutée", description: "Tu peux lancer la transformation." });
    } catch (err) {
      toast({
        variant: "destructive",
        title: "Upload échoué",
        description: err instanceof Error ? err.message : "Erreur upload",
      });
    } finally {
      setBusy(false);
    }
  };

  const handleGenerate = async () => {
    if (!uploadedVideoUrl || durationSec == null || busy) return;
    setBusy(true);
    setOutputUrl(null);
    const idempotencyKey = crypto.randomUUID();
    try {
      const result = await startCarVideoGeneration({
        inputVideoUrl: uploadedVideoUrl,
        durationSeconds: durationSec,
        planType,
        selectedVehicle: vehicle,
        selectedInteriorStyle: planType === "interior" ? interiorStyle : undefined,
        idempotencyKey,
      });
      setGenerationId(result.generationId);
      setStatus(result.status);
      setStatusLabel(result.statusLabel);
    } catch (err) {
      toast({
        variant: "destructive",
        title: "Génération refusée",
        description: err instanceof Error ? err.message : "Erreur",
      });
    } finally {
      setBusy(false);
    }
  };

  const poll = useCallback(async () => {
    if (!generationId) return;
    try {
      const data = await fetchCarVideoGeneration(generationId);
      setStatus(data.status);
      setStatusLabel(data.statusLabel);
      setProgress(data.progress ?? null);
      if (data.outputVideoUrl) setOutputUrl(data.outputVideoUrl);
      if (data.status === "failed" && data.errorMessage) {
        toast({ variant: "destructive", title: "Échec", description: data.errorMessage });
      }
    } catch {
      /* ignore transient poll errors */
    }
  }, [generationId, toast]);

  useEffect(() => {
    if (!generationId) return;
    if (status === "completed" || status === "failed") return;
    const timer = window.setInterval(() => void poll(), 5000);
    void poll();
    return () => window.clearInterval(timer);
  }, [generationId, status, poll]);

  const credits =
    durationSec != null ? estimateCarVideoCredits(durationSec) : null;

  return (
    <div className="car-transform-page mx-auto max-w-3xl px-4 py-8">
      <header className="mb-8 space-y-2">
        <div className="flex items-center gap-2 text-primary">
          <Car className="h-7 w-7" />
          <h1 className="text-2xl font-semibold tracking-tight">
            Transforme ta voiture par IA
          </h1>
        </div>
        <p className="text-muted-foreground text-sm">
          Vidéo → vidéo · 2–8 s · 720p · une génération par commande · PoYo Wan 2.7 Edit
        </p>
      </header>

      <Card className="mb-6">
        <CardHeader>
          <CardTitle className="text-lg">1. Ta vidéo</CardTitle>
        </CardHeader>
        <CardContent className="space-y-4">
          <input
            ref={fileRef}
            type="file"
            accept="video/mp4,video/quicktime,video/webm,.mp4,.mov,.webm"
            className="hidden"
            onChange={(e) => {
              const f = e.target.files?.[0];
              if (f) void onPickFile(f);
            }}
          />
          <Button
            type="button"
            variant="outline"
            onClick={() => fileRef.current?.click()}
            disabled={busy}
          >
            <Upload className="mr-2 h-4 w-4" />
            Choisir MP4, MOV ou WebM
          </Button>
          {previewUrl && (
            <video
              src={previewUrl}
              controls
              playsInline
              className="w-full rounded-lg border bg-black/5"
            />
          )}
          {durationSec != null && (
            <p className="text-sm text-muted-foreground">
              Durée détectée : {formatVideoDurationLabel(durationSec)} s · Résolution sortie :{" "}
              <strong>720p</strong>
            </p>
          )}
          {previewUrl && !uploadedVideoUrl && (
            <Button type="button" onClick={() => void handleUploadAndPrepare()} disabled={busy}>
              {busy ? <Loader2 className="mr-2 h-4 w-4 animate-spin" /> : null}
              Valider et envoyer la vidéo
            </Button>
          )}
          {uploadedVideoUrl && (
            <p className="text-sm text-emerald-600 dark:text-emerald-400">Vidéo ajoutée</p>
          )}
        </CardContent>
      </Card>

      <Card className="mb-6">
        <CardHeader>
          <CardTitle className="text-lg">2. Transformation</CardTitle>
        </CardHeader>
        <CardContent className="grid gap-4 sm:grid-cols-2">
          <div className="space-y-2">
            <Label>Type de plan</Label>
            <Select
              value={planType}
              onValueChange={(v) => setPlanType(v as CarVideoPlanType)}
            >
              <SelectTrigger>
                <SelectValue />
              </SelectTrigger>
              <SelectContent>
                <SelectItem value="exterior">Extérieur</SelectItem>
                <SelectItem value="interior">Intérieur</SelectItem>
              </SelectContent>
            </Select>
          </div>
          <div className="space-y-2">
            <Label>Véhicule virtuel</Label>
            <Select
              value={vehicle}
              onValueChange={(v) => setVehicle(v as CarVideoVehicleId)}
            >
              <SelectTrigger>
                <SelectValue />
              </SelectTrigger>
              <SelectContent>
                {CAR_VIDEO_VEHICLES.map((v) => (
                  <SelectItem key={v.id} value={v.id}>
                    {v.label}
                  </SelectItem>
                ))}
              </SelectContent>
            </Select>
          </div>
          {planType === "interior" && (
            <div className="space-y-2 sm:col-span-2">
              <Label>Style intérieur</Label>
              <Select
                value={interiorStyle}
                onValueChange={(v) => setInteriorStyle(v as CarVideoInteriorStyle)}
              >
                <SelectTrigger>
                  <SelectValue />
                </SelectTrigger>
                <SelectContent>
                  {CAR_VIDEO_INTERIOR_STYLES.map((s) => (
                    <SelectItem key={s.id} value={s.id}>
                      {s.label}
                    </SelectItem>
                  ))}
                </SelectContent>
              </Select>
            </div>
          )}
        </CardContent>
      </Card>

      <Card className="mb-6">
        <CardHeader>
          <CardTitle className="text-lg">3. Génération</CardTitle>
        </CardHeader>
        <CardContent className="space-y-4">
          {credits != null && (
            <p className="text-sm">
              Estimation : <strong>{credits} jetons</strong> (12 / seconde, max 96 pour 8 s)
            </p>
          )}
          <Button
            type="button"
            size="lg"
            disabled={!uploadedVideoUrl || busy || Boolean(generationId && status === "processing")}
            onClick={() => void handleGenerate()}
          >
            {busy ? <Loader2 className="mr-2 h-4 w-4 animate-spin" /> : null}
            Confirmer la transformation
          </Button>
          {statusLabel && (
            <div className="space-y-2 rounded-lg border p-4">
              <p className="text-sm font-medium">{statusLabel}</p>
              {progress != null && status === "processing" && (
                <Progress value={Math.min(100, progress)} />
              )}
            </div>
          )}
          {outputUrl && status === "completed" && (
            <div className="space-y-3">
              <video src={outputUrl} controls playsInline className="w-full rounded-lg border" />
              <Button asChild variant="secondary">
                <a href={outputUrl} download target="_blank" rel="noreferrer">
                  <Download className="mr-2 h-4 w-4" />
                  Télécharger
                </a>
              </Button>
            </div>
          )}
        </CardContent>
      </Card>
    </div>
  );
}
