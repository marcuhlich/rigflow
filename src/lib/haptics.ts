// src/lib/haptics.ts

const supported = typeof navigator !== "undefined" && "vibrate" in navigator;

export const haptics = {
  /** Kurzer Tap – für normale Buttons */
  tap: () => supported && navigator.vibrate(10),
  /** Bestätigung – z.B. Item gespeichert */
  success: () => supported && navigator.vibrate([40, 20, 40]),
  /** Fehler – z.B. Validierung fehlgeschlagen */
  error: () => supported && navigator.vibrate([80, 30, 80, 30, 80]),
  /** Schwerer Tap – z.B. Löschen-Button */
  heavy: () => supported && navigator.vibrate(60),
  /** Swipe/Auswahl – z.B. Checkbox, Toggle */
  select: () => supported && navigator.vibrate(15),
};