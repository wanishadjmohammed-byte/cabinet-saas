"use client"

import { useEffect, useRef, useState } from "react"
import { Printer, ArrowLeft, Download, Loader2 } from "lucide-react"
import { useRouter } from "next/navigation"
import { telechargerFeuillePdf } from "@/lib/pdf"
import { toast } from "sonner"

/**
 * Barre flottante affichée à l'écran uniquement (masquée par `.no-print`).
 * Ouvre le dialogue d'impression au chargement : imprimer reste à un clic.
 */
export function PrintToolbar({
  title,
  pdfName,
  autoPrint = true,
}: {
  title: string
  pdfName: string
  autoPrint?: boolean
}) {
  const fired = useRef(false)
  const router = useRouter()
  const [ready, setReady] = useState(false)
  const [pdfEnCours, setPdfEnCours] = useState(false)

  useEffect(() => {
    setReady(true)
    if (!autoPrint || fired.current) return
    fired.current = true

    // Attendre le filigrane et les polices, sinon l'aperçu sort à moitié vide.
    let cancelled = false
    const go = () => {
      if (!cancelled) window.print()
    }
    const fonts = document.fonts?.ready ?? Promise.resolve()
    Promise.all([fonts, waitForImages()]).then(() => setTimeout(go, 150))

    return () => {
      cancelled = true
    }
  }, [autoPrint])

  async function telecharger() {
    const feuille = document.querySelector<HTMLElement>(".sheet")
    if (!feuille) return
    setPdfEnCours(true)
    try {
      await telechargerFeuillePdf(feuille, pdfName)
    } catch {
      toast.error("Impossible de générer le PDF")
    } finally {
      setPdfEnCours(false)
    }
  }

  return (
    <div className="no-print fixed top-0 inset-x-0 z-50 flex items-center justify-between gap-3 border-b border-neutral-200 bg-white/95 px-4 py-2.5 backdrop-blur">
      <div className="flex items-center gap-3 min-w-0">
        <button
          type="button"
          onClick={() => router.back()}
          className="flex h-8 w-8 shrink-0 items-center justify-center rounded-md text-neutral-500 transition-colors hover:bg-neutral-100 hover:text-neutral-900"
          aria-label="Retour"
        >
          <ArrowLeft className="h-4 w-4" />
        </button>
        <span className="truncate text-sm font-medium text-neutral-800">{title}</span>
      </div>

      <div className="flex shrink-0 items-center gap-2">
        <button
          type="button"
          onClick={telecharger}
          disabled={!ready || pdfEnCours}
          className="flex items-center gap-2 rounded-md border border-neutral-300 px-3 py-1.5 text-sm font-medium text-neutral-700 transition-colors hover:bg-neutral-100 disabled:opacity-50"
        >
          {pdfEnCours ? <Loader2 className="h-4 w-4 animate-spin" /> : <Download className="h-4 w-4" />}
          PDF
        </button>

        <button
          type="button"
          onClick={() => window.print()}
          disabled={!ready}
          className="flex items-center gap-2 rounded-md bg-neutral-900 px-3.5 py-1.5 text-sm font-medium text-white transition-opacity hover:opacity-90 disabled:opacity-50"
        >
          <Printer className="h-4 w-4" />
          Imprimer
        </button>
      </div>
    </div>
  )
}

function waitForImages(): Promise<unknown> {
  const pending = Array.from(document.images)
    .filter((img) => !img.complete)
    .map(
      (img) =>
        new Promise((resolve) => {
          img.addEventListener("load", resolve, { once: true })
          img.addEventListener("error", resolve, { once: true })
        })
    )
  return Promise.all(pending)
}
