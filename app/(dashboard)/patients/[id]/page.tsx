import { getPatientById } from "@/actions/patients"
import { notFound } from "next/navigation"
import { Badge } from "@/components/ui/badge"
import { Card, CardContent, CardHeader, CardTitle } from "@/components/ui/card"
import { formatCurrency, formatDate, calcAge } from "@/lib/utils"
import Link from "next/link"
import { ChevronLeft } from "lucide-react"

export default async function PatientDetailPage({ params }: { params: Promise<{ id: string }> }) {
  const { id } = await params
  const patient = await getPatientById(id)
  if (!patient) notFound()

  const montantDuCalc = patient.consultations.reduce((s, c) => s + c.prixFinal, 0)
  const montantDu = patient.montantDuCustom ?? montantDuCalc
  const totalVerse = patient.versements.reduce((s, v) => s + v.montant, 0)
  const restant = montantDu - totalVerse
  const statut = totalVerse >= montantDu && montantDu > 0 ? "paye" : totalVerse > 0 ? "partiel" : "impaye"
  const statutLabels = { paye: "Payé", partiel: "Partiel", impaye: "Impayé" }

  return (
    <div className="space-y-5 max-w-4xl">
      <div className="flex items-center gap-2">
        <Link href="/patients" className="text-muted-foreground hover:text-foreground transition-colors">
          <ChevronLeft className="w-4 h-4" />
        </Link>
        <div>
          <h1 className="text-lg font-semibold">{patient.prenom} {patient.nom}</h1>
          <p className="text-xs text-muted-foreground font-mono">{patient.ref}</p>
        </div>
      </div>

      <div className="grid grid-cols-1 md:grid-cols-3 gap-4">
        {/* Fiche patient */}
        <Card className="md:col-span-2">
          <CardHeader><CardTitle>Informations</CardTitle></CardHeader>
          <CardContent>
            <dl className="grid grid-cols-2 gap-x-6 gap-y-3 text-sm">
              {[
                ["Prénom", patient.prenom], ["Nom", patient.nom],
                ["Téléphone", patient.telephone],
                ["Date de naissance", formatDate(patient.dateNaissance)],
                ["Âge", calcAge(patient.dateNaissance) ? `${calcAge(patient.dateNaissance)} ans` : "—"],
                ["Sexe", patient.sexe === "H" ? "Homme" : patient.sexe === "F" ? "Femme" : "—"],
                ["Pathologie", patient.pathologie ?? "—"],
                ["Inscrit le", formatDate(patient.createdAt.toISOString())],
              ].map(([k, v]) => (
                <div key={k}>
                  <dt className="text-muted-foreground text-xs">{k}</dt>
                  <dd className="font-medium mt-0.5">{v}</dd>
                </div>
              ))}
              {patient.notesMedicales && (
                <div className="col-span-2">
                  <dt className="text-muted-foreground text-xs">Notes médicales</dt>
                  <dd className="mt-0.5 whitespace-pre-wrap">{patient.notesMedicales}</dd>
                </div>
              )}
            </dl>
          </CardContent>
        </Card>

        {/* Paiement */}
        <Card>
          <CardHeader><CardTitle>Paiement</CardTitle></CardHeader>
          <CardContent className="space-y-3">
            <Badge variant={statut as "paye" | "partiel" | "impaye"}>{statutLabels[statut]}</Badge>
            <div className="space-y-2 text-sm">
              <div className="flex justify-between"><span className="text-muted-foreground">Montant dû</span><span className="font-semibold">{formatCurrency(montantDu)}</span></div>
              <div className="flex justify-between"><span className="text-muted-foreground">Versé</span><span className="font-semibold text-emerald-600">{formatCurrency(totalVerse)}</span></div>
              <div className="flex justify-between border-t border-border pt-2"><span className="text-muted-foreground">Restant</span><span className={`font-bold ${restant > 0 ? "text-red-600" : "text-emerald-600"}`}>{formatCurrency(restant)}</span></div>
            </div>
          </CardContent>
        </Card>
      </div>

      {/* Consultations */}
      <Card>
        <CardHeader><CardTitle>Consultations ({patient.consultations.length})</CardTitle></CardHeader>
        <CardContent>
          {patient.consultations.length === 0 ? (
            <p className="text-sm text-muted-foreground text-center py-4">Aucune consultation</p>
          ) : (
            <div className="divide-y divide-border">
              {patient.consultations.map((c) => (
                <div key={c.id} className="py-3 flex items-start justify-between gap-4">
                  <div>
                    <p className="text-sm font-medium">{c.service?.nom ?? "Service non défini"}</p>
                    <p className="text-xs text-muted-foreground">{formatDate(c.date)} · {c.ref}</p>
                    {c.diagnostic && <p className="text-xs text-muted-foreground mt-1 italic">{c.diagnostic}</p>}
                  </div>
                  <span className="text-sm font-semibold shrink-0">{formatCurrency(c.prixFinal)}</span>
                </div>
              ))}
            </div>
          )}
        </CardContent>
      </Card>

      {/* Versements */}
      <Card>
        <CardHeader><CardTitle>Versements ({patient.versements.length})</CardTitle></CardHeader>
        <CardContent>
          {patient.versements.length === 0 ? (
            <p className="text-sm text-muted-foreground text-center py-4">Aucun versement</p>
          ) : (
            <div className="divide-y divide-border">
              {patient.versements.map((v) => (
                <div key={v.id} className="py-3 flex items-center justify-between">
                  <div>
                    <p className="text-sm font-medium capitalize">{v.type} · {v.mode === "baridi_mob" ? "Baridi Mob" : "Espèces"}</p>
                    <p className="text-xs text-muted-foreground">{formatDate(v.date)} · {v.ref}</p>
                  </div>
                  <span className="text-sm font-semibold text-emerald-600">{formatCurrency(v.montant)}</span>
                </div>
              ))}
            </div>
          )}
        </CardContent>
      </Card>
    </div>
  )
}
