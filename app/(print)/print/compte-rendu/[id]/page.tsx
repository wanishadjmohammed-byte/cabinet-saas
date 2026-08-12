import { notFound } from "next/navigation"
import { getCompteRenduById } from "@/actions/comptes-rendus"
import { calcAge } from "@/lib/utils"
import { CompteRenduSheet } from "@/components/print/documents/compte-rendu-sheet"
import { PrintToolbar } from "@/components/print/print-toolbar"
import { nomFichierSur } from "@/lib/pdf"

export default async function CompteRenduPrintPage({
  params,
}: {
  params: Promise<{ id: string }>
}) {
  const { id } = await params
  const cr = await getCompteRenduById(id)
  if (!cr) notFound()

  const p = cr.patient

  return (
    <>
      <style>{`@page { size: A5 portrait; margin: 0; }`}</style>

      <PrintToolbar
        title={`Compte rendu — ${p.prenom} ${p.nom} · ${cr.ref}`}
        pdfName={nomFichierSur("Compte-rendu", p.nom, p.prenom, cr.date)}
      />

      <CompteRenduSheet
        data={{
          type: cr.type,
          date: cr.date,
          motif: cr.motif,
          contenu: cr.contenu,
          patientPrenom: p.prenom,
          patientNom: p.nom,
          age: calcAge(p.dateNaissance),
          sexe: p.sexe,
        }}
      />
    </>
  )
}
