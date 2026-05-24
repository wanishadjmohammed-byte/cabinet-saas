"use client"

import { useState, useTransition, useEffect } from "react"
import {
  DndContext, DragEndEvent, DragOverlay, DragStartEvent,
  closestCorners, PointerSensor, useSensor, useSensors,
} from "@dnd-kit/core"
import { useDroppable, useDraggable } from "@dnd-kit/core"
import { updateRdv, updateRdvStatut, deleteRdv, createPatientAndLinkToRdv } from "@/actions/rdv"
import { createClient } from "@/lib/supabase/client"
import { createConsultation, getConsultationByRdvId, type ConsultationFormData } from "@/actions/consultations"
import { createVersement, type VersementFormData } from "@/actions/versements"
import { getPatientInfo, updatePatient } from "@/actions/patients"
import { toast } from "sonner"
import { useRouter } from "next/navigation"
import { Clock, Stethoscope, Trash2, User } from "lucide-react"
import { formatDate } from "@/lib/utils"
import { Button } from "@/components/ui/button"
import { Input } from "@/components/ui/input"
import { Label } from "@/components/ui/label"
import { Select, SelectContent, SelectItem, SelectTrigger, SelectValue } from "@/components/ui/select"
import { Dialog, DialogContent, DialogHeader, DialogTitle } from "@/components/ui/dialog"
import { Textarea } from "@/components/ui/textarea"

type Statut = "confirme" | "arrive" | "en_consultation" | "effectue" | "annule" | "no_show"

type RdvRow = {
  id: string; ref: string; date: string; heure: string; statut: string
  patientNomLibre: string | null; telephone: string | null; age: number | null
  notes: string | null
  patient: { id: string; prenom: string; nom: string; telephone: string } | null
  medecin: { nom: string; prenom: string } | null
}
type Service = { id: string; nom: string; prixStandard: number }
type Medecin = { id: string; nom: string; prenom: string }

const COLUMNS = [
  { id: "confirme",        label: "Confirmé",         color: "#3B82F6", bg: "#EFF6FF", border: "#93C5FD" },
  { id: "arrive",          label: "Arrivé",            color: "#F59E0B", bg: "#FFFBEB", border: "#FCD34D" },
  { id: "en_consultation", label: "En consultation",   color: "#8B5CF6", bg: "#F5F3FF", border: "#C4B5FD" },
  { id: "effectue",        label: "Terminé",           color: "#10B981", bg: "#ECFDF5", border: "#6EE7B7" },
  { id: "dead",            label: "Annulé / No-show",  color: "#9CA3AF", bg: "#F9FAFB", border: "#D1D5DB" },
] as const

type ColumnId = (typeof COLUMNS)[number]["id"]

const STATUT_MAP: Record<ColumnId, Statut> = {
  confirme: "confirme", arrive: "arrive", en_consultation: "en_consultation",
  effectue: "effectue", dead: "annule",
}

const COLUMN_COLOR: Record<string, string> = {
  confirme: "#3B82F6", arrive: "#F59E0B", en_consultation: "#8B5CF6",
  effectue: "#10B981", annule: "#9CA3AF", no_show: "#9CA3AF",
}

function getColumnId(statut: string): ColumnId {
  if (statut === "annule" || statut === "no_show") return "dead"
  return statut as ColumnId
}

function splitName(full: string | null): { prenom: string; nom: string } {
  if (!full) return { prenom: "", nom: "" }
  const parts = full.trim().split(/\s+/)
  return parts.length === 1
    ? { prenom: parts[0], nom: "" }
    : { prenom: parts[0], nom: parts.slice(1).join(" ") }
}

// ─── Card Display ─────────────────────────────────────────────────────────────

function CardDisplay({ rdv }: { rdv: RdvRow }) {
  const nom = rdv.patient
    ? `${rdv.patient.prenom} ${rdv.patient.nom}`
    : rdv.patientNomLibre ?? "—"
  const medecinNom = rdv.medecin ? `Dr. ${rdv.medecin.prenom} ${rdv.medecin.nom}` : null
  const borderColor = COLUMN_COLOR[rdv.statut] ?? "#9CA3AF"

  return (
    <div
      className="bg-white border border-border rounded-lg p-3 shadow-sm hover:shadow-md transition-shadow"
      style={{ borderLeft: `3px solid ${borderColor}` }}
    >
      <p className="font-semibold text-sm leading-tight">{nom}</p>
      <div className="flex items-center gap-1.5 mt-2 text-xs text-muted-foreground">
        <Clock className="w-3 h-3 shrink-0" />
        <span>{rdv.heure.slice(0, 5)} · {formatDate(rdv.date)}</span>
      </div>
      {medecinNom ? (
        <div className="flex items-center gap-1.5 mt-1 text-xs text-muted-foreground">
          <Stethoscope className="w-3 h-3 shrink-0" />
          <span>{medecinNom}</span>
        </div>
      ) : (rdv.patient?.telephone ?? rdv.telephone) ? (
        <div className="flex items-center gap-1.5 mt-1 text-xs text-muted-foreground">
          <User className="w-3 h-3 shrink-0" />
          <span>{rdv.patient?.telephone ?? rdv.telephone}</span>
        </div>
      ) : null}
      <p className="text-xs font-mono text-muted-foreground/50 mt-2">{rdv.ref}</p>
    </div>
  )
}

