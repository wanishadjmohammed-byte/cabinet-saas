import { getVersements } from "@/actions/versements"
import { getPatients } from "@/actions/patients"
import { VersementsClient } from "./versements-client"

export default async function VersementsPage() {
  const [versements, patients] = await Promise.all([getVersements(), getPatients()])
  return <VersementsClient versements={versements} patients={patients} />
}
