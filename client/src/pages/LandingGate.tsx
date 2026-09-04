import { useEffect, useState } from "react";
import { useAuth } from "@/hooks/use-auth";
import { useV2Access } from "@/hooks/use-v2-access";
import Landing from "@/pages/Landing";
import LandingV2 from "@/pages/LandingV2";
import { AuthResolveShell } from "@/components/v2/AuthResolveShell";

const GATE_SHELL_MAX_MS = 2500;

/** Routes admins on allowlisted IPs to Landing V2 after auth + IP gate resolve. */
export default function LandingGate() {
  const { user, isLoading: authLoading } = useAuth();
  const { v2Enabled, isLoading: gateLoading } = useV2Access();
  const [timedOut, setTimedOut] = useState(false);

  const blocking = authLoading || (Boolean(user) && gateLoading);

  useEffect(() => {
    if (!blocking) {
      setTimedOut(false);
      return;
    }
    const timer = window.setTimeout(() => setTimedOut(true), GATE_SHELL_MAX_MS);
    return () => window.clearTimeout(timer);
  }, [blocking]);

  if (blocking && !timedOut) {
    return <AuthResolveShell />;
  }

  if (v2Enabled && !timedOut) {
    return <LandingV2 />;
  }

  return <Landing />;
}
