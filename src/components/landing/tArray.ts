import type { TFunction } from "i18next";

/**
 * Reads an array resource (returnObjects) and guarantees an array.
 * A missing key returns the key string in i18next, which would crash `.map`.
 */
export function tArray<T>(t: TFunction, key: string): T[] {
  const value: unknown = t(key, { returnObjects: true });
  return Array.isArray(value) ? (value as T[]) : [];
}
