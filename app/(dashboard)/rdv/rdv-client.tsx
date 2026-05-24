"use client"

import { useState, useTransition } from "react"
import { useRouter } from "next/navigation"
import { createRdv, updateRdvStatut, type RdvFormData } from "@/actions/rdv"
import { Button } from "@/components/ui/button"
import { Input } from "@/components/ui/input"
import { Label } from "@/components/ui/label"
import { Badge } from "@/components/ui/badge"
import { Dialog, DialogContent, DialogHeader, DialogTitle, DialogTrigger } from "@/components/ui/dialog"
import { Select, SelectContent, SelectItem, SelectTrigger, SelectValue } from "@/components/ui/select"
import { Table, TableBody, TableCell, TableHead, TableHeader, TableRow } from "@/components/ui/table"
import { CalendarDays, Plus, Clock, LayoutGrid, List, ChevronLeft, ChevronRight } from "lucide-react"
import { formatDate } from "@/lib/utils"
import { toast } from "sonner"
import { KanbanBoard } from "@/components/rdv/kanban-board"

type RdvRow = {
  id: string; ref: string; date: string; heure: string; statut: string
  patientNomLibre: string | null; telephone: string | null; age: number | null
  notes: string | null
  patient: { id: string; prenom: string; nom: string; telephone: string } | null
  medecin: { nom: string; prenom: string } | null
}
type Patient = { id: string; prenom: string; nom: string; telephone: string; dateNaissance: string | null }
type Service = { id: string; nom: string; prixStandard: number }
type Medecin = { id: string; nom: string; prenom: string }

const STATUT_LABELS: Record<string, string> = {
  confirme: "Confirmé", arrive: "Arrivé", en_consultation: "En consultation",
  effectue: "Effectué", annule: "Annulé", no_show: "No-show",
}

const STATUT_VARIANTS = {
  confirme: "confirme", arrive: "confirme", en_consultation: "confirme",
  effectue: "effectue", annule: "annule", no_show: "no_show",
} as const

// ── Date helpers ──────────────────────────────────────────────────────────────

function addDays(dateStr: string, n: number): string {
  const d = new Date(dateStr + "T12:00:00")
  d.setDate(d.getDate() + n)
  return d.toISOString().split("T")[0]
}

function startOfMonth(dateStr: string): string {
  return dateStr.slice(0, 7) + "-01"
}

function endOfMonth(dateStr: string): string {
  const [year, month] = dateStr.split("-").map(Number)
  const last = new Date(year, month, 0).getDate()
  return `${year}-${String(month).padStart(2, "0")}-${String(last).padStart(2, "0")}`
}

function fmtLabel(dateStr: string): string {
  return new Date(dateStr + "T12:00:00").toLocaleDateString("fr-DZ", { weekday: "short", day: "numeric", month: "short" })
}

// ── Main component ────────────────────────────────────────────────────────────

