import { notFound } from "next/navigation"
import { getCertificatById } from "@/actions/certificats"
import { calcAge } from "@/lib/utils"
import { CertificatSheet } from "@/components/print/documents/certificat-sheet"
import { PrintToolbar } from "@/components/print/print-toolbar"
import { nomFichierSur } from "@/lib/pdf"

export default async function CertificatPrintPage({
  params,
}: {
  params: Promise<{ id: string }>
}) {
  const { id } = await params
  const certificat = await getCertificatById(id)
  if (!certificat) notFound()

  const p = certificat.patient

  return (
    <>
      <style>{`@page { size: A5 portrait; margin: 0; }`}</style>

      <PrintToolbar
        title={`Arrêt de travail — ${p.prenom} ${p.nom} · ${certificat.ref}`}
        pdfName={nomFichierSur("Arret-travail", p.nom, p.prenom, certificat.date)}
      />

      <CertificatSheet
        data={{
          date: certificat.date,
          patientNom: p.nom,
          patientPrenom: p.prenom,
          age: calcAge(p.dateNaissance),
          nature: certificat.nature,
          nombreJours: certificat.nombreJours,
          dateDebut: certificat.dateDebut,
          dateFin: certificat.dateFin,
          dateReprise: certificat.dateReprise,
        }}
      />
    </>
  )
}
