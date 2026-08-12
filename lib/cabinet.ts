/**
 * Identity of the practice, printed on every document (ordonnance, compte rendu, facture).
 * Single source of truth — change it here and all three documents follow.
 */

export const CABINET = {
  medecinNom: "Dr. OUNNAS Meriem",
  medecinNomLong: "Docteur OUNNAS Meriem",
  titre: "Chirurgien Orthopédiste",
  titreLong: "Chirurgienne Orthopédiste & Traumatologue",
  titreArabe: "طبيبة مختصة في طب وجراحة العظام والمفاصل",
  ville: "Staoueli",

  email: "dr.ounnas@icloud.com",
  telephone: "+213 561 15 14 86",
  telephoneCourt: "0561 15 14 86",
  instagram: "dr ounnas",
  adresse: "Rue du 20 août - Section 06, ILôt - Staoueli",
  adresseComplete: "Rue 20 Aout section 06 G.P 185 Staoueli, ALGER",
  cabinet: "Cabinet Médical Spécialisé en Orthopédie – Staoueli, Alger",

  // Mentions légales — obligatoires en bas de facture.
  numeroOrdre: "16/20022",
  nif: "28616100106917561680",

  logo: "/logo.png",
} as const

/** Taux de TVA appliqué par défaut aux factures (%). */
export const TVA_DEFAUT = 19

/** Palette des documents imprimés. */
export const PRINT_COLORS = {
  /** Rouge/bordeaux de l'en-tête ordonnance. */
  rouge: "#9E2A3C",
  /** Bleu-gris des libellés de l'ordonnance. */
  ardoise: "#54638A",
  /** Bleu franc des comptes rendus et factures. */
  bleu: "#1A4FA0",
} as const
