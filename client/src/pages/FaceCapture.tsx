import * as React from "react";
import { ArrowLeft, Camera, Check, Loader2, RefreshCw, ShieldCheck } from "lucide-react";
import { useLocation } from "wouter";
import { useTranslation } from "react-i18next";
import { Button } from "@/components/ui/button";
import { FaceCaptureView } from "@/components/FaceCaptureView";
import { useAuth } from "@/hooks/use-auth";
import { useStoreFaceCaptures } from "@/hooks/use-face-captures";
import type { CapturedPose, PoseId } from "@/lib/face-capture";

const REQUIRED_CAPTURE_POSES = ["frontal", "profile-right", "profile-left"] as const;

const POSE_LABELS: Record<(typeof REQUIRED_CAPTURE_POSES)[number], { en: string; fr: string }> = {
  frontal: { en: "Front face", fr: "Visage de face" },
  "profile-right": { en: "Right profile", fr: "Profil droit" },
  "profile-left": { en: "Left profile", fr: "Profil gauche" },
};

function copy(language: string | undefined, text: { en: string; fr: string }) {
  return language === "fr" ? text.fr : text.en;
}

function poseLabel(poseId: PoseId, language: string | undefined) {
  if (poseId === "frontal" || poseId === "profile-right" || poseId === "profile-left") {
    return copy(language, POSE_LABELS[poseId]);
  }
  return poseId;
}

