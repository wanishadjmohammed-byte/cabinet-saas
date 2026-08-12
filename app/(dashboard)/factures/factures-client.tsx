"use client"

import { useRef, useState, useTransition } from "react"
import { useRouter } from "next/navigation"
import {
  createFacture,
  updateFacture,
  deleteFacture,
  type FactureFormData,
} from "@/actions/factures"
import { calcTotaux } from "@/lib/facture"
import { TVA_DEFAUT } from "@/lib/cabinet"
import { Button } from "@/components/ui/button"
import { Input } from "@/components/ui/input"
import { Label } from "@/components/ui/label"
import { Textarea } from "@/components/ui/textarea"
import { Dialog, DialogContent, DialogHeader, DialogTitle } from "@/components/ui/dialog"
import { Table, TableBody, TableCell, TableHead, TableHeader, TableRow } from "@/components/ui/table"
import { SheetPreview } from "@/components/print/sheet-preview"
import { FactureSheet } from "@/components/print/documents/facture-sheet"
import { PdfButton } from "@/components/print/pdf-button"
import { nomFichierSur } from "@/lib/pdf"
import { formatCurrency, formatDate, calcAge, today } from "@/lib/utils"
import { Plus, Printer, Pencil, Trash2, Receipt, X, Eye } from "lucide-react"
import { toast } from "sonner"

type Patient = {
  id: string
  prenom: string
  nom: string
  telephone: string
  dateNaissance: string | null
  sexe: "H" | "F" | null
}
type FactureRow = {
  id: string
  numero: string
  date: string
  patientId: string | null
  patientNom: string
  patientAge: string | null
  patientSexe: string | null
  typeIntervention: string | null
  dateIntervention: string | null
  tva: number
  notes: string | null
  lignes: { id: string; description: string; montant: number; ordre: number }[]
}

const EMPTY: FactureFormData = {
  date: today(),
  patientId: null,
  patientNom: "",
  patientAge: null,
  patientSexe: null,
  typeIntervention: null,
  dateIntervention: null,
  tva: TVA_DEFAUT,
  notes: null,
  lignes: [{ description: "", montant: 0 }],
}

function openPrint(id: string) {
  window.open(`/print/facture/${id}`, "_blank", "noopener")
}

