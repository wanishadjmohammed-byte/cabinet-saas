import { getConsultations } from "@/actions/consultations"
import { getPatients } from "@/actions/patients"
import { getActiveServices } from "@/actions/services"
import { ConsultationsClient } from "./consultations-client"

export default async function ConsultationsPage() {
  const [consultations, patients, services] = await Promise.all([
    getConsultations(30),
    getPatients(),
    getActiveServices(),
  ])
  return <ConsultationsClient consultations={consultations} patients={patients} services={services} />
}
