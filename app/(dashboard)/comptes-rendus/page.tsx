import { getComptesRendus } from "@/actions/comptes-rendus"
import { getPatients } from "@/actions/patients"
import { db } from "@/lib/db"
import { profiles } from "@/lib/db/schema"
import { eq } from "drizzle-orm"
import { ComptesRendusClient } from "./comptes-rendus-client"

export default async function ComptesRendusPage() {
  const [comptesRendus, patients, medecins] = await Promise.all([
    getComptesRendus(),
    getPatients(),
    db.query.profiles.findMany({ where: eq(profiles.role, "medecin") }),
  ])

  return (
    <ComptesRendusClient
      comptesRendus={comptesRendus}
      patients={patients}
      medecins={medecins}
    />
  )
}