export default function FaceCapture() {
  const [, navigate] = useLocation();
  const { i18n } = useTranslation();
  const { profile } = useAuth();
  const language = profile?.preferred_locale ?? i18n.resolvedLanguage ?? "en";
  const captureLanguage = language === "fr" ? "fr" : "en";
  const storeFaceCaptures = useStoreFaceCaptures();
  const [showCapture, setShowCapture] = React.useState(false);
  const [capturedPoses, setCapturedPoses] = React.useState<CapturedPose[]>([]);
  const [thumbnailUrls, setThumbnailUrls] = React.useState<string[]>([]);

  React.useEffect(() => {
    return () => {
      for (const url of thumbnailUrls) URL.revokeObjectURL(url);
    };
  }, [thumbnailUrls]);

  const resetCapture = React.useCallback(() => {
    for (const url of thumbnailUrls) URL.revokeObjectURL(url);
    setThumbnailUrls([]);
    setCapturedPoses([]);
    storeFaceCaptures.reset();
    setShowCapture(true);
  }, [storeFaceCaptures, thumbnailUrls]);

  const handleComplete = React.useCallback(
    async (poses: CapturedPose[]) => {
      setShowCapture(false);
      setCapturedPoses(poses);
      setThumbnailUrls((previousUrls) => {
        for (const url of previousUrls) URL.revokeObjectURL(url);
        return poses.map((pose) => URL.createObjectURL(pose.blob));
      });
      await storeFaceCaptures.mutateAsync(poses).catch(() => undefined);
    },
    [storeFaceCaptures],
  );

  const isSaving = storeFaceCaptures.isPending;
  const isSaved = Boolean(storeFaceCaptures.data);
  const hasError = storeFaceCaptures.isError;

  return (
    <main className="min-h-[100svh] bg-background px-4 py-6 text-foreground">
      {showCapture ? (
        <FaceCaptureView
          language={captureLanguage}
          posesToCapture={REQUIRED_CAPTURE_POSES}
          onCancel={() => setShowCapture(false)}
          onComplete={handleComplete}
        />
      ) : null}

      <div className="mx-auto flex min-h-[calc(100svh-3rem)] w-full max-w-3xl flex-col">
        <button
          type="button"
          onClick={() => navigate("/generate")}
          className="mb-8 inline-flex w-fit items-center gap-2 text-sm font-medium text-muted-foreground transition-colors hover:text-foreground"
        >
          <ArrowLeft className="h-4 w-4" />
          {copy(language, { en: "Back", fr: "Retour" })}
        </button>

        <section className="flex flex-1 flex-col items-center justify-center text-center">
          <div className="mb-6 flex h-14 w-14 items-center justify-center rounded-full border border-primary/20 bg-primary/10 text-primary">
            {isSaving ? (
              <Loader2 className="h-6 w-6 animate-spin" />
            ) : isSaved ? (
              <Check className="h-6 w-6" />
            ) : (
              <Camera className="h-6 w-6" />
            )}
          </div>

          <h1 className="font-display text-3xl font-bold tracking-tight md:text-5xl">
            {isSaved
              ? copy(language, { en: "Face capture saved", fr: "Capture visage sauvegard\u00e9e" })
              : copy(language, { en: "Face capture", fr: "Capture visage" })}
          </h1>

          <p className="mt-4 max-w-xl text-sm leading-6 text-muted-foreground md:text-base">
            {isSaving
              ? copy(language, {
                  en: "Saving your three captures securely.",
                  fr: "Sauvegarde s\u00e9curis\u00e9e de tes trois captures.",
                })
              : isSaved
                ? copy(language, {
                    en: "Your front, left profile, and right profile photos were stored privately.",
                    fr: "Tes photos de face, profil gauche et profil droit ont \u00e9t\u00e9 stock\u00e9es en priv\u00e9.",
                  })
                : copy(language, {
                    en: "Capture your front face, left profile, and right profile with the same guided process used by ScoreMax.",
                    fr: "Capture ton visage de face, ton profil gauche et ton profil droit avec le m\u00eame guidage que ScoreMax.",
                  })}
          </p>

          <div className="mt-7 flex flex-wrap justify-center gap-2">
            {REQUIRED_CAPTURE_POSES.map((poseId) => (
              <span
                key={poseId}
                className="rounded-full border border-border bg-card px-3 py-1.5 text-xs font-semibold text-muted-foreground"
              >
                {copy(language, POSE_LABELS[poseId])}
              </span>
            ))}
          </div>

          {thumbnailUrls.length > 0 ? (
            <div className="mt-8 grid w-full max-w-lg grid-cols-3 gap-3">
              {thumbnailUrls.map((url, index) => {
                const pose = capturedPoses[index];
                return (
                  <figure
                    key={pose?.poseId ?? url}
                    className="overflow-hidden rounded-lg border border-border bg-card text-left shadow-sm"
                  >
                    <img
                      src={url}
                      alt={pose ? poseLabel(pose.poseId, language) : ""}
                      className="aspect-[9/12] w-full object-cover"
                    />
                    <figcaption className="px-2 py-2 text-center text-[11px] font-semibold text-muted-foreground">
                      {pose ? poseLabel(pose.poseId, language) : ""}
                    </figcaption>
                  </figure>
                );
              })}
            </div>
          ) : null}

          {hasError ? (
            <p className="mt-5 max-w-md rounded-lg border border-red-500/20 bg-red-500/10 px-4 py-3 text-sm text-red-600">
              {storeFaceCaptures.error.message}
            </p>
          ) : null}

          <div className="mt-8 flex flex-col gap-3 sm:flex-row">
            {isSaved || hasError ? (
              <Button
                type="button"
                variant="outline"
                onClick={resetCapture}
                className="gap-2 rounded-full"
              >
                <RefreshCw className="h-4 w-4" />
                {copy(language, { en: "Start again", fr: "Recommencer" })}
              </Button>
            ) : (
              <Button
                type="button"
                onClick={() => setShowCapture(true)}
                disabled={isSaving}
                className="gap-2 rounded-full"
              >
                <Camera className="h-4 w-4" />
                {copy(language, { en: "Start capture", fr: "D\u00e9marrer la capture" })}
              </Button>
            )}

            <Button
              type="button"
              variant="ghost"
              onClick={() => navigate("/generate")}
              className="gap-2 rounded-full"
            >
              <ShieldCheck className="h-4 w-4" />
              {copy(language, { en: "Return to generation", fr: "Retour \u00e0 la g\u00e9n\u00e9ration" })}
            </Button>
          </div>
        </section>
      </div>
    </main>
  );
}
