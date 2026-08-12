/**
 * Export PDF d'une feuille de document.
 *
 * La feuille est capturée telle qu'elle est rendue à l'écran, ce qui garantit
 * que le PDF est identique à l'impression. Le rendu est matriciel (image haute
 * définition) : pour un PDF à texte sélectionnable, passer par
 * « Imprimer → Enregistrer au format PDF ».
 */

/** Résolution de capture — 3× ≈ 280 dpi sur une A5. */
const ECHELLE = 3

export type FormatFeuille = { largeurMm: number; hauteurMm: number }

export const A5: FormatFeuille = { largeurMm: 148, hauteurMm: 210 }

export async function telechargerFeuillePdf(
  feuille: HTMLElement,
  nomFichier: string,
  format: FormatFeuille = A5
) {
  const [{ default: html2canvas }, { jsPDF }] = await Promise.all([
    import("html2canvas"),
    import("jspdf"),
  ])

  // L'aperçu intégré applique une mise à l'échelle CSS au parent : on la
  // neutralise le temps de la capture, sinon le PDF sort réduit.
  const parent = feuille.parentElement
  const transformeInitiale = parent?.style.transform ?? null
  if (parent) parent.style.transform = "none"

  let canvas: HTMLCanvasElement
  try {
    canvas = await html2canvas(feuille, {
      scale: ECHELLE,
      backgroundColor: "#ffffff",
      useCORS: true,
      logging: false,
    })
  } finally {
    if (parent) parent.style.transform = transformeInitiale ?? ""
  }

  const pdf = new jsPDF({
    orientation: "portrait",
    unit: "mm",
    format: [format.largeurMm, format.hauteurMm],
  })

  const pxParMm = canvas.width / format.largeurMm
  const hauteurPagePx = Math.floor(format.hauteurMm * pxParMm)
  // Marge d'arrondi : sans elle, quelques pixels de dépassement suffisent à
  // produire une seconde page quasi vide. 0,5 % d'une page ≈ 1 mm, pris dans
  // la marge basse de la feuille.
  const tolerance = Math.max(2, Math.round(hauteurPagePx * 0.005))
  const pages = Math.max(1, Math.ceil((canvas.height - tolerance) / hauteurPagePx))

  for (let i = 0; i < pages; i++) {
    if (i > 0) pdf.addPage([format.largeurMm, format.hauteurMm], "portrait")

    const hauteurTranche = Math.min(hauteurPagePx, canvas.height - i * hauteurPagePx)

    // Une tranche = une page. On la recopie sur un canvas intermédiaire.
    const tranche = document.createElement("canvas")
    tranche.width = canvas.width
    tranche.height = hauteurTranche
    const ctx = tranche.getContext("2d")
    if (!ctx) continue
    ctx.fillStyle = "#ffffff"
    ctx.fillRect(0, 0, tranche.width, tranche.height)
    ctx.drawImage(canvas, 0, -i * hauteurPagePx)

    pdf.addImage(
      tranche.toDataURL("image/jpeg", 0.95),
      "JPEG",
      0,
      0,
      format.largeurMm,
      hauteurTranche / pxParMm
    )
  }

  pdf.save(nomFichier.endsWith(".pdf") ? nomFichier : `${nomFichier}.pdf`)
}

/** Nettoie un libellé pour en faire un nom de fichier sûr. */
export function nomFichierSur(...parties: (string | null | undefined)[]): string {
  return parties
    .filter(Boolean)
    .join("-")
    .normalize("NFD")
    .replace(/[̀-ͯ]/g, "") // accents combinés
    .replace(/[^a-zA-Z0-9-_]+/g, "-")
    .replace(/-+/g, "-")
    .replace(/^-|-$/g, "")
}
