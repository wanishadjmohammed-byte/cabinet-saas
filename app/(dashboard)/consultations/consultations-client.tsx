"use client"

import { useState, useTransition } from "react"
import { useRouter } from "next/navigation"
import { createConsultation, updateConsultation, deleteConsultation, type ConsultationFormData } from "@/actions/consultations"
import { Button } from "@/components/ui/button"
import { Input } from "@/components/ui/input"
import { Label } from "@/components/ui/label"
import { Textarea } from "@/components/ui/textarea"
import { Select, SelectContent, SelectItem, SelectTrigger, SelectValue } from "@/components/ui/select"
import { Table, TableBody, TableCell, TableHead, TableHeader, TableRow } from "@/components/ui/table"
import { Card, CardContent, CardHeader, CardTitle } from "@/components/ui/card"
import { Dialog, DialogContent, DialogHeader, DialogTitle, DialogDescription } from "@/components/ui/dialog"
import { formatCurrency, formatDate, today, calcAge } from "@/lib/utils"
import { Stethoscope, Pencil, Trash2 } from "lucide-react"
import { toast } from "sonner"

type Patient = { id: string; prenom: string; nom: string; telephone: string; dateNaissance: string | null }
type Service = { id: string; nom: string; prixStandard: number }
type Consultation = {
  id: string; ref: string; date: string; prixFinal: number
  diagnostic: string | null; ordonnance: string | null; notesMedicales: string | null
  patient: { prenom: string; nom: string; dateNaissance: string | null } | null
  service: { nom: string } | null
}

