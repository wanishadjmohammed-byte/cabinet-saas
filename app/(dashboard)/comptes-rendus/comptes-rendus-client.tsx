"use client"

import { useRef, useState, useTransition } from "react"
import { useRouter } from "next/navigation"
import {
  createCompteRendu,
  updateCompteRendu,
  deleteCompteRendu,
  type CompteRenduFormData,
} from "@/actions/comptes-rendus"
import { Button } from "@/components/ui/button"
import { Input } from "@/components/ui/input"
import { Label } from "@/components/ui/label"
import { Textarea } from "@/components/ui/textarea"
import { Select, SelectContent, SelectItem, SelectTrigger, SelectValue } from "@/components/ui/select"
import { Dialog, DialogContent, DialogHeader, DialogTitle } from "@/components/ui/dialog"
import { Table, TableBody, TableCell, TableHead, TableHeader, TableRow } from "@/components/ui/table"
import { ReportEditor, MODELES_COMPTE_RENDU } from "@/components/print/report-editor"
import { PdfButton } from "@/components/print/pdf-button"
import { nomFichierSur } from "@/lib/pdf"
import { SheetPreview } from "@/components/print/sheet-preview"
import { CompteRenduSheet } from "@/components/print/documents/compte-rendu-sheet"
import { formatDate, today, calcAge } from "@/lib/utils"
import { Plus, Printer, Pencil, Trash2, FileText, Eye } from "lucide-react"
import { toast } from "sonner"

type Patient = {
  id: string
  prenom: string
  nom: string
  telephone: string
  dateNaissance: string | null
  sexe: "H" | "F" | null
}
type Medecin = { id: string; nom: string; prenom: string }
type CompteRenduRow = {
  id: string
  ref: string
  date: string
  type: string
  motif: string | null
  contenu: string
  patientId: string
  medecinId: string | null
  patient: { prenom: string; nom: string; dateNaissance: string | null; sexe: "H" | "F" | null } | null
  medecin: { prenom: string; nom: string } | null
}

const TYPES_COURANTS = [
  "SUIVI MEDICAL",
  "COMPTE RENDU OPERATOIRE",
  "COMPTE RENDU DE CONSULTATION",
  "CERTIFICAT MEDICAL",
]

const EMPTY: CompteRenduFormData = {
  patientId: "",
  date: today(),
  type: "SUIVI MEDICAL",
  motif: null,
  contenu: "",
  medecinId: null,
  consultationId: null,
}

function openPrint(id: string) {
  window.open(`/print/compte-rendu/${id}`, "_blank", "noopener")
}

