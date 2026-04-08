import { clsx, type ClassValue } from "clsx";
import { twMerge } from "tailwind-merge";

export function cn(...inputs: ClassValue[]) {
  return twMerge(clsx(inputs));
}

export function hapticFeedback(pattern: number | number[] = 50) {
  navigator.vibrate?.(pattern);
}

export function hapticStop() {
  navigator.vibrate?.(0);
}

// Registriert das komplette Long-Press-Muster auf einen Schlag:
// [StartBuzz, Stille, AbschlussBuzz]
export function hapticLongPress(durationMs: number) {
  navigator.vibrate?.([12, durationMs - 30, 60]);
}