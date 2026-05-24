"use client"

import { useState, useTransition } from "react"
import { useRouter } from "next/navigation"
import { createVersement, updateVersement, deleteVersement, type VersementFormData } from "@/actions/versements"
import { Button } from "@/components/ui/button"
import { Input } from "@/components/ui/input"
import { Label } from "@/components/ui/label"
import { Select, SelectContent, SelectItem, SelectTrigger, SelectValue } from "@/components/ui/select"
import { Table, TableBody, TableCell, TableHead, TableHeader, TableRow } from "@/components/ui/table"
import { Card, CardContent, CardHeader, CardTitle } from "@/components/ui/card"
import { Badge } from "@/components/ui/badge"
import { Dialog, DialogContent, DialogHeader, DialogTitle } from "@/components/ui/dialog"
import { Textarea } from "@/components/ui/textarea"
import { formatCurrency, formatDate, today } from "@/lib/utils"
import { CreditCard, Pencil, Trash2 } from "lucide-react"
import { toast } from "sonner"

type Patient = { id: string; prenom: string; nom: string; telephone: string }
type Versement = { id: string; ref: string; date: string; montant: number; mode: string; type: string; notes: string | null
  patient: { prenom: string; nom: string } | null }

const MODE_LABELS: Record<string, string> = { baridi_mob: "Baridi Mob", especes: "Espèces" }
const TYPE_LABELS: Record<string, string> = { acompte: "Acompte", versement: "Versement", solde: "Solde", total: "Total" }

