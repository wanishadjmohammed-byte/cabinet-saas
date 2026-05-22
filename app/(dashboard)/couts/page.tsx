import { getCouts } from "@/actions/couts"
import { CoutsClient } from "./couts-client"

export default async function CoutsPage() {
  const couts = await getCouts()
  return <CoutsClient couts={couts} />
}
