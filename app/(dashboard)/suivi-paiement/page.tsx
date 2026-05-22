import { getPatientsWithPayment } from "@/actions/patients"
import { SuiviClient } from "./suivi-client"

export default async function SuiviPaiementPage() {
  const patients = await getPatientsWithPayment()
  return <SuiviClient patients={patients} />
}
