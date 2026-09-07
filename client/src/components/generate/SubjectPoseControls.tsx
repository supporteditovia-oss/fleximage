import {
  SUBJECT_OPTIONS,
  POSE_STYLE_OPTIONS,
  buildSubjectPoseSummary,
  type PoseStyle,
  type SubjectType,
  type ResolvedSubjectType,
} from "@/lib/subject-pose-prompt";
import "./subject-pose-controls.css";

type SubjectPoseControlsProps = {
  subject: SubjectType;
  poseStyle: PoseStyle;
  autoResolved?: ResolvedSubjectType | null;
  onSubjectChange: (value: SubjectType) => void;
  onPoseStyleChange: (value: PoseStyle) => void;
  compact?: boolean;
};

export function SubjectPoseControls({
  subject,
  poseStyle,
  autoResolved = null,
  onSubjectChange,
  onPoseStyleChange,
  compact = false,
}: SubjectPoseControlsProps) {
  const summary = buildSubjectPoseSummary(subject, poseStyle, autoResolved);

  return (
    <section
      className={`subject-pose-controls${compact ? " subject-pose-controls--compact" : ""}`}
      aria-label="Sujet et style de pose"
    >
      <div className="subject-pose-controls__grid">
        <label className="subject-pose-field">
          <span className="subject-pose-field__label">
            Sujet <span className="subject-pose-required">*</span>
          </span>
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

      <p className="subject-pose-controls__preview">
        <span className="subject-pose-controls__preview-label">Aperçu</span>
        {summary}
      </p>
    </section>
  );
}
