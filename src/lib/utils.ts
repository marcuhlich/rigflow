import { clsx, type ClassValue } from 'clsx';
import { twMerge } from 'tailwind-merge';
import { isNative } from '@/services/platform';
import { nativeHaptics } from '@/services/native';

export function cn(...inputs: ClassValue[]) {
  return twMerge(clsx(inputs));
}

const ignoreHapticsError = () => { /* haptics are best-effort (plugin may be unavailable) */ };

export function hapticFeedback(pattern: number | number[] = 50) {
  if (isNative()) {
    const run = Array.isArray(pattern) ? nativeHaptics.pattern(pattern) : nativeHaptics.impact(pattern);
    run.catch(ignoreHapticsError);
  } else {
    navigator.vibrate?.(pattern);
  }
}

export function hapticStop() {
  if (!isNative()) {
    navigator.vibrate?.(0);
  }
  // Nativ: kein Stop nötig, Impacts sind einmalig
}

export function hapticLongPress(durationMs: number) {
  if (isNative()) {
    // Long-Press nativ: Light am Anfang, Heavy am Ende
    nativeHaptics.impact(30).catch(ignoreHapticsError);
    setTimeout(() => { nativeHaptics.impact(100).catch(ignoreHapticsError); }, Math.max(0, durationMs - 30));
  } else {
    navigator.vibrate?.([12, Math.max(0, durationMs - 30), 60]);
  }
}
/** Returns the local calendar date as `YYYY-MM-DD` (unlike toISOString(), which uses UTC and can be off by one day). */
export function toLocalDateString(date: Date = new Date()): string {
  const y = date.getFullYear();
  const m = String(date.getMonth() + 1).padStart(2, '0');
  const d = String(date.getDate()).padStart(2, '0');
  return `${y}-${m}-${d}`;
}
