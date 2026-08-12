"use client"

import { useRouter } from "next/navigation"
import { statutColor, STATUT_RDV_LABEL, heureEnMinutes } from "@/lib/rdv-status"
import { AlertCircle } from "lucide-react"

type RdvRow = {
  id: string
  ref: string
  date: string
  heure: string
  statut: string
  patientNomLibre: string | null
  telephone: string | null
  patient: { id: string; prenom: string; nom: string; telephone: string } | null
  medecin: { nom: string; prenom: string } | null
}

/** Horaires de travail du cabinet. */
const HEURE_DEBUT = 9
const HEURE_FIN = 16
/** Largeur nominale d'un rendez-vous, faute de durée en base. */
const DUREE_NOMINALE = 30

const TOTAL_MINUTES = (HEURE_FIN - HEURE_DEBUT) * 60
const HEURES = Array.from({ length: HEURE_FIN - HEURE_DEBUT }, (_, i) => HEURE_DEBUT + i)

const JOURS = ["Dimanche", "Lundi", "Mardi", "Mercredi", "Jeudi", "Vendredi", "Samedi"]
const MOIS = [
  "janvier", "février", "mars", "avril", "mai", "juin",
  "juillet", "août", "septembre", "octobre", "novembre", "décembre",
]

const HAUTEUR_BLOC = 26
const ESPACE_BLOC = 4

function addDays(dateStr: string, n: number): string {
  const d = new Date(dateStr + "T12:00:00")
  d.setDate(d.getDate() + n)
  return d.toISOString().split("T")[0]
}

function nomPatient(r: RdvRow): string {
  return r.patient ? `${r.patient.prenom} ${r.patient.nom}` : r.patientNomLibre ?? "—"
}

/**
 * Empile les rendez-vous qui se chevauchent sur plusieurs voies,
 * pour qu'aucun bloc n'en recouvre un autre.
 */
function repartirEnVoies(rdvs: RdvRow[]) {
  const tries = [...rdvs].sort((a, b) => heureEnMinutes(a.heure) - heureEnMinutes(b.heure))
  const finDeVoie: number[] = []
  return tries.map((rdv) => {
    const debut = heureEnMinutes(rdv.heure)
    let voie = finDeVoie.findIndex((fin) => fin <= debut)
    if (voie === -1) voie = finDeVoie.length
    finDeVoie[voie] = debut + DUREE_NOMINALE
    return { rdv, voie, debut }
  })
}

