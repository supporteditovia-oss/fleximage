import { useEffect, useMemo, useRef, useState } from "react";
import { useLocation } from "wouter";
import { Film, ImageIcon, Loader2, Upload, Video } from "lucide-react";
import { useTranslation } from "react-i18next";
import { useAuth } from "@/hooks/use-auth";
import { compressImageForGeneration } from "@/lib/compress-image";
import { startLandingGuestFunnel } from "@/lib/landing-funnel";
import {
  VIDEO_V2V_MAX_DURATION_SEC,
  VIDEO_V2V_MAX_SIZE_MB,
  type VideoAspectRatio,
  type VideoWorkflow,
} from "@/lib/video-studio-config";
import {
  formatVideoDurationLabel,
  readVideoDurationSec,
  validateVideoDurationForUpload,
} from "@/lib/video-duration";
import "@/pages/video-ia-page.css";

export function LandingVideoPanel() {
  const { user } = useAuth();
  const [, navigate] = useLocation();
  const { t, i18n } = useTranslation();
  const imageFileRef = useRef<HTMLInputElement>(null);
  const videoFileRef = useRef<HTMLInputElement>(null);

  const [workflow, setWorkflow] = useState<VideoWorkflow>("image_to_video");
  const [aspectRatio, setAspectRatio] = useState<VideoAspectRatio>("9:16");
  const [imagePreviewUrl, setImagePreviewUrl] = useState<string | null>(null);
  const [imageFile, setImageFile] = useState<File | null>(null);
  const [videoPreview, setVideoPreview] = useState<string | null>(null);
  const [videoDurationSec, setVideoDurationSec] = useState<number | null>(null);
  const [motionPrompt, setMotionPrompt] = useState(() => t("landing:videoPanel.motionDefault"));
  const [swapPrompt, setSwapPrompt] = useState(() => t("landing:videoPanel.swapDefault"));
  const [busy, setBusy] = useState(false);
  const [isVideoUploading, setIsVideoUploading] = useState(false);

  useEffect(() => {
    setMotionPrompt(t("landing:videoPanel.motionDefault"));
    setSwapPrompt(t("landing:videoPanel.swapDefault"));
  }, [i18n.resolvedLanguage, t]);

  const workflowOptions = useMemo(
    () =>
      [
        {
          id: "image_to_video" as const,
          label: t("landing:videoPanel.i2vLabel"),
          hint: t("landing:videoPanel.i2vHint"),
        },
        {
          id: "video_to_video" as const,
          label: t("landing:videoPanel.v2vLabel"),
          hint: t("landing:videoPanel.v2vHint"),
        },
      ] as const,
    [t],
  );

  const canGenerateI2V = Boolean(imageFile);
  const canGenerateV2V = Boolean(videoPreview);

  const handleImageUpload = async (file: File | null) => {
    if (!file) return;
    try {
      const compressed = await compressImageForGeneration(file);
      if (imagePreviewUrl) URL.revokeObjectURL(imagePreviewUrl);
      setImageFile(compressed);
      setImagePreviewUrl(URL.createObjectURL(compressed));
    } catch {
      /* ignore */
    }
  };

  const handleVideoUpload = async (file: File | null) => {
    if (!file || !file.type.startsWith("video/")) return;
    if (file.size > VIDEO_V2V_MAX_SIZE_MB * 1024 * 1024) return;
    setIsVideoUploading(true);
    try {
      const duration = await readVideoDurationSec(file);
      const check = validateVideoDurationForUpload(duration);
      if (!check.ok) return;
      if (videoPreview) URL.revokeObjectURL(videoPreview);
      setVideoPreview(URL.createObjectURL(file));
      setVideoDurationSec(Number(formatVideoDurationLabel(duration)));
    } finally {
      setIsVideoUploading(false);
    }
  };

  const handleGenerate = async () => {
    if (busy) return;
    if (workflow === "image_to_video" && !canGenerateI2V) return;
    if (workflow === "video_to_video" && !canGenerateV2V) return;

    setBusy(true);
    try {
      const prompt =
        workflow === "image_to_video" ? motionPrompt.trim() : swapPrompt.trim();
      await startLandingGuestFunnel({
        mode: "video",
        prompt: prompt || t("landing:videoPanel.fallbackPrompt"),
        imageFile: workflow === "image_to_video" ? imageFile : undefined,
      });
      navigate(user ? "/video-ia" : "/register");
    } finally {
      setBusy(false);
    }
  };

  return (
    <div className="via-studio landing-video-panel pb-4">
      <div className="via-mode-grid">
        {workflowOptions.map((option) => (
          <button
            key={option.id}
            type="button"
            onClick={() => setWorkflow(option.id)}
            className={`via-mode-card ${workflow === option.id ? "is-active" : ""}`}
          >
            <span className="via-mode-card__emoji" aria-hidden>
              ◈
            </span>
            <span className="via-mode-card__label">{option.label}</span>
            <span className="via-mode-card__hint">{option.hint}</span>
          </button>
        ))}
      </div>

      <div key={workflow} className="via-panel via-panel-enter">
        {workflow === "image_to_video" ? (
          <>
            <p className="via-step-label">
              <ImageIcon className="h-3.5 w-3.5" />
              {t("landing:videoPanel.step1")}
            </p>
            <h3 className="via-step-title">{t("landing:videoPanel.i2vTitle")}</h3>
            <p className="via-step-desc">{t("landing:videoPanel.i2vDesc")}</p>
            <input
              ref={imageFileRef}
              type="file"
              accept="image/*"
              className="hidden"
              onChange={(e) => void handleImageUpload(e.target.files?.[0] ?? null)}
            />
            <button
              type="button"
              className={`via-upload-zone ${imagePreviewUrl ? "has-file" : ""}`}
              onClick={() => imageFileRef.current?.click()}
            >
              <span className="via-upload-zone__icon">
                <Upload className="h-4 w-4" />
              </span>
              <span className="via-upload-zone__text">
                {imagePreviewUrl
                  ? t("landing:videoPanel.changeImage")
                  : t("landing:videoPanel.chooseImage")}
              </span>
              <span className="via-upload-zone__meta">{t("landing:videoPanel.imageMeta")}</span>
            </button>
            {imagePreviewUrl ? (
              <div className={`via-preview-frame ${aspectRatio === "16:9" ? "is-landscape" : ""}`}>
                <img src={imagePreviewUrl} alt={t("landing:videoPanel.previewAlt")} />
              </div>
            ) : null}
            {imagePreviewUrl ? (
              <>
                <label className="via-step-label" style={{ marginTop: "1.25rem" }}>
                  {t("landing:videoPanel.step2Prompt")}
                </label>
                <textarea
                  value={motionPrompt}
                  onChange={(e) => setMotionPrompt(e.target.value)}
                  rows={3}
                  maxLength={500}
                  className="via-prompt-field"
                />
              </>
            ) : null}
          </>
        ) : (
          <>
            <p className="via-step-label">
              <Video className="h-3.5 w-3.5" />
              {t("landing:videoPanel.step1")}
            </p>
            <h3 className="via-step-title">{t("landing:videoPanel.v2vTitle")}</h3>
            <p className="via-step-desc">
              {t("landing:videoPanel.v2vDesc", { maxSec: VIDEO_V2V_MAX_DURATION_SEC })}
            </p>
            <input
              ref={videoFileRef}
              type="file"
              accept="video/*"
              className="hidden"
              onChange={(e) => void handleVideoUpload(e.target.files?.[0] ?? null)}
            />
            <button
              type="button"
              className={`via-upload-zone ${videoPreview ? "has-file" : ""}`}
              disabled={isVideoUploading}
              onClick={() => videoFileRef.current?.click()}
            >
              <span className="via-upload-zone__icon">
                {isVideoUploading ? (
                  <Loader2 className="h-4 w-4 animate-spin" />
                ) : (
                  <Upload className="h-4 w-4" />
                )}
              </span>
              <span className="via-upload-zone__text">
                {videoPreview
                  ? t("landing:videoPanel.changeVideo")
                  : t("landing:videoPanel.chooseVideo")}
              </span>
              <span className="via-upload-zone__meta">
                {t("landing:videoPanel.videoMeta", { maxMb: VIDEO_V2V_MAX_SIZE_MB })}
                {videoDurationSec ? ` · ${videoDurationSec}s` : ""}
              </span>
            </button>
            {videoPreview ? (
              <div className="via-preview-frame">
                <video src={videoPreview} controls muted playsInline />
              </div>
            ) : null}
            {videoPreview ? (
              <textarea
                value={swapPrompt}
                onChange={(e) => setSwapPrompt(e.target.value)}
                rows={3}
                maxLength={500}
                className="via-prompt-field"
                style={{ marginTop: "1rem" }}
              />
            ) : null}
          </>
        )}

        <div
          className="via-orient-toggle"
          role="group"
          aria-label={t("landing:videoPanel.orientationAria")}
        >
          <button
            type="button"
            className={`via-orient-toggle__btn ${aspectRatio === "9:16" ? "is-active" : ""}`}
            onClick={() => setAspectRatio("9:16")}
          >
            {t("landing:videoPanel.vertical")}
          </button>
          <button
            type="button"
            className={`via-orient-toggle__btn ${aspectRatio === "16:9" ? "is-active" : ""}`}
            onClick={() => setAspectRatio("16:9")}
          >
            {t("landing:videoPanel.landscape")}
          </button>
        </div>

        <button
          type="button"
          className="via-cta"
          disabled={
            busy ||
            (workflow === "image_to_video" ? !canGenerateI2V : !canGenerateV2V)
          }
          onClick={() => void handleGenerate()}
        >
          {busy ? (
            <>
              <Loader2 className="h-4 w-4 animate-spin" />
              {t("landing:videoPanel.preparing")}
            </>
          ) : (
            <>
              <Film className="h-4 w-4" />
              {t("landing:videoPanel.cta")}
            </>
          )}
        </button>
      </div>
    </div>
  );
}
