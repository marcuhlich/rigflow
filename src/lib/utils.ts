import { clsx, type ClassValue } from 'clsx';
import { twMerge } from 'tailwind-merge';
import { isNative } from '@/services/platform';
import { nativeHaptics } from '@/services/native';

export function cn(...inputs: ClassValue[]) {
  return twMerge(clsx(inputs));
}

export function hapticFeedback(pattern: number | number[] = 50) {
  if (isNative()) {
    if (Array.isArray(pattern)) {
      nativeHaptics.pattern(pattern);
    } else {
      nativeHaptics.impact(pattern);
    }
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
    nativeHaptics.impact(30);
    setTimeout(() => nativeHaptics.impact(100), durationMs - 30);
  } else {
    navigator.vibrate?.([12, durationMs - 30, 60]);
  }
}