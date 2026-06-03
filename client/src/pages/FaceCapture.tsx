import * as React from "react";
import { ArrowLeft, Check, Loader2, RefreshCw, ScanFace, Trash2 } from "lucide-react";
import { useLocation } from "wouter";
import { useTranslation } from "react-i18next";
import { Button } from "@/components/ui/button";
import { FaceCaptureView } from "@/components/FaceCaptureView";
import { useAuth } from "@/hooks/use-auth";
import {
  fetchFaceCaptureAssetBlob,
  useDeleteLatestFaceCapture,
  useLatestFaceCapture,
  useStoreFaceCaptures,
} from "@/hooks/use-face-captures";
import { composeFaceCaptureBlobs } from "@/lib/face-capture-generation";
import type { CapturedPose } from "@/lib/face-capture";

const REQUIRED_CAPTURE_POSES = ["frontal", "profile-right", "profile-left"] as const;

function copy(language: string | undefined, text: { en: string; fr: string }) {
  return language === "fr" ? text.fr : text.en;
}

export default function FaceCapture() {
  const [, navigate] = useLocation();
  const { i18n } = useTranslation();
  const { profile } = useAuth();
  const language = profile?.preferred_locale ?? i18n.resolvedLanguage ?? "en";
  const captureLanguage = language === "fr" ? "fr" : "en";
  const storeFaceCaptures = useStoreFaceCaptures();
  const latestFaceCapture = useLatestFaceCapture();
  const deleteLatestFaceCapture = useDeleteLatestFaceCapture();
  const [showCapture, setShowCapture] = React.useState(false);
  const [thumbnailUrl, setThumbnailUrl] = React.useState<string | null>(null);
  const [storedThumbnailUrl, setStoredThumbnailUrl] = React.useState<string | null>(null);
  const [storedThumbnailsLoading, setStoredThumbnailsLoading] = React.useState(false);
  const [storedThumbnailsError, setStoredThumbnailsError] = React.useState<Error | null>(null);

  const clearStoredThumbnails = React.useCallback(() => {
    setStoredThumbnailUrl((previousUrl) => {
      if (previousUrl) URL.revokeObjectURL(previousUrl);
      return null;
    });
    setStoredThumbnailsLoading(false);
    setStoredThumbnailsError(null);
  }, []);

  React.useEffect(() => {
    return () => {
      if (thumbnailUrl) URL.revokeObjectURL(thumbnailUrl);
    };
  }, [thumbnailUrl]);

  React.useEffect(() => {
    let isCancelled = false;
    const captures = latestFaceCapture.data?.session?.captures ?? [];

    clearStoredThumbnails();

    if (!latestFaceCapture.data?.session?.id || captures.length === 0) {
      return () => {
        isCancelled = true;
      };
    }

    setStoredThumbnailsLoading(true);

    const orderedCaptures = REQUIRED_CAPTURE_POSES.map((poseId) =>
      captures.find((capture) => capture.poseId === poseId),
    );

    void Promise.all(
      orderedCaptures.map(async (capture) => {
        if (!capture) throw new Error("Unable to load saved face capture.");
        return fetchFaceCaptureAssetBlob(capture.imageUrl);
      }),
    )
      .then((blobs) => composeFaceCaptureBlobs(blobs))
      .then((compositeBlob) => {
        const objectUrl = URL.createObjectURL(compositeBlob);
        if (isCancelled) {
          URL.revokeObjectURL(objectUrl);
          return;
        }
        setStoredThumbnailUrl(objectUrl);
        setStoredThumbnailsLoading(false);
      })
      .catch((error) => {
        if (!isCancelled) {
          setStoredThumbnailUrl(null);
          setStoredThumbnailsError(
            error instanceof Error ? error : new Error("Unable to load saved face capture."),
          );
          setStoredThumbnailsLoading(false);
        }
      });

    return () => {
      isCancelled = true;
    };
  }, [clearStoredThumbnails, latestFaceCapture.data?.session?.id, latestFaceCapture.data?.session?.captures]);

  const resetCapture = React.useCallback(() => {
    if (thumbnailUrl) URL.revokeObjectURL(thumbnailUrl);
    setThumbnailUrl(null);
    storeFaceCaptures.reset();
    setShowCapture(true);
  }, [storeFaceCaptures, thumbnailUrl]);

  const handleComplete = React.useCallback(
    async (poses: CapturedPose[]) => {
      setShowCapture(false);
      const compositeBlob = await composeFaceCaptureBlobs(poses.map((pose) => pose.blob));
      setThumbnailUrl((previousUrl) => {
        if (previousUrl) URL.revokeObjectURL(previousUrl);
        return URL.createObjectURL(compositeBlob);
      });
      await storeFaceCaptures.mutateAsync(poses).catch(() => undefined);
    },
    [storeFaceCaptures],
  );

  const handleDelete = React.useCallback(async () => {
    try {
      await deleteLatestFaceCapture.mutateAsync();
    } catch {
      return;
    }

    if (thumbnailUrl) URL.revokeObjectURL(thumbnailUrl);
    setThumbnailUrl(null);
    clearStoredThumbnails();
    storeFaceCaptures.reset();
  }, [clearStoredThumbnails, deleteLatestFaceCapture, storeFaceCaptures, thumbnailUrl]);

  const isSaving = storeFaceCaptures.isPending;
  const isSaved = Boolean(storeFaceCaptures.data);
  const hasError =
    storeFaceCaptures.isError ||
    latestFaceCapture.isError ||
    deleteLatestFaceCapture.isError ||
    Boolean(storedThumbnailsError);
  const latestSession = latestFaceCapture.data?.session ?? null;
  const displayCaptureUrl = thumbnailUrl ?? storedThumbnailUrl;
  const hasStoredCapture = Boolean(latestSession && storedThumbnailUrl);
  const hasDisplayCapture = Boolean(displayCaptureUrl);
  const isLoadingExistingCapture =
    (latestFaceCapture.isLoading || storedThumbnailsLoading) &&
    !thumbnailUrl;
  const showDeleteCapture =
    Boolean(isSaved || latestSession) &&
    !isSaving;
  const errorMessage = storeFaceCaptures.isError
    ? storeFaceCaptures.error.message
    : latestFaceCapture.isError
      ? latestFaceCapture.error.message
      : deleteLatestFaceCapture.isError
        ? deleteLatestFaceCapture.error.message
        : storedThumbnailsError?.message ?? null;

  return (
    <main className="h-[calc(100svh-12rem)] overflow-hidden bg-transparent px-4 py-0 text-foreground">
      {showCapture ? (
        <FaceCaptureView
          language={captureLanguage}
          posesToCapture={REQUIRED_CAPTURE_POSES}
          onCancel={() => setShowCapture(false)}
          onComplete={handleComplete}
        />
      ) : null}

      <div className="mx-auto flex h-full min-h-0 w-full max-w-3xl flex-col">
        <button
          type="button"
          onClick={() => navigate("/generate")}
          className="mb-4 inline-flex w-fit shrink-0 items-center gap-2 text-sm font-medium text-muted-foreground transition-colors hover:text-foreground"
        >
          <ArrowLeft className="h-4 w-4" />
          {copy(language, { en: "Back", fr: "Retour" })}
        </button>

        <section className="flex min-h-0 flex-1 items-center justify-center overflow-hidden text-center">
          <div className="relative flex h-[min(76svh,520px)] aspect-[9/16] max-w-full flex-col overflow-hidden rounded-lg border-2 border-foreground/25 bg-white/80 shadow-sm">
            <div className="relative z-20 flex h-full min-h-0 flex-col items-center justify-center px-5 py-6">
              <div className="mb-4 flex h-14 w-14 shrink-0 items-center justify-center rounded-full border border-primary/20 bg-primary/10 text-primary">
                {isSaving || isLoadingExistingCapture || deleteLatestFaceCapture.isPending ? (
                  <Loader2 className="h-6 w-6 animate-spin" />
                ) : isSaved || hasStoredCapture ? (
                  <Check className="h-6 w-6" />
                ) : (
                  <ScanFace className="h-6 w-6" />
                )}
              </div>

              <h1 className="font-display text-3xl font-bold tracking-tight">
                {isSaved
                  ? copy(language, { en: "Face capture saved", fr: "Capture visage sauvegard\u00e9e" })
                  : hasStoredCapture
                    ? copy(language, { en: "Face scan ready", fr: "Scan visage pr\u00eat" })
                    : copy(language, { en: "Face capture", fr: "Capture visage" })}
              </h1>

              {isSaving || isSaved || isLoadingExistingCapture ? (
                <p className="mt-3 max-w-[17rem] text-sm leading-5 text-muted-foreground">
                  {isSaving
                    ? copy(language, {
                        en: "Saving your three captures securely.",
                        fr: "Sauvegarde s\u00e9curis\u00e9e de tes trois captures.",
                      })
                    : isLoadingExistingCapture
                      ? copy(language, {
                          en: "Loading your saved scan.",
                          fr: "Chargement de ton scan enregistr\u00e9.",
                        })
                      : copy(language, {
                          en: "Your front, left profile, and right profile photos were stored privately.",
                          fr: "Tes photos de face, profil gauche et profil droit ont \u00e9t\u00e9 stock\u00e9es en priv\u00e9.",
                        })}
                </p>
              ) : null}

              {hasDisplayCapture ? (
                <figure className="mt-4 w-full shrink text-left">
                  <img
                    src={displayCaptureUrl ?? ""}
                    alt={copy(language, {
                      en: "Combined face scan: front, right profile, and left profile",
                      fr: "Scan visage combin\u00e9 : face, profil droit et profil gauche",
                    })}
                    className="aspect-[27/16] w-full rounded-md object-cover"
                  />
                  <figcaption className="mt-1 truncate text-center text-[10px] font-semibold text-muted-foreground">
                    {copy(language, {
                      en: "Front, right profile, left profile",
                      fr: "Face, profil droit, profil gauche",
                    })}
                  </figcaption>
                </figure>
              ) : null}

              {hasError ? (
                <p className="mt-4 max-w-[17rem] rounded-lg border border-red-500/20 bg-red-500/10 px-3 py-2 text-sm leading-5 text-red-600">
                  {errorMessage}
                </p>
              ) : null}

              <div className="mt-5 flex w-full max-w-[14rem] shrink-0 flex-col gap-2.5">
                {isLoadingExistingCapture ? (
                  <Button
                    type="button"
                    disabled
                    className="gap-2 rounded-full"
                  >
                    <Loader2 className="h-4 w-4 animate-spin" />
                    {copy(language, { en: "Loading", fr: "Chargement" })}
                  </Button>
                ) : hasDisplayCapture || hasError ? (
                  <Button
                    type="button"
                    onClick={resetCapture}
                    disabled={isSaving || deleteLatestFaceCapture.isPending}
                    className="gap-2 rounded-full"
                  >
                    <RefreshCw className="h-4 w-4" />
                    {copy(language, { en: "Retake", fr: "Reprendre" })}
                  </Button>
                ) : (
                  <Button
                    type="button"
                    onClick={() => setShowCapture(true)}
                    disabled={isSaving}
                    className="gap-2 rounded-full"
                  >
                    <ScanFace className="h-4 w-4" />
                    {copy(language, { en: "Start capture", fr: "D\u00e9marrer la capture" })}
                  </Button>
                )}

                {showDeleteCapture ? (
                  <Button
                    type="button"
                    variant="ghost"
                    onClick={handleDelete}
                    disabled={deleteLatestFaceCapture.isPending}
                    className="gap-2 rounded-full text-red-600 hover:bg-red-500/10 hover:text-red-700"
                  >
                    {deleteLatestFaceCapture.isPending ? (
                      <Loader2 className="h-4 w-4 animate-spin" />
                    ) : (
                      <Trash2 className="h-4 w-4" />
                    )}
                    {deleteLatestFaceCapture.isPending
                      ? copy(language, { en: "Deleting", fr: "Suppression" })
                      : copy(language, { en: "Delete", fr: "Supprimer" })}
                  </Button>
                ) : null}
              </div>
            </div>
            <span className="hero-image-slot absolute inset-0 z-30 rounded-lg pointer-events-none" />
          </div>
        </section>
      </div>
    </main>
  );
}