export function RdvClient({ initialRdv, patients, services, medecins, today, from, to }: {
  initialRdv: RdvRow[]; patients: Patient[]; services: Service[]; medecins: Medecin[]
  today: string; from: string; to: string
}) {
  const [open, setOpen] = useState(false)
  const [view, setView] = useState<"liste" | "kanban">("kanban")
  const [isPending, startTransition] = useTransition()
  const [patientSearch, setPatientSearch] = useState("")
  const [customOpen, setCustomOpen] = useState(false)
  const [customFrom, setCustomFrom] = useState(from)
  const [customTo, setCustomTo] = useState(to)
  const router = useRouter()

  const [form, setForm] = useState<RdvFormData>({
    date: today, heure: "09:00", statut: "confirme",
    patientId: null, patientNomLibre: null, telephone: null, age: null, medecinId: null, notes: null,
  })

  // ── Navigation helper ──────────────────────────────────────────────────────

  function navigate(newFrom: string, newTo: string) {
    if (newFrom === today && newTo === today) {
      router.push("/rdv")
    } else {
      router.push(`/rdv?from=${newFrom}&to=${newTo}`)
    }
  }

  // ── Range presets (for list view) ──────────────────────────────────────────

  const PRESETS = [
    { label: "Aujourd'hui",  f: today,              t: today },
    { label: "Demain",       f: addDays(today, 1),  t: addDays(today, 1) },
    { label: "3 jours",      f: today,              t: addDays(today, 2) },
    { label: "7 jours",      f: today,              t: addDays(today, 6) },
    { label: "Ce mois",      f: startOfMonth(today), t: endOfMonth(today) },
  ]

  const activePreset = PRESETS.find((p) => p.f === from && p.t === to)
  const isCustomRange = !activePreset

  // ── Handlers ───────────────────────────────────────────────────────────────

  const filteredPats = patients.filter((p) => {
    const q = patientSearch.toLowerCase()
    return p.nom.toLowerCase().includes(q) || p.prenom.toLowerCase().includes(q)
  }).slice(0, 5)

  const rdvByDate = initialRdv.reduce<Record<string, RdvRow[]>>((acc, r) => {
    if (!acc[r.date]) acc[r.date] = []
    acc[r.date].push(r)
    return acc
  }, {})

  // Kanban always shows one day (the 'from' date)
  const kanbanRdvs = initialRdv.filter((r) => r.date === from)

  function selectPatient(p: Patient) {
    setForm((f) => ({ ...f, patientId: p.id, telephone: p.telephone, patientNomLibre: null }))
    setPatientSearch(`${p.prenom} ${p.nom}`)
  }

  function handleStatusChange(id: string, statut: RdvFormData["statut"]) {
    startTransition(async () => {
      await updateRdvStatut(id, statut)
      toast.success("Statut mis à jour")
      router.refresh()
    })
  }

  function handleSubmit(e: React.FormEvent) {
    e.preventDefault()
    startTransition(async () => {
      try {
        await createRdv(form)
        toast.success("Rendez-vous créé")
        setOpen(false)
        setPatientSearch("")
        setForm({ date: today, heure: "09:00", statut: "confirme", patientId: null, patientNomLibre: null, telephone: null, age: null, medecinId: null, notes: null })
        router.refresh()
      } catch (err: unknown) {
        toast.error(err instanceof Error ? err.message : "Erreur")
      }
    })
  }

  const totalRdv = initialRdv.length
  const totalConfirmes = initialRdv.filter((r) => r.statut === "confirme").length

  // ── Chip button style ──────────────────────────────────────────────────────

  function chipCls(active: boolean) {
    return `text-xs px-2.5 py-1 rounded-md border transition-colors whitespace-nowrap ${
      active
        ? "bg-foreground text-background border-foreground"
        : "border-border text-muted-foreground hover:bg-muted hover:text-foreground"
    }`
  }

  return (
    <div className="space-y-4">
      {/* ── Top header ── */}
      <div className="flex items-center justify-between">
        <div>
          <h1 className="text-lg font-semibold">Rendez-vous</h1>
          <p className="text-sm text-muted-foreground">
            {totalRdv} RDV{totalRdv !== 1 ? "s" : ""} · {totalConfirmes} confirmé{totalConfirmes !== 1 ? "s" : ""}
          </p>
        </div>

        <div className="flex items-center gap-2">
          {/* View toggle */}
          <div className="flex items-center border border-border rounded-md overflow-hidden">
            <button
              onClick={() => setView("kanban")}
              className={`px-2.5 py-1.5 flex items-center gap-1.5 text-xs transition-colors ${view === "kanban" ? "bg-foreground text-background" : "hover:bg-muted text-muted-foreground"}`}
            >
              <LayoutGrid className="w-3.5 h-3.5" />Kanban
            </button>
            <button
              onClick={() => setView("liste")}
              className={`px-2.5 py-1.5 flex items-center gap-1.5 text-xs transition-colors border-l border-border ${view === "liste" ? "bg-foreground text-background" : "hover:bg-muted text-muted-foreground"}`}
            >
              <List className="w-3.5 h-3.5" />Liste
            </button>
          </div>

          {/* New RDV dialog */}
          <Dialog open={open} onOpenChange={setOpen}>
            <DialogTrigger asChild>
              <Button size="sm"><Plus className="w-4 h-4" />Nouveau RDV</Button>
            </DialogTrigger>
            <DialogContent>
              <DialogHeader><DialogTitle>Nouveau rendez-vous</DialogTitle></DialogHeader>
              <form onSubmit={handleSubmit} className="space-y-4 mt-2">
                <div className="grid grid-cols-2 gap-3">
                  <div className="space-y-1.5">
                    <Label>Date *</Label>
                    <Input type="date" value={form.date} onChange={(e) => setForm((f) => ({ ...f, date: e.target.value }))} required />
                  </div>
                  <div className="space-y-1.5">
                    <Label>Heure *</Label>
                    <Input type="time" value={form.heure} onChange={(e) => setForm((f) => ({ ...f, heure: e.target.value }))} required />
                  </div>
                </div>
                <div className="space-y-1.5">
                  <Label>Patient</Label>
                  <div className="relative">
                    <Input
                      placeholder="Chercher un patient ou saisir un nom libre…"
                      value={patientSearch}
                      onChange={(e) => { setPatientSearch(e.target.value); setForm((f) => ({ ...f, patientId: null, patientNomLibre: e.target.value || null })) }}
                    />
                    {patientSearch && !form.patientId && filteredPats.length > 0 && (
                      <div className="absolute top-full left-0 right-0 z-10 mt-1 bg-card border border-border rounded-md shadow-lg overflow-hidden">
                        {filteredPats.map((p) => (
                          <button key={p.id} type="button" className="w-full text-left px-3 py-2 text-sm hover:bg-accent" onClick={() => selectPatient(p)}>
                            {p.prenom} {p.nom} <span className="text-muted-foreground text-xs">· {p.telephone}</span>
                          </button>
                        ))}
                      </div>
                    )}
                  </div>
                </div>
                <div className="grid grid-cols-2 gap-3">
                  <div className="space-y-1.5">
                    <Label>Téléphone</Label>
                    <Input value={form.telephone ?? ""} onChange={(e) => setForm((f) => ({ ...f, telephone: e.target.value || null }))} />
                  </div>
                  <div className="space-y-1.5">
                    <Label>Statut</Label>
                    <Select value={form.statut} onValueChange={(v) => setForm((f) => ({ ...f, statut: v as RdvFormData["statut"] }))}>
                      <SelectTrigger><SelectValue /></SelectTrigger>
                      <SelectContent>
                        <SelectItem value="confirme">Confirmé</SelectItem>
                        <SelectItem value="arrive">Arrivé</SelectItem>
                        <SelectItem value="en_consultation">En consultation</SelectItem>
                        <SelectItem value="effectue">Effectué</SelectItem>
                        <SelectItem value="annule">Annulé</SelectItem>
                        <SelectItem value="no_show">No-show</SelectItem>
                      </SelectContent>
                    </Select>
                  </div>
                </div>
                <div className="flex justify-end gap-2 pt-1">
                  <Button type="button" variant="outline" onClick={() => setOpen(false)}>Annuler</Button>
                  <Button type="submit" disabled={isPending}>{isPending ? "Enregistrement…" : "Créer"}</Button>
                </div>
              </form>
            </DialogContent>
          </Dialog>
        </div>
      </div>

      {/* ── Date / range controls (contextual) ── */}
      {view === "kanban" ? (
        /* Kanban: single day with prev/next arrows */
        <div className="flex items-center gap-1.5">
          <button
            onClick={() => navigate(addDays(from, -1), addDays(from, -1))}
            className="h-8 w-8 flex items-center justify-center rounded-md border border-border hover:bg-muted text-muted-foreground hover:text-foreground transition-colors"
          >
            <ChevronLeft className="w-4 h-4" />
          </button>
          <Input
            type="date"
            value={from}
            onChange={(e) => navigate(e.target.value, e.target.value)}
            className="h-8 w-36 text-sm"
          />
          <button
            onClick={() => navigate(addDays(from, 1), addDays(from, 1))}
            className="h-8 w-8 flex items-center justify-center rounded-md border border-border hover:bg-muted text-muted-foreground hover:text-foreground transition-colors"
          >
            <ChevronRight className="w-4 h-4" />
          </button>
          {from !== today && (
            <button
              onClick={() => navigate(today, today)}
              className="text-xs text-muted-foreground hover:text-foreground underline underline-offset-2 whitespace-nowrap ml-0.5"
            >
              Aujourd'hui
            </button>
          )}
        </div>
      ) : (
        /* List: range preset chips */
        <div className="space-y-2">
          <div className="flex items-center gap-1.5 flex-wrap">
            {PRESETS.map((p) => (
              <button key={p.label} className={chipCls(p.f === from && p.t === to)} onClick={() => { navigate(p.f, p.t); setCustomOpen(false) }}>
                {p.label}
              </button>
            ))}
            <button
              className={chipCls(isCustomRange)}
              onClick={() => { setCustomFrom(from); setCustomTo(to); setCustomOpen((o) => !o) }}
            >
              Personnalisé
            </button>
            {from !== today || to !== today ? (
              <span className="text-xs text-muted-foreground ml-1">
                {from === to ? fmtLabel(from) : `${fmtLabel(from)} → ${fmtLabel(to)}`}
              </span>
            ) : null}
          </div>

          {/* Custom range inputs */}
          {customOpen && (
            <div className="flex items-center gap-2 flex-wrap">
              <Input type="date" value={customFrom} onChange={(e) => setCustomFrom(e.target.value)} className="h-8 w-36 text-sm" />
              <span className="text-muted-foreground text-sm">→</span>
              <Input type="date" value={customTo} min={customFrom} onChange={(e) => setCustomTo(e.target.value)} className="h-8 w-36 text-sm" />
              <Button
                size="sm" variant="outline"
                onClick={() => { navigate(customFrom, customTo); setCustomOpen(false) }}
                disabled={!customFrom || !customTo || customTo < customFrom}
              >
                Appliquer
              </Button>
            </div>
          )}
        </div>
      )}

      {/* ── Kanban view ── */}
      {view === "kanban" && (
        kanbanRdvs.length === 0 ? (
          <div className="text-center py-16 text-muted-foreground">
            <CalendarDays className="w-10 h-10 mx-auto mb-3 opacity-30" />
            <p className="text-sm">Aucun rendez-vous ce jour</p>
          </div>
        ) : (
          <KanbanBoard rdvs={kanbanRdvs} services={services} medecins={medecins} today={today} />
        )
      )}

      {/* ── List view ── */}
      {view === "liste" && (
        Object.keys(rdvByDate).length === 0 ? (
          <div className="text-center py-16 text-muted-foreground">
            <CalendarDays className="w-10 h-10 mx-auto mb-3 opacity-30" />
            <p className="text-sm">Aucun rendez-vous sur cette période</p>
          </div>
        ) : (
          Object.entries(rdvByDate).map(([date, rdvs]) => (
            <div key={date}>
              <p className="text-xs font-semibold text-muted-foreground uppercase tracking-widest mb-2">{formatDate(date)}</p>
              <div className="border border-border rounded-lg bg-card overflow-hidden">
                <Table>
                  <TableHeader>
                    <TableRow className="bg-muted/30 hover:bg-muted/30">
                      <TableHead>Heure</TableHead>
                      <TableHead>Patient</TableHead>
                      <TableHead>Téléphone</TableHead>
                      <TableHead>Réf.</TableHead>
                      <TableHead>Statut</TableHead>
                      <TableHead>Actions</TableHead>
                    </TableRow>
                  </TableHeader>
                  <TableBody>
                    {rdvs.map((r) => {
                      const nom = r.patient ? `${r.patient.prenom} ${r.patient.nom}` : r.patientNomLibre ?? "—"
                      const tel = r.patient?.telephone ?? r.telephone ?? "—"
                      return (
                        <TableRow key={r.id}>
                          <TableCell>
                            <div className="flex items-center gap-1.5">
                              <Clock className="w-3.5 h-3.5 text-muted-foreground" />
                              <span className="font-medium text-sm">{r.heure.slice(0, 5)}</span>
                            </div>
                          </TableCell>
                          <TableCell className="font-medium text-sm">{nom}</TableCell>
                          <TableCell className="text-sm text-muted-foreground">{tel}</TableCell>
                          <TableCell className="text-xs font-mono text-muted-foreground">{r.ref}</TableCell>
                          <TableCell>
                            <Badge variant={STATUT_VARIANTS[r.statut as keyof typeof STATUT_VARIANTS] ?? "confirme"}>
                              {STATUT_LABELS[r.statut] ?? r.statut}
                            </Badge>
                          </TableCell>
                          <TableCell>
                            <div className="flex items-center gap-1 flex-wrap">
                              {r.statut === "confirme" && (
                                <>
                                  <button onClick={() => handleStatusChange(r.id, "arrive")} className="text-xs px-2 py-1 rounded border border-amber-200 text-amber-700 hover:bg-amber-50 transition-colors">Arrivé</button>
                                  <button onClick={() => handleStatusChange(r.id, "no_show")} className="text-xs px-2 py-1 rounded border border-orange-200 text-orange-700 hover:bg-orange-50 transition-colors">No-show</button>
                                  <button onClick={() => handleStatusChange(r.id, "annule")} className="text-xs px-2 py-1 rounded border border-border text-muted-foreground hover:bg-muted transition-colors">Annuler</button>
                                </>
                              )}
                              {r.statut === "arrive" && (
                                <button onClick={() => handleStatusChange(r.id, "en_consultation")} className="text-xs px-2 py-1 rounded border border-purple-200 text-purple-700 hover:bg-purple-50 transition-colors">En consultation</button>
                              )}
                              {r.statut === "en_consultation" && (
                                <button onClick={() => handleStatusChange(r.id, "effectue")} className="text-xs px-2 py-1 rounded border border-emerald-200 text-emerald-700 hover:bg-emerald-50 transition-colors">Terminé</button>
                              )}
                            </div>
                          </TableCell>
                        </TableRow>
                      )
                    })}
                  </TableBody>
                </Table>
              </div>
            </div>
          ))
        )
      )}
    </div>
  )
}