// ─── Draggable Card (with delete button) ─────────────────────────────────────

function DraggableCard({ rdv, onDelete, onCardClick }: { rdv: RdvRow; onDelete: (id: string) => void; onCardClick: (rdv: RdvRow) => void }) {
  const { attributes, listeners, setNodeRef, transform, isDragging } = useDraggable({ id: rdv.id })
  const [confirmDelete, setConfirmDelete] = useState(false)

  const style: React.CSSProperties = {
    transform: transform ? `translate3d(${transform.x}px, ${transform.y}px, 0)` : undefined,
    opacity: isDragging ? 0.35 : 1,
    transition: isDragging ? undefined : "opacity 150ms",
  }

  return (
    <div ref={setNodeRef} style={style} className="relative group touch-none">
      {/* Drag handle wraps card content — click opens detail */}
      <div {...listeners} {...attributes} className="cursor-grab active:cursor-grabbing" onClick={() => !isDragging && onCardClick(rdv)}>
        <CardDisplay rdv={rdv} />
      </div>

      {/* Delete button — stops drag from firing */}
      {!confirmDelete ? (
        <button
          onPointerDown={(e) => e.stopPropagation()}
          onClick={(e) => { e.stopPropagation(); setConfirmDelete(true) }}
          className="absolute top-2 right-2 opacity-0 group-hover:opacity-100 transition-opacity p-1 rounded hover:bg-red-50 text-muted-foreground hover:text-red-500"
          title="Supprimer"
        >
          <Trash2 className="w-3.5 h-3.5" />
        </button>
      ) : (
        <div
          onPointerDown={(e) => e.stopPropagation()}
          className="absolute inset-0 bg-white/95 rounded-lg border border-red-200 flex flex-col items-center justify-center gap-2 p-3"
        >
          <p className="text-xs font-medium text-center">Supprimer ce RDV ?</p>
          <div className="flex gap-2">
            <button
              onClick={(e) => { e.stopPropagation(); setConfirmDelete(false) }}
              className="text-xs px-3 py-1 rounded border border-border hover:bg-muted transition-colors"
            >
              Non
            </button>
            <button
              onClick={(e) => { e.stopPropagation(); onDelete(rdv.id) }}
              className="text-xs px-3 py-1 rounded bg-red-500 text-white hover:bg-red-600 transition-colors"
            >
              Supprimer
            </button>
          </div>
        </div>
      )}
    </div>
  )
}

// ─── Column ───────────────────────────────────────────────────────────────────

function KanbanColumn({
  column, rdvs, onDelete, onCardClick,
}: {
  column: (typeof COLUMNS)[number]
  rdvs: RdvRow[]
  onDelete: (id: string) => void
  onCardClick: (rdv: RdvRow) => void
}) {
  const { setNodeRef, isOver } = useDroppable({ id: column.id })

  return (
    <div className="flex flex-col w-56 shrink-0">
      <div className="flex items-center justify-between mb-3 px-0.5">
        <div className="flex items-center gap-2">
          <span className="w-2.5 h-2.5 rounded-full shrink-0" style={{ background: column.color }} />
          <span className="text-xs font-semibold">{column.label}</span>
        </div>
        <span className="text-xs px-1.5 py-0.5 rounded-full font-medium"
          style={{ background: column.bg, color: column.color }}>
          {rdvs.length}
        </span>
      </div>
      <div
        ref={setNodeRef}
        className="flex-1 rounded-xl p-2 space-y-2 min-h-[200px] max-h-[calc(100vh-280px)] overflow-y-auto transition-colors duration-150"
        style={{ background: isOver ? column.bg : "#F4F4F5", border: `1.5px dashed ${isOver ? column.color : "#E4E4E7"}` }}
      >
        {rdvs.map((r) => <DraggableCard key={r.id} rdv={r} onDelete={onDelete} onCardClick={onCardClick} />)}
        {rdvs.length === 0 && (
          <div className="flex items-center justify-center h-16">
            <p className="text-xs text-muted-foreground/40">Aucun</p>
          </div>
        )}
      </div>
    </div>
  )
}

// ─── Patient Registration Modal ───────────────────────────────────────────────

