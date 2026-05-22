import { getPatientsWithPayment } from "@/actions/patients"
import { PatientsClient } from "./patients-client"

export default async function PatientsPage() {
  const patients = await getPatientsWithPayment()
  return <PatientsClient initialPatients={patients} />
}
