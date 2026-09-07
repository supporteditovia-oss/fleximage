import { useEffect, useRef, useState } from "react";
import { authFetch } from "@/lib/api";
import {
  buildAnalysisSummaryFr,
  type SubjectAnalysis,
} from "@/lib/subject-pose-prompt";

function fileToBase64(file: File): Promise<string> {
  return new Promise((resolve, reject) => {
    const reader = new FileReader();
    reader.onload = () => resolve(String(reader.result ?? ""));
    reader.onerror = () => reject(reader.error);
    reader.readAsDataURL(file);
  });
}

/** Aperçu intelligent (debounced) — même analyse que la génération. */
export function useSubjectAnalysisPreview(
  imageFile: File | null,
  prompt: string,
  sceneContext = "",
  enabled = true,
) {
  const [summaryFr, setSummaryFr] = useState<string | null>(null);
  const [loading, setLoading] = useState(false);
  const requestIdRef = useRef(0);

  useEffect(() => {
    if (!enabled) {
      setSummaryFr(null);
      setLoading(false);
      return;
    }

    if (!imageFile && !prompt.trim() && !sceneContext.trim()) {
      setSummaryFr(null);
      setLoading(false);
      return;
    }

    const requestId = ++requestIdRef.current;
    const timer = window.setTimeout(() => {
      void (async () => {
        setLoading(true);
        try {
          const images = imageFile ? [await fileToBase64(imageFile)] : [];
          const res = await authFetch("/api/larps/analyze-subject", {
            method: "POST",
            body: JSON.stringify({
              images,
              prompt: prompt.trim(),
              scene_context: sceneContext.trim(),
            }),
          });
          if (requestId !== requestIdRef.current) return;
          if (!res.ok) {
            setSummaryFr(null);
            return;
          }
          const json = (await res.json()) as {
            analysis?: SubjectAnalysis;
            summaryFr?: string;
          };
          if (json.summaryFr) {
            setSummaryFr(json.summaryFr);
          } else if (json.analysis) {
            setSummaryFr(buildAnalysisSummaryFr(json.analysis));
          }
        } catch {
          if (requestId === requestIdRef.current) setSummaryFr(null);
        } finally {
          if (requestId === requestIdRef.current) setLoading(false);
        }
      })();
    }, 650);

    return () => window.clearTimeout(timer);
  }, [enabled, imageFile, prompt, sceneContext]);

  return { summaryFr, loading };
}
