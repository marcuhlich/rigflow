import posthog from "posthog-js";

const CONSENT_KEY = "rigflow_analytics_consent_v1";

export function hasAnalyticsConsent(): boolean {
  const consent = localStorage.getItem(CONSENT_KEY);
  return consent === "true";
}

export function setAnalyticsConsent(consent: boolean): void {
  localStorage.setItem(CONSENT_KEY, consent ? "true" : "false");
  
  // Initialize or opt-out PostHog based on consent
  if (consent) {
    posthog.opt_in_capturing();
  } else {
    posthog.opt_out_capturing();
  }
}

export function initializePostHog(): void {
  posthog.init(import.meta.env.VITE_POSTHOG_KEY, {
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
  
  (window as any).posthog = posthog;
}
