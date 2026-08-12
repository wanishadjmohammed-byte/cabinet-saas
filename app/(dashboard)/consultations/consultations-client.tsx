"use client"

import { useRef, useState, useTransition } from "react"
import { useRouter } from "next/navigation"
import {
  createConsultation,
  updateConsultation,
  deleteConsultation,
  type ConsultationFormData,
} from "@/actions/consultations"
import { Button } from "@/components/ui/button"
import { Input } from "@/components/ui/input"
import { Label } from "@/components/ui/label"
import { Textarea } from "@/components/ui/textarea"
import { Select, SelectContent, SelectItem, SelectTrigger, SelectValue } from "@/components/ui/select"
import { Table, TableBody, TableCell, TableHead, TableHeader, TableRow } from "@/components/ui/table"
import { Dialog, DialogContent, DialogHeader, DialogTitle } from "@/components/ui/dialog"
import { SheetPreview } from "@/components/print/sheet-preview"
import { OrdonnanceSheet } from "@/components/print/documents/ordonnance-sheet"
import { ReportEditor } from "@/components/print/report-editor"
import { PdfButton } from "@/components/print/pdf-button"
import { nomFichierSur } from "@/lib/pdf"
import { formatCurrency, formatDate, today, calcAge } from "@/lib/utils"
import { Plus, Stethoscope, Pencil, Trash2, Printer, Eye } from "lucide-react"
import { toast } from "sonner"

type Patient = {
  id: string
  prenom: string
  nom: string
  telephone: string
  dateNaissance: string | null
}
type Service = { id: string; nom: string; prixStandard: number }
type Consultation = {
  id: string
  ref: string
  date: string
  prixFinal: number
  diagnostic: string | null
  ordonnance: string | null
  notesMedicales: string | null
  patient: { prenom: string; nom: string; dateNaissance: string | null } | null
  service: { nom: string } | null
}

const EMPTY: ConsultationFormData = {
  patientId: "",
  serviceId: null,
  prixStandard: 0,
  prixFinal: 0,
  medecinId: null,
  date: today(),
  rdvId: null,
  diagnostic: null,
  ordonnance: null,
  notesMedicales: null,
}

/** Ouvre l'ordonnance A5 imprimable de la consultation dans un nouvel onglet. */
function openOrdonnance(id: string) {
  window.open(`/print/ordonnance/${id}`, "_blank", "noopener")
}

