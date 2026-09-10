import { Gem } from "lucide-react";
import { useTranslation } from "react-i18next";
import { useAuth } from "@/hooks/use-auth";
import { useCurrentPlan } from "@/hooks/use-billing";
import { formatCredits } from "@/lib/format-locale";

type VideoCreditSummaryProps = {
  creditCost: number;
};

export function VideoCreditSummary({ creditCost }: VideoCreditSummaryProps) {
  const { i18n } = useTranslation();
  const { user } = useAuth();
  const { data: plan } = useCurrentPlan({ enabled: Boolean(user) });

  const balance = plan?.credits ?? 0;
  const locale = i18n.resolvedLanguage || "fr";
  const balanceLabel = formatCredits(balance, locale);
  const enough = balance >= creditCost;
  const remaining = Math.max(0, balance - creditCost);

  return (
    <div
      className={`via-credit-summary ${enough ? "" : "via-credit-summary--low"}`}
      role="status"
      aria-live="polite"
    >
      <div className="via-credit-summary__row">
        <Gem className="h-4 w-4 shrink-0 text-[var(--lx-gold)]" aria-hidden />
        <span>
          Ton solde : <strong>{balanceLabel} crédits</strong>
        </span>
      </div>
      <div className="via-credit-summary__row via-credit-summary__row--cost">
        <span>
          Coût de cette vidéo : <strong>{creditCost} crédits</strong>
          {enough ? (
            <>
              {" "}
              · reste <strong>{formatCredits(remaining, locale)}</strong> après
            </>
          ) : null}
        </span>
      </div>
      {!enough ? (
        <p className="via-credit-summary__warn">
          Crédits insuffisants — il te faut {creditCost - balance} crédit
          {creditCost - balance > 1 ? "s" : ""} de plus.
        </p>
      ) : null}
    </div>
  );
}