function PatientModal({
  rdv, onConfirm, onCancel, loading,
}: {
  rdv: RdvRow
  onConfirm: (data: { nom: string; prenom: string; telephone: string; sexe?: "H" | "F" | null; dateNaissance?: string | null; pathologie?: string | null }) => void
  onCancel: () => void
  loading: boolean
}) {
  const { prenom: initPrenom, nom: initNom } = splitName(rdv.patientNomLibre)
  const [prenom, setPrenom] = useState(initPrenom)
  const [nom, setNom] = useState(initNom)
  const [telephone, setTelephone] = useState(rdv.telephone ?? rdv.patient?.telephone ?? "")
  const [sexe, setSexe] = useState<"H" | "F" | "">("")
  const [dateNaissance, setDateNaissance] = useState("")
  const [pathologie, setPathologie] = useState("")

  function handleSubmit(e: React.FormEvent) {
    e.preventDefault()
    if (!prenom.trim() || !nom.trim()) { toast.error("Prénom et nom requis"); return }
    if (!telephone.trim()) { toast.error("Téléphone requis"); return }
    onConfirm({
      nom: nom.trim(),
      prenom: prenom.trim(),
      telephone: telephone.trim(),
      sexe: sexe || null,
      dateNaissance: dateNaissance || null,
      pathologie: pathologie || null,
    })
  }

  return (
    <form onSubmit={handleSubmit} className="space-y-4 mt-2">
      <p className="text-sm text-muted-foreground">
        Ce patient n'est pas encore enregistré. Confirmez ses informations pour l'ajouter à la base de données.
      </p>

      <div className="grid grid-cols-2 gap-3">
        <div className="space-y-1.5">
          <Label>Prénom *</Label>
          <Input value={prenom} onChange={(e) => setPrenom(e.target.value)} required />
        </div>
        <div className="space-y-1.5">
          <Label>Nom *</Label>
          <Input value={nom} onChange={(e) => setNom(e.target.value)} required />
        </div>
      </div>

      <div className="grid grid-cols-2 gap-3">
        <div className="space-y-1.5">
          <Label>Téléphone *</Label>
          <Input value={telephone} onChange={(e) => setTelephone(e.target.value)} required />
        </div>
        <div className="space-y-1.5">
          <Label>Sexe</Label>
          <Select value={sexe} onValueChange={(v) => setSexe(v as "H" | "F")}>
            <SelectTrigger><SelectValue placeholder="—" /></SelectTrigger>
            <SelectContent>
              <SelectItem value="H">Homme</SelectItem>
              <SelectItem value="F">Femme</SelectItem>
            </SelectContent>
          </Select>
        </div>
      </div>

      <div className="grid grid-cols-2 gap-3">
        <div className="space-y-1.5">
          <Label>Date de naissance</Label>
          <Input type="date" value={dateNaissance} onChange={(e) => setDateNaissance(e.target.value)} />
        </div>
        <div className="space-y-1.5">
          <Label>Pathologie</Label>
          <Input value={pathologie} onChange={(e) => setPathologie(e.target.value)} placeholder="Optionnel…" />
        </div>
      </div>

      <div className="flex justify-end gap-2 pt-1">
        <Button type="button" variant="outline" onClick={onCancel}>Annuler</Button>
        <Button type="submit" disabled={loading}>
          {loading ? "Enregistrement…" : "Enregistrer le patient"}
        </Button>
      </div>
    </form>
  )
}

// ─── Consultation Modal ───────────────────────────────────────────────────────

function ConsultationModal({
  rdv, services, medecins, today, onConfirm, onCancel, loading,
}: {
  rdv: RdvRow; services: Service[]; medecins: Medecin[]; today: string
  onConfirm: (data: ConsultationFormData) => void; onCancel: () => void; loading: boolean
}) {
  const [serviceId, setServiceId] = useState<string | null>(null)
  const [prixStandard, setPrixStandard] = useState(0)
  const [prixFinal, setPrixFinal] = useState(0)
  const [medecinId, setMedecinId] = useState<string | null>(null)
  const [diagnostic, setDiagnostic] = useState("")
  const [ordonnance, setOrdonnance] = useState("")
  const [notesMedicales, setNotesMedicales] = useState("")
  const nom = rdv.patient ? `${rdv.patient.prenom} ${rdv.patient.nom}` : rdv.patientNomLibre ?? "—"

  function handleServiceChange(id: string) {
    setServiceId(id)
    const svc = services.find((s) => s.id === id)
    if (svc) { setPrixStandard(svc.prixStandard); setPrixFinal(svc.prixStandard) }
  }

  function handleSubmit(e: React.FormEvent) {
    e.preventDefault()
    if (!rdv.patient?.id) { toast.error("Ce RDV n'a pas de patient enregistré"); return }
    onConfirm({
      patientId: rdv.patient.id, serviceId, prixStandard, prixFinal,
      medecinId, date: today, rdvId: rdv.id,
      diagnostic: diagnostic || null, ordonnance: ordonnance || null, notesMedicales: notesMedicales || null,
    })
  }

  return (
    <form onSubmit={handleSubmit} className="space-y-4 mt-2">
      <div className="px-3 py-2 bg-muted/50 rounded-md text-sm">
        <span className="text-muted-foreground">Patient : </span>
        <span className="font-medium">{nom}</span>
      </div>
      <div className="grid grid-cols-2 gap-3">
        <div className="space-y-1.5">
          <Label>Service</Label>
          <Select onValueChange={handleServiceChange}>
            <SelectTrigger><SelectValue placeholder="Choisir…" /></SelectTrigger>
            <SelectContent>{services.map((s) => <SelectItem key={s.id} value={s.id}>{s.nom}</SelectItem>)}</SelectContent>
          </Select>
        </div>
        <div className="space-y-1.5">
          <Label>Médecin</Label>
          <Select onValueChange={(v) => setMedecinId(v)}>
            <SelectTrigger><SelectValue placeholder="Choisir…" /></SelectTrigger>
            <SelectContent>{medecins.map((m) => <SelectItem key={m.id} value={m.id}>Dr. {m.prenom} {m.nom}</SelectItem>)}</SelectContent>
          </Select>
        </div>
      </div>
      <div className="grid grid-cols-2 gap-3">
        <div className="space-y-1.5">
          <Label>Prix standard (DA)</Label>
          <Input type="number" min={0} value={prixStandard} onChange={(e) => setPrixStandard(Number(e.target.value))} />
        </div>
        <div className="space-y-1.5">
          <Label>Prix final (DA)</Label>
          <Input type="number" min={0} value={prixFinal} onChange={(e) => setPrixFinal(Number(e.target.value))} />
        </div>
      </div>
      <div className="space-y-1.5">
        <Label>Diagnostic</Label>
        <Textarea rows={2} value={diagnostic} onChange={(e) => setDiagnostic(e.target.value)} placeholder="Diagnostic…" />
      </div>
      <div className="space-y-1.5">
        <Label>Ordonnance</Label>
        <Textarea rows={3} value={ordonnance} onChange={(e) => setOrdonnance(e.target.value)} placeholder="Médicaments prescrits…" />
      </div>
      <div className="space-y-1.5">
        <Label>Notes médicales</Label>
        <Textarea rows={2} value={notesMedicales} onChange={(e) => setNotesMedicales(e.target.value)} placeholder="Observations…" />
      </div>
      <div className="flex justify-end gap-2 pt-1">
        <Button type="button" variant="outline" onClick={onCancel}>Annuler</Button>
        <Button type="submit" disabled={loading}>{loading ? "Enregistrement…" : "Créer la consultation"}</Button>
      </div>
    </form>
  )
}

