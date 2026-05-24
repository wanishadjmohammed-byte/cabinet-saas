import { getRdv } from "@/actions/rdv"
import { getPatients } from "@/actions/patients"
import { getActiveServices } from "@/actions/services"
import { db } from "@/lib/db"
import { profiles } from "@/lib/db/schema"
import { eq } from "drizzle-orm"
import { RdvClient } from "./rdv-client"
import { format } from "date-fns"

export default async function RdvPage({
  searchParams,
}: {
  searchParams: Promise<{ from?: string; to?: string }>
}) {
  const { from: urlFrom, to: urlTo } = await searchParams
  const today = format(new Date(), "yyyy-MM-dd")
  const from = urlFrom ?? today
  const to = urlTo ?? from

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
    />
  )
}
