import { getStatsJournalieres } from "@/actions/couts"
import { StatistiquesClient } from "./statistiques-client"
import { format, subDays, parseISO } from "date-fns"

export default async function StatistiquesPage({
  searchParams,
}: {
  searchParams: Promise<{ from?: string; to?: string }>
}) {
  const { from: urlFrom, to: urlTo } = await searchParams

  const today = format(new Date(), "yyyy-MM-dd")
  // Par défaut : les 30 derniers jours.
  const to = urlTo ?? today
  const from = urlFrom ?? format(subDays(parseISO(to), 29), "yyyy-MM-dd")

  const stats = await getStatsJournalieres({ from, to })

  return <StatistiquesClient stats={stats} today={today} from={from} to={to} />
}