export function ComptesRendusClient({
  comptesRendus,
  patients,
  medecins,
}: {
  comptesRendus: CompteRenduRow[]
  patients: Patient[]
  medecins: Medecin[]
}) {
  const router = useRouter()
  const [isPending, startTransition] = useTransition()

  const [open, setOpen] = useState(false)
  const [editingId, setEditingId] = useState<string | null>(null)
  const [form, setForm] = useState<CompteRenduFormData>(EMPTY)
  const [patientSearch, setPatientSearch] = useState("")
  const [deletingId, setDeletingId] = useState<string | null>(null)
  const [apercu, setApercu] = useState<CompteRenduRow | null>(null)
  const apercuRef = useRef<HTMLDivElement>(null)

  const filteredPats = patients
    .filter((p) => {
      const q = patientSearch.toLowerCase()
      return p.nom.toLowerCase().includes(q) || p.prenom.toLowerCase().includes(q)
    })
    .slice(0, 5)

  const patientChoisi = patients.find((p) => p.id === form.patientId) ?? null

  function openCreate() {
    setEditingId(null)
    setForm(EMPTY)
    setPatientSearch("")
    setOpen(true)
  }

  function openEdit(cr: CompteRenduRow) {
    setEditingId(cr.id)
    setForm({
      patientId: cr.patientId,
      date: cr.date,
      type: cr.type,
      motif: cr.motif,
      contenu: cr.contenu,
      medecinId: cr.medecinId,
      consultationId: null,
    })
    setPatientSearch(cr.patient ? `${cr.patient.prenom} ${cr.patient.nom}` : "")
    setOpen(true)
  }

  function handleSubmit(e: React.FormEvent) {
    e.preventDefault()
    if (!form.patientId) {
      toast.error("Sélectionnez un patient")
      return
    }
    startTransition(async () => {
      try {
        if (editingId) {
          await updateCompteRendu(editingId, form)
          toast.success("Compte rendu mis à jour", {
            action: { label: "Imprimer", onClick: () => openPrint(editingId) },
          })
        } else {
          const res = await createCompteRendu(form)
          toast.success("Compte rendu créé", {
            action: { label: "Imprimer", onClick: () => openPrint(res.id) },
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
        await deleteCompteRendu(id)
        toast.success("Compte rendu supprimé")
        router.refresh()
      } catch {
        toast.error("Suppression impossible")
      }
    })
  }

  return (
    <div className="space-y-5">
      <div className="flex items-center justify-between gap-3">
        <div>
          <h1 className="text-lg font-semibold">Comptes rendus</h1>
          <p className="text-sm text-muted-foreground">
            {comptesRendus.length} document{comptesRendus.length !== 1 ? "s" : ""} · format A5 imprimable
          </p>
        </div>
        <Button size="sm" onClick={openCreate}>
          <Plus className="w-4 h-4" />
          Nouveau compte rendu
        </Button>
      </div>

      <div className="border border-border rounded-lg bg-card overflow-hidden">
        <Table>
          <TableHeader>
            <TableRow className="bg-muted/30 hover:bg-muted/30">
              <TableHead>Réf.</TableHead>
              <TableHead>Date</TableHead>
              <TableHead>Patient</TableHead>
              <TableHead>Type</TableHead>
              <TableHead>Motif</TableHead>
              <TableHead />
            </TableRow>
          </TableHeader>
          <TableBody>
            {comptesRendus.length === 0 ? (
              <TableRow>
                <TableCell colSpan={6} className="text-center py-12 text-muted-foreground">
                  <FileText className="w-8 h-8 mx-auto mb-2 opacity-30" />
                  Aucun compte rendu
                </TableCell>
              </TableRow>
            ) : (
              comptesRendus.map((cr) => (
                <TableRow key={cr.id} className="cursor-pointer" onClick={() => setApercu(cr)}>
                  <TableCell className="text-xs font-mono text-muted-foreground">{cr.ref}</TableCell>
                  <TableCell className="text-sm">{formatDate(cr.date)}</TableCell>
                  <TableCell className="text-sm font-medium">
                    {cr.patient ? `${cr.patient.prenom} ${cr.patient.nom}` : "—"}
                  </TableCell>
                  <TableCell className="text-xs text-muted-foreground">{cr.type}</TableCell>
                  <TableCell className="text-sm text-muted-foreground max-w-[220px] truncate">
                    {cr.motif ?? "—"}
                  </TableCell>
                  <TableCell onClick={(e) => e.stopPropagation()}>
                    {deletingId === cr.id ? (
                      <div className="flex items-center gap-1 justify-end">
                        <button
                          onClick={() => handleDelete(cr.id)}
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
                          onClick={() => setApercu(cr)}
                          title="Voir le document"
                          className="p-1.5 rounded hover:bg-accent text-muted-foreground hover:text-foreground transition-colors"
                        >
                          <Eye className="w-3.5 h-3.5" />
                        </button>
                        <button
                          onClick={() => openPrint(cr.id)}
                          title="Imprimer"
                          className="p-1.5 rounded hover:bg-accent text-muted-foreground hover:text-foreground transition-colors"
                        >
                          <Printer className="w-3.5 h-3.5" />
                        </button>
                        <button
                          onClick={() => openEdit(cr)}
                          title="Modifier"
                          className="p-1.5 rounded hover:bg-accent text-muted-foreground hover:text-foreground transition-colors"
                        >
                          <Pencil className="w-3.5 h-3.5" />
                        </button>
                        <button
                          onClick={() => setDeletingId(cr.id)}
                          title="Supprimer"
                          className="p-1.5 rounded hover:bg-red-50 text-muted-foreground hover:text-red-500 transition-colors"
                        >
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

      {/* ── Formulaire + aperçu en direct ── */}
      <Dialog open={open} onOpenChange={setOpen}>
        <DialogContent className="max-w-5xl max-h-[92vh] overflow-y-auto">
          <DialogHeader>
            <DialogTitle>{editingId ? "Modifier le compte rendu" : "Nouveau compte rendu"}</DialogTitle>
          </DialogHeader>

          <div className="grid grid-cols-1 lg:grid-cols-2 gap-6 mt-2">
            {/* Colonne saisie */}
            <form onSubmit={handleSubmit} className="space-y-4">
              <div className="grid grid-cols-1 sm:grid-cols-2 gap-3">
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
                            className="w-full text-left px-3 py-2 text-sm hover:bg-accent"
                            onClick={() => {
                              setForm((f) => ({ ...f, patientId: p.id }))
                              setPatientSearch(`${p.prenom} ${p.nom}`)
                            }}
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
                <Label>Type de document *</Label>
                <Input
                  value={form.type}
                  onChange={(e) => setForm((f) => ({ ...f, type: e.target.value }))}
                  required
                />
                <div className="flex flex-wrap gap-1.5 pt-0.5">
                  {TYPES_COURANTS.map((t) => (
                    <button
                      key={t}
                      type="button"
                      onClick={() => setForm((f) => ({ ...f, type: t }))}
                      className={`text-[11px] px-2 py-1 rounded border transition-colors ${
                        form.type === t
                          ? "bg-foreground text-background border-foreground"
                          : "border-border text-muted-foreground hover:bg-muted hover:text-foreground"
                      }`}
                    >
                      {t}
                    </button>
                  ))}
                </div>
              </div>

              <div className="space-y-1.5">
                <Label>Motif de consultation</Label>
                <Textarea
                  rows={2}
                  value={form.motif ?? ""}
                  onChange={(e) => setForm((f) => ({ ...f, motif: e.target.value || null }))}
                  placeholder="Douleurs musculaires diffuses évoluant depuis près d'une année…"
                />
              </div>

              <div className="space-y-1.5">
                <Label>Médecin</Label>
                <Select
                  value={form.medecinId ?? ""}
                  onValueChange={(v) => setForm((f) => ({ ...f, medecinId: v || null }))}
                >
                  <SelectTrigger>
                    <SelectValue placeholder="Choisir…" />
                  </SelectTrigger>
                  <SelectContent>
                    {medecins.map((m) => (
                      <SelectItem key={m.id} value={m.id}>
                        Dr. {m.prenom} {m.nom}
                      </SelectItem>
                    ))}
                  </SelectContent>
                </Select>
              </div>

              <div className="space-y-1.5">
                <Label>Contenu du compte rendu *</Label>
                <ReportEditor
                  value={form.contenu}
                  onChange={(v) => setForm((f) => ({ ...f, contenu: v }))}
                  placeholder={"# Histoire de la maladie\n- Douleurs diffuses depuis un an"}
                  required
                  modeles={MODELES_COMPTE_RENDU}
                />
              </div>

              <div className="flex justify-end gap-2 pt-1">
                <Button type="button" variant="outline" onClick={() => setOpen(false)}>
                  Annuler
                </Button>
                <Button type="submit" disabled={isPending}>
                  {isPending ? "Enregistrement…" : editingId ? "Sauvegarder" : "Créer"}
                </Button>
              </div>
            </form>

            {/* Colonne aperçu */}
            <div className="lg:sticky lg:top-0 lg:self-start">
              <p className="mb-2 text-[11px] font-semibold uppercase tracking-widest text-muted-foreground">
                Aperçu du document
              </p>
              <div className="rounded-lg bg-neutral-200 p-3">
                <SheetPreview>
                  <CompteRenduSheet
                    data={{
                      type: form.type,
                      date: form.date,
                      motif: form.motif ?? null,
                      contenu: form.contenu,
                      patientPrenom: patientChoisi?.prenom ?? "—",
                      patientNom: patientChoisi?.nom ?? "",
                      age: calcAge(patientChoisi?.dateNaissance),
                      sexe: patientChoisi?.sexe ?? null,
                    }}
                  />
                </SheetPreview>
              </div>
            </div>
          </div>
        </DialogContent>
      </Dialog>

      {/* ── Aperçu d'un compte rendu enregistré ── */}
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
                  <CompteRenduSheet
                    data={{
                      type: apercu.type,
                      date: apercu.date,
                      motif: apercu.motif,
                      contenu: apercu.contenu,
                      patientPrenom: apercu.patient?.prenom ?? "",
                      patientNom: apercu.patient?.nom ?? "",
                      age: calcAge(apercu.patient?.dateNaissance),
                      sexe: apercu.patient?.sexe ?? null,
                    }}
                  />
                </SheetPreview>
              </div>
              <div className="flex flex-wrap justify-end gap-2">
                <Button variant="outline" onClick={() => { openEdit(apercu); setApercu(null) }}>
                  <Pencil className="w-3.5 h-3.5 mr-1.5" />
                  Modifier
                </Button>
                <PdfButton
                  getSheet={() => apercuRef.current?.querySelector<HTMLElement>(".sheet") ?? null}
                  nomFichier={nomFichierSur(
                    "Compte-rendu",
                    apercu.patient?.nom,
                    apercu.patient?.prenom,
                    apercu.date
                  )}
                />
                <Button onClick={() => openPrint(apercu.id)}>
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
