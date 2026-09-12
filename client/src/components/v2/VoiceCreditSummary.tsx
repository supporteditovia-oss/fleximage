import { Gem } from "lucide-react";
import { useTranslation } from "react-i18next";
import { useAuth } from "@/hooks/use-auth";
import { useCurrentPlan } from "@/hooks/use-billing";
import { formatCredits } from "@/lib/format-locale";
import {
  VOICE_CLONE_CREDIT_COST,
  VOICE_CREDIT_COST,
} from "@shared/credit-costs";

type VoiceCreditSummaryProps = {
  /** Clone + génération en une fois (nouvel extrait capturé). */
  includesClone: boolean;
  guestFunnel?: boolean;
};

export function VoiceCreditSummary({
  includesClone,
  guestFunnel = false,
}: VoiceCreditSummaryProps) {
  const { t, i18n } = useTranslation();
  const { user } = useAuth();
  const { data: plan } = useCurrentPlan({ enabled: Boolean(user) && !guestFunnel });

  const generateCost = VOICE_CREDIT_COST;
  const cloneCost = includesClone ? VOICE_CLONE_CREDIT_COST : 0;
  const estimatedCost = generateCost + cloneCost;

  const balance = guestFunnel ? 0 : (plan?.credits ?? 0);
  const locale = i18n.resolvedLanguage || "fr";
  const balanceLabel = formatCredits(balance, locale);
  const enough = guestFunnel || balance >= estimatedCost;
  const remaining = Math.max(0, balance - estimatedCost);

  return (
    <div
      className={`vs-credit-summary ${enough ? "" : "vs-credit-summary--low"}`}
      role="status"
      aria-live="polite"
    >
      <div className="vs-credit-summary__row">
        <Gem className="h-4 w-4 shrink-0 text-[var(--lx-gold)]" aria-hidden />
        <span>
          {t("voiceStudio.creditTariff", {
            voice: generateCost,
            clone: VOICE_CLONE_CREDIT_COST,
          })}
        </span>
      </div>
      {!guestFunnel && user ? (
        <div className="vs-credit-summary__row vs-credit-summary__row--indent">
          <span>
            {t("voiceStudio.creditBalance", { balance: balanceLabel })}
          </span>
        </div>
      ) : null}
      <div className="vs-credit-summary__row vs-credit-summary__row--indent vs-credit-summary__row--cost">
        <span>
          {includesClone
            ? t("voiceStudio.creditActionCloneAndGenerate", {
                clone: cloneCost,
                generate: generateCost,
                total: estimatedCost,
              })
            : t("voiceStudio.creditActionGenerate", { count: generateCost })}
        </span>
      </div>
      {includesClone ? (
        <p className="vs-credit-summary__note">
          {t("voiceStudio.firstCloneFreeNote", { generate: generateCost })}
        </p>
      ) : null}
      {!guestFunnel && user && enough && estimatedCost > 0 ? (
        <p className="vs-credit-summary__note">
          {t("voiceStudio.creditRemainingAfter", {
            count: formatCredits(remaining, locale),
          })}
        </p>
      ) : null}
      {!guestFunnel && user && !enough ? (
        <p className="vs-credit-summary__warn">
          {t("voiceStudio.creditInsufficient", {
            need: estimatedCost - balance,
          })}
        </p>
      ) : null}
    </div>
  );
}
