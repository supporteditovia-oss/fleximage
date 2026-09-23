import type { TFunction } from "i18next";

const PIPELINE_ORDER = [
  "enriching_prompt",
  "uploading_inputs",
  "analyzing_subject",
  "submitting_provider",
  "waiting_provider",
] as const;

export type ImagePipelinePhase = (typeof PIPELINE_ORDER)[number];

export function buildImagePipelineStatusMessages(
  t: TFunction,
  pipelinePhase: string | null | undefined,
): string[] | undefined {
  if (!pipelinePhase) return undefined;
  const idx = PIPELINE_ORDER.indexOf(pipelinePhase as ImagePipelinePhase);
  if (idx < 0) {
    return [
      t("progress.stepPromptIntel"),
      t("progress.stepAnalyze"),
      t("progress.stepRendering"),
      t("progress.stepFinishing"),
    ];
  }
  const keys = PIPELINE_ORDER.slice(0, idx + 1).map(
    (phase) => `progress.pipeline.${phase}`,
  );
  const messages = keys.map((key) => t(key));
  if (idx >= PIPELINE_ORDER.length - 1) {
    messages.push(t("progress.stepFinishing"));
  }
  return messages;
}
