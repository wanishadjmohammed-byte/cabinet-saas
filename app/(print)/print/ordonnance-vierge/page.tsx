import { OrdonnanceSheet } from "@/components/print/documents/ordonnance-sheet"
import { PrintToolbar } from "@/components/print/print-toolbar"

/**
 * Ordonnance vierge : le papier à en-tête du cabinet, sans aucune donnée.
 * Sert à imprimer une réserve de feuilles que la doctoresse remplit à la main.
 */
export default function OrdonnanceViergePrintPage() {
  return (
    <>
      <style>{`@page { size: A5 portrait; margin: 0; }`}</style>

      <PrintToolbar title="Ordonnance vierge" pdfName="Ordonnance-vierge" />

      <OrdonnanceSheet
        data={{
          date: "",
          patientNom: "",
          patientPrenom: "",
          age: null,
          ordonnance: null,
          vierge: true,
        }}
      />
    </>
  )
}
