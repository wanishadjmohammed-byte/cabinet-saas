/**
 * Totaux d'une facture.
 * Les montants sont stockés en dinars entiers : la TVA est donc arrondie à l'unité.
 */
export function calcTotaux(lignes: { montant: number }[], tva: number) {
  const totalHT = lignes.reduce((s, l) => s + l.montant, 0)
  const montantTva = Math.round((totalHT * tva) / 100)
  return { totalHT, montantTva, totalTTC: totalHT + montantTva }
}
