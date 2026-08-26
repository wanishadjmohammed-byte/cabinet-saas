import { getStatsJournalieres } from "@/actions/couts"
import { currentRole } from "@/lib/auth/role"
import { StatistiquesClient } from "./statistiques-client"
import { format, subDays, parseISO } from "date-fns"

export default async function StatistiquesPage({
  searchParams,
}: {
  searchParams: Promise<{ from?: string; to?: string }>
}) {
  const { from: urlFrom, to: urlTo } = await searchParams
  const role = await currentRole()

  const today = format(new Date(), "yyyy-MM-dd")

  // L accueil ne voit que la journee en cours : on ne charge meme pas
  // l historique, sinon il partirait dans la page malgre l affichage masque.
  const estAccueil = role === "receptionniste"
  const to = estAccueil ? today : urlTo ?? today
  const from = estAccueil ? today : urlFrom ?? format(subDays(parseISO(to), 29), "yyyy-MM-dd")

  const stats = await getStatsJournalieres({ from, to })

  return <StatistiquesClient stats={stats} today={today} from={from} to={to} role={role} />
}
