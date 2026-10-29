import type { TFunction } from "i18next";
import posthog from "posthog-js";
import { isNative } from "@/services/platform";
import { ANALYTICS_CONSENT_KEY, ONBOARDING_DONE_KEY } from "@/lib/constants";

/** Maps Supabase auth error messages to translated, user-facing text. */
export function getAuthErrorMessage(rawMessage: string, t: TFunction): string {
  const map: Array<[string, string]> = [
    ["Email rate limit exceeded", "auth.errors.rate_limit"],
    ["rate limit", "auth.errors.rate_limit"],
    ["Email not confirmed", "auth.errors.email_not_confirmed"],
    ["Invalid login credentials", "auth.errors.invalid_credentials"],
  ];
  const hit = map.find(([needle]) => rawMessage.toLowerCase().includes(needle.toLowerCase()));
  return hit ? t(hit[1]) : t("auth.errors.unknown");
}

/** Where to go after a completed login. */
export function getPostLoginRoute(): string {
  if (isNative() && !localStorage.getItem(ONBOARDING_DONE_KEY)) return "/native-onboarding";
  return "/install-prompt";
}

/** Sends a PostHog event only when the user opted in to analytics. */
export function captureIfConsented(event: string) {
  try {
    if (localStorage.getItem(ANALYTICS_CONSENT_KEY) === "true") posthog.capture(event);
  } catch {
    // Analytics must never break auth flows.
  }
}

export const EMAIL_REDIRECT_NATIVE = "com.rigflow.app://auth/callback";
