import { type ClassValue, clsx } from "clsx";
import { twMerge } from "tailwind-merge";

export function cn(...inputs: ClassValue[]) {
  return twMerge(clsx(inputs));
}

export function formatNumber(num: number): string {
  if (isNaN(num)) return "—";
  return new Intl.NumberFormat("en-US", {
    maximumFractionDigits: 2,
  }).format(num);
}