export function ConsultationsClient({ consultations, patients, services }: {
  consultations: Consultation[]; patients: Patient[]; services: Service[]
}) {
  const router = useRouter()
  const [isPending, startTransition] = useTransition()
  const [patientSearch, setPatientSearch] = useState("")
  const [selected, setSelected] = useState<Consultation | null>(null)
  const [editMode, setEditMode] = useState(false)
  const [editForm, setEditForm] = useState({ date: "", prixFinal: 0, diagnostic: "", ordonnance: "", notesMedicales: "" })
  const [editPending, startEditTransition] = useTransition()
  const [deletingId, setDeletingId] = useState<string | null>(null)
  const [, startDeleteTransition] = useTransition()

  function handleDelete(id: string) {
    setDeletingId(null)
    startDeleteTransition(async () => {
      try {
        await deleteConsultation(id)
        toast.success("Consultation supprimée")
        router.refresh()
      } catch {
        toast.error("Erreur lors de la suppression")
      }
    })
  }

  function openDetail(c: Consultation) {
    setSelected(c)
    setEditMode(false)
  }

  function startEdit() {
    if (!selected) return
    setEditForm({
      date: selected.date,
      prixFinal: selected.prixFinal,
      diagnostic: selected.diagnostic ?? "",
      ordonnance: selected.ordonnance ?? "",
      notesMedicales: selected.notesMedicales ?? "",
    })
    setEditMode(true)
  }

  function handleEditSubmit(e: React.FormEvent) {
    e.preventDefault()
    if (!selected) return
    startEditTransition(async () => {
      try {
        await updateConsultation(selected.id, {
          date: editForm.date,
          prixFinal: editForm.prixFinal,
          diagnostic: editForm.diagnostic || null,
          ordonnance: editForm.ordonnance || null,
          notesMedicales: editForm.notesMedicales || null,
        })
        toast.success("Consultation mise à jour")
        setSelected(null)
        setEditMode(false)
        router.refresh()
      } catch (err: unknown) {
        toast.error(err instanceof Error ? err.message : "Erreur")
      }
    })
  }
  const [form, setForm] = useState<ConsultationFormData>({
    patientId: "", serviceId: null, prixStandard: 0, prixFinal: 0,
    medecinId: null, date: today(), rdvId: null,
    diagnostic: null, ordonnance: null, notesMedicales: null,
  })

  const filteredPats = patients.filter((p) => {
    const q = patientSearch.toLowerCase()
    return p.nom.toLowerCase().includes(q) || p.prenom.toLowerCase().includes(q)
  }).slice(0, 5)

  function selectPatient(p: Patient) {
    setForm((f) => ({ ...f, patientId: p.id }))
    setPatientSearch(`${p.prenom} ${p.nom}`)
  }

  function selectService(serviceId: string) {
    const svc = services.find((s) => s.id === serviceId)
    if (svc) {
      setForm((f) => ({ ...f, serviceId, prixStandard: svc.prixStandard, prixFinal: svc.prixStandard }))
    }
  }

  function handleSubmit(e: React.FormEvent) {
    e.preventDefault()
    if (!form.patientId) { toast.error("Sélectionnez un patient"); return }
    startTransition(async () => {
      try {
        await createConsultation(form)
        toast.success("Consultation enregistrée")
        setForm({ patientId: "", serviceId: null, prixStandard: 0, prixFinal: 0, medecinId: null, date: today(), rdvId: null, diagnostic: null, ordonnance: null, notesMedicales: null })
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
        <h1 className="text-lg font-semibold">Consultations</h1>
        <p className="text-sm text-muted-foreground">Enregistrer un acte médical</p>
      </div>

      {/* Form */}
      <form onSubmit={handleSubmit}>
        <div className="grid grid-cols-1 lg:grid-cols-2 gap-4">
          {/* Left — patient & service */}
          <Card>
            <CardHeader><CardTitle>Acte médical</CardTitle></CardHeader>
            <CardContent className="space-y-4">
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
                          {p.prenom} {p.nom} <span className="text-muted-foreground text-xs">· {p.telephone}</span>
                        </button>
                      ))}
                    </div>
                  )}
                </div>
              </div>

              <div className="space-y-1.5">
                <Label>Service</Label>
                <Select onValueChange={selectService}>
                  <SelectTrigger><SelectValue placeholder="Choisir un service…" /></SelectTrigger>
                  <SelectContent>
                    {services.map((s) => (
                      <SelectItem key={s.id} value={s.id}>{s.nom}</SelectItem>
                    ))}
                  </SelectContent>
                </Select>
              </div>

              <div className="grid grid-cols-2 gap-3">
                <div className="space-y-1.5">
                  <Label>Prix standard</Label>
                  <Input value={formatCurrency(form.prixStandard)} readOnly className="bg-muted text-muted-foreground" />
                </div>
                <div className="space-y-1.5">
                  <Label>Prix final (DA) *</Label>
                  <Input type="number" min={0} value={form.prixFinal}
                    onChange={(e) => setForm((f) => ({ ...f, prixFinal: Number(e.target.value) }))} required />
                </div>
              </div>

              <div className="grid grid-cols-2 gap-3">
                <div className="space-y-1.5">
                  <Label>Date *</Label>
                  <Input type="date" value={form.date} onChange={(e) => setForm((f) => ({ ...f, date: e.target.value }))} required />
                </div>
                <div className="space-y-1.5">
                  <Label>ID RDV</Label>
                  <Input placeholder="Optionnel" value={form.rdvId ?? ""} onChange={(e) => setForm((f) => ({ ...f, rdvId: e.target.value || null }))} />
                </div>
              </div>

              <Button type="submit" className="w-full" disabled={isPending}>
                {isPending ? "Enregistrement…" : "Enregistrer la consultation"}
              </Button>
            </CardContent>
          </Card>

          {/* Right — medical notes */}
          <Card>
            <CardHeader><CardTitle>Notes médicales</CardTitle></CardHeader>
            <CardContent className="space-y-4">
              <div className="space-y-1.5">
                <Label>Diagnostic / Cas</Label>
                <Textarea rows={4} placeholder="Description du cas, diagnostic…"
                  value={form.diagnostic ?? ""} onChange={(e) => setForm((f) => ({ ...f, diagnostic: e.target.value || null }))} />
              </div>
              <div className="space-y-1.5">
                <Label>Ordonnance</Label>
                <Textarea rows={5} placeholder="Médicaments, posologies, durée du traitement…"
                  value={form.ordonnance ?? ""} onChange={(e) => setForm((f) => ({ ...f, ordonnance: e.target.value || null }))} />
              </div>
              <div className="space-y-1.5">
                <Label>Notes complémentaires</Label>
                <Textarea rows={3} placeholder="Observations, suivi…"
                  value={form.notesMedicales ?? ""} onChange={(e) => setForm((f) => ({ ...f, notesMedicales: e.target.value || null }))} />
              </div>
            </CardContent>
          </Card>
        </div>
      </form>

      {/* Recent consultations */}
      <div>
        <h2 className="text-sm font-semibold text-muted-foreground uppercase tracking-widest mb-3">Dernières consultations</h2>
        <div className="border border-border rounded-lg bg-card overflow-hidden">
          <Table>
            <TableHeader>
              <TableRow className="bg-muted/30 hover:bg-muted/30">
                <TableHead>Réf.</TableHead><TableHead>Date</TableHead>
                <TableHead>Patient</TableHead><TableHead>Âge</TableHead>
                <TableHead>Service</TableHead>
                <TableHead className="text-right">Prix final</TableHead>
                <TableHead />
              </TableRow>
            </TableHeader>
            <TableBody>
              {consultations.length === 0 ? (
                <TableRow><TableCell colSpan={7} className="text-center py-10 text-muted-foreground">
                  <Stethoscope className="w-8 h-8 mx-auto mb-2 opacity-30" />Aucune consultation
                </TableCell></TableRow>
              ) : (
                consultations.map((c) => {
                  const age = calcAge(c.patient?.dateNaissance)
                  const isDeleting = deletingId === c.id
                  return (
                    <TableRow key={c.id} className="cursor-pointer hover:bg-accent/50" onClick={() => !isDeleting && openDetail(c)}>
                      <TableCell className="text-xs font-mono text-muted-foreground">{c.ref}</TableCell>
                      <TableCell className="text-sm">{formatDate(c.date)}</TableCell>
                      <TableCell className="text-sm font-medium">{c.patient ? `${c.patient.prenom} ${c.patient.nom}` : "—"}</TableCell>
                      <TableCell className="text-sm text-muted-foreground">{age !== null ? `${age} ans` : "—"}</TableCell>
                      <TableCell className="text-sm text-muted-foreground">{c.service?.nom ?? "—"}</TableCell>
                      <TableCell className="text-right text-sm font-semibold">{formatCurrency(c.prixFinal)}</TableCell>
                      <TableCell>
                        {isDeleting ? (
                          <div className="flex items-center gap-1" onClick={(e) => e.stopPropagation()}>
                            <button onClick={() => handleDelete(c.id)} className="text-xs px-2 py-1 rounded bg-red-500 text-white hover:bg-red-600 transition-colors">Oui</button>
                            <button onClick={() => setDeletingId(null)} className="text-xs px-2 py-1 rounded border border-border hover:bg-muted transition-colors">Non</button>
                          </div>
                        ) : (
                          <button onClick={(e) => { e.stopPropagation(); setDeletingId(c.id) }}
                            className="p-1.5 rounded hover:bg-red-50 text-muted-foreground hover:text-red-500 transition-colors">
                            <Trash2 className="w-3.5 h-3.5" />
                          </button>
                        )}
                      </TableCell>
                    </TableRow>
                  )
                })
              )}
            </TableBody>
          </Table>
        </div>
      </div>

      {/* Consultation detail / edit dialog */}
      <Dialog open={!!selected} onOpenChange={(open) => { if (!open) { setSelected(null); setEditMode(false) } }}>
        <DialogContent className="max-w-lg">
          {!editMode ? (
            <>
              <DialogHeader>
                <DialogTitle>
                  Consultation {selected?.ref} — {selected?.patient ? `${selected.patient.prenom} ${selected.patient.nom}` : ""}
                </DialogTitle>
                <DialogDescription>
                  {selected && formatDate(selected.date)} · {selected?.service?.nom ?? "—"} · {formatCurrency(selected?.prixFinal ?? 0)}
                </DialogDescription>
              </DialogHeader>
              <div className="space-y-4 pb-2">
                <DetailField label="Diagnostic / Cas" value={selected?.diagnostic} />
                <DetailField label="Ordonnance" value={selected?.ordonnance} />
                <DetailField label="Notes complémentaires" value={selected?.notesMedicales} />
              </div>
              <div className="flex justify-end pt-1">
                <Button size="sm" variant="outline" onClick={startEdit}>
                  <Pencil className="w-3.5 h-3.5 mr-1.5" />Modifier
                </Button>
              </div>
            </>
          ) : (
            <>
              <DialogHeader>
                <DialogTitle>Modifier — {selected?.ref}</DialogTitle>
                <DialogDescription>{selected?.patient ? `${selected.patient.prenom} ${selected.patient.nom}` : ""}</DialogDescription>
              </DialogHeader>
              <form onSubmit={handleEditSubmit} className="space-y-4 mt-1">
                <div className="grid grid-cols-2 gap-3">
                  <div className="space-y-1.5">
                    <Label>Date</Label>
                    <Input type="date" value={editForm.date} onChange={(e) => setEditForm((f) => ({ ...f, date: e.target.value }))} required />
                  </div>
                  <div className="space-y-1.5">
                    <Label>Prix final (DA)</Label>
                    <Input type="number" min={0} value={editForm.prixFinal} onChange={(e) => setEditForm((f) => ({ ...f, prixFinal: Number(e.target.value) }))} required />
                  </div>
                </div>
                <div className="space-y-1.5">
                  <Label>Diagnostic / Cas</Label>
                  <Textarea rows={3} value={editForm.diagnostic} onChange={(e) => setEditForm((f) => ({ ...f, diagnostic: e.target.value }))} />
                </div>
                <div className="space-y-1.5">
                  <Label>Ordonnance</Label>
                  <Textarea rows={4} value={editForm.ordonnance} onChange={(e) => setEditForm((f) => ({ ...f, ordonnance: e.target.value }))} />
                </div>
                <div className="space-y-1.5">
                  <Label>Notes complémentaires</Label>
                  <Textarea rows={2} value={editForm.notesMedicales} onChange={(e) => setEditForm((f) => ({ ...f, notesMedicales: e.target.value }))} />
                </div>
                <div className="flex justify-end gap-2 pt-1">
                  <Button type="button" variant="outline" onClick={() => setEditMode(false)}>Annuler</Button>
                  <Button type="submit" disabled={editPending}>{editPending ? "Enregistrement…" : "Sauvegarder"}</Button>
                </div>
              </form>
            </>
          )}
        </DialogContent>
      </Dialog>
    </div>
  )
}

function DetailField({ label, value }: { label: string; value: string | null | undefined }) {
  return (
    <div>
      <p className="text-xs font-semibold text-muted-foreground uppercase tracking-wider mb-1">{label}</p>
      {value ? (
        <p className="text-sm whitespace-pre-wrap leading-relaxed">{value}</p>
      ) : (
        <p className="text-sm text-muted-foreground italic">Non renseigné</p>
      )}
    </div>
  )
}
