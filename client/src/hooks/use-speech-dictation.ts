import { useCallback, useEffect, useRef, useState } from "react";

type SpeechRec = {
  lang: string;
  continuous: boolean;
  interimResults: boolean;
  onstart: (() => void) | null;
  onresult: ((ev: {
    resultIndex: number;
    results: ArrayLike<{ isFinal: boolean; 0: { transcript: string } }>;
  }) => void) | null;
  onerror: ((ev: { error?: string }) => void) | null;
  onend: (() => void) | null;
  start: () => void;
  stop: () => void;
  abort: () => void;
};

function getSpeechRecognitionCtor(): (new () => SpeechRec) | null {
  if (typeof window === "undefined") return null;
  const w = window as Window & {
    SpeechRecognition?: new () => SpeechRec;
    webkitSpeechRecognition?: new () => SpeechRec;
  };
  return w.SpeechRecognition || w.webkitSpeechRecognition || null;
}

function localeToBcp47(lang: string) {
  const base = String(lang || "fr").slice(0, 2).toLowerCase();
  if (base === "en") return "en-US";
  if (base === "es") return "es-ES";
  if (base === "it") return "it-IT";
  if (base === "de") return "de-DE";
  if (base === "pt") return "pt-PT";
  if (base === "ar") return "ar-SA";
  return "fr-FR";
}

export function useSpeechDictation({
  enabled,
  lang,
  baseText,
  onText,
}: {
  enabled: boolean;
  lang: string;
  baseText: string;
  onText: (value: string) => void;
}) {
  const [listening, setListening] = useState(false);
  const [error, setError] = useState<string | null>(null);
  const recRef = useRef<SpeechRec | null>(null);
  const baseRef = useRef(baseText);
  const finalsRef = useRef("");
  const lastWrittenRef = useRef(baseText);
  const consumeFromRef = useRef(0);
  const wantListenRef = useRef(false);
  const onTextRef = useRef(onText);
  const langRef = useRef(lang);
  onTextRef.current = onText;
  langRef.current = lang;

  const supported =
    typeof window !== "undefined" && Boolean(getSpeechRecognitionCtor());

  const stop = useCallback(() => {
    wantListenRef.current = false;
    setListening(false);
    const rec = recRef.current;
    recRef.current = null;
    try {
      rec?.abort();
    } catch {
      /* already stopped */
    }
  }, []);

  const adoptUserText = useCallback((text: string) => {
    if (!wantListenRef.current) return;
    baseRef.current = text;
    finalsRef.current = "";
    lastWrittenRef.current = text;
    consumeFromRef.current = Number.MAX_SAFE_INTEGER;
  }, []);

  const writePrompt = (spokenRaw: string) => {
    const spoken = spokenRaw.replace(/\s+/g, " ").trim();
    const prefix = baseRef.current.replace(/\s+$/g, "");
    const next = !spoken ? baseRef.current : prefix ? `${prefix} ${spoken}` : spoken;
    lastWrittenRef.current = next;
    onTextRef.current(next);
  };

  const start = useCallback(() => {
    const Ctor = getSpeechRecognitionCtor();
    if (!enabled) return;
    if (!Ctor) {
      setError("Dictée indisponible. Ouvrez le site dans Chrome ou Edge.");
      return;
    }

    wantListenRef.current = true;
    setError(null);
    baseRef.current = baseText;
    finalsRef.current = "";
    lastWrittenRef.current = baseText;
    consumeFromRef.current = 0;

    try {
      recRef.current?.abort();
    } catch {
      /* ignore */
    }

    const rec = new Ctor();
    rec.lang = localeToBcp47(langRef.current);
    rec.continuous = true;
    rec.interimResults = true;
    rec.onstart = () => {
      if (wantListenRef.current) setListening(true);
    };
    rec.onresult = (ev) => {
      if (consumeFromRef.current === Number.MAX_SAFE_INTEGER) {
        consumeFromRef.current = ev.results.length;
      }
      let interim = "";
      let finals = finalsRef.current;
      const from = Math.max(ev.resultIndex, consumeFromRef.current);
      for (let i = from; i < ev.results.length; i++) {
        const piece = ev.results[i][0]?.transcript || "";
        if (ev.results[i].isFinal) finals += `${piece} `;
        else interim += piece;
      }
      finalsRef.current = finals;
      writePrompt(`${finals}${interim}`);
    };
    rec.onerror = (ev) => {
      const code = ev.error || "";
      if (code === "aborted" || code === "no-speech") return;
      wantListenRef.current = false;
      setListening(false);
      if (code === "not-allowed" || code === "service-not-allowed") {
        setError(
          "Le micro est bloqué. Autorisez le micro pour luxeflexia.com dans Chrome.",
        );
        return;
      }
      if (code === "network") {
        setError("Dictée indisponible (réseau). Réessayez dans Chrome.");
        return;
      }
      setError("Dictée interrompue. Réessayez.");
    };
    rec.onend = () => {
      if (!wantListenRef.current) {
        setListening(false);
        return;
      }
      baseRef.current = lastWrittenRef.current;
      finalsRef.current = "";
      consumeFromRef.current = 0;
      try {
        rec.start();
      } catch {
        wantListenRef.current = false;
        setListening(false);
      }
    };
    recRef.current = rec;
    try {
      rec.start();
      setListening(true);
    } catch {
      wantListenRef.current = false;
      setListening(false);
      setError("Impossible de démarrer le micro. Réessayez dans Chrome.");
    }
  }, [baseText, enabled]);

  const toggle = useCallback(() => {
    if (wantListenRef.current || listening) stop();
    else start();
  }, [listening, start, stop]);

  useEffect(() => () => stop(), [stop]);

  return { listening, supported, error, toggle, stop, adoptUserText };
}
