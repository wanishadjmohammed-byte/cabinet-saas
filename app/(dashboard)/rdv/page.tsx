import { getRdv } from "@/actions/rdv"
import { getPatients } from "@/actions/patients"
import { getActiveServices } from "@/actions/services"
import { db } from "@/lib/db"
import { profiles } from "@/lib/db/schema"
import { eq } from "drizzle-orm"
import { RdvClient } from "./rdv-client"
import { format, startOfWeek, addDays, parseISO } from "date-fns"

export type RdvView = "kanban" | "liste" | "semaine"

export default async function RdvPage({
  searchParams,
}: {
  searchParams: Promise<{ view?: string; from?: string; to?: string }>
}) {
  const { view: urlView, from: urlFrom, to: urlTo } = await searchParams
  const view: RdvView =
    urlView === "liste" || urlView === "semaine" ? urlView : "kanban"

  const today = format(new Date(), "yyyy-MM-dd")
  const ancre = urlFrom ?? today

  // Le planning raisonne toujours par semaine complète (dimanche → samedi).
  let from: string
  let to: string
  if (view === "semaine") {
    from = format(startOfWeek(parseISO(ancre), { weekStartsOn: 0 }), "yyyy-MM-dd")
    to = format(addDays(parseISO(from), 6), "yyyy-MM-dd")
  } else {
    from = ancre
    to = urlTo ?? from
  }

  const [rdvList, patients, services, medecins] = await Promise.all([
    getRdv({ from, to }),
    getPatients(),
    getActiveServices(),
    db.query.profiles.findMany({ where: eq(profiles.role, "medecin") }),
  ])

  return (
    <RdvClient
      initialRdv={rdvList}
      patients={patients}
      services={services}
      medecins={medecins}
      today={today}
      from={from}
      to={to}
      view={view}
    />
  )
}
