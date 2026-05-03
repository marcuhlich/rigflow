import { Haptics, ImpactStyle, NotificationType } from '@capacitor/haptics';
import { isNative } from '@/services/platform';

/**
 * Einfaches Feedback – ersetzt navigator.vibrate(ms)
 * Mapping: ≤30ms → Light, ≤80ms → Medium, >80ms → Heavy
 */
async function impact(ms: number): Promise<void> {
  if (ms <= 30) {
    // Sehr kurz → Haptics.vibrate() gibt das Klick-Feeling
    // und ist trotzdem DND-unabhängig (kein navigator.vibrate!)
    await Haptics.vibrate({ duration: ms });
  } else {
    const style = ms <= 80 ? ImpactStyle.Medium : ImpactStyle.Heavy;
    await Haptics.impact({ style });
  }
}

/**
 * Muster-Feedback – ersetzt navigator.vibrate([...])
 * Auf Native: Wir spielen für jeden Vibrations-Slot einen Impact ab.
 */
async function pattern(slots: number[]): Promise<void> {
  // slots = [vibrate, pause, vibrate, pause, ...]
  // Geradzahlige Indizes = vibrieren, ungeradzahlige = Pause
  for (let i = 0; i < slots.length; i++) {
    if (i % 2 === 0) {
      // Vibrations-Slot
      await Haptics.impact({
        style: slots[i] <= 30 ? ImpactStyle.Light :
               slots[i] <= 80 ? ImpactStyle.Medium :
                                ImpactStyle.Heavy,
      });
    } else {
      // Pause
      await new Promise(res => setTimeout(res, slots[i]));
    }
  }
}

export const nativeHaptics = { impact, pattern };