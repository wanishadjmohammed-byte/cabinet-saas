import { getCouts } from "@/actions/couts"
import { currentRole } from "@/lib/auth/role"
import { CoutsClient } from "./couts-client"

export default async function CoutsPage() {
  const [couts, role] = await Promise.all([getCouts(), currentRole()])
  return <CoutsClient couts={couts} role={role} />
}
