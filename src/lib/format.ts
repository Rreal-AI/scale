/**
 * Utility functions for formatting and parsing data
 */

export function parsePrice(value: string | number): number {
  if (typeof value === "number") return value;
  if (!value || typeof value !== "string") return 0;

  // Remove any non-digit, non-dot, non-comma characters
  const cleaned = value.replace(/[^\d.,]/g, "");

  // Handle different decimal separators
  // If there are multiple dots or commas, treat the last one as decimal separator
  const lastDotIndex = cleaned.lastIndexOf(".");
  const lastCommaIndex = cleaned.lastIndexOf(",");

  let normalized = cleaned;

  if (lastDotIndex > lastCommaIndex) {
    // Dot is the decimal separator
    normalized = cleaned.replace(/,/g, "");
  } else if (lastCommaIndex > lastDotIndex) {
    // Comma is the decimal separator
    normalized = cleaned.replace(/\./g, "").replace(",", ".");
  }

  const parsed = parseFloat(normalized);
  return isNaN(parsed) ? 0 : Math.max(0, parsed); // Ensure non-negative
}

export function formatPrice(priceInCents: number): string {
  return new Intl.NumberFormat("en-US", {
    style: "currency",
    currency: "USD",
  }).format(priceInCents / 100);
}

export function formatWeight(weightInGrams: number): string {
  if (weightInGrams >= 1000) {
    return `${(weightInGrams / 1000).toFixed(1)} kg`;
  }
  return `${weightInGrams} g`;
}

export function formatDate(dateString: string): string {
  return new Date(dateString).toLocaleDateString("en-US", {
    year: "numeric",
    month: "long",
    day: "numeric",
    hour: "2-digit",
    minute: "2-digit",
  });
}

export function formatRelativeTime(dateString: string): string {
  const date = new Date(dateString);
  const now = new Date();
  const diffInSeconds = Math.floor((now.getTime() - date.getTime()) / 1000);

  const rtf = new Intl.RelativeTimeFormat("en", { numeric: "auto" });

  if (diffInSeconds < 60) {
    return rtf.format(-diffInSeconds, "second");
  } else if (diffInSeconds < 3600) {
    return rtf.format(-Math.floor(diffInSeconds / 60), "minute");
  } else if (diffInSeconds < 86400) {
    return rtf.format(-Math.floor(diffInSeconds / 3600), "hour");
  } else if (diffInSeconds < 2592000) {
    return rtf.format(-Math.floor(diffInSeconds / 86400), "day");
  } else if (diffInSeconds < 31536000) {
    return rtf.format(-Math.floor(diffInSeconds / 2592000), "month");
  } else {
    return rtf.format(-Math.floor(diffInSeconds / 31536000), "year");
  }
}
