/** Palette et libellés des statuts de rendez-vous, partagés par le kanban et le planning. */

export type StatutRdv =
  | "confirme"
  | "arrive"
  | "en_consultation"
  | "effectue"
  | "annule"
  | "no_show"

export const STATUT_RDV_LABEL: Record<string, string> = {
  confirme: "Confirmé",
  arrive: "Arrivé",
  en_consultation: "En consultation",
  effectue: "Terminé",
  annule: "Annulé",
  no_show: "No-show",
}

/** trait = bordure et texte, fond = remplissage du bloc. */
export const STATUT_RDV_COLOR: Record<string, { trait: string; fond: string }> = {
  confirme: { trait: "#3B82F6", fond: "#EFF6FF" },
  arrive: { trait: "#F59E0B", fond: "#FFFBEB" },
  en_consultation: { trait: "#8B5CF6", fond: "#F5F3FF" },
  effectue: { trait: "#10B981", fond: "#ECFDF5" },
  annule: { trait: "#9CA3AF", fond: "#F4F4F5" },
  no_show: { trait: "#9CA3AF", fond: "#F4F4F5" },
}

export function statutColor(statut: string) {
  return STATUT_RDV_COLOR[statut] ?? STATUT_RDV_COLOR.confirme
}

/** "09:30:00" → 570 minutes depuis minuit. */
export function heureEnMinutes(heure: string): number {
  const [h, m] = heure.split(":").map(Number)
  return h * 60 + (m || 0)
}
