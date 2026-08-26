"use client"

import { useRef, useState, useTransition } from "react"
import { useRouter } from "next/navigation"
import {
  createCertificat,
  updateCertificat,
  deleteCertificat,
  type CertificatFormData,
} from "@/actions/certificats"
import { Button } from "@/components/ui/button"
import { Input } from "@/components/ui/input"
import { Label } from "@/components/ui/label"
import { Select, SelectContent, SelectItem, SelectTrigger, SelectValue } from "@/components/ui/select"
import { Dialog, DialogContent, DialogHeader, DialogTitle } from "@/components/ui/dialog"
import { Table, TableBody, TableCell, TableHead, TableHeader, TableRow } from "@/components/ui/table"
import { Badge } from "@/components/ui/badge"
import { SheetPreview } from "@/components/print/sheet-preview"
import { CertificatSheet, type NatureCertificat } from "@/components/print/documents/certificat-sheet"
import { PdfButton } from "@/components/print/pdf-button"
import { nomFichierSur } from "@/lib/pdf"
import { formatDate, today, calcAge } from "@/lib/utils"
import { Plus, Printer, Pencil, Trash2, FileCheck, Eye } from "lucide-react"
import { toast } from "sonner"

type Patient = {
  id: string
  prenom: string
  nom: string
  telephone: string
  dateNaissance: string | null
}
type Medecin = { id: string; nom: string; prenom: string }
type PatientCertificat = { prenom: string; nom: string; dateNaissance: string | null }
type CertificatRow = {
  id: string
  ref: string
  date: string
  patientId: string
  nature: NatureCertificat
  nombreJours: number | null
  dateDebut: string | null
  dateFin: string | null
  dateReprise: string | null
  medecinId: string | null
  patient: PatientCertificat | null
}

const NATURE_LABELS: Record<NatureCertificat, string> = {
  arret: "Arrêt de travail",
  prolongation: "Prolongation",
  reprise: "Reprise",
}

const EMPTY: CertificatFormData = {
  patientId: "",
  date: today(),
  nature: "arret",
  nombreJours: 1,
  dateDebut: today(),
  dateFin: today(),
  dateReprise: null,
  medecinId: null,
}

function openPrint(id: string) {
  window.open(`/print/certificat/${id}`, "_blank", "noopener")
}

/** Ajoute n jours à une date ISO, en restant sur le fuseau local. */
function addDays(dateStr: string, n: number): string {
  const d = new Date(dateStr + "T12:00:00")
  d.setDate(d.getDate() + n)
  return d.toISOString().split("T")[0]
}

