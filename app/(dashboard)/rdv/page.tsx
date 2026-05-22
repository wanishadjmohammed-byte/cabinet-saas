import { getRdv } from "@/actions/rdv"
import { getPatients } from "@/actions/patients"
import { RdvClient } from "./rdv-client"
import { format } from "date-fns"

export default async function RdvPage() {
  const today = format(new Date(), "yyyy-MM-dd")
  const [rdvList, patients] = await Promise.all([
    getRdv({ from: today }),
    getPatients(),
  ])
  return <RdvClient initialRdv={rdvList} patients={patients} today={today} />
}
