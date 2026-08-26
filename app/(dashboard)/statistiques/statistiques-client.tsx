"use client"

import { useRouter } from "next/navigation"
import { Input } from "@/components/ui/input"
import { Table, TableBody, TableCell, TableHead, TableHeader, TableRow } from "@/components/ui/table"
import { formatCurrency } from "@/lib/utils"
import type { StatJour } from "@/actions/couts"
import { TrendingUp, TrendingDown, Wallet, BarChart3 } from "lucide-react"
import type { Role } from "@/lib/auth/guard"

function addDays(dateStr: string, n: number): string {
  const d = new Date(dateStr + "T12:00:00")
  d.setDate(d.getDate() + n)
  return d.toISOString().split("T")[0]
}

function startOfMonth(dateStr: string): string {
  return dateStr.slice(0, 7) + "-01"
}

function jourLong(dateStr: string): string {
  return new Date(dateStr + "T12:00:00").toLocaleDateString("fr-DZ", {
    weekday: "long",
    day: "numeric",
    month: "long",
  })
}

export function StatistiquesClient({
  stats,
  today,
  from,
  to,
  role,
}: {
  stats: StatJour[]
  today: string
  from: string
  to: string
  role: Role
}) {
  const router = useRouter()
  // L accueil s arrete au net du jour : ni historique ni cumuls du cabinet.
  const voitHistorique = role !== "receptionniste"

  function navigate(newFrom: string, newTo: string) {
    router.push(`/statistiques?from=${newFrom}&to=${newTo}`)
  }

  const PRESETS = [
    { label: "Aujourd'hui", f: today, t: today },
    { label: "7 jours", f: addDays(today, -6), t: today },
    { label: "30 jours", f: addDays(today, -29), t: today },
    { label: "Ce mois", f: startOfMonth(today), t: today },
  ]

  const jourCourant = stats.find((s) => s.date === today)
  const totaux = stats.reduce(
    (acc, s) => ({
      encaisse: acc.encaisse + s.encaisse,
      depenses: acc.depenses + s.depenses,
      net: acc.net + s.net,
    }),
    { encaisse: 0, depenses: 0, net: 0 }
  )

  const netMax = Math.max(1, ...stats.map((s) => Math.abs(s.net)))

  return (
    <div className="space-y-5">
      <div>
        <h1 className="text-lg font-semibold">Statistiques</h1>
        <p className="text-sm text-muted-foreground">
          {voitHistorique ? "Net encaissé jour par jour" : "Journée en cours"}
        </p>
      </div>

      {/* ── Aujourd'hui ── */}
      <div className="grid grid-cols-1 sm:grid-cols-3 gap-4">
        <Kpi
          titre="Encaissé aujourd'hui"
          valeur={formatCurrency(jourCourant?.encaisse ?? 0)}
          icone={TrendingUp}
          couleur="#16a34a"
        />
        <Kpi
          titre="Dépenses aujourd'hui"
          valeur={formatCurrency(jourCourant?.depenses ?? 0)}
          icone={TrendingDown}
          couleur="#dc2626"
        />
        <Kpi
          titre="Net aujourd'hui"
          valeur={formatCurrency(jourCourant?.net ?? 0)}
          sous={(jourCourant?.net ?? 0) >= 0 ? "Positif" : "Déficit"}
          icone={Wallet}
          couleur={(jourCourant?.net ?? 0) >= 0 ? "#16a34a" : "#dc2626"}
        />
      </div>

      {!voitHistorique ? null : (
      <>
      {/* ── Plage ── */}
      <div className="space-y-2">
        <div className="flex flex-wrap items-center gap-1.5">
          {PRESETS.map((p) => {
            const actif = p.f === from && p.t === to
            return (
              <button
                key={p.label}
                onClick={() => navigate(p.f, p.t)}
                className={`text-xs px-2.5 py-1 rounded-md border transition-colors whitespace-nowrap ${
                  actif
                    ? "bg-foreground text-background border-foreground"
                    : "border-border text-muted-foreground hover:bg-muted hover:text-foreground"
                }`}
              >
                {p.label}
              </button>
            )
          })}
          <div className="flex items-center gap-1.5 ml-1">
            <Input
              type="date"
              value={from}
              max={to}
              onChange={(e) => navigate(e.target.value, to)}
              className="h-8 w-36 text-sm"
            />
            <span className="text-muted-foreground text-sm">→</span>
            <Input
              type="date"
              value={to}
              min={from}
              onChange={(e) => navigate(from, e.target.value)}
              className="h-8 w-36 text-sm"
            />
          </div>
        </div>
      </div>

      {/* ── Total de la plage ── */}
      <div className="grid grid-cols-3 gap-3">
        {[
          { label: "Total encaissé", valeur: totaux.encaisse, couleur: "text-emerald-600" },
          { label: "Total dépenses", valeur: totaux.depenses, couleur: "text-red-600" },
          {
            label: "Net sur la période",
            valeur: totaux.net,
            couleur: totaux.net >= 0 ? "text-emerald-600" : "text-red-600",
          },
        ].map(({ label, valeur, couleur }) => (
          <div key={label} className="rounded-lg border border-border bg-card px-4 py-3">
            <p className="text-xs text-muted-foreground">{label}</p>
            <p className={`mt-0.5 text-xl font-bold ${couleur}`}>{formatCurrency(valeur)}</p>
          </div>
        ))}
      </div>

      {/* ── Détail par jour ── */}
      <div className="border border-border rounded-lg bg-card overflow-hidden">
        <Table>
          <TableHeader>
            <TableRow className="bg-muted/30 hover:bg-muted/30">
              <TableHead>Jour</TableHead>
              <TableHead className="text-right">Encaissé</TableHead>
              <TableHead className="text-right">Dépenses</TableHead>
              <TableHead className="text-right">Net</TableHead>
              <TableHead className="w-[140px]" />
            </TableRow>
          </TableHeader>
          <TableBody>
            {stats.length === 0 ? (
              <TableRow>
                <TableCell colSpan={5} className="text-center py-12 text-muted-foreground">
                  <BarChart3 className="w-8 h-8 mx-auto mb-2 opacity-30" />
                  Aucun mouvement sur cette période
                </TableCell>
              </TableRow>
            ) : (
              stats.map((s) => {
                const positif = s.net >= 0
                return (
                  <TableRow key={s.date} className={s.date === today ? "bg-primary/5" : ""}>
                    <TableCell className="text-sm">
                      <div className="flex items-center gap-2">
                        {s.date === today && (
                          <span className="h-1.5 w-1.5 shrink-0 rounded-full bg-primary" />
                        )}
                        <span className="capitalize font-medium">{jourLong(s.date)}</span>
                      </div>
                    </TableCell>
                    <TableCell className="text-right text-sm text-emerald-600">
                      {formatCurrency(s.encaisse)}
                    </TableCell>
                    <TableCell className="text-right text-sm text-red-600">
                      {s.depenses > 0 ? formatCurrency(s.depenses) : "—"}
                    </TableCell>
                    <TableCell
                      className={`text-right text-sm font-semibold ${
                        positif ? "text-emerald-600" : "text-red-600"
                      }`}
                    >
                      {positif ? "+" : ""}
                      {formatCurrency(s.net)}
                    </TableCell>
                    <TableCell>
                      {/* Barre proportionnelle au plus gros net de la période */}
                      <div className="flex items-center gap-1.5">
                        <div className="h-1.5 flex-1 overflow-hidden rounded-full bg-muted">
                          <div
                            className={`h-full rounded-full ${
                              positif ? "bg-emerald-500" : "bg-red-500"
                            }`}
                            style={{ width: `${(Math.abs(s.net) / netMax) * 100}%` }}
                          />
                        </div>
                      </div>
                    </TableCell>
                  </TableRow>
                )
              })
            )}
          </TableBody>
        </Table>
      </div>
      </>
      )}
    </div>
  )
}

function Kpi({
  titre,
  valeur,
  sous,
  icone: Icone,
  couleur,
}: {
  titre: string
  valeur: string
  sous?: string
  icone: React.ElementType
  couleur: string
}) {
  return (
    <div className="rounded-lg border border-border bg-card p-4">
      <p className="text-xs text-muted-foreground">{titre}</p>
      <div className="mt-1 flex items-end justify-between">
        <div>
          <p className="text-2xl font-bold">{valeur}</p>
          {sous && <p className="mt-0.5 text-xs text-muted-foreground">{sous}</p>}
        </div>
        <div
          className="flex h-9 w-9 items-center justify-center rounded-md"
          style={{ background: couleur + "18" }}
        >
          <Icone className="h-5 w-5" style={{ color: couleur }} />
        </div>
      </div>
    </div>
  )
}
