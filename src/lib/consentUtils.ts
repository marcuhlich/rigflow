import posthog from "posthog-js";
import { logger } from "@/lib/logger";

const CONSENT_KEY = "rigflow_analytics_consent_v1";

let initialized = false;

export function hasAnalyticsConsent(): boolean {
  const consent = localStorage.getItem(CONSENT_KEY);
  return consent === "true";
}

export function setAnalyticsConsent(consent: boolean): void {
  localStorage.setItem(CONSENT_KEY, consent ? "true" : "false");
  
  // Initialize or opt-out PostHog based on consent (no-op if PostHog isn't initialized)
  if (!initialized) return;
  if (consent) {
    posthog.opt_in_capturing();
  } else {
    posthog.opt_out_capturing();
  }
}

export function initializePostHog(): void {
  if (initialized) return;
  const key = import.meta.env.VITE_POSTHOG_KEY;
  if (!key) {
    // No key configured (e.g. local dev) – posthog.init would throw/log noisily
    logger.warn('consentUtils', 'VITE_POSTHOG_KEY missing – analytics disabled');
    return;
  }
  initialized = true;
  posthog.init(key, {
    api_host: import.meta.env.VITE_POSTHOG_HOST,
    autocapture: false,
    opt_out_capturing_by_default: true,
  });
  
  // Apply current consent setting
  if (hasAnalyticsConsent()) {
    posthog.opt_in_capturing();
  } else {
    posthog.opt_out_capturing();
  }
  
  (window as Window & { posthog?: typeof posthog }).posthog = posthog;
}
