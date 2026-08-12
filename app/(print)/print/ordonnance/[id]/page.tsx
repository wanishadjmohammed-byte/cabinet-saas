import { notFound } from "next/navigation"
import { getConsultationForPrint } from "@/actions/consultations"
import { calcAge } from "@/lib/utils"
import { OrdonnanceSheet } from "@/components/print/documents/ordonnance-sheet"
import { PrintToolbar } from "@/components/print/print-toolbar"
import { nomFichierSur } from "@/lib/pdf"

export default async function OrdonnancePrintPage({
  params,
}: {
  params: Promise<{ id: string }>
}) {
  const { id } = await params
  const consultation = await getConsultationForPrint(id)
  if (!consultation) notFound()

  const p = consultation.patient

  return (
    <>
      {/* Le format A5 est déclaré ici : @page ne peut pas être porté par une classe. */}
      <style>{`@page { size: A5 portrait; margin: 0; }`}</style>

      <PrintToolbar
        title={`Ordonnance — ${p?.prenom ?? ""} ${p?.nom ?? ""} · ${consultation.ref}`}
        pdfName={nomFichierSur("Ordonnance", p?.nom, p?.prenom, consultation.date)}
      />

      <OrdonnanceSheet
        data={{
          date: consultation.date,
          patientNom: p?.nom ?? "",
          patientPrenom: p?.prenom ?? "",
          age: calcAge(p?.dateNaissance),
          ordonnance: consultation.ordonnance,
        }}
      />
    </>
  )
}
