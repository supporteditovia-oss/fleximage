import { useState } from "react";
import { ChevronDown } from "lucide-react";
import {
  SUBJECT_OPTIONS,
  POSE_STYLE_OPTIONS,
  buildSubjectPoseSummary,
  isAdvancedSubjectPoseActive,
  type PoseStyle,
  type SubjectType,
} from "@/lib/subject-pose-prompt";
import "./subject-pose-controls.css";

type SubjectPoseControlsProps = {
  subject: SubjectType;
  poseStyle: PoseStyle;
  analysisSummary?: string | null;
  analysisLoading?: boolean;
  onSubjectChange: (value: SubjectType) => void;
  onPoseStyleChange: (value: PoseStyle) => void;
  compact?: boolean;
};

export function SubjectPoseControls({
  subject,
  poseStyle,
  analysisSummary = null,
  analysisLoading = false,
  onSubjectChange,
  onPoseStyleChange,
  compact = false,
}: SubjectPoseControlsProps) {
  const [advancedOpen, setAdvancedOpen] = useState(
    isAdvancedSubjectPoseActive(subject, poseStyle),
  );
  const summary = buildSubjectPoseSummary(subject, poseStyle, analysisSummary);

  return (
    <section
      className={`subject-pose-controls${compact ? " subject-pose-controls--compact" : ""}`}
      aria-label="Analyse sujet et pose"
    >
      <p className="subject-pose-controls__preview">
        <span className="subject-pose-controls__preview-label">Aperçu</span>
        {analysisLoading ? "Analyse de ta photo…" : summary}
      </p>

      <button
        type="button"
        className={`subject-pose-advanced-toggle${advancedOpen ? " is-open" : ""}`}
        onClick={() => setAdvancedOpen((open) => !open)}
        aria-expanded={advancedOpen}
      >
        Options avancées (facultatif)
        <ChevronDown className="h-4 w-4" aria-hidden />
      </button>

      {advancedOpen ? (
        <div className="subject-pose-controls__grid">
          <label className="subject-pose-field">
            <span className="subject-pose-field__label">Sujet</span>
            <select
              className="subject-pose-field__select"
              value={subject}
              onChange={(event) =>
                onSubjectChange(event.target.value as SubjectType)
              }
            >
              {SUBJECT_OPTIONS.map((option) => (
                <option key={option.value} value={option.value}>
                  {option.label}
                </option>
              ))}
            </select>
          </label>

          <label className="subject-pose-field">
            <span className="subject-pose-field__label">Style de pose</span>
            <select
              className="subject-pose-field__select"
              value={poseStyle}
              onChange={(event) =>
                onPoseStyleChange(event.target.value as PoseStyle)
              }
            >
              {POSE_STYLE_OPTIONS.map((option) => (
                <option key={option.value} value={option.value}>
                  {option.label}
                </option>
              ))}
            </select>
          </label>
        </div>
      ) : null}
    </section>
  );
}