export function FacturesClient({
  factures,
  patients,
}: {
  factures: FactureRow[]
  patients: Patient[]
}) {
  const router = useRouter()
  const [isPending, startTransition] = useTransition()

  const [open, setOpen] = useState(false)
  const [editingId, setEditingId] = useState<string | null>(null)
  const [form, setForm] = useState<FactureFormData>(EMPTY)
  const [showSuggestions, setShowSuggestions] = useState(false)
  const [deletingId, setDeletingId] = useState<string | null>(null)
  const [apercu, setApercu] = useState<FactureRow | null>(null)
  const apercuRef = useRef<HTMLDivElement>(null)

  const totaux = calcTotaux(form.lignes, form.tva)
  // Le numéro n'est attribué qu'à l'enregistrement : l'aperçu l'annonce.
  const numeroApercu = (editingId && factures.find((f) => f.id === editingId)?.numero) || "à générer"

  const filteredPats = patients
    .filter((p) => {
      const q = form.patientNom.toLowerCase()
      return q.length > 0 && (p.nom.toLowerCase().includes(q) || p.prenom.toLowerCase().includes(q))
    })
    .slice(0, 5)

  function openCreate() {
    setEditingId(null)
    setForm(EMPTY)
    setShowSuggestions(false)
    setOpen(true)
  }

  function openEdit(f: FactureRow) {
    setEditingId(f.id)
    setForm({
      date: f.date,
      patientId: f.patientId,
      patientNom: f.patientNom,
      patientAge: f.patientAge,
      patientSexe: f.patientSexe,
      typeIntervention: f.typeIntervention,
      dateIntervention: f.dateIntervention,
      tva: f.tva,
      notes: f.notes,
      lignes: f.lignes.length
        ? f.lignes.map((l) => ({ description: l.description, montant: l.montant }))
        : [{ description: "", montant: 0 }],
    })
    setShowSuggestions(false)
    setOpen(true)
  }

  /** Sélectionner un patient enregistré pré-remplit nom, âge et sexe. */
  function selectPatient(p: Patient) {
    const age = calcAge(p.dateNaissance)
    setForm((f) => ({
      ...f,
      patientId: p.id,
      patientNom: `${p.nom.toUpperCase()} ${p.prenom}`,
      patientAge: age !== null ? `${age} ans` : f.patientAge,
      patientSexe: p.sexe === "F" ? "Féminin" : p.sexe === "H" ? "Masculin" : f.patientSexe,
    }))
    setShowSuggestions(false)
  }

  function setLigne(i: number, patch: Partial<{ description: string; montant: number }>) {
    setForm((f) => ({
      ...f,
      lignes: f.lignes.map((l, idx) => (idx === i ? { ...l, ...patch } : l)),
    }))
  }

  function addLigne() {
    setForm((f) => ({ ...f, lignes: [...f.lignes, { description: "", montant: 0 }] }))
  }

  function removeLigne(i: number) {
    setForm((f) => ({
      ...f,
      lignes: f.lignes.length === 1 ? f.lignes : f.lignes.filter((_, idx) => idx !== i),
    }))
  }

  function handleSubmit(e: React.FormEvent) {
    e.preventDefault()
    const lignes = form.lignes.filter((l) => l.description.trim())
    if (lignes.length === 0) {
      toast.error("Ajoutez au moins une ligne de facturation")
      return
    }
    const payload = { ...form, lignes }

    startTransition(async () => {
      try {
        if (editingId) {
          await updateFacture(editingId, payload)
          toast.success("Facture mise à jour", {
            action: { label: "Imprimer", onClick: () => openPrint(editingId) },
          })
        } else {
          const res = await createFacture(payload)
          toast.success(`Facture N° ${res.numero} créée`, {
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
        await deleteFacture(id)
        toast.success("Facture supprimée")
        router.refresh()
      } catch {
        toast.error("Suppression impossible — réservée à l'administrateur")
      }
    })
  }

  const totalFacture = factures.reduce(
    (s, f) => s + calcTotaux(f.lignes, f.tva).totalTTC,
    0
  )

  return (
    <div className="space-y-5">
      <div className="flex items-center justify-between gap-3">
        <div>
          <h1 className="text-lg font-semibold">Factures</h1>
          <p className="text-sm text-muted-foreground">
            {factures.length} facture{factures.length !== 1 ? "s" : ""} · total TTC{" "}
            <strong>{formatCurrency(totalFacture)}</strong>
          </p>
        </div>
        <Button size="sm" onClick={openCreate}>
          <Plus className="w-4 h-4" />
          Nouvelle facture
        </Button>
      </div>

      <div className="border border-border rounded-lg bg-card overflow-hidden">
        <Table>
          <TableHeader>
            <TableRow className="bg-muted/30 hover:bg-muted/30">
              <TableHead>N°</TableHead>
              <TableHead>Date</TableHead>
              <TableHead>Patient</TableHead>
              <TableHead>Intervention</TableHead>
              <TableHead className="text-right">Total HT</TableHead>
              <TableHead className="text-right">Total TTC</TableHead>
              <TableHead />
            </TableRow>
          </TableHeader>
          <TableBody>
            {factures.length === 0 ? (
              <TableRow>
                <TableCell colSpan={7} className="text-center py-12 text-muted-foreground">
                  <Receipt className="w-8 h-8 mx-auto mb-2 opacity-30" />
                  Aucune facture
                </TableCell>
              </TableRow>
            ) : (
              factures.map((f) => {
                const t = calcTotaux(f.lignes, f.tva)
                return (
                  <TableRow key={f.id} className="cursor-pointer" onClick={() => setApercu(f)}>
                    <TableCell className="text-xs font-mono text-muted-foreground">{f.numero}</TableCell>
                    <TableCell className="text-sm">{formatDate(f.date)}</TableCell>
                    <TableCell className="text-sm font-medium">{f.patientNom}</TableCell>
                    <TableCell className="text-sm text-muted-foreground max-w-[180px] truncate">
                      {f.typeIntervention ?? "—"}
                    </TableCell>
                    <TableCell className="text-right text-sm">{formatCurrency(t.totalHT)}</TableCell>
                    <TableCell className="text-right text-sm font-semibold">
                      {formatCurrency(t.totalTTC)}
                    </TableCell>
                    <TableCell onClick={(e) => e.stopPropagation()}>
                      {deletingId === f.id ? (
                        <div className="flex items-center gap-1 justify-end">
                          <button
                            onClick={() => handleDelete(f.id)}
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
                            onClick={() => setApercu(f)}
                            title="Voir la facture"
                            className="p-1.5 rounded hover:bg-accent text-muted-foreground hover:text-foreground transition-colors"
                          >
                            <Eye className="w-3.5 h-3.5" />
                          </button>
                          <button
                            onClick={() => openPrint(f.id)}
                            title="Imprimer"
                            className="p-1.5 rounded hover:bg-accent text-muted-foreground hover:text-foreground transition-colors"
                          >
                            <Printer className="w-3.5 h-3.5" />
                          </button>
                          <button
                            onClick={() => openEdit(f)}
                            title="Modifier"
                            className="p-1.5 rounded hover:bg-accent text-muted-foreground hover:text-foreground transition-colors"
                          >
                            <Pencil className="w-3.5 h-3.5" />
                          </button>
                          <button
                            onClick={() => setDeletingId(f.id)}
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

      {/* ── Formulaire ── */}
      <Dialog open={open} onOpenChange={setOpen}>
        <DialogContent className="max-w-5xl max-h-[92vh] overflow-y-auto">
          <DialogHeader>
            <DialogTitle>
              {editingId ? "Modifier la facture" : "Nouvelle facture"}
            </DialogTitle>
          </DialogHeader>

          <div className="grid grid-cols-1 lg:grid-cols-2 gap-6 mt-2">
          <form onSubmit={handleSubmit} className="space-y-4">
            <div className="grid grid-cols-1 sm:grid-cols-2 gap-3">
              <div className="space-y-1.5">
                <Label>Patient *</Label>
                <div className="relative">
                  <Input
                    placeholder="Nom du patient…"
                    value={form.patientNom}
                    onChange={(e) => {
                      setForm((f) => ({ ...f, patientNom: e.target.value, patientId: null }))
                      setShowSuggestions(true)
                    }}
                    required
                  />
                  {showSuggestions && !form.patientId && filteredPats.length > 0 && (
                    <div className="absolute top-full left-0 right-0 z-20 mt-1 bg-card border border-border rounded-md shadow-lg overflow-hidden">
                      {filteredPats.map((p) => (
                        <button
                          key={p.id}
                          type="button"
                          className="w-full text-left px-3 py-2 text-sm hover:bg-accent"
                          onClick={() => selectPatient(p)}
                        >
                          {p.prenom} {p.nom}{" "}
                          <span className="text-muted-foreground text-xs">· {p.telephone}</span>
                        </button>
                      ))}
                    </div>
                  )}
                </div>
                <p className="text-[11px] text-muted-foreground">
                  Texte libre accepté — le nom est figé sur la facture émise.
                </p>
              </div>

              <div className="space-y-1.5">
                <Label>Date de la facture *</Label>
                <Input
                  type="date"
                  value={form.date}
                  onChange={(e) => setForm((f) => ({ ...f, date: e.target.value }))}
                  required
                />
              </div>
            </div>

            <div className="grid grid-cols-2 gap-3">
              <div className="space-y-1.5">
                <Label>Âge</Label>
                <Input
                  value={form.patientAge ?? ""}
                  onChange={(e) => setForm((f) => ({ ...f, patientAge: e.target.value || null }))}
                  placeholder="27 ans · Adulte…"
                />
              </div>
              <div className="space-y-1.5">
                <Label>Sexe</Label>
                <Input
                  value={form.patientSexe ?? ""}
                  onChange={(e) => setForm((f) => ({ ...f, patientSexe: e.target.value || null }))}
                  placeholder="Féminin · Masculin"
                />
              </div>
            </div>

            <div className="grid grid-cols-1 sm:grid-cols-2 gap-3">
              <div className="space-y-1.5">
                <Label>Type d&apos;intervention</Label>
                <Input
                  value={form.typeIntervention ?? ""}
                  onChange={(e) =>
                    setForm((f) => ({ ...f, typeIntervention: e.target.value || null }))
                  }
                  placeholder="PSD Jambe…"
                />
              </div>
              <div className="space-y-1.5">
                <Label>Date de l&apos;intervention</Label>
                <Input
                  type="date"
                  value={form.dateIntervention ?? ""}
                  onChange={(e) =>
                    setForm((f) => ({ ...f, dateIntervention: e.target.value || null }))
                  }
                />
              </div>
            </div>

            {/* ── Lignes ── */}
            <div className="space-y-2">
              <Label>Lignes de facturation *</Label>
              <div className="space-y-2">
                {form.lignes.map((l, i) => (
                  <div key={i} className="flex items-center gap-2">
                    <Input
                      className="flex-1"
                      placeholder="Frais clinique, matériel, acte chirurgical…"
                      value={l.description}
                      onChange={(e) => setLigne(i, { description: e.target.value })}
                    />
                    <Input
                      type="number"
                      min={0}
                      className="w-36"
                      placeholder="0"
                      value={l.montant || ""}
                      onChange={(e) => setLigne(i, { montant: Number(e.target.value) })}
                    />
                    <button
                      type="button"
                      onClick={() => removeLigne(i)}
                      disabled={form.lignes.length === 1}
                      title="Retirer la ligne"
                      className="p-2 rounded text-muted-foreground hover:text-red-500 hover:bg-red-50 transition-colors disabled:opacity-30 disabled:hover:bg-transparent disabled:hover:text-muted-foreground"
                    >
                      <X className="w-3.5 h-3.5" />
                    </button>
                  </div>
                ))}
              </div>
              <Button type="button" variant="outline" size="sm" onClick={addLigne}>
                <Plus className="w-3.5 h-3.5" />
                Ajouter une ligne
              </Button>
            </div>

            {/* ── Totaux ── */}
            <div className="rounded-lg border border-border bg-muted/30 p-3 space-y-2">
              <div className="flex items-center justify-between text-sm">
                <span className="text-muted-foreground">Total HT</span>
                <span className="font-semibold">{formatCurrency(totaux.totalHT)}</span>
              </div>
              <div className="flex items-center justify-between text-sm">
                <div className="flex items-center gap-2">
                  <span className="text-muted-foreground">TVA</span>
                  <Input
                    type="number"
                    min={0}
                    max={100}
                    className="h-7 w-16 text-xs"
                    value={form.tva}
                    onChange={(e) => setForm((f) => ({ ...f, tva: Number(e.target.value) }))}
                  />
                  <span className="text-muted-foreground text-xs">%</span>
                </div>
                <span className="font-semibold">{formatCurrency(totaux.montantTva)}</span>
              </div>
              <div className="flex items-center justify-between border-t border-border pt-2 text-sm">
                <span className="font-medium">Total TTC</span>
                <span className="font-bold text-base">{formatCurrency(totaux.totalTTC)}</span>
              </div>
            </div>

            <div className="space-y-1.5">
              <Label>Notes internes</Label>
              <Textarea
                rows={2}
                value={form.notes ?? ""}
                onChange={(e) => setForm((f) => ({ ...f, notes: e.target.value || null }))}
                placeholder="Non imprimé sur la facture."
              />
            </div>

            <div className="flex justify-end gap-2 pt-1">
              <Button type="button" variant="outline" onClick={() => setOpen(false)}>
                Annuler
              </Button>
              <Button type="submit" disabled={isPending}>
                {isPending ? "Enregistrement…" : editingId ? "Sauvegarder" : "Créer la facture"}
              </Button>
            </div>
          </form>

          {/* Colonne aperçu */}
          <div className="lg:sticky lg:top-0 lg:self-start">
            <p className="mb-2 text-[11px] font-semibold uppercase tracking-widest text-muted-foreground">
              Aperçu de la facture
            </p>
            <div className="rounded-lg bg-neutral-200 p-3">
              <SheetPreview>
                <FactureSheet
                  data={{
                    numero: numeroApercu,
                    date: form.date,
                    patientNom: form.patientNom || "—",
                    patientAge: form.patientAge ?? null,
                    patientSexe: form.patientSexe ?? null,
                    typeIntervention: form.typeIntervention ?? null,
                    dateIntervention: form.dateIntervention ?? null,
                    tva: form.tva,
                    lignes: form.lignes.filter((l) => l.description.trim()),
                  }}
                />
              </SheetPreview>
            </div>
          </div>
          </div>
        </DialogContent>
      </Dialog>

      {/* ── Aperçu d'une facture enregistrée ── */}
      <Dialog open={!!apercu} onOpenChange={(o) => { if (!o) setApercu(null) }}>
        <DialogContent className="max-w-2xl max-h-[92vh] overflow-y-auto">
          <DialogHeader>
            <DialogTitle>
              Facture N° {apercu?.numero} — {apercu?.patientNom}
            </DialogTitle>
          </DialogHeader>

          {apercu && (
            <>
              <div ref={apercuRef} className="rounded-lg bg-neutral-200 p-3">
                <SheetPreview>
                  <FactureSheet
                    data={{
                      numero: apercu.numero,
                      date: apercu.date,
                      patientNom: apercu.patientNom,
                      patientAge: apercu.patientAge,
                      patientSexe: apercu.patientSexe,
                      typeIntervention: apercu.typeIntervention,
                      dateIntervention: apercu.dateIntervention,
                      tva: apercu.tva,
                      lignes: apercu.lignes,
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
                  nomFichier={nomFichierSur("Facture", apercu.numero, apercu.patientNom)}
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
