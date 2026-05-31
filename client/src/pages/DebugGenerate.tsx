import { useState, useEffect, useRef } from "react";
import { useLocation } from "wouter";
import { savePendingLarp, getPendingLarp, clearPendingLarp } from "@/lib/pending-larp";

interface LogEntry {
  time: number;
  label: string;
}

export default function DebugGenerate() {
  const [, navigate] = useLocation();
  const [hasPending, setHasPending] = useState<boolean | null>(null);
  const [logs, setLogs] = useState<LogEntry[]>([]);
  const startRef = useRef(Date.now());

  const log = (label: string) =>
    setLogs((prev) => [...prev, { time: Date.now() - startRef.current, label }]);

  // Check IDB on mount
  useEffect(() => {
    getPendingLarp().then((p) => {
      setHasPending(!!p);
      log(`IDB check: ${p ? "FOUND pending LARP" : "no pending LARP"}`);
      if (p) {
        log(`  prompt: "${p.prompt}"`);
        log(`  images: ${p.images.length}`);
        log(`  age: ${Math.round((Date.now() - p.timestamp) / 1000)}s`);
      }
    });
  }, []);

  const handleSaveFake = async () => {
    // Create a tiny 1x1 white PNG as a fake image
    const canvas = document.createElement("canvas");
    canvas.width = 100;
    canvas.height = 100;
    const ctx = canvas.getContext("2d")!;
    ctx.fillStyle = "#1a1a2e";
    ctx.fillRect(0, 0, 100, 100);
    ctx.fillStyle = "#e2e8f0";
    ctx.font = "bold 14px sans-serif";
    ctx.textAlign = "center";
    ctx.fillText("DEBUG", 50, 55);
    const blob = await new Promise<Blob>((r) => canvas.toBlob((b) => r(b!), "image/png"));
    const file = new File([blob], "debug.png", { type: "image/png" });

    await savePendingLarp({
      prompt: "Debug test LARP - mets cette personne dans l'espace",
      images: [file],
      timestamp: Date.now(),
    });
    log("Saved fake pending LARP to IDB");
    setHasPending(true);
  };

  const handleClear = async () => {
    await clearPendingLarp();
    log("Cleared pending LARP from IDB");
    setHasPending(false);
  };

  const handleNavigate = () => {
    log("Navigating to /generate...");
    navigate("/generate");
  };

  return (
    <div className="min-h-screen bg-background text-foreground p-6 max-w-2xl mx-auto space-y-6">
      <h1 className="text-2xl font-bold font-display">Debug: Generate Flow</h1>
      <p className="text-sm text-muted-foreground">
        Cette page permet de tester le flux hero → register → generate sans passer par le hero.
      </p>

      {/* Status */}
      <div className="rounded-xl border border-border bg-card p-4 space-y-2">
        <h2 className="text-sm font-semibold uppercase text-muted-foreground">IndexedDB Status</h2>
        <div className="flex items-center gap-2">
          <span
            className={`w-3 h-3 rounded-full ${
              hasPending === null ? "bg-muted-foreground animate-pulse" :
              hasPending ? "bg-[#42a5f6]" : "bg-red-500"
            }`}
          />
          <span className="text-sm font-medium">
            {hasPending === null ? "Checking..." : hasPending ? "Pending LARP found" : "No pending LARP"}
          </span>
        </div>
      </div>

      {/* Actions */}
      <div className="rounded-xl border border-border bg-card p-4 space-y-3">
        <h2 className="text-sm font-semibold uppercase text-muted-foreground">Actions</h2>
        <div className="flex flex-wrap gap-2">
          <button
            onClick={handleSaveFake}
            className="px-4 py-2 text-sm font-semibold rounded-full bg-primary text-primary-foreground hover:bg-primary/90 active:scale-95 transition-all"
          >
            1. Save fake pending LARP
          </button>
          <button
            onClick={handleNavigate}
            className="px-4 py-2 text-sm font-semibold rounded-full bg-primary text-primary-foreground hover:bg-primary/90 active:scale-95 transition-all"
          >
            2. Go to /generate
          </button>
          <button
            onClick={handleClear}
            className="px-4 py-2 text-sm font-semibold rounded-full bg-destructive text-destructive-foreground hover:bg-destructive/90 active:scale-95 transition-all"
          >
            Clear pending LARP
          </button>
        </div>
        <p className="text-xs text-muted-foreground">
          Flow: Click "Save fake" → then "Go to /generate". You should see the loading → generation flow without any flash of the form.
        </p>
      </div>

      {/* Logs */}
      <div className="rounded-xl border border-border bg-card p-4 space-y-2">
        <h2 className="text-sm font-semibold uppercase text-muted-foreground">Log</h2>
        <div className="font-mono text-xs space-y-0.5 max-h-60 overflow-y-auto">
          {logs.length === 0 && <p className="text-muted-foreground">No logs yet...</p>}
          {logs.map((entry, i) => (
            <div key={i} className="flex gap-2">
              <span className="text-muted-foreground shrink-0 tabular-nums">
                {(entry.time / 1000).toFixed(2)}s
              </span>
              <span>{entry.label}</span>
            </div>
          ))}
        </div>
      </div>
    </div>
  );
}
