import { getFactures } from "@/actions/factures"
import { getPatients } from "@/actions/patients"
import { FacturesClient } from "./factures-client"

export default async function FacturesPage() {
  const [factures, patients] = await Promise.all([getFactures(), getPatients()])
  return <FacturesClient factures={factures} patients={patients} />
}
