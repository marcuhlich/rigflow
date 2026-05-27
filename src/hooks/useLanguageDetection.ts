// src/hooks/useLanguageDetection.ts
import { useEffect } from 'react';
import { Capacitor } from '@capacitor/core';
import { Device } from '@capacitor/device';
import { changeLanguage } from '../i18n';

export const useLanguageDetection = () => {
  useEffect(() => {
    // Im Browser übernimmt der LanguageDetector von i18next automatisch
    if (!Capacitor.isNativePlatform()) return;

    // Auf Android/iOS: Gerätesprache lesen
    const saved = localStorage.getItem('rigflow_language');
    if (saved) return; // Nutzereinstellung hat Vorrang

    Device.getLanguageCode().then(({ value }) => {
      const lang = value?.toLowerCase().startsWith('de') ? 'de' : 'en';
      changeLanguage(lang);
    }).catch(() => {});
  }, []);
};