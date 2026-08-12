import { notFound } from "next/navigation"
import { getFactureById } from "@/actions/factures"
import { FactureSheet } from "@/components/print/documents/facture-sheet"
import { PrintToolbar } from "@/components/print/print-toolbar"
import { nomFichierSur } from "@/lib/pdf"

export default async function FacturePrintPage({
  params,
}: {
  params: Promise<{ id: string }>
}) {
  const { id } = await params
  const facture = await getFactureById(id)
  if (!facture) notFound()

  return (
    <>
      <style>{`@page { size: A5 portrait; margin: 0; }`}</style>

      <PrintToolbar
        title={`Facture N° ${facture.numero} — ${facture.patientNom}`}
        pdfName={nomFichierSur("Facture", facture.numero, facture.patientNom)}
      />

      <FactureSheet
        data={{
          numero: facture.numero,
          date: facture.date,
          patientNom: facture.patientNom,
          patientAge: facture.patientAge,
          patientSexe: facture.patientSexe,
          typeIntervention: facture.typeIntervention,
          dateIntervention: facture.dateIntervention,
          tva: facture.tva,
          lignes: facture.lignes,
        }}
      />
    </>
  )
}
