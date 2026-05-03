import { Capacitor } from '@capacitor/core';

/** Läuft als native Android/iOS App (Capacitor) */
export const isNative = () => Capacitor.isNativePlatform();

/** Läuft im Electron-Desktop-Client */
export const isElectron = () =>
  typeof navigator !== 'undefined' &&
  navigator.userAgent.includes('Electron');

/** Läuft im normalen Browser oder als PWA */
export const isWeb = () => !isNative() && !isElectron();

/** Gibt 'android', 'ios', oder 'web' zurück */
export const getPlatform = () => Capacitor.getPlatform();