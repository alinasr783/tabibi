import { clsx } from "clsx"
import { twMerge } from "tailwind-merge"

export function cn(...inputs) {
  return twMerge(clsx(inputs))
}

// format currency to egp with arabic
export function formatCurrency(amount) {
  // Round to nearest whole number and format as currency without decimals
  const roundedAmount = Math.round(amount);
  return new Intl.NumberFormat("ar-EG", {
    style: "currency",
    currency: "EGP",
    minimumFractionDigits: 0,
    maximumFractionDigits: 0,
  }).format(roundedAmount)
}

export function hexToRgba(hex, alpha = 1) {
  const a = typeof alpha === "number" ? Math.min(1, Math.max(0, alpha)) : 1;
  const raw = typeof hex === "string" ? hex.trim().replace("#", "") : "";
  if (raw.length === 3) {
    const r = parseInt(raw[0] + raw[0], 16);
    const g = parseInt(raw[1] + raw[1], 16);
    const b = parseInt(raw[2] + raw[2], 16);
    if ([r, g, b].some((n) => Number.isNaN(n))) return `rgba(0,0,0,${a})`;
    return `rgba(${r},${g},${b},${a})`;
  }
  if (raw.length === 6) {
    const r = parseInt(raw.slice(0, 2), 16);
    const g = parseInt(raw.slice(2, 4), 16);
    const b = parseInt(raw.slice(4, 6), 16);
    if ([r, g, b].some((n) => Number.isNaN(n))) return `rgba(0,0,0,${a})`;
    return `rgba(${r},${g},${b},${a})`;
  }
  return `rgba(0,0,0,${a})`;
}
