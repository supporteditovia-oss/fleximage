import { useEffect, useMemo, useRef, useState, type CSSProperties } from "react";
import { createPortal } from "react-dom";
import { motion } from "framer-motion";
import { Mic, Music2 } from "lucide-react";
import { useTranslation } from "react-i18next";
import { BrandMark } from "@/components/BrandMark";
import {
  useGenerationCountdown,
  useGenerationProgress,
} from "@/hooks/use-generation-countdown";
import "./voice-generation-loader.css";

const MESSAGE_INTERVAL_MS = 1800;
const WAVE_BARS = 36;

export function VoiceGenerationLoaderBackdrop({ zIndex = 100 }: { zIndex?: number }) {
  if (typeof document === "undefined") return null;
  return createPortal(
    <div
      className="lx-voice-loader__base fixed inset-0"
      style={{ zIndex }}
      aria-hidden
    />,
    document.body,
  );
}

type VoiceGenerationLoaderProps = {
  status?: "connecting" | "waiting" | "success";
  estimatedSeconds?: number;
  serverRemainingSeconds?: number | null;
  startedAtMs?: number | null;
  taskId?: string;
};

export function VoiceGenerationLoader({
  status = "waiting",
  estimatedSeconds = 40,
  serverRemainingSeconds = null,
  startedAtMs = null,
  taskId = "voice-loader",
}: VoiceGenerationLoaderProps) {
  const { t } = useTranslation();
  const progressMessages = useMemo(
    () => [
      t("voiceProgress.stepAnalyze"),
      t("voiceProgress.stepClone"),
      t("voiceProgress.stepSynthesis"),
      t("voiceProgress.stepEffects"),
      t("voiceProgress.stepFinishing"),
    ],
    [t],
  );

  const [messageIndex, setMessageIndex] = useState(0);
  const [messageKey, setMessageKey] = useState(0);
  const lockedEstimate = useRef(Math.max(1, Math.round(estimatedSeconds)));

  useEffect(() => {
    lockedEstimate.current = Math.max(
      lockedEstimate.current,
      Math.max(1, Math.round(estimatedSeconds)),
    );
  }, [estimatedSeconds]);

  const remaining = useGenerationCountdown(
    taskId,
    startedAtMs,
    lockedEstimate.current,
    status === "success",
    serverRemainingSeconds,
  );

  const progress = useGenerationProgress(
    taskId,
    startedAtMs,
    lockedEstimate.current,
    status === "success",
  );

  const isOvertime = remaining <= 0 && status !== "success";
  const progressPct = Math.round(progress * 100);

  useEffect(() => {
    const id = setInterval(() => {
      setMessageIndex((prev) => (prev + 1) % progressMessages.length);
      setMessageKey((k) => k + 1);
    }, MESSAGE_INTERVAL_MS);
    return () => clearInterval(id);
  }, [progressMessages.length]);

  const loaderTree = (
    <motion.div
      className="lx-voice-loader fixed inset-0 z-[101] overflow-hidden"
      initial={false}
      animate={{ opacity: 1 }}
      role="status"
      aria-live="polite"
      aria-busy
    >
      <div className="lx-voice-loader__base absolute inset-0" aria-hidden />
      <div className="lx-voice-loader__aurora absolute inset-0" aria-hidden />
      <div className="lx-voice-loader__grain absolute inset-0" aria-hidden />

      <div className="lx-voice-loader__stage">
        <div className="lx-voice-loader__orb-wrap">
          <span className="lx-voice-loader__ring lx-voice-loader__ring--1" aria-hidden />
          <span className="lx-voice-loader__ring lx-voice-loader__ring--2" aria-hidden />
          <span className="lx-voice-loader__ring lx-voice-loader__ring--3" aria-hidden />
          <div className="lx-voice-loader__core">
            <Mic className="lx-voice-loader__mic" strokeWidth={1.5} aria-hidden />
          </div>
        </div>

        <div className="lx-voice-loader__wave" aria-hidden>
          {Array.from({ length: WAVE_BARS }, (_, i) => (
            <span
              key={i}
              className="lx-voice-loader__bar"
              style={{ "--i": i } as CSSProperties}
            />
          ))}
        </div>

        <div className="lx-voice-loader__badge">
          <Music2 className="h-3.5 w-3.5" aria-hidden />
          <span>{t("voiceProgress.badge")}</span>
        </div>
      </div>

      <motion.div
        className="lx-voice-loader__hud"
        initial={{ opacity: 0, y: 20 }}
        animate={{ opacity: 1, y: 0 }}
        transition={{ duration: 0.5, ease: [0.22, 1, 0.36, 1] }}
      >
        <div className="lx-voice-loader__hud-top">
          <div className="lx-voice-loader__count-block">
            {status === "success" || isOvertime ? (
              <span className="lx-voice-loader__count-symbol" aria-hidden>
                ♪
              </span>
            ) : (
              <>
                <span className="lx-voice-loader__count-num">{remaining}</span>
                <span className="lx-voice-loader__count-unit">
                  {t("progress.seconds")}
                </span>
              </>
            )}
          </div>

          <div className="lx-voice-loader__meter" aria-hidden>
            <div
              className="lx-voice-loader__meter-fill"
              style={{ width: `${progressPct}%` }}
            />
            <span className="lx-voice-loader__meter-label">{progressPct}%</span>
          </div>
        </div>

        <div className="lx-voice-loader__copy">
          {isOvertime && status !== "success" ? (
            <p className="lx-voice-loader__hint">{t("voiceProgress.overrun")}</p>
          ) : null}
          <p key={messageKey} className="lx-voice-loader__step">
            {status === "success"
              ? t("voiceProgress.stepFinishing")
              : progressMessages[messageIndex]}
          </p>
        </div>

        <div className="lx-voice-loader__brand">
          <BrandMark
            className="lx-voice-loader__brand-text"
            accentClassName="lx-voice-loader__brand-accent"
          />
        </div>
      </motion.div>
    </motion.div>
  );

  if (typeof document === "undefined") return loaderTree;
  return createPortal(loaderTree, document.body);
}
