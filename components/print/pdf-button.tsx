"use client"

import { useState } from "react"
import { Download, Loader2 } from "lucide-react"
import { Button } from "@/components/ui/button"
import { telechargerFeuillePdf } from "@/lib/pdf"
import { toast } from "sonner"

/**
 * Télécharge en PDF la feuille rendue dans un aperçu intégré.
 * `getSheet` doit renvoyer l'élément `.sheet` affiché.
 */
export function PdfButton({
  getSheet,
  nomFichier,
  label = "PDF",
}: {
  getSheet: () => HTMLElement | null
  nomFichier: string
  label?: string
}) {
  const [enCours, setEnCours] = useState(false)

  async function telecharger() {
    const feuille = getSheet()
    if (!feuille) {
      toast.error("Aperçu indisponible")
      return
    }
    setEnCours(true)
    try {
      await telechargerFeuillePdf(feuille, nomFichier)
    } catch {
      toast.error("Impossible de générer le PDF")
    } finally {
      setEnCours(false)
    }
  }

  return (
    <Button type="button" variant="outline" onClick={telecharger} disabled={enCours}>
      {enCours ? (
        <Loader2 className="w-3.5 h-3.5 mr-1.5 animate-spin" />
      ) : (
        <Download className="w-3.5 h-3.5 mr-1.5" />
      )}
      {label}
    </Button>
  )
}
