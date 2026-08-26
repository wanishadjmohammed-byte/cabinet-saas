import { getCertificats } from "@/actions/certificats"
import { getPatients } from "@/actions/patients"
import { db } from "@/lib/db"
import { profiles } from "@/lib/db/schema"
import { eq } from "drizzle-orm"
import { CertificatsClient } from "./certificats-client"

export default async function CertificatsPage() {
  const [certificats, patients, medecins] = await Promise.all([
    getCertificats(),
    getPatients(),
    db.query.profiles.findMany({ where: eq(profiles.role, "medecin") }),
  ])

  return (
    <CertificatsClient certificats={certificats} patients={patients} medecins={medecins} />
  )
}
