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
import { CalendarDays, Plus, Clock, Users } from "lucide-react"
import { formatDate } from "@/lib/utils"
import { toast } from "sonner"

type RdvRow = { id: string; ref: string; date: string; heure: string; statut: string
  patientNomLibre: string | null; telephone: string | null; age: number | null
  patient: { id: string; prenom: string; nom: string; telephone: string } | null
  medecin: { nom: string; prenom: string } | null }
type Patient = { id: string; prenom: string; nom: string; telephone: string; dateNaissance: string | null }

const STATUT_VARIANTS = { confirme: "confirme", effectue: "effectue", annule: "annule", no_show: "no_show" } as const
const STATUT_LABELS: Record<string, string> = { confirme: "Confirmé", effectue: "Effectué", annule: "Annulé", no_show: "No-show" }

export function RdvClient({ initialRdv, patients, today }: {
  initialRdv: RdvRow[]; patients: Patient[]; today: string
}) {
  const [open, setOpen] = useState(false)
  const [isPending, startTransition] = useTransition()
  const [patientSearch, setPatientSearch] = useState("")
  const router = useRouter()

  const [form, setForm] = useState<RdvFormData>({
    date: today, heure: "09:00", statut: "confirme",
    patientId: null, patientNomLibre: null, telephone: null, age: null, medecinId: null, notes: null,
  })

  const filteredPats = patients.filter((p) => {
    const q = patientSearch.toLowerCase()
    return p.nom.toLowerCase().includes(q) || p.prenom.toLowerCase().includes(q)
  }).slice(0, 5)

  const rdvByDate = initialRdv.reduce<Record<string, RdvRow[]>>((acc, r) => {
    if (!acc[r.date]) acc[r.date] = []
    acc[r.date].push(r)
    return acc
  }, {})

  function selectPatient(p: Patient) {
    setForm((f) => ({ ...f, patientId: p.id, telephone: p.telephone, patientNomLibre: null }))
    setPatientSearch(`${p.prenom} ${p.nom}`)
  }

  function handleStatusChange(id: string, statut: "confirme" | "effectue" | "annule" | "no_show") {
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

  const totalJour = initialRdv.filter((r) => r.date === today).length
  const totalConfirmes = initialRdv.filter((r) => r.statut === "confirme").length

  return (
    <div className="space-y-5">
      <div className="flex items-center justify-between">
        <div>
          <h1 className="text-lg font-semibold">Rendez-vous</h1>
          <p className="text-sm text-muted-foreground">{totalJour} aujourd'hui · {totalConfirmes} confirmé{totalConfirmes !== 1 ? "s" : ""}</p>
        </div>
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
                    onChange={(e) => {
                      setPatientSearch(e.target.value)
                      setForm((f) => ({ ...f, patientId: null, patientNomLibre: e.target.value || null }))
                    }}
                  />
                  {patientSearch && !form.patientId && filteredPats.length > 0 && (
                    <div className="absolute top-full left-0 right-0 z-10 mt-1 bg-card border border-border rounded-md shadow-lg overflow-hidden">
                      {filteredPats.map((p) => (
                        <button key={p.id} type="button" className="w-full text-left px-3 py-2 text-sm hover:bg-accent"
                          onClick={() => selectPatient(p)}>
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

      {/* RDV grouped by date */}
      {Object.keys(rdvByDate).length === 0 ? (
        <div className="text-center py-16 text-muted-foreground">
          <CalendarDays className="w-10 h-10 mx-auto mb-3 opacity-30" />
          <p className="text-sm">Aucun rendez-vous à venir</p>
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
                          <div className="flex items-center gap-1">
                            {r.statut === "confirme" && (
                              <>
                                <button onClick={() => handleStatusChange(r.id, "effectue")}
                                  className="text-xs px-2 py-1 rounded border border-emerald-200 text-emerald-700 hover:bg-emerald-50 transition-colors">
                                  Effectué
                                </button>
                                <button onClick={() => handleStatusChange(r.id, "no_show")}
                                  className="text-xs px-2 py-1 rounded border border-orange-200 text-orange-700 hover:bg-orange-50 transition-colors">
                                  No-show
                                </button>
                                <button onClick={() => handleStatusChange(r.id, "annule")}
                                  className="text-xs px-2 py-1 rounded border border-border text-muted-foreground hover:bg-muted transition-colors">
                                  Annuler
                                </button>
                              </>
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
      )}
    </div>
  )
}