export function CertificatsClient({
  certificats,
  patients,
  medecins,
}: {
  certificats: CertificatRow[]
  patients: Patient[]
  medecins: Medecin[]
}) {
  const router = useRouter()
  const [isPending, startTransition] = useTransition()

  const [open, setOpen] = useState(false)
  const [editingId, setEditingId] = useState<string | null>(null)
  const [form, setForm] = useState<CertificatFormData>(EMPTY)
  const [patientSearch, setPatientSearch] = useState("")
  const [deletingId, setDeletingId] = useState<string | null>(null)
  const [apercu, setApercu] = useState<CertificatRow | null>(null)
  const apercuRef = useRef<HTMLDivElement>(null)

  const filteredPats = patients
    .filter((p) => {
      const q = patientSearch.toLowerCase()
      return p.nom.toLowerCase().includes(q) || p.prenom.toLowerCase().includes(q)
    })
    .slice(0, 5)

  const patientChoisi = patients.find((p) => p.id === form.patientId) ?? null
  const estReprise = form.nature === "reprise"

  function openCreate() {
    setEditingId(null)
    setForm({ ...EMPTY, date: today(), dateDebut: today(), dateFin: today() })
    setPatientSearch("")
    setOpen(true)
  }

  function openEdit(c: CertificatRow) {
    setEditingId(c.id)
    setForm({
      patientId: c.patientId,
      date: c.date,
      nature: c.nature,
      nombreJours: c.nombreJours,
      dateDebut: c.dateDebut,
      dateFin: c.dateFin,
      dateReprise: c.dateReprise,
      medecinId: c.medecinId,
    })
    setPatientSearch(c.patient ? `${c.patient.prenom} ${c.patient.nom}` : "")
    setOpen(true)
  }

  // La durée et la date de fin décrivent la même chose : saisir l'une ajuste l'autre.
  function setJours(n: number) {
    setForm((f) => ({
      ...f,
      nombreJours: n,
      dateFin: f.dateDebut && n > 0 ? addDays(f.dateDebut, n - 1) : f.dateFin,
    }))
  }

  function setDebut(d: string) {
    setForm((f) => ({
      ...f,
      dateDebut: d,
      dateFin: d && f.nombreJours ? addDays(d, f.nombreJours - 1) : f.dateFin,
    }))
  }

  function setFin(d: string) {
    setForm((f) => {
      if (!f.dateDebut || !d || d < f.dateDebut) return { ...f, dateFin: d }
      const jours =
        Math.round(
          (new Date(d + "T12:00:00").getTime() - new Date(f.dateDebut + "T12:00:00").getTime()) /
            86400000
        ) + 1
      return { ...f, dateFin: d, nombreJours: jours }
    })
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
          const id = editingId
          await updateCertificat(id, form)
          toast.success("Certificat mis à jour", {
            action: { label: "Imprimer", onClick: () => openPrint(id) },
          })
        } else {
          const res = await createCertificat(form)
          toast.success("Certificat créé", {
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
        await deleteCertificat(id)
        toast.success("Certificat supprimé")
        router.refresh()
      } catch {
        toast.error("Suppression impossible — réservée à l'administrateur")
      }
    })
  }

  /** Données de la feuille, qu'on soit en saisie ou en relecture. */
  function donnees(
    source: CertificatFormData | CertificatRow,
    patient: PatientCertificat | null
  ) {
    return {
      date: source.date,
      patientNom: patient?.nom ?? "",
      patientPrenom: patient?.prenom ?? "",
      age: calcAge(patient?.dateNaissance),
      nature: source.nature,
      nombreJours: source.nombreJours ?? null,
      dateDebut: source.dateDebut ?? null,
      dateFin: source.dateFin ?? null,
      dateReprise: source.dateReprise ?? null,
    }
  }

  return (
    <div className="space-y-5">
      <div className="flex items-center justify-between gap-3">
        <div>
          <h1 className="text-lg font-semibold">Arrêts de travail</h1>
          <p className="text-sm text-muted-foreground">
            {certificats.length} certificat{certificats.length !== 1 ? "s" : ""} · format A5 imprimable
          </p>
        </div>
        <Button size="sm" onClick={openCreate}>
          <Plus className="w-4 h-4" />
          Nouveau certificat
        </Button>
      </div>

      <div className="border border-border rounded-lg bg-card overflow-hidden">
        <Table>
          <TableHeader>
            <TableRow className="bg-muted/30 hover:bg-muted/30">
              <TableHead>Réf.</TableHead>
              <TableHead>Date</TableHead>
              <TableHead>Patient</TableHead>
              <TableHead>Nature</TableHead>
              <TableHead>Période</TableHead>
              <TableHead />
            </TableRow>
          </TableHeader>
          <TableBody>
            {certificats.length === 0 ? (
              <TableRow>
                <TableCell colSpan={6} className="text-center py-12 text-muted-foreground">
                  <FileCheck className="w-8 h-8 mx-auto mb-2 opacity-30" />
                  Aucun certificat
                </TableCell>
              </TableRow>
            ) : (
              certificats.map((c) => (
                <TableRow key={c.id} className="cursor-pointer" onClick={() => setApercu(c)}>
                  <TableCell className="text-xs font-mono text-muted-foreground">{c.ref}</TableCell>
                  <TableCell className="text-sm">{formatDate(c.date)}</TableCell>
                  <TableCell className="text-sm font-medium">
                    {c.patient ? `${c.patient.prenom} ${c.patient.nom}` : "—"}
                  </TableCell>
                  <TableCell>
                    <Badge variant={c.nature === "reprise" ? "effectue" : "confirme"}>
                      {NATURE_LABELS[c.nature]}
                    </Badge>
                  </TableCell>
                  <TableCell className="text-sm text-muted-foreground">
                    {c.nature === "reprise"
                      ? formatDate(c.dateReprise)
                      : `${c.nombreJours ?? "—"} j · ${formatDate(c.dateDebut)} → ${formatDate(c.dateFin)}`}
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
                          title="Voir le certificat"
                          className="p-1.5 rounded hover:bg-accent text-muted-foreground hover:text-foreground transition-colors"
                        >
                          <Eye className="w-3.5 h-3.5" />
                        </button>
                        <button
                          onClick={() => openPrint(c.id)}
                          title="Imprimer"
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
              ))
            )}
          </TableBody>
        </Table>
      </div>

      {/* ── Formulaire + aperçu en direct ── */}
      <Dialog open={open} onOpenChange={setOpen}>
        <DialogContent className="max-w-5xl max-h-[92vh] overflow-y-auto">
          <DialogHeader>
            <DialogTitle>
              {editingId ? "Modifier le certificat" : "Nouveau certificat d'arrêt de travail"}
            </DialogTitle>
          </DialogHeader>

          <div className="grid grid-cols-1 lg:grid-cols-2 gap-6 mt-2">
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
                  <Label>Date du certificat *</Label>
                  <Input
                    type="date"
                    value={form.date}
                    onChange={(e) => setForm((f) => ({ ...f, date: e.target.value }))}
                    required
                  />
                </div>
              </div>

              <div className="space-y-1.5">
                <Label>Nature *</Label>
                <div className="flex flex-wrap gap-1.5">
                  {(Object.keys(NATURE_LABELS) as NatureCertificat[]).map((n) => (
                    <button
                      key={n}
                      type="button"
                      onClick={() => setForm((f) => ({ ...f, nature: n }))}
                      className={`text-xs px-2.5 py-1.5 rounded border transition-colors ${
                        form.nature === n
                          ? "bg-foreground text-background border-foreground"
                          : "border-border text-muted-foreground hover:bg-muted hover:text-foreground"
                      }`}
                    >
                      {NATURE_LABELS[n]}
                    </button>
                  ))}
                </div>
              </div>

              {estReprise ? (
                <div className="space-y-1.5">
                  <Label>Reprise de travail le *</Label>
                  <Input
                    type="date"
                    value={form.dateReprise ?? ""}
                    onChange={(e) => setForm((f) => ({ ...f, dateReprise: e.target.value || null }))}
                    required
                  />
                </div>
              ) : (
                <>
                  <div className="grid grid-cols-3 gap-3">
                    <div className="space-y-1.5">
                      <Label>Jours *</Label>
                      <Input
                        type="number"
                        min={1}
                        value={form.nombreJours ?? ""}
                        onChange={(e) => setJours(Number(e.target.value))}
                        required
                      />
                    </div>
                    <div className="space-y-1.5">
                      <Label>Du *</Label>
                      <Input
                        type="date"
                        value={form.dateDebut ?? ""}
                        onChange={(e) => setDebut(e.target.value)}
                        required
                      />
                    </div>
                    <div className="space-y-1.5">
                      <Label>Au *</Label>
                      <Input
                        type="date"
                        value={form.dateFin ?? ""}
                        min={form.dateDebut ?? undefined}
                        onChange={(e) => setFin(e.target.value)}
                        required
                      />
                    </div>
                  </div>
                  <p className="text-[11px] text-muted-foreground">
                    Durée et date de fin restent synchronisées : modifier l&apos;une ajuste l&apos;autre.
                  </p>
                </>
              )}

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

              <div className="flex justify-end gap-2 pt-1">
                <Button type="button" variant="outline" onClick={() => setOpen(false)}>
                  Annuler
                </Button>
                <Button type="submit" disabled={isPending}>
                  {isPending ? "Enregistrement…" : editingId ? "Sauvegarder" : "Créer"}
                </Button>
              </div>
            </form>

            <div className="lg:sticky lg:top-0 lg:self-start">
              <p className="mb-2 text-[11px] font-semibold uppercase tracking-widest text-muted-foreground">
                Aperçu du certificat
              </p>
              <div className="rounded-lg bg-neutral-200 p-3">
                <SheetPreview>
                  <CertificatSheet
                    data={donnees(
                      form,
                      patientChoisi
                        ? {
                            prenom: patientChoisi.prenom,
                            nom: patientChoisi.nom,
                            dateNaissance: patientChoisi.dateNaissance,
                          }
                        : null
                    )}
                  />
                </SheetPreview>
              </div>
            </div>
          </div>
        </DialogContent>
      </Dialog>

      {/* ── Aperçu d'un certificat enregistré ── */}
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
                  <CertificatSheet data={donnees(apercu, apercu.patient)} />
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
                    "Arret-travail",
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
