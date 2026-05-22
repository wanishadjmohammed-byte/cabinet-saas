import { clsx, type ClassValue } from "clsx"
import { twMerge } from "tailwind-merge"
import { format, differenceInYears, parseISO } from "date-fns"
import { fr } from "date-fns/locale"

export function cn(...inputs: ClassValue[]) {
  return twMerge(clsx(inputs))
}

export function formatCurrency(amount: number): string {
  return new Intl.NumberFormat("fr-DZ", {
    style: "decimal",
    minimumFractionDigits: 0,
    maximumFractionDigits: 0,
  }).format(amount) + " DA"
}

export function formatDate(dateStr: string | null | undefined): string {
  if (!dateStr) return "—"
  try {
    return format(parseISO(dateStr), "d MMM yyyy", { locale: fr })
  } catch {
    return dateStr
  }
}

export function formatDateTime(dateStr: string | null | undefined): string {
  if (!dateStr) return "—"
  try {
    return format(parseISO(dateStr), "d MMM yyyy à HH:mm", { locale: fr })
  } catch {
    return dateStr
  }
}

export function calcAge(dateNaissance: string | null | undefined): number | null {
  if (!dateNaissance) return null
  try {
    return differenceInYears(new Date(), parseISO(dateNaissance))
  } catch {
    return null
  }
}

export function getStatutPaiement(
  montantDu: number,
  totalVerse: number
): "paye" | "partiel" | "impaye" {
  if (totalVerse >= montantDu && montantDu > 0) return "paye"
  if (totalVerse > 0) return "partiel"
  return "impaye"
}

export function statutLabel(statut: "paye" | "partiel" | "impaye"): string {
  const labels = { paye: "Payé", partiel: "Partiel", impaye: "Impayé" }
  return labels[statut]
}

export function today(): string {
  return format(new Date(), "yyyy-MM-dd")
}

export function currentMonth(): { year: number; month: number } {
  const d = new Date()
  return { year: d.getFullYear(), month: d.getMonth() + 1 }
}

export function nextRef(prefix: string, count: number): string {
  return `${prefix}-${String(count + 1).padStart(3, "0")}`
}

export const CATEGORIES_COUT: Record<string, string> = {
  salaires: "Salaires",
  livraison: "Livraison",
  charges: "Charges",
  materiel_medical: "Matériel médical",
  medicaments_injections: "Médicaments / Injections",
  fournitures: "Fournitures",
  entretien: "Entretien",
  assurance: "Assurance",
  impots: "Impôts",
  marketing: "Marketing",
  autre: "Autre",
}

export const STATUT_RDV_LABELS: Record<string, string> = {
  confirme: "Confirmé",
  effectue: "Effectué",
  annule: "Annulé",
  no_show: "No-show",
}
