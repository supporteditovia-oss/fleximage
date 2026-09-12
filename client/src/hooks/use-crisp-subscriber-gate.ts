import { useEffect } from "react";
import { useAuth } from "@/hooks/use-auth";
import { useCurrentPlan } from "@/hooks/use-billing";
import {
  canUseCrispChat,
  setCrispSubscriberAllowed,
} from "@/lib/crisp-gate";

/**
 * Affiche le widget Crisp seulement aux abonnés payants (et admin).
 * Les visiteurs / comptes gratuits ne voient pas le chat support.
 */
export function useCrispSubscriberGate() {
  const { user, profile } = useAuth();
  const { data: plan } = useCurrentPlan({ enabled: Boolean(user) });

  const allowed = Boolean(
    user &&
      (canUseCrispChat(profile) ||
        plan?.isSubscriber ||
        profile?.role === "admin"),
  );

  useEffect(() => {
    setCrispSubscriberAllowed(allowed);
    return () => setCrispSubscriberAllowed(false);
  }, [allowed]);
}
