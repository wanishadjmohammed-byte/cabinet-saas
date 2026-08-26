import { getPatientsWithPayment } from "@/actions/patients"
import { currentRole } from "@/lib/auth/role"
import { SuiviClient } from "./suivi-client"

export default async function SuiviPaiementPage() {
  const [patients, role] = await Promise.all([getPatientsWithPayment(), currentRole()])
  return <SuiviClient patients={patients} role={role} />
}