export function VersementsClient({ versements, patients }: { versements: Versement[]; patients: Patient[] }) {
  const router = useRouter()
  const [isPending, startTransition] = useTransition()
  const [patientSearch, setPatientSearch] = useState("")
  const [form, setForm] = useState<VersementFormData>({
    patientId: "", montant: 0, mode: "especes", type: "total", date: today(), notes: null,
  })

  const [editVersement, setEditVersement] = useState<Versement | null>(null)
  const [editForm, setEditForm] = useState({ montant: 0, mode: "especes" as VersementFormData["mode"], type: "total" as VersementFormData["type"], date: "", notes: "" })
  const [editPending, startEditTransition] = useTransition()
  const [deletingId, setDeletingId] = useState<string | null>(null)
  const [, startDeleteTransition] = useTransition()

  function handleDelete(id: string) {
    setDeletingId(null)
    startDeleteTransition(async () => {
      try {
        await deleteVersement(id)
        toast.success("Versement supprimé")
        router.refresh()
      } catch {
        toast.error("Erreur lors de la suppression")
      }
    })
  }

  function openEdit(v: Versement, e: React.MouseEvent) {
    e.stopPropagation()
    setEditVersement(v)
    setEditForm({ montant: v.montant, mode: v.mode as VersementFormData["mode"], type: v.type as VersementFormData["type"], date: v.date, notes: v.notes ?? "" })
  }

  function handleEditSubmit(e: React.FormEvent) {
    e.preventDefault()
    if (!editVersement) return
    startEditTransition(async () => {
      try {
        await updateVersement(editVersement.id, { ...editForm, notes: editForm.notes || null })
        toast.success("Versement mis à jour")
        setEditVersement(null)
        router.refresh()
      } catch (err: unknown) {
        toast.error(err instanceof Error ? err.message : "Erreur")
      }
    })
  }

  const filteredPats = patients.filter((p) => {
    const q = patientSearch.toLowerCase()
    return p.nom.toLowerCase().includes(q) || p.prenom.toLowerCase().includes(q)
  }).slice(0, 5)

  const totalEncaisse = versements.reduce((s, v) => s + v.montant, 0)
  const todayTotal = versements.filter((v) => v.date === today()).reduce((s, v) => s + v.montant, 0)

  function selectPatient(p: Patient) {
    setForm((f) => ({ ...f, patientId: p.id }))
    setPatientSearch(`${p.prenom} ${p.nom}`)
  }

  function handleSubmit(e: React.FormEvent) {
    e.preventDefault()
    if (!form.patientId) { toast.error("Sélectionnez un patient"); return }
    if (form.montant <= 0) { toast.error("Montant invalide"); return }
    startTransition(async () => {
      try {
        await createVersement(form)
        toast.success("Versement enregistré")
        setForm({ patientId: "", montant: 0, mode: "especes", type: "total", date: today(), notes: null })
        setPatientSearch("")
        router.refresh()
      } catch (err: unknown) {
        toast.error(err instanceof Error ? err.message : "Erreur")
      }
    })
  }

  return (
    <div className="space-y-5">
      <div>
        <h1 className="text-lg font-semibold">Versements</h1>
        <p className="text-sm text-muted-foreground">Encaissé aujourd'hui : <strong>{formatCurrency(todayTotal)}</strong> · Total : <strong>{formatCurrency(totalEncaisse)}</strong></p>
      </div>

      <div className="grid grid-cols-1 lg:grid-cols-3 gap-4">
        {/* Quick form */}
        <Card>
          <CardHeader><CardTitle>Enregistrer un paiement</CardTitle></CardHeader>
          <CardContent>
            <form onSubmit={handleSubmit} className="space-y-4">
              <div className="space-y-1.5">
                <Label>Patient *</Label>
                <div className="relative">
                  <Input placeholder="Rechercher un patient…" value={patientSearch}
                    onChange={(e) => { setPatientSearch(e.target.value); setForm((f) => ({ ...f, patientId: "" })) }} />
                  {patientSearch && !form.patientId && filteredPats.length > 0 && (
                    <div className="absolute top-full left-0 right-0 z-10 mt-1 bg-card border border-border rounded-md shadow-lg overflow-hidden">
                      {filteredPats.map((p) => (
                        <button key={p.id} type="button" onClick={() => selectPatient(p)}
                          className="w-full text-left px-3 py-2 text-sm hover:bg-accent">
                          {p.prenom} {p.nom} <span className="text-xs text-muted-foreground">· {p.telephone}</span>
                        </button>
                      ))}
                    </div>
                  )}
                </div>
              </div>

              <div className="space-y-1.5">
                <Label>Montant (DA) *</Label>
                <Input type="number" min={1} value={form.montant || ""}
                  onChange={(e) => setForm((f) => ({ ...f, montant: Number(e.target.value) }))} required />
              </div>

              <div className="space-y-1.5">
                <Label>Mode</Label>
                <Select value={form.mode} onValueChange={(v) => setForm((f) => ({ ...f, mode: v as VersementFormData["mode"] }))}>
                  <SelectTrigger><SelectValue /></SelectTrigger>
                  <SelectContent>
                    <SelectItem value="especes">Espèces</SelectItem>
                    <SelectItem value="baridi_mob">Baridi Mob</SelectItem>
                  </SelectContent>
                </Select>
              </div>

              <div className="space-y-1.5">
                <Label>Type</Label>
                <Select value={form.type} onValueChange={(v) => setForm((f) => ({ ...f, type: v as VersementFormData["type"] }))}>
                  <SelectTrigger><SelectValue /></SelectTrigger>
                  <SelectContent>
                    <SelectItem value="total">Total</SelectItem>
                    <SelectItem value="acompte">Acompte</SelectItem>
                    <SelectItem value="versement">Versement</SelectItem>
                    <SelectItem value="solde">Solde</SelectItem>
                  </SelectContent>
                </Select>
              </div>

              <div className="space-y-1.5">
                <Label>Date</Label>
                <Input type="date" value={form.date} onChange={(e) => setForm((f) => ({ ...f, date: e.target.value }))} />
              </div>

              <Button type="submit" className="w-full" disabled={isPending}>
                {isPending ? "Enregistrement…" : "Enregistrer"}
              </Button>
            </form>
          </CardContent>
        </Card>

        {/* List */}
        <div className="lg:col-span-2">
          <div className="border border-border rounded-lg bg-card overflow-hidden">
            <Table>
              <TableHeader>
                <TableRow className="bg-muted/30 hover:bg-muted/30">
                  <TableHead>Réf.</TableHead><TableHead>Date</TableHead>
                  <TableHead>Patient</TableHead><TableHead>Mode</TableHead>
                  <TableHead>Type</TableHead><TableHead className="text-right">Montant</TableHead>
                  <TableHead />
                </TableRow>
              </TableHeader>
              <TableBody>
                {versements.length === 0 ? (
                  <TableRow><TableCell colSpan={7} className="text-center py-12 text-muted-foreground">
                    <CreditCard className="w-8 h-8 mx-auto mb-2 opacity-30" />Aucun versement
                  </TableCell></TableRow>
                ) : (
                  versements.map((v) => (
                    <TableRow key={v.id}>
                      <TableCell className="text-xs font-mono text-muted-foreground">{v.ref}</TableCell>
                      <TableCell className="text-sm">{formatDate(v.date)}</TableCell>
                      <TableCell className="text-sm font-medium">{v.patient ? `${v.patient.prenom} ${v.patient.nom}` : "—"}</TableCell>
                      <TableCell><Badge variant="secondary">{MODE_LABELS[v.mode] ?? v.mode}</Badge></TableCell>
                      <TableCell className="text-sm text-muted-foreground capitalize">{TYPE_LABELS[v.type] ?? v.type}</TableCell>
                      <TableCell className="text-right text-sm font-semibold text-emerald-600">{formatCurrency(v.montant)}</TableCell>
                      <TableCell>
                        {deletingId === v.id ? (
                          <div className="flex items-center gap-1">
                            <button onClick={() => handleDelete(v.id)} className="text-xs px-2 py-1 rounded bg-red-500 text-white hover:bg-red-600 transition-colors">Oui</button>
                            <button onClick={() => setDeletingId(null)} className="text-xs px-2 py-1 rounded border border-border hover:bg-muted transition-colors">Non</button>
                          </div>
                        ) : (
                          <div className="flex items-center gap-1">
                            <button onClick={(e) => openEdit(v, e)} className="p-1.5 rounded hover:bg-accent text-muted-foreground hover:text-foreground transition-colors">
                              <Pencil className="w-3.5 h-3.5" />
                            </button>
                            <button onClick={(e) => { e.stopPropagation(); setDeletingId(v.id) }} className="p-1.5 rounded hover:bg-red-50 text-muted-foreground hover:text-red-500 transition-colors">
                              <Trash2 className="w-3.5 h-3.5" />
                            </button>
                          </div>
                        )}
                      </TableCell>
                    </TableRow>
                  ))
                )}
              </TableBody>
            </Table>
          </div>
        </div>
      </div>

      {/* Edit versement dialog */}
      <Dialog open={!!editVersement} onOpenChange={(open) => { if (!open) setEditVersement(null) }}>
        <DialogContent className="max-w-sm">
          <DialogHeader>
            <DialogTitle>Modifier — {editVersement?.ref}</DialogTitle>
          </DialogHeader>
          <form onSubmit={handleEditSubmit} className="space-y-4 mt-1">
            <div className="space-y-1.5">
              <Label>Montant (DA) *</Label>
              <Input type="number" min={1} value={editForm.montant || ""} onChange={(e) => setEditForm((f) => ({ ...f, montant: Number(e.target.value) }))} required />
            </div>
            <div className="space-y-1.5">
              <Label>Mode</Label>
              <Select value={editForm.mode} onValueChange={(v) => setEditForm((f) => ({ ...f, mode: v as VersementFormData["mode"] }))}>
                <SelectTrigger><SelectValue /></SelectTrigger>
                <SelectContent>
                  <SelectItem value="especes">Espèces</SelectItem>
                  <SelectItem value="baridi_mob">Baridi Mob</SelectItem>
                </SelectContent>
              </Select>
            </div>
            <div className="space-y-1.5">
              <Label>Type</Label>
              <Select value={editForm.type} onValueChange={(v) => setEditForm((f) => ({ ...f, type: v as VersementFormData["type"] }))}>
                <SelectTrigger><SelectValue /></SelectTrigger>
                <SelectContent>
                  <SelectItem value="total">Total</SelectItem>
                  <SelectItem value="acompte">Acompte</SelectItem>
                  <SelectItem value="versement">Versement</SelectItem>
                  <SelectItem value="solde">Solde</SelectItem>
                </SelectContent>
              </Select>
            </div>
            <div className="space-y-1.5">
              <Label>Date</Label>
              <Input type="date" value={editForm.date} onChange={(e) => setEditForm((f) => ({ ...f, date: e.target.value }))} />
            </div>
            <div className="space-y-1.5">
              <Label>Notes</Label>
              <Textarea rows={2} value={editForm.notes} onChange={(e) => setEditForm((f) => ({ ...f, notes: e.target.value }))} />
            </div>
            <div className="flex justify-end gap-2 pt-1">
              <Button type="button" variant="outline" onClick={() => setEditVersement(null)}>Annuler</Button>
              <Button type="submit" disabled={editPending}>{editPending ? "Enregistrement…" : "Sauvegarder"}</Button>
            </div>
          </form>
        </DialogContent>
      </Dialog>
    </div>
  )
}