// ─── Versement Modal ──────────────────────────────────────────────────────────

function VersementModal({
  rdv, today, montantDu, onConfirm, onCancel, loading,
}: {
  rdv: RdvRow; today: string; montantDu: number | null
  onConfirm: (data: VersementFormData) => void; onCancel: () => void; loading: boolean
}) {
  const [montant, setMontant] = useState(montantDu != null ? String(montantDu) : "")
  const [mode, setMode] = useState<"especes" | "baridi_mob">("especes")
  const [type, setType] = useState<"total" | "acompte" | "versement" | "solde">("total")
  const [notes, setNotes] = useState("")
  const nom = rdv.patient ? `${rdv.patient.prenom} ${rdv.patient.nom}` : rdv.patientNomLibre ?? "—"

  function handleSubmit(e: React.FormEvent) {
    e.preventDefault()
    if (!rdv.patient?.id) { toast.error("Ce RDV n'a pas de patient enregistré"); return }
    if (!montant || Number(montant) < 1) { toast.error("Montant invalide"); return }
    onConfirm({ patientId: rdv.patient.id, montant: Number(montant), mode, type, date: today, notes: notes || null })
  }

  return (
    <form onSubmit={handleSubmit} className="space-y-4 mt-2">
      <div className="px-3 py-2 bg-muted/50 rounded-md text-sm">
        <span className="text-muted-foreground">Patient : </span><span className="font-medium">{nom}</span>
      </div>

      {montantDu != null && (
        <div className="flex items-center justify-between px-3 py-2.5 rounded-md border border-emerald-200 bg-emerald-50">
          <span className="text-sm text-emerald-800">Montant dû (consultation)</span>
          <span className="font-bold text-emerald-700 text-base">{montantDu.toLocaleString("fr-DZ")} DA</span>
        </div>
      )}

      <div className="space-y-1.5">
        <Label>Montant encaissé (DA) *</Label>
        <Input type="number" min={1} value={montant} onChange={(e) => setMontant(e.target.value)} placeholder="0" required />
      </div>
      <div className="grid grid-cols-2 gap-3">
        <div className="space-y-1.5">
          <Label>Mode de paiement</Label>
          <Select value={mode} onValueChange={(v) => setMode(v as typeof mode)}>
            <SelectTrigger><SelectValue /></SelectTrigger>
            <SelectContent>
              <SelectItem value="especes">Espèces</SelectItem>
              <SelectItem value="baridi_mob">Baridi Mob</SelectItem>
            </SelectContent>
          </Select>
        </div>
        <div className="space-y-1.5">
          <Label>Type</Label>
          <Select value={type} onValueChange={(v) => setType(v as typeof type)}>
            <SelectTrigger><SelectValue /></SelectTrigger>
            <SelectContent>
              <SelectItem value="total">Total</SelectItem>
              <SelectItem value="acompte">Acompte</SelectItem>
              <SelectItem value="versement">Versement</SelectItem>
              <SelectItem value="solde">Solde</SelectItem>
            </SelectContent>
          </Select>
        </div>
      </div>
      <div className="space-y-1.5">
        <Label>Notes</Label>
        <Input value={notes} onChange={(e) => setNotes(e.target.value)} placeholder="Optionnel…" />
      </div>
      <div className="flex justify-end gap-2 pt-1">
        <Button type="button" variant="outline" onClick={onCancel}>Annuler</Button>
        <Button type="submit" disabled={loading}>{loading ? "Enregistrement…" : "Enregistrer le paiement"}</Button>
      </div>
    </form>
  )
}

