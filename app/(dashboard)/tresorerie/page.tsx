import { getTresorerie } from "@/actions/couts"
import { formatCurrency } from "@/lib/utils"
import { format } from "date-fns"
import { fr } from "date-fns/locale"

export default async function TresoreriePage() {
  const rows = await getTresorerie()
  const currentMonth = format(new Date(), "yyyy-MM")

  return (
    <div className="space-y-5">
      <div>
        <h1 className="text-lg font-semibold">Trésorerie</h1>
        <p className="text-sm text-muted-foreground">Vue mensuelle consolidée</p>
      </div>

      {rows.length === 0 ? (
        <div className="text-center py-16 text-muted-foreground text-sm">
          Aucune donnée financière. Enregistrez des versements et des coûts pour voir la trésorerie.
        </div>
      ) : (
        <div className="border border-border rounded-lg bg-card overflow-hidden">
          <div className="overflow-x-auto">
            <table className="w-full text-sm">
              <thead>
                <tr className="border-b border-border bg-muted/30">
                  {["Mois", "Entrées", "Coûts fixes", "Coûts variables", "Total sorties", "Solde du mois", "Solde cumulé"].map((h) => (
                    <th key={h} className="px-4 py-3 text-left text-xs font-medium text-muted-foreground whitespace-nowrap">{h}</th>
                  ))}
                </tr>
              </thead>
              <tbody>
                {rows.map((row, i) => {
                  const isCurrent = row.mois === currentMonth
                  const isPositive = row.soldeMois >= 0
                  return (
                    <tr key={row.mois} className={`border-b border-border last:border-0 transition-colors ${isCurrent ? "bg-primary/5" : "hover:bg-muted/30"}`}>
                      <td className="px-4 py-3 font-medium whitespace-nowrap">
                        <div className="flex items-center gap-2">
                          {isCurrent && <span className="w-1.5 h-1.5 rounded-full bg-primary shrink-0" />}
                          {format(new Date(row.mois + "-01"), "MMMM yyyy", { locale: fr })}
                        </div>
                      </td>
                      <td className="px-4 py-3 font-semibold text-emerald-600">{formatCurrency(row.entrees)}</td>
                      <td className="px-4 py-3 text-blue-600">{formatCurrency(row.fixes)}</td>
                      <td className="px-4 py-3 text-orange-600">{formatCurrency(row.variables)}</td>
                      <td className="px-4 py-3 text-red-600">{formatCurrency(row.totalSorties)}</td>
                      <td className={`px-4 py-3 font-semibold ${isPositive ? "text-emerald-600" : "text-red-600"}`}>
                        {isPositive ? "+" : ""}{formatCurrency(row.soldeMois)}
                      </td>
                      <td className={`px-4 py-3 font-bold ${row.soldeCumule >= 0 ? "text-foreground" : "text-red-600"}`}>
                        {formatCurrency(row.soldeCumule)}
                      </td>
                    </tr>
                  )
                })}
              </tbody>
              <tfoot>
                <tr className="border-t-2 border-border bg-muted/50">
                  <td className="px-4 py-3 font-semibold text-xs uppercase tracking-wide text-muted-foreground">Total</td>
                  <td className="px-4 py-3 font-bold text-emerald-600">{formatCurrency(rows.reduce((s, r) => s + r.entrees, 0))}</td>
                  <td className="px-4 py-3 font-bold text-blue-600">{formatCurrency(rows.reduce((s, r) => s + r.fixes, 0))}</td>
                  <td className="px-4 py-3 font-bold text-orange-600">{formatCurrency(rows.reduce((s, r) => s + r.variables, 0))}</td>
                  <td className="px-4 py-3 font-bold text-red-600">{formatCurrency(rows.reduce((s, r) => s + r.totalSorties, 0))}</td>
                  <td colSpan={2} />
                </tr>
              </tfoot>
            </table>
          </div>
        </div>
      )}
    </div>
  )
}
