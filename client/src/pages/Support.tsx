import * as React from "react";
import { Redirect } from "wouter";
import { Headphones, MessageCircle } from "lucide-react";
import { useTranslation } from "react-i18next";
import { Button } from "@/components/ui/button";
import { useAuth } from "@/hooks/use-auth";

const CRISP_WEBSITE_ID = "e73cb8a0-2dd4-4239-967a-3913dcc35e2a";
const CRISP_SCRIPT_ID = "larpking-crisp-script";

declare global {
  interface Window {
    $crisp?: unknown[];
    CRISP_WEBSITE_ID?: string;
  }
}

function cleanupCrisp() {
  try {
    window.$crisp?.push(["do", "chat:close"]);
  } catch {
    // Crisp may already be partially unloaded.
  }

  document
    .querySelectorAll(
      `#${CRISP_SCRIPT_ID}, script[src*="client.crisp.chat"], #crisp-chatbox, .crisp-client`,
    )
    .forEach((node) => node.remove());

  delete window.$crisp;
  delete window.CRISP_WEBSITE_ID;
}

export default function Support() {
  const { profile } = useAuth();
  const { t } = useTranslation();
  const [chatOpen, setChatOpen] = React.useState(false);
  const hasSupportAccess = Boolean(profile?.is_subscriber || profile?.role === "admin");

  React.useEffect(() => {
    if (!hasSupportAccess) return;

    cleanupCrisp();
    window.$crisp = [];
    window.CRISP_WEBSITE_ID = CRISP_WEBSITE_ID;
    window.$crisp.push(["on", "chat:opened", () => setChatOpen(true)]);
    window.$crisp.push(["on", "chat:closed", () => setChatOpen(false)]);

    const script = document.createElement("script");
    script.id = CRISP_SCRIPT_ID;
    script.src = "https://client.crisp.chat/l.js";
    script.async = true;
    document.head.appendChild(script);

    return cleanupCrisp;
  }, [hasSupportAccess]);

  const toggleChat = () => {
    window.$crisp?.push(["do", chatOpen ? "chat:close" : "chat:open"]);
  };

  if (!hasSupportAccess) {
    return <Redirect to="/settings" />;
  }

  return (
    <div className="relative flex min-h-[calc(100svh-12rem)] items-center justify-center overflow-hidden py-16">
      <div className="pointer-events-none absolute inset-0 -z-10">
        <div className="absolute left-1/2 top-1/2 h-72 w-72 -translate-x-1/2 -translate-y-1/2 rounded-full bg-primary/10 blur-3xl" />
        <div className="absolute left-[15%] top-[20%] h-24 w-24 rounded-full border border-primary/20" />
        <div className="absolute bottom-[18%] right-[12%] h-32 w-32 rounded-full border border-border/70 bg-white/40 blur-[1px]" />
      </div>

      <section className="mx-auto flex w-full max-w-xl flex-col items-center text-center">
        <div className="mb-6 flex h-16 w-16 items-center justify-center rounded-2xl border border-border/70 bg-white/85 shadow-lg shadow-black/5 backdrop-blur-xl">
          <Headphones className="h-7 w-7 text-primary" />
        </div>

        <p className="mb-3 text-xs font-bold uppercase tracking-[0.28em] text-muted-foreground">
          {t("support.badge")}
        </p>
        <h1 className="font-display text-3xl font-bold tracking-tight text-foreground md:text-5xl">
          {t("support.title")}
        </h1>
        <p className="mt-4 max-w-md text-sm leading-6 text-muted-foreground md:text-base">
          {t("support.description")}
        </p>

        <Button
          type="button"
          onClick={toggleChat}
          size="lg"
          className="mt-10 h-14 rounded-full px-8 text-base font-bold shadow-xl shadow-primary/20 transition-transform active:scale-95"
          aria-pressed={chatOpen}
          aria-label={chatOpen ? t("support.closeChat") : t("support.openChat")}
        >
          <MessageCircle className="mr-2 h-5 w-5" />
          {t("support.openChat")}
        </Button>

        <p className="mt-4 text-xs text-muted-foreground/70">
          {chatOpen ? t("support.openHint") : t("support.closedHint")}
        </p>
      </section>
    </div>
  );
}