// ─── Card Detail / Edit Modal ─────────────────────────────────────────────────

function CardDetailModal({ rdv, onClose, onSaved }: { rdv: RdvRow; onClose: () => void; onSaved: () => void }) {
  const isRdvEditable = rdv.statut === "confirme" || (rdv.statut === "arrive" && !rdv.patient)
  const isPatientEditable = rdv.statut === "arrive" && !!rdv.patient

  // RDV edit state
  const [heure, setHeure] = useState(rdv.heure.slice(0, 5))
  const [date, setDate] = useState(rdv.date)
  const [nomLibre, setNomLibre] = useState(rdv.patientNomLibre ?? "")
  const [telephone, setTelephone] = useState(rdv.telephone ?? rdv.patient?.telephone ?? "")
  const [notes, setNotes] = useState(rdv.notes ?? "")

  // Patient edit state (pre-filled after fetch)
  const [patientNom, setPatientNom] = useState(rdv.patient?.nom ?? "")
  const [patientPrenom, setPatientPrenom] = useState(rdv.patient?.prenom ?? "")
  const [patientTel, setPatientTel] = useState(rdv.patient?.telephone ?? "")
  const [patientSexe, setPatientSexe] = useState<"H" | "F" | "">("")
  const [patientDOB, setPatientDOB] = useState("")
  const [patientPathologie, setPatientPathologie] = useState("")
  const [patientNotesMed, setPatientNotesMed] = useState("")
  const [patientLoading, setPatientLoading] = useState(isPatientEditable)
  const [saving, setSaving] = useState(false)

  // Fetch full patient data to pre-fill all fields without overwriting
  useEffect(() => {
    if (!isPatientEditable || !rdv.patient?.id) return
    getPatientInfo(rdv.patient.id).then((p) => {
      if (p) {
        setPatientNom(p.nom)
        setPatientPrenom(p.prenom)
        setPatientTel(p.telephone)
        setPatientSexe(p.sexe ?? "")
        setPatientDOB(p.dateNaissance ?? "")
        setPatientPathologie(p.pathologie ?? "")
        setPatientNotesMed(p.notesMedicales ?? "")
      }
      setPatientLoading(false)
    })
  }, [isPatientEditable, rdv.patient?.id])

  async function handleRdvSave(e: React.FormEvent) {
    e.preventDefault()
    setSaving(true)
    try {
      await updateRdv(rdv.id, {
        heure: heure.length === 5 ? heure + ":00" : heure,
        date,
        patientNomLibre: rdv.patient ? null : (nomLibre || null),
        telephone: telephone || null,
        notes: notes || null,
      })
      toast.success("Rendez-vous mis à jour")
      onSaved()
      onClose()
    } catch (err) {
      toast.error(err instanceof Error ? err.message : "Erreur")
    } finally {
      setSaving(false)
    }
  }

  async function handlePatientSave(e: React.FormEvent) {
    e.preventDefault()
    if (!rdv.patient?.id) return
    setSaving(true)
    try {
      await updatePatient(rdv.patient.id, {
        nom: patientNom,
        prenom: patientPrenom,
        telephone: patientTel,
        sexe: patientSexe || null,
        dateNaissance: patientDOB || null,
        pathologie: patientPathologie || null,
        notesMedicales: patientNotesMed || null,
      })
      toast.success("Patient mis à jour")
      onSaved()
      onClose()
    } catch (err) {
      toast.error(err instanceof Error ? err.message : "Erreur")
    } finally {
      setSaving(false)
    }
  }

  const nom = rdv.patient ? `${rdv.patient.prenom} ${rdv.patient.nom}` : rdv.patientNomLibre ?? "—"

  return (
    <div className="space-y-4">
      {/* Info header */}
      <div className="flex items-center gap-2 px-1">
        <span className="w-2.5 h-2.5 rounded-full shrink-0" style={{ background: COLUMN_COLOR[rdv.statut] ?? "#9CA3AF" }} />
        <span className="text-xs font-mono text-muted-foreground">{rdv.ref}</span>
        <span className="text-xs text-muted-foreground">·</span>
        <span className="text-xs text-muted-foreground">{rdv.heure.slice(0, 5)} · {rdv.date}</span>
      </div>

      {/* RDV edit (confirmé or arrivé without patient) */}
      {isRdvEditable && (
        <form onSubmit={handleRdvSave} className="space-y-3">
          {!rdv.patient && (
            <div className="space-y-1.5">
              <Label>Nom du patient</Label>
              <Input value={nomLibre} onChange={(e) => setNomLibre(e.target.value)} />
            </div>
          )}
          {rdv.patient && (
            <div className="px-3 py-2 bg-muted/50 rounded-md text-sm">
              <span className="text-muted-foreground">Patient : </span>
              <span className="font-medium">{nom}</span>
            </div>
          )}
          <div className="grid grid-cols-2 gap-3">
            <div className="space-y-1.5">
              <Label>Date</Label>
              <Input type="date" value={date} onChange={(e) => setDate(e.target.value)} />
            </div>
            <div className="space-y-1.5">
              <Label>Heure</Label>
              <Input type="time" value={heure} onChange={(e) => setHeure(e.target.value)} />
            </div>
          </div>
          <div className="space-y-1.5">
            <Label>Téléphone</Label>
            <Input value={telephone} onChange={(e) => setTelephone(e.target.value)} />
          </div>
          <div className="space-y-1.5">
            <Label>Notes</Label>
            <Textarea rows={2} value={notes} onChange={(e) => setNotes(e.target.value)} placeholder="Notes sur le RDV…" />
          </div>
          <div className="flex justify-end gap-2 pt-1">
            <Button type="button" variant="outline" size="sm" onClick={onClose}>Annuler</Button>
            <Button type="submit" size="sm" disabled={saving}>{saving ? "Enregistrement…" : "Sauvegarder"}</Button>
          </div>
        </form>
      )}

      {/* Patient edit (arrivé with registered patient) */}
      {isPatientEditable && (
        patientLoading ? (
          <div className="text-center py-8 text-sm text-muted-foreground">Chargement des données patient…</div>
        ) : (
          <form onSubmit={handlePatientSave} className="space-y-3">
            <div className="grid grid-cols-2 gap-3">
              <div className="space-y-1.5">
                <Label>Prénom *</Label>
                <Input value={patientPrenom} onChange={(e) => setPatientPrenom(e.target.value)} required />
              </div>
              <div className="space-y-1.5">
                <Label>Nom *</Label>
                <Input value={patientNom} onChange={(e) => setPatientNom(e.target.value)} required />
              </div>
            </div>
            <div className="space-y-1.5">
              <Label>Téléphone *</Label>
              <Input value={patientTel} onChange={(e) => setPatientTel(e.target.value)} required />
            </div>
            <div className="grid grid-cols-2 gap-3">
              <div className="space-y-1.5">
                <Label>Date de naissance</Label>
                <Input type="date" value={patientDOB} onChange={(e) => setPatientDOB(e.target.value)} />
              </div>
              <div className="space-y-1.5">
                <Label>Sexe</Label>
                <Select value={patientSexe} onValueChange={(v) => setPatientSexe(v as "H" | "F")}>
                  <SelectTrigger><SelectValue placeholder="—" /></SelectTrigger>
                  <SelectContent>
                    <SelectItem value="H">Homme</SelectItem>
                    <SelectItem value="F">Femme</SelectItem>
                  </SelectContent>
                </Select>
              </div>
            </div>
            <div className="space-y-1.5">
              <Label>Pathologie</Label>
              <Input value={patientPathologie} onChange={(e) => setPatientPathologie(e.target.value)} placeholder="Optionnel…" />
            </div>
            <div className="space-y-1.5">
              <Label>Notes médicales</Label>
              <Textarea rows={2} value={patientNotesMed} onChange={(e) => setPatientNotesMed(e.target.value)} placeholder="Optionnel…" />
            </div>
            <div className="flex justify-end gap-2 pt-1">
              <Button type="button" variant="outline" size="sm" onClick={onClose}>Annuler</Button>
              <Button type="submit" size="sm" disabled={saving}>{saving ? "Enregistrement…" : "Sauvegarder"}</Button>
            </div>
          </form>
        )
      )}

      {/* Read-only for other statuses */}
      {!isRdvEditable && !isPatientEditable && (
        <div className="space-y-2 text-sm">
          <div className="flex justify-between">
            <span className="text-muted-foreground">Patient</span>
            <span className="font-medium">{nom}</span>
          </div>
          {rdv.medecin && (
            <div className="flex justify-between">
              <span className="text-muted-foreground">Médecin</span>
              <span>Dr. {rdv.medecin.prenom} {rdv.medecin.nom}</span>
            </div>
          )}
          {rdv.notes && (
            <div className="pt-1">
              <p className="text-xs text-muted-foreground mb-1">Notes</p>
              <p className="text-sm whitespace-pre-wrap">{rdv.notes}</p>
            </div>
          )}
        </div>
      )}
    </div>
  )
}

