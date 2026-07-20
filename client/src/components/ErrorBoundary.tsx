import * as React from "react";
import { AlertTriangle } from "lucide-react";
import { Button } from "@/components/ui/button";

interface Props {
  children: React.ReactNode;
}

interface State {
  hasError: boolean;
  error?: Error;
  errorInfo?: string;
}

const LAST_ERROR_KEY = "luxeflexia:last-ui-error";

function persistError(error: Error, errorInfo?: React.ErrorInfo) {
  try {
    sessionStorage.setItem(
      LAST_ERROR_KEY,
      JSON.stringify({
        message: error.message,
        name: error.name,
        stack: error.stack?.slice(0, 2000) ?? null,
        componentStack: errorInfo?.componentStack?.slice(0, 2000) ?? null,
        href: typeof window !== "undefined" ? window.location.href : null,
        at: new Date().toISOString(),
      }),
    );
  } catch {
    /* ignore */
  }
}

export class ErrorBoundary extends React.Component<Props, State> {
  constructor(props: Props) {
    super(props);
    this.state = { hasError: false };
  }

  static getDerivedStateFromError(error: Error): State {
    return { hasError: true, error };
  }

  componentDidCatch(error: Error, errorInfo: React.ErrorInfo) {
    console.error("ErrorBoundary caught an error", error, errorInfo);
    persistError(error, errorInfo);
    this.setState({
      errorInfo: errorInfo.componentStack?.slice(0, 800) ?? undefined,
    });
  }

  private handleRetry = () => {
    this.setState({ hasError: false, error: undefined, errorInfo: undefined });
  };

  private handleHome = () => {
    this.setState({ hasError: false, error: undefined, errorInfo: undefined });
    // Soft navigate within the SPA so auth session is preserved.
    const target =
      typeof window !== "undefined" &&
      window.location.pathname.startsWith("/admin")
        ? "/admin/users"
        : "/generate";
    window.location.assign(target);
  };

  render() {
    if (this.state.hasError) {
      const detail =
        this.state.error?.message ||
        "Une erreur inattendue s'est produite dans l'application.";

      return (
        <div className="flex min-h-screen w-full items-center justify-center bg-[var(--lx-surface,#f7f4ed)] p-4">
          <div className="w-full max-w-md space-y-6 text-center">
            <div className="flex justify-center">
              <div className="rounded-full bg-destructive/10 p-4">
                <AlertTriangle className="h-12 w-12 text-destructive" />
              </div>
            </div>
            <div className="space-y-2">
              <h1 className="text-2xl font-bold tracking-tight text-[var(--lx-ink,#1a1612)]">
                Une erreur est survenue
              </h1>
              <p className="text-sm text-muted-foreground">
                L&apos;application a rencontré un problème. Tu peux réessayer ou
                revenir à la création.
              </p>
            </div>

            <pre className="max-h-36 overflow-auto rounded-lg border border-border/70 bg-white/80 p-3 text-left text-[11px] leading-relaxed text-muted-foreground">
              {detail}
            </pre>

            <div className="flex flex-col gap-2 pt-2 sm:flex-row">
              <Button
                type="button"
                onClick={this.handleRetry}
                className="w-full rounded-full"
                variant="outline"
              >
                Réessayer
              </Button>
              <Button
                type="button"
                onClick={this.handleHome}
                className="w-full rounded-full"
              >
                Retour à Créer
              </Button>
            </div>
          </div>
        </div>
      );
    }

    return this.props.children;
  }
}
