import { clsx } from "clsx"
import { twMerge } from "tailwind-merge"

export function cn(...inputs) {
  return twMerge(clsx(inputs))
}

// format currency to egp with arabic
export function formatCurrency(amount) {
  // Round to nearest whole number and format as currency without decimals
  const roundedAmount = Math.round(amount);
  return new Intl.NumberFormat("en-US", {
    style: "currency",
    currency: "EGP",
    minimumFractionDigits: 0,
    maximumFractionDigits: 0,
  }).format(roundedAmount)
}