// ─── Main Board ───────────────────────────────────────────────────────────────

export function KanbanBoard({
  rdvs: initialRdvs, services, medecins, today,
}: {
  rdvs: RdvRow[]; services: Service[]; medecins: Medecin[]; today: string
}) {
  const [rdvs, setRdvs] = useState(initialRdvs)
  const [activeId, setActiveId] = useState<string | null>(null)
  const [selectedCard, setSelectedCard] = useState<RdvRow | null>(null)
  const [pendingArrival, setPendingArrival] = useState<RdvRow | null>(null)
  const [pendingConsultation, setPendingConsultation] = useState<RdvRow | null>(null)
  const [pendingVersement, setPendingVersement] = useState<RdvRow | null>(null)
  const [consultationAmount, setConsultationAmount] = useState<number | null>(null)
  const [modalLoading, setModalLoading] = useState(false)
  const [, startTransition] = useTransition()
  const router = useRouter()

  const sensors = useSensors(useSensor(PointerSensor, { activationConstraint: { distance: 5 } }))

  // Sync local state when server data refreshes (from any user's action)
  useEffect(() => {
    setRdvs(initialRdvs)
  }, [initialRdvs])

  // Subscribe to Supabase Realtime — refresh whenever rendez_vous changes
  useEffect(() => {
    const supabase = createClient()
    const channel = supabase
      .channel("rdv-realtime")
      .on("postgres_changes", { event: "*", schema: "public", table: "rendez_vous" }, () => {
        router.refresh()
      })
      .subscribe()
    return () => { supabase.removeChannel(channel) }
  }, [router])

  const grouped = Object.fromEntries(
    COLUMNS.map((col) => [col.id, rdvs.filter((r) => getColumnId(r.statut) === col.id)])
  ) as Record<ColumnId, RdvRow[]>

  const activeRdv = rdvs.find((r) => r.id === activeId) ?? null

  function applyStatusChange(rdvId: string, newStatut: Statut) {
    setRdvs((prev) => prev.map((r) => r.id === rdvId ? { ...r, statut: newStatut } : r))
    startTransition(async () => {
      await updateRdvStatut(rdvId, newStatut)
      router.refresh()
    })
  }

  function revertStatus(rdv: RdvRow) {
    setRdvs((prev) => prev.map((r) => r.id === rdv.id ? { ...r, statut: rdv.statut } : r))
  }

  function handleDelete(rdvId: string) {
    setRdvs((prev) => prev.filter((r) => r.id !== rdvId))
    startTransition(async () => {
      await deleteRdv(rdvId)
      toast.success("Rendez-vous supprimé")
      router.refresh()
    })
  }

  function handleDragStart(e: DragStartEvent) { setActiveId(e.active.id as string) }

  function handleDragEnd(e: DragEndEvent) {
    const { active, over } = e
    setActiveId(null)
    if (!over) return

    const rdvId = active.id as string
    const targetCol = over.id as ColumnId
    const newStatut = STATUT_MAP[targetCol]
    if (!newStatut) return

    const rdv = rdvs.find((r) => r.id === rdvId)
    if (!rdv || getColumnId(rdv.statut) === targetCol) return

    // Arrive: show patient registration modal if not yet registered
    if (targetCol === "arrive") {
      if (rdv.patient !== null) {
        applyStatusChange(rdvId, "arrive")
        toast.success("Statut mis à jour")
      } else {
        setRdvs((prev) => prev.map((r) => r.id === rdvId ? { ...r, statut: "arrive" } : r))
        setPendingArrival(rdv)
      }
      return
    }

    // En consultation: require registered patient + open consultation modal
    if (targetCol === "en_consultation") {
      if (!rdv.patient?.id) {
        toast.error("Ce RDV n'a pas de patient enregistré — consultation impossible")
        return
      }
      setRdvs((prev) => prev.map((r) => r.id === rdvId ? { ...r, statut: "en_consultation" } : r))
      setPendingConsultation(rdv)
      return
    }

    // Terminé: fetch consultation amount then open versement modal
    if (targetCol === "effectue") {
      setRdvs((prev) => prev.map((r) => r.id === rdvId ? { ...r, statut: "effectue" } : r))
      setConsultationAmount(null)
      setPendingVersement(rdv)
      getConsultationByRdvId(rdvId).then((c) => {
        if (c) setConsultationAmount(c.prixFinal)
      })
      return
    }

    applyStatusChange(rdvId, newStatut)
    toast.success("Statut mis à jour")
  }

  // ── Arrival / Patient registration ─────────────────────────────────────────

  async function handleArrivalConfirm(data: Parameters<typeof createPatientAndLinkToRdv>[1]) {
    if (!pendingArrival) return
    setModalLoading(true)
    try {
      await createPatientAndLinkToRdv(pendingArrival.id, data)
      toast.success("Patient enregistré et marqué Arrivé")
      setPendingArrival(null)
      router.refresh()
    } catch (err) {
      toast.error(err instanceof Error ? err.message : "Erreur")
      revertStatus(pendingArrival)
    } finally {
      setModalLoading(false)
    }
  }

  function handleArrivalCancel() {
    if (pendingArrival) revertStatus(pendingArrival)
    setPendingArrival(null)
  }

  // ── Consultation ───────────────────────────────────────────────────────────

  async function handleConsultationConfirm(data: ConsultationFormData) {
    if (!pendingConsultation) return
    setModalLoading(true)
    try {
      await createConsultation(data)
      await updateRdvStatut(pendingConsultation.id, "en_consultation")
      toast.success("Consultation créée")
      setPendingConsultation(null)
      router.refresh()
    } catch (err) {
      toast.error(err instanceof Error ? err.message : "Erreur")
      revertStatus(pendingConsultation)
    } finally {
      setModalLoading(false)
    }
  }

  function handleConsultationCancel() {
    if (pendingConsultation) revertStatus(pendingConsultation)
    setPendingConsultation(null)
  }

  // ── Versement ──────────────────────────────────────────────────────────────

  async function handleVersementConfirm(data: VersementFormData) {
    if (!pendingVersement) return
    setModalLoading(true)
    try {
      await createVersement(data)
      await updateRdvStatut(pendingVersement.id, "effectue")
      toast.success("Paiement enregistré")
      setPendingVersement(null)
      router.refresh()
    } catch (err) {
      toast.error(err instanceof Error ? err.message : "Erreur")
      revertStatus(pendingVersement)
    } finally {
      setModalLoading(false)
    }
  }

  function handleVersementCancel() {
    if (pendingVersement) revertStatus(pendingVersement)
    setPendingVersement(null)
    setConsultationAmount(null)
  }

  return (
    <>
      <DndContext sensors={sensors} collisionDetection={closestCorners}
        onDragStart={handleDragStart} onDragEnd={handleDragEnd}>
        <div className="flex gap-3 overflow-x-auto pb-4">
          {COLUMNS.map((col) => (
            <KanbanColumn key={col.id} column={col} rdvs={grouped[col.id] ?? []} onDelete={handleDelete} onCardClick={setSelectedCard} />
          ))}
        </div>
        <DragOverlay dropAnimation={null}>
          {activeRdv ? (
            <div className="w-56 rotate-1 shadow-xl opacity-95">
              <CardDisplay rdv={activeRdv} />
            </div>
          ) : null}
        </DragOverlay>
      </DndContext>

      {/* Card detail / edit modal */}
      <Dialog open={!!selectedCard} onOpenChange={(open) => { if (!open) setSelectedCard(null) }}>
        <DialogContent className="max-w-md">
          <DialogHeader>
            <DialogTitle>
              {selectedCard?.statut === "confirme" && "Modifier le RDV"}
              {selectedCard?.statut === "arrive" && selectedCard.patient && "Modifier le patient"}
              {selectedCard?.statut === "arrive" && !selectedCard.patient && "Modifier le RDV"}
              {selectedCard?.statut !== "confirme" && selectedCard?.statut !== "arrive" && "Détail du RDV"}
            </DialogTitle>
          </DialogHeader>
          {selectedCard && (
            <CardDetailModal
              rdv={selectedCard}
              onClose={() => setSelectedCard(null)}
              onSaved={() => router.refresh()}
            />
          )}
        </DialogContent>
      </Dialog>

      {/* Patient registration modal (arrive) */}
      <Dialog open={!!pendingArrival} onOpenChange={(open) => { if (!open) handleArrivalCancel() }}>
        <DialogContent className="max-w-md">
          <DialogHeader>
            <DialogTitle className="flex items-center gap-2">
              <span className="w-2.5 h-2.5 rounded-full bg-amber-400 shrink-0" />
              Enregistrer le patient
            </DialogTitle>
          </DialogHeader>
          {pendingArrival && (
            <PatientModal
              rdv={pendingArrival}
              onConfirm={handleArrivalConfirm}
              onCancel={handleArrivalCancel}
              loading={modalLoading}
            />
          )}
        </DialogContent>
      </Dialog>

      {/* Consultation modal */}
      <Dialog open={!!pendingConsultation} onOpenChange={(open) => { if (!open) handleConsultationCancel() }}>
        <DialogContent className="max-w-lg max-h-[90vh] overflow-y-auto">
          <DialogHeader>
            <DialogTitle className="flex items-center gap-2">
              <span className="w-2.5 h-2.5 rounded-full bg-purple-500 shrink-0" />
              Nouvelle consultation
            </DialogTitle>
          </DialogHeader>
          {pendingConsultation && (
            <ConsultationModal
              rdv={pendingConsultation} services={services} medecins={medecins} today={today}
              onConfirm={handleConsultationConfirm} onCancel={handleConsultationCancel} loading={modalLoading}
            />
          )}
        </DialogContent>
      </Dialog>

      {/* Versement modal */}
      <Dialog open={!!pendingVersement} onOpenChange={(open) => { if (!open) handleVersementCancel() }}>
        <DialogContent className="max-w-md">
          <DialogHeader>
            <DialogTitle className="flex items-center gap-2">
              <span className="w-2.5 h-2.5 rounded-full bg-emerald-500 shrink-0" />
              Enregistrer le paiement
            </DialogTitle>
          </DialogHeader>
          {pendingVersement && (
            <VersementModal
              rdv={pendingVersement} today={today} montantDu={consultationAmount}
              onConfirm={handleVersementConfirm} onCancel={handleVersementCancel} loading={modalLoading}
            />
          )}
        </DialogContent>
      </Dialog>
    </>
  )
}
