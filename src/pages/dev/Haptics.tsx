import { useState } from "react";
import { Button } from "@/components/ui/button";
import { hapticFeedback, hapticStop, hapticLongPress } from "@/lib/utils";

type LogEntry = { time: string; label: string };

export default function HapticsTest() {
  const [log, setLog] = useState<LogEntry[]>([]);

  const push = (label: string) => {
    setLog(prev => [
      { time: new Date().toLocaleTimeString("de-DE"), label },
      ...prev.slice(0, 19),
    ]);
  };

  const fire = (label: string, fn: () => void) => {
    fn();
    push(label);
  };

  const PATTERNS: { label: string; desc: string; fn: () => void }[] = [
    {
      label: "hapticFeedback(30)",
      desc: "Sehr kurz — Tap",
      fn: () => hapticFeedback(30),
    },
    {
      label: "hapticFeedback(50)",
      desc: "Kurz — Standard",
      fn: () => hapticFeedback(50),
    },
    {
      label: "hapticFeedback(80)",
      desc: "Mittel — Long-Press-End",
      fn: () => hapticFeedback(80),
    },
    {
      label: "hapticFeedback(100)",
      desc: "Stark — Delete",
      fn: () => hapticFeedback(100),
    },
    {
      label: "hapticFeedback(200)",
      desc: "Lang — Fehler",
      fn: () => hapticFeedback(200),
    },
    {
      label: "navigator.vibrate([30,50,30])",
      desc: "Doppelt-Tap",
      fn: () => navigator.vibrate?.([30, 50, 30]),
    },
    {
      label: "navigator.vibrate([50,30,50,30,50])",
      desc: "Triple — Erfolg",
      fn: () => navigator.vibrate?.([50, 30, 50, 30, 50]),
    },
    {
      label: "navigator.vibrate([6,40,12])",
      desc: "Swipe-Reveal (wie Lending)",
      fn: () => navigator.vibrate?.([6, 40, 12]),
    },
    {
      label: "navigator.vibrate(8)",
      desc: "Card-Press (wie Bento)",
      fn: () => navigator.vibrate?.(8),
    },
    {
      label: "hapticLongPress(1000)",
      desc: "Long-Press-Muster starten (1s)",
      fn: () => hapticLongPress(1000),
    },
    {
      label: "hapticStop()",
      desc: "Laufendes Muster stoppen",
      fn: () => hapticStop(),
    },
    {
      label: "navigator.vibrate([100,50,100,50,200])",
      desc: "Fehler / Warnung",
      fn: () => navigator.vibrate?.([100, 50, 100, 50, 200]),
    },
  ];

  const isSupported =
    typeof navigator !== "undefined" && "vibrate" in navigator;

  return (
    <div className="min-h-screen bg-background p-8 space-y-6 max-w-md mx-auto">
      <div>
        <h1 className="text-xl font-bold mb-1">📳 Haptics Testbench</h1>
        <p className="text-sm text-muted-foreground">
          Unterstützt:{" "}
          <strong>{isSupported ? "✅ Ja" : "❌ Nein (kein Mobile)"}</strong>
        </p>
        {!isSupported && (
          <p className="text-xs text-muted-foreground mt-1">
            Auf einem echten Gerät oder im mobilen Emulator testen.
          </p>
        )}
      </div>

      <div className="space-y-2">
        <p className="text-xs font-semibold text-muted-foreground uppercase tracking-wider">
          Muster
        </p>
        {PATTERNS.map((p) => (
          <button
            key={p.label}
            onClick={() => fire(p.label, p.fn)}
            className="w-full flex items-start justify-between gap-3 p-3 rounded-lg border border-border hover:bg-muted/30 active:scale-[0.98] transition-all text-left"
          >
            <div className="min-w-0">
              <p className="text-sm font-medium truncate">{p.desc}</p>
              <p className="text-xs text-muted-foreground font-mono mt-0.5 truncate">
                {p.label}
              </p>
            </div>
          </button>
        ))}
      </div>

      {/* Custom */}
      <div className="space-y-2">
        <p className="text-xs font-semibold text-muted-foreground uppercase tracking-wider">
          Custom ms
        </p>
        <CustomFire onFire={push} />
      </div>

      {/* Log */}
      {log.length > 0 && (
        <div className="space-y-2">
          <div className="flex items-center justify-between">
            <p className="text-xs font-semibold text-muted-foreground uppercase tracking-wider">
              Log
            </p>
            <button
              onClick={() => setLog([])}
              className="text-xs text-muted-foreground hover:text-foreground transition-colors"
            >
              Leeren
            </button>
          </div>
          <div className="rounded-lg border border-border divide-y divide-border/50 overflow-hidden">
            {log.map((entry, i) => (
              <div key={i} className="flex items-center gap-3 px-3 py-2 bg-muted/10">
                <span className="text-[10px] text-muted-foreground shrink-0 font-mono">
                  {entry.time}
                </span>
                <span className="text-xs truncate">{entry.label}</span>
              </div>
            ))}
          </div>
        </div>
      )}
    </div>
  );
}

function CustomFire({ onFire }: { onFire: (label: string) => void }) {
  const [ms, setMs] = useState(50);
  return (
    <div className="flex gap-2 items-center">
      <input
        type="range"
        min={10}
        max={500}
        step={10}
        value={ms}
        onChange={e => setMs(Number(e.target.value))}
        className="flex-1"
      />
      <span className="text-xs font-mono w-12 text-right">{ms}ms</span>
      <button
        onClick={() => {
          hapticFeedback(ms);
          onFire(`hapticFeedback(${ms})`);
        }}
        className="px-3 py-1.5 rounded-md border border-border text-xs hover:bg-muted/30 active:scale-95 transition-all"
      >
        Feuern
      </button>
    </div>
  );
}