export function ConsultationsClient({
  consultations,
  patients,
  services,
}: {
  consultations: Consultation[]
  patients: Patient[]
  services: Service[]
}) {
  const router = useRouter()
  const [isPending, startTransition] = useTransition()

  const [open, setOpen] = useState(false)
  /** Consultation en cours de modification — null en création. */
  const [editing, setEditing] = useState<Consultation | null>(null)
  const [form, setForm] = useState<ConsultationFormData>(EMPTY)
  const [patientSearch, setPatientSearch] = useState("")
  const [deletingId, setDeletingId] = useState<string | null>(null)
  const [apercu, setApercu] = useState<Consultation | null>(null)
  const apercuRef = useRef<HTMLDivElement>(null)

  const filteredPats = patients
    .filter((p) => {
      const q = patientSearch.toLowerCase()
      return p.nom.toLowerCase().includes(q) || p.prenom.toLowerCase().includes(q)
    })
    .slice(0, 5)

  const patientChoisi = patients.find((p) => p.id === form.patientId) ?? null

  /** Patient affiché dans l'aperçu : celui de la consultation modifiée, sinon celui choisi. */
  const patientApercu = editing
    ? editing.patient
    : patientChoisi
    ? { prenom: patientChoisi.prenom, nom: patientChoisi.nom, dateNaissance: patientChoisi.dateNaissance }
    : null

  const totalCA = consultations.reduce((s, c) => s + c.prixFinal, 0)

  function openCreate() {
    setEditing(null)
    setForm({ ...EMPTY, date: today() })
    setPatientSearch("")
    setOpen(true)
  }

  function openEdit(c: Consultation) {
    setEditing(c)
    setForm({
      ...EMPTY,
      patientId: "",
      date: c.date,
      prixFinal: c.prixFinal,
      diagnostic: c.diagnostic,
      ordonnance: c.ordonnance,
      notesMedicales: c.notesMedicales,
    })
    setPatientSearch("")
    setOpen(true)
  }

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
    if (!editing && !form.patientId) {
      toast.error("Sélectionnez un patient")
      return
    }

    startTransition(async () => {
      try {
        if (editing) {
          // Le patient et le service d'une consultation existante ne changent pas.
          await updateConsultation(editing.id, {
            date: form.date,
            prixFinal: form.prixFinal,
            diagnostic: form.diagnostic ?? null,
            ordonnance: form.ordonnance ?? null,
            notesMedicales: form.notesMedicales ?? null,
          })
          const id = editing.id
          toast.success("Consultation mise à jour", {
            action: { label: "Imprimer", onClick: () => openOrdonnance(id) },
          })
        } else {
          const res = await createConsultation(form)
          toast.success("Consultation enregistrée", {
            action: { label: "Imprimer l'ordonnance", onClick: () => openOrdonnance(res.id) },
          })
        }
        setOpen(false)
        router.refresh()
      } catch (err: unknown) {
        toast.error(err instanceof Error ? err.message : "Erreur")
      }
    })
  }

  function handleDelete(id: string) {
    setDeletingId(null)
    startTransition(async () => {
      try {
        await deleteConsultation(id)
        toast.success("Consultation supprimée")
        router.refresh()
      } catch {
        toast.error("Suppression impossible — réservée à l'administrateur")
      }
    })
  }

  return (
    <div className="space-y-5">
      <div className="flex items-center justify-between gap-3">
        <div>
          <h1 className="text-lg font-semibold">Consultations</h1>
          <p className="text-sm text-muted-foreground">
            {consultations.length} consultation{consultations.length !== 1 ? "s" : ""} ·{" "}
            <strong>{formatCurrency(totalCA)}</strong>
          </p>
        </div>
        <Button size="sm" onClick={openCreate}>
          <Plus className="w-4 h-4" />
          Nouvelle consultation
        </Button>
      </div>

      <div className="border border-border rounded-lg bg-card overflow-hidden">
        <Table>
          <TableHeader>
            <TableRow className="bg-muted/30 hover:bg-muted/30">
              <TableHead>Réf.</TableHead>
              <TableHead>Date</TableHead>
              <TableHead>Patient</TableHead>
              <TableHead>Âge</TableHead>
              <TableHead>Service</TableHead>
              <TableHead className="text-right">Prix final</TableHead>
              <TableHead />
            </TableRow>
          </TableHeader>
          <TableBody>
            {consultations.length === 0 ? (
              <TableRow>
                <TableCell colSpan={7} className="text-center py-12 text-muted-foreground">
                  <Stethoscope className="w-8 h-8 mx-auto mb-2 opacity-30" />
                  Aucune consultation
                </TableCell>
              </TableRow>
            ) : (
              consultations.map((c) => {
                const age = calcAge(c.patient?.dateNaissance)
                return (
                  <TableRow key={c.id} className="cursor-pointer" onClick={() => setApercu(c)}>
                    <TableCell className="text-xs font-mono text-muted-foreground">{c.ref}</TableCell>
                    <TableCell className="text-sm">{formatDate(c.date)}</TableCell>
                    <TableCell className="text-sm font-medium">
                      {c.patient ? `${c.patient.prenom} ${c.patient.nom}` : "—"}
                    </TableCell>
                    <TableCell className="text-sm text-muted-foreground">
                      {age !== null ? `${age} ans` : "—"}
                    </TableCell>
                    <TableCell className="text-sm text-muted-foreground max-w-[180px] truncate">
                      {c.service?.nom ?? "—"}
                    </TableCell>
                    <TableCell className="text-right text-sm font-semibold">
                      {formatCurrency(c.prixFinal)}
                    </TableCell>
                    <TableCell onClick={(e) => e.stopPropagation()}>
                      {deletingId === c.id ? (
                        <div className="flex items-center gap-1 justify-end">
                          <button
                            onClick={() => handleDelete(c.id)}
                            className="text-xs px-2 py-1 rounded bg-red-500 text-white hover:bg-red-600 transition-colors"
                          >
                            Oui
                          </button>
                          <button
                            onClick={() => setDeletingId(null)}
                            className="text-xs px-2 py-1 rounded border border-border hover:bg-muted transition-colors"
                          >
                            Non
                          </button>
                        </div>
                      ) : (
                        <div className="flex items-center gap-1 justify-end">
                          <button
                            onClick={() => setApercu(c)}
                            title="Voir l'ordonnance"
                            className="p-1.5 rounded hover:bg-accent text-muted-foreground hover:text-foreground transition-colors"
                          >
                            <Eye className="w-3.5 h-3.5" />
                          </button>
                          <button
                            onClick={() => openOrdonnance(c.id)}
                            title="Imprimer l'ordonnance"
                            className="p-1.5 rounded hover:bg-accent text-muted-foreground hover:text-foreground transition-colors"
                          >
                            <Printer className="w-3.5 h-3.5" />
                          </button>
                          <button
                            onClick={() => openEdit(c)}
                            title="Modifier"
                            className="p-1.5 rounded hover:bg-accent text-muted-foreground hover:text-foreground transition-colors"
                          >
                            <Pencil className="w-3.5 h-3.5" />
                          </button>
                          <button
                            onClick={() => setDeletingId(c.id)}
                            title="Supprimer"
                            className="p-1.5 rounded hover:bg-red-50 text-muted-foreground hover:text-red-500 transition-colors"
                          >
                            <Trash2 className="w-3.5 h-3.5" />
                          </button>
                        </div>
                      )}
                    </TableCell>
                  </TableRow>
                )
              })
            )}
          </TableBody>
        </Table>
      </div>

      {/* ── Formulaire + aperçu en direct ── */}
      <Dialog open={open} onOpenChange={setOpen}>
        <DialogContent className="max-w-5xl max-h-[92vh] overflow-y-auto">
          <DialogHeader>
            <DialogTitle>
              {editing ? `Modifier la consultation — ${editing.ref}` : "Nouvelle consultation"}
            </DialogTitle>
          </DialogHeader>

          <div className="grid grid-cols-1 lg:grid-cols-2 gap-6 mt-2">
            {/* Colonne saisie */}
            <form onSubmit={handleSubmit} className="space-y-4">
              {editing ? (
                <div className="rounded-md bg-muted/50 px-3 py-2 text-sm">
                  <span className="text-muted-foreground">Patient : </span>
                  <span className="font-medium">
                    {editing.patient ? `${editing.patient.prenom} ${editing.patient.nom}` : "—"}
                  </span>
                  <span className="text-muted-foreground"> · Service : </span>
                  <span className="font-medium">{editing.service?.nom ?? "—"}</span>
                </div>
              ) : (
                <>
                  <div className="space-y-1.5">
                    <Label>Patient *</Label>
                    <div className="relative">
                      <Input
                        placeholder="Rechercher un patient…"
                        value={patientSearch}
                        onChange={(e) => {
                          setPatientSearch(e.target.value)
                          setForm((f) => ({ ...f, patientId: "" }))
                        }}
                      />
                      {patientSearch && !form.patientId && filteredPats.length > 0 && (
                        <div className="absolute top-full left-0 right-0 z-20 mt-1 bg-card border border-border rounded-md shadow-lg overflow-hidden">
                          {filteredPats.map((p) => (
                            <button
                              key={p.id}
                              type="button"
                              onClick={() => selectPatient(p)}
                              className="w-full text-left px-3 py-2 text-sm hover:bg-accent"
                            >
                              {p.prenom} {p.nom}{" "}
                              <span className="text-muted-foreground text-xs">· {p.telephone}</span>
                            </button>
                          ))}
                        </div>
                      )}
                    </div>
                  </div>

                  <div className="space-y-1.5">
                    <Label>Service</Label>
                    <Select onValueChange={selectService}>
                      <SelectTrigger>
                        <SelectValue placeholder="Choisir un service…" />
                      </SelectTrigger>
                      <SelectContent>
                        {services.map((s) => (
                          <SelectItem key={s.id} value={s.id}>
                            {s.nom}
                          </SelectItem>
                        ))}
                      </SelectContent>
                    </Select>
                  </div>
                </>
              )}

              <div className="grid grid-cols-2 gap-3">
                {!editing && (
                  <div className="space-y-1.5">
                    <Label>Prix standard</Label>
                    <Input
                      value={formatCurrency(form.prixStandard)}
                      readOnly
                      className="bg-muted text-muted-foreground"
                    />
                  </div>
                )}
                <div className="space-y-1.5">
                  <Label>Prix final (DA) *</Label>
                  <Input
                    type="number"
                    min={0}
                    value={form.prixFinal}
                    onChange={(e) => setForm((f) => ({ ...f, prixFinal: Number(e.target.value) }))}
                    required
                  />
                </div>
                <div className="space-y-1.5">
                  <Label>Date *</Label>
                  <Input
                    type="date"
                    value={form.date}
                    onChange={(e) => setForm((f) => ({ ...f, date: e.target.value }))}
                    required
                  />
                </div>
              </div>

              <div className="space-y-1.5">
                <Label>Diagnostic / Cas</Label>
                <Textarea
                  rows={3}
                  placeholder="Description du cas, diagnostic…"
                  value={form.diagnostic ?? ""}
                  onChange={(e) => setForm((f) => ({ ...f, diagnostic: e.target.value || null }))}
                />
              </div>

              <div className="space-y-1.5">
                <Label>Ordonnance</Label>
                <ReportEditor
                  rows={8}
                  placeholder={"- Médicament — posologie — durée"}
                  value={form.ordonnance ?? ""}
                  onChange={(v) => setForm((f) => ({ ...f, ordonnance: v || null }))}
                />
              </div>

              <div className="space-y-1.5">
                <Label>Notes complémentaires</Label>
                <Textarea
                  rows={2}
                  placeholder="Observations, suivi…"
                  value={form.notesMedicales ?? ""}
                  onChange={(e) => setForm((f) => ({ ...f, notesMedicales: e.target.value || null }))}
                />
              </div>

              {!editing && (
                <div className="space-y-1.5">
                  <Label>ID RDV</Label>
                  <Input
                    placeholder="Optionnel — rempli automatiquement depuis le kanban"
                    value={form.rdvId ?? ""}
                    onChange={(e) => setForm((f) => ({ ...f, rdvId: e.target.value || null }))}
                  />
                </div>
              )}

              <div className="flex justify-end gap-2 pt-1">
                <Button type="button" variant="outline" onClick={() => setOpen(false)}>
                  Annuler
                </Button>
                <Button type="submit" disabled={isPending}>
                  {isPending ? "Enregistrement…" : editing ? "Sauvegarder" : "Enregistrer la consultation"}
                </Button>
              </div>
            </form>

            {/* Colonne aperçu */}
            <div className="lg:sticky lg:top-0 lg:self-start">
              <p className="mb-2 text-[11px] font-semibold uppercase tracking-widest text-muted-foreground">
                Aperçu de l&apos;ordonnance
              </p>
              <div className="rounded-lg bg-neutral-200 p-3">
                <SheetPreview>
                  <OrdonnanceSheet
                    data={{
                      date: form.date,
                      patientNom: patientApercu?.nom ?? "",
                      patientPrenom: patientApercu?.prenom ?? "—",
                      age: calcAge(patientApercu?.dateNaissance),
                      ordonnance: form.ordonnance ?? "",
                    }}
                  />
                </SheetPreview>
              </div>
            </div>
          </div>
        </DialogContent>
      </Dialog>

      {/* ── Aperçu d'une consultation enregistrée ── */}
      <Dialog open={!!apercu} onOpenChange={(o) => { if (!o) setApercu(null) }}>
        <DialogContent className="max-w-2xl max-h-[92vh] overflow-y-auto">
          <DialogHeader>
            <DialogTitle>
              {apercu?.ref} — {apercu?.patient ? `${apercu.patient.prenom} ${apercu.patient.nom}` : ""}
            </DialogTitle>
          </DialogHeader>

          {apercu && (
            <>
              <div ref={apercuRef} className="rounded-lg bg-neutral-200 p-3">
                <SheetPreview>
                  <OrdonnanceSheet
                    data={{
                      date: apercu.date,
                      patientNom: apercu.patient?.nom ?? "",
                      patientPrenom: apercu.patient?.prenom ?? "",
                      age: calcAge(apercu.patient?.dateNaissance),
                      ordonnance: apercu.ordonnance,
                    }}
                  />
                </SheetPreview>
              </div>

              {(apercu.diagnostic || apercu.notesMedicales) && (
                <div className="space-y-3">
                  <DetailField label="Diagnostic / Cas" value={apercu.diagnostic} />
                  <DetailField label="Notes complémentaires" value={apercu.notesMedicales} />
                </div>
              )}

              <div className="flex flex-wrap justify-end gap-2">
                <Button variant="outline" onClick={() => { openEdit(apercu); setApercu(null) }}>
                  <Pencil className="w-3.5 h-3.5 mr-1.5" />
                  Modifier
                </Button>
                <PdfButton
                  getSheet={() => apercuRef.current?.querySelector<HTMLElement>(".sheet") ?? null}
                  nomFichier={nomFichierSur(
                    "Ordonnance",
                    apercu.patient?.nom,
                    apercu.patient?.prenom,
                    apercu.date
                  )}
                />
                <Button onClick={() => openOrdonnance(apercu.id)}>
                  <Printer className="w-3.5 h-3.5 mr-1.5" />
                  Imprimer
                </Button>
              </div>
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