export function WeekTimeline({
  rdvs,
  weekStart,
  today,
}: {
  rdvs: RdvRow[]
  weekStart: string
  today: string
}) {
  const router = useRouter()

  const jours = Array.from({ length: 7 }, (_, i) => {
    const date = addDays(weekStart, i)
    const duJour = rdvs.filter((r) => r.date === date)
    const dansPlage = duJour.filter((r) => {
      const m = heureEnMinutes(r.heure)
      return m >= HEURE_DEBUT * 60 && m < HEURE_FIN * 60
    })
    const horsPlage = duJour.filter((r) => !dansPlage.includes(r))
    const places = repartirEnVoies(dansPlage)
    const voies = Math.max(1, ...places.map((p) => p.voie + 1))
    return { date, index: i, duJour, places, horsPlage, voies }
  })

  const chargeMax = Math.max(1, ...jours.map((j) => j.duJour.length))

  return (
    <div className="rounded-lg border border-border bg-card overflow-hidden">
      <div className="overflow-x-auto">
        <div style={{ minWidth: "760px" }}>
          {/* ── Bandeau des heures ── */}
          <div className="flex border-b border-border bg-muted/40">
            <div className="w-[132px] shrink-0 px-3 py-2">
              <span className="text-[10px] font-semibold uppercase tracking-widest text-muted-foreground">
                Semaine
              </span>
            </div>
            <div className="relative flex-1">
              <div className="flex">
                {HEURES.map((h) => (
                  <div
                    key={h}
                    className="flex-1 border-l border-border px-2 py-2 text-[11px] font-medium text-muted-foreground"
                  >
                    {h}h
                  </div>
                ))}
              </div>
            </div>
          </div>

          {/* ── Une ligne par jour ── */}
          {jours.map((jour) => {
            const d = new Date(jour.date + "T12:00:00")
            const estAujourdhui = jour.date === today
            const hauteur = jour.voies * HAUTEUR_BLOC + (jour.voies - 1) * ESPACE_BLOC + 16

            return (
              <div
                key={jour.date}
                className={`flex border-b border-border last:border-0 ${
                  estAujourdhui ? "bg-primary/5" : ""
                }`}
              >
                {/* Libellé du jour */}
                <div className="w-[132px] shrink-0 px-3 py-2">
                  <div className="flex items-center gap-1.5">
                    {estAujourdhui && <span className="h-1.5 w-1.5 shrink-0 rounded-full bg-primary" />}
                    <span className="text-sm font-medium">{JOURS[jour.index]}</span>
                  </div>
                  <p className="mt-0.5 text-xs text-muted-foreground">
                    {d.getDate()} {MOIS[d.getMonth()]}
                  </p>

                  {/* Jauge de charge relative au jour le plus chargé */}
                  {jour.duJour.length > 0 && (
                    <div className="mt-1.5 flex items-center gap-1.5">
                      <div className="h-1 w-10 overflow-hidden rounded-full bg-muted">
                        <div
                          className="h-full rounded-full bg-primary/70"
                          style={{ width: `${(jour.duJour.length / chargeMax) * 100}%` }}
                        />
                      </div>
                      <span className="text-[10px] text-muted-foreground">{jour.duJour.length}</span>
                    </div>
                  )}
                </div>

                {/* Piste horaire */}
                <div className="relative flex-1" style={{ height: `${hauteur}px` }}>
                  {/* Lignes verticales des heures */}
                  <div className="absolute inset-0 flex">
                    {HEURES.map((h) => (
                      <div key={h} className="flex-1 border-l border-border/70" />
                    ))}
                  </div>

                  {jour.places.map(({ rdv, voie, debut }) => {
                    const couleur = statutColor(rdv.statut)
                    const gauche = ((debut - HEURE_DEBUT * 60) / TOTAL_MINUTES) * 100
                    const largeur = (DUREE_NOMINALE / TOTAL_MINUTES) * 100

                    return (
                      <button
                        key={rdv.id}
                        type="button"
                        onClick={() => router.push(`/rdv?from=${rdv.date}&to=${rdv.date}`)}
                        title={`${rdv.heure.slice(0, 5)} · ${nomPatient(rdv)} · ${
                          STATUT_RDV_LABEL[rdv.statut] ?? rdv.statut
                        }`}
                        className="absolute overflow-hidden rounded-md border px-1.5 text-left transition-shadow hover:shadow-md"
                        style={{
                          left: `calc(${gauche}% + 2px)`,
                          width: `calc(${largeur}% - 4px)`,
                          top: `${8 + voie * (HAUTEUR_BLOC + ESPACE_BLOC)}px`,
                          height: `${HAUTEUR_BLOC}px`,
                          background: couleur.fond,
                          borderColor: couleur.trait,
                          borderLeftWidth: "3px",
                        }}
                      >
                        <span
                          className="block truncate text-[11px] font-medium leading-[20px]"
                          style={{ color: couleur.trait }}
                        >
                          {rdv.heure.slice(0, 5)} {nomPatient(rdv)}
                        </span>
                      </button>
                    )
                  })}
                </div>
              </div>
            )
          })}
        </div>
      </div>

      {/* ── Rendez-vous en dehors de 9h–16h : jamais masqués ── */}
      <HorsPlage jours={jours} />
    </div>
  )
}

function HorsPlage({
  jours,
}: {
  jours: { date: string; index: number; horsPlage: RdvRow[] }[]
}) {
  const total = jours.reduce((s, j) => s + j.horsPlage.length, 0)
  if (total === 0) return null

  return (
    <div className="border-t border-border bg-amber-50/60 px-3 py-2.5">
      <div className="flex items-center gap-1.5 text-amber-700">
        <AlertCircle className="h-3.5 w-3.5 shrink-0" />
        <span className="text-xs font-medium">
          {total} rendez-vous en dehors de {HEURE_DEBUT}h–{HEURE_FIN}h
        </span>
      </div>
      <div className="mt-1.5 flex flex-wrap gap-1.5">
        {jours.flatMap((j) =>
          j.horsPlage.map((r) => (
            <span
              key={r.id}
              className="rounded border border-amber-200 bg-white px-1.5 py-0.5 text-[11px] text-amber-800"
            >
              {JOURS[j.index].slice(0, 3)}. {r.heure.slice(0, 5)} · {nomPatient(r)}
            </span>
          ))
        )}
      </div>
    </div>
  )
}
