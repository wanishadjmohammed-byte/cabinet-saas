import { getDashboardStats } from "@/actions/consultations"
import { getRdv } from "@/actions/rdv"
import { Card, CardContent, CardHeader, CardTitle } from "@/components/ui/card"
import { Badge } from "@/components/ui/badge"
import { formatCurrency, formatDate } from "@/lib/utils"
import {
  TrendingUp, TrendingDown, Users, CalendarDays,
  Stethoscope, Wallet, AlertCircle, Clock,
} from "lucide-react"
import { format, addDays } from "date-fns"
import { fr } from "date-fns/locale"

function KpiCard({
  title, value, sub, icon: Icon, color,
}: {
  title: string; value: string; sub?: string
  icon: React.ElementType; color: string
}) {
  return (
    <Card>
      <CardHeader><CardTitle>{title}</CardTitle></CardHeader>
      <CardContent>
        <div className="flex items-end justify-between">
          <div>
            <p className="text-2xl font-bold text-foreground">{value}</p>
            {sub && <p className="text-xs text-muted-foreground mt-0.5">{sub}</p>}
          </div>
          <div className="w-9 h-9 rounded-md flex items-center justify-center" style={{ background: color + "18" }}>
            <Icon className="w-5 h-5" style={{ color }} />
          </div>
        </div>
      </CardContent>
    </Card>
  )
}

export default async function DashboardPage() {
  const today = new Date().toISOString().split("T")[0]
  const in7 = format(addDays(new Date(), 7), "yyyy-MM-dd")

  const [stats, rdvSemaine] = await Promise.all([
    getDashboardStats(),
    getRdv({ from: today, to: in7 }),
  ])

  if (!stats) {
    return (
      <div className="flex items-center justify-center h-64 text-muted-foreground text-sm">
        <div className="text-center space-y-2">
          <AlertCircle className="w-8 h-8 mx-auto text-muted-foreground/50" />
          <p>Base de données non configurée.</p>
          <p className="text-xs">Copiez <code>.env.local.example</code> en <code>.env.local</code> et ajoutez vos identifiants Supabase.</p>
        </div>
      </div>
    )
  }

  const rdvConfirmes = rdvSemaine.filter((r) => r.statut === "confirme")

  return (
    <div className="space-y-6">
      <div>
        <h1 className="text-lg font-semibold">Tableau de bord</h1>
        <p className="text-sm text-muted-foreground">
          {format(new Date(), "EEEE d MMMM yyyy", { locale: fr })}
        </p>
      </div>

      {/* KPI row 1 */}
      <div className="grid grid-cols-2 lg:grid-cols-4 gap-4">
        <KpiCard title="CA du jour" value={formatCurrency(stats.caJour)} icon={TrendingUp} color="#16a34a" />
        <KpiCard title="CA total encaissé" value={formatCurrency(stats.caTotal)} icon={Wallet} color="#2563eb" />
        <KpiCard title="Dépenses totales" value={formatCurrency(stats.depenses)} icon={TrendingDown} color="#dc2626" />
        <KpiCard
          title="Bénéfice net"
          value={formatCurrency(stats.benefice)}
          sub={stats.benefice >= 0 ? "Positif" : "Déficit"}
          icon={TrendingUp}
          color={stats.benefice >= 0 ? "#16a34a" : "#dc2626"}
        />
      </div>

      {/* KPI row 2 */}
      <div className="grid grid-cols-2 lg:grid-cols-4 gap-4">
        <KpiCard title="Consultations aujourd'hui" value={String(stats.consultationsJour)} icon={Stethoscope} color="#7c3aed" />
        <KpiCard title="Patients inscrits" value={String(stats.patients)} icon={Users} color="#0891b2" />
        <KpiCard title="RDV effectués" value={String(stats.rdvEffectues)} icon={CalendarDays} color="#059669" />
        <KpiCard title="Trésorerie cumulée" value={formatCurrency(stats.tresorerie)} icon={Wallet} color="#d97706" />
      </div>

      <div className="grid grid-cols-1 lg:grid-cols-3 gap-4">
        {/* Statut paiements */}
        <Card>
          <CardHeader><CardTitle>Statut des paiements</CardTitle></CardHeader>
          <CardContent className="space-y-3">
            {[
              { label: "Payé", data: stats.paye, variant: "paye" as const, color: "#16a34a" },
              { label: "Partiel", data: stats.partiel, variant: "partiel" as const, color: "#d97706" },
              { label: "Impayé", data: stats.impaye, variant: "impaye" as const, color: "#dc2626" },
            ].map(({ label, data, variant, color }) => (
              <div key={label} className="flex items-center justify-between py-2 border-b border-border last:border-0">
                <div className="flex items-center gap-2">
                  <Badge variant={variant}>{label}</Badge>
                  <span className="text-xs text-muted-foreground">{data.count} patient{data.count !== 1 ? "s" : ""}</span>
                </div>
                <span className="text-sm font-semibold" style={{ color }}>{formatCurrency(data.montant)}</span>
              </div>
            ))}
          </CardContent>
        </Card>

        {/* Top services */}
        <Card>
          <CardHeader><CardTitle>CA par service (top 5)</CardTitle></CardHeader>
          <CardContent className="space-y-2">
            {stats.topServices.length === 0 ? (
              <p className="text-xs text-muted-foreground py-4 text-center">Aucune consultation enregistrée</p>
            ) : (
              stats.topServices.map((svc, i) => (
                <div key={i} className="flex items-center justify-between py-1.5 border-b border-border last:border-0">
                  <div className="min-w-0 flex-1 mr-2">
                    <p className="text-sm font-medium truncate">{svc.nom}</p>
                    <p className="text-xs text-muted-foreground">{svc.count} consultation{svc.count !== 1 ? "s" : ""}</p>
                  </div>
                  <span className="text-sm font-semibold text-foreground shrink-0">{formatCurrency(svc.ca)}</span>
                </div>
              ))
            )}
          </CardContent>
        </Card>

        {/* RDV à venir */}
        <Card>
          <CardHeader>
            <CardTitle className="flex items-center justify-between">
              RDV à venir
              <span className="text-xs font-medium px-2 py-0.5 rounded-full bg-primary/10 text-primary">
                {rdvConfirmes.length}
              </span>
            </CardTitle>
          </CardHeader>
          <CardContent className="space-y-2">
            {rdvConfirmes.length === 0 ? (
              <p className="text-xs text-muted-foreground py-4 text-center">Aucun RDV à venir</p>
            ) : (
              rdvConfirmes.slice(0, 6).map((rdv) => {
                const nom = rdv.patient
                  ? `${rdv.patient.prenom} ${rdv.patient.nom}`
                  : rdv.patientNomLibre ?? "—"
                return (
                  <div key={rdv.id} className="flex items-center gap-2 py-1.5 border-b border-border last:border-0">
                    <Clock className="w-3.5 h-3.5 text-muted-foreground shrink-0" />
                    <div className="min-w-0 flex-1">
                      <p className="text-sm font-medium truncate">{nom}</p>
                      <p className="text-xs text-muted-foreground">
                        {formatDate(rdv.date)} · {rdv.heure.slice(0, 5)}
                      </p>
                    </div>
                  </div>
                )
              })
            )}
          </CardContent>
        </Card>
      </div>
    </div>
  )
}
