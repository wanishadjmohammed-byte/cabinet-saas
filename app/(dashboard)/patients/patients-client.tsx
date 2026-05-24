"use client"

import { useState, useTransition } from "react"
import { useRouter } from "next/navigation"
import { createPatient, updatePatient, deletePatient, type PatientFormData } from "@/actions/patients"
import { Button } from "@/components/ui/button"
import { Input } from "@/components/ui/input"
import { Label } from "@/components/ui/label"
import { Badge } from "@/components/ui/badge"
import { Dialog, DialogContent, DialogHeader, DialogTitle, DialogTrigger } from "@/components/ui/dialog"
import { Select, SelectContent, SelectItem, SelectTrigger, SelectValue } from "@/components/ui/select"
import { Textarea } from "@/components/ui/textarea"
import { Table, TableBody, TableCell, TableHead, TableHeader, TableRow } from "@/components/ui/table"
import { formatCurrency, formatDate, calcAge } from "@/lib/utils"
import { Plus, Search, User, Pencil, Trash2 } from "lucide-react"
import { toast } from "sonner"

type PatientRow = {
  id: string; ref: string; nom: string; prenom: string
  telephone: string; dateNaissance: string | null; sexe: "H" | "F" | null
  pathologie: string | null; notesMedicales: string | null
  createdAt: Date
  montantDu: number; totalVerse: number; restant: number; pct: number
  statut: "paye" | "partiel" | "impaye"
}

const STATUT_LABELS = { paye: "Payé", partiel: "Partiel", impaye: "Impayé" }
const STATUT_VARIANTS = { paye: "paye", partiel: "partiel", impaye: "impaye" } as const

export function PatientsClient({ initialPatients }: { initialPatients: PatientRow[] }) {
  const [search, setSearch] = useState("")
  const [open, setOpen] = useState(false)
  const [isPending, startTransition] = useTransition()
  const router = useRouter()

  const [form, setForm] = useState<PatientFormData>({
    nom: "", prenom: "", telephone: "", dateNaissance: null,
    sexe: null, pathologie: null, notesMedicales: null,
  })

  const [editPatient, setEditPatient] = useState<PatientRow | null>(null)
  const [editForm, setEditForm] = useState<PatientFormData>({
    nom: "", prenom: "", telephone: "", dateNaissance: null,
    sexe: null, pathologie: null, notesMedicales: null,
  })
  const [editPending, startEditTransition] = useTransition()
  const [deletingId, setDeletingId] = useState<string | null>(null)
  const [, startDeleteTransition] = useTransition()

  function handleDelete(id: string) {
    setDeletingId(null)
    startDeleteTransition(async () => {
      try {
        await deletePatient(id)
        toast.success("Patient supprimé")
        router.refresh()
      } catch {
        toast.error("Impossible de supprimer ce patient — il a des consultations ou des versements liés")
      }
    })
  }

  function openEdit(p: PatientRow, e: React.MouseEvent) {
    e.stopPropagation()
    setEditPatient(p)
    setEditForm({
      nom: p.nom, prenom: p.prenom, telephone: p.telephone,
      dateNaissance: p.dateNaissance, sexe: p.sexe,
      pathologie: p.pathologie, notesMedicales: p.notesMedicales,
    })
  }

  function handleEditSubmit(e: React.FormEvent) {
    e.preventDefault()
    if (!editPatient) return
    startEditTransition(async () => {
      try {
        await updatePatient(editPatient.id, editForm)
        toast.success("Patient mis à jour")
        setEditPatient(null)
        router.refresh()
      } catch (err: unknown) {
        toast.error(err instanceof Error ? err.message : "Erreur")
      }
    })
  }

  const filtered = initialPatients.filter((p) => {
    const q = search.toLowerCase()
    return (
      p.nom.toLowerCase().includes(q) ||
      p.prenom.toLowerCase().includes(q) ||
      p.telephone.includes(q)
    )
  })

  function handleSubmit(e: React.FormEvent) {
    e.preventDefault()
    startTransition(async () => {
      try {
        await createPatient(form)
        toast.success("Patient ajouté avec succès")
        setOpen(false)
        setForm({ nom: "", prenom: "", telephone: "", dateNaissance: null, sexe: null, pathologie: null, notesMedicales: null })
        router.refresh()
      } catch (err: unknown) {
        toast.error(err instanceof Error ? err.message : "Erreur lors de l'ajout")
      }
    })
  }

  return (
    <div className="space-y-5">
      <div className="flex items-center justify-between">
        <div>
          <h1 className="text-lg font-semibold">Patients</h1>
          <p className="text-sm text-muted-foreground">{initialPatients.length} patient{initialPatients.length !== 1 ? "s" : ""} enregistré{initialPatients.length !== 1 ? "s" : ""}</p>
        </div>
        <Dialog open={open} onOpenChange={setOpen}>
          <DialogTrigger asChild>
            <Button size="sm"><Plus className="w-4 h-4" />Nouveau patient</Button>
          </DialogTrigger>
          <DialogContent className="max-w-lg">
            <DialogHeader><DialogTitle>Nouveau patient</DialogTitle></DialogHeader>
            <form onSubmit={handleSubmit} className="space-y-4 mt-2">
              <div className="grid grid-cols-2 gap-3">
                <div className="space-y-1.5">
                  <Label htmlFor="prenom">Prénom *</Label>
                  <Input id="prenom" value={form.prenom} onChange={(e) => setForm((f) => ({ ...f, prenom: e.target.value }))} required />
                </div>
                <div className="space-y-1.5">
                  <Label htmlFor="nom">Nom *</Label>
                  <Input id="nom" value={form.nom} onChange={(e) => setForm((f) => ({ ...f, nom: e.target.value }))} required />
                </div>
              </div>
              <div className="space-y-1.5">
                <Label htmlFor="tel">Téléphone *</Label>
                <Input id="tel" value={form.telephone} onChange={(e) => setForm((f) => ({ ...f, telephone: e.target.value }))} required />
              </div>
              <div className="grid grid-cols-2 gap-3">
                <div className="space-y-1.5">
                  <Label>Date de naissance</Label>
                  <Input type="date" value={form.dateNaissance ?? ""} onChange={(e) => setForm((f) => ({ ...f, dateNaissance: e.target.value || null }))} />
                </div>
                <div className="space-y-1.5">
                  <Label>Sexe</Label>
                  <Select value={form.sexe ?? ""} onValueChange={(v) => setForm((f) => ({ ...f, sexe: (v || null) as "H" | "F" | null }))}>
                    <SelectTrigger><SelectValue placeholder="—" /></SelectTrigger>
                    <SelectContent>
                      <SelectItem value="H">Homme</SelectItem>
                      <SelectItem value="F">Femme</SelectItem>
                    </SelectContent>
                  </Select>
                </div>
              </div>
              <div className="space-y-1.5">
                <Label>Pathologie / Cas</Label>
                <Input value={form.pathologie ?? ""} onChange={(e) => setForm((f) => ({ ...f, pathologie: e.target.value || null }))} />
              </div>
              <div className="space-y-1.5">
                <Label>Notes médicales</Label>
                <Textarea rows={3} value={form.notesMedicales ?? ""} onChange={(e) => setForm((f) => ({ ...f, notesMedicales: e.target.value || null }))} />
              </div>
              <div className="flex justify-end gap-2 pt-1">
                <Button type="button" variant="outline" onClick={() => setOpen(false)}>Annuler</Button>
                <Button type="submit" disabled={isPending}>{isPending ? "Enregistrement…" : "Enregistrer"}</Button>
              </div>
            </form>
          </DialogContent>
        </Dialog>
      </div>

      {/* Search */}
      <div className="relative max-w-sm">
        <Search className="absolute left-3 top-1/2 -translate-y-1/2 w-4 h-4 text-muted-foreground" />
        <Input placeholder="Rechercher par nom, prénom, téléphone…" className="pl-9" value={search} onChange={(e) => setSearch(e.target.value)} />
      </div>

      {/* Table */}
      <div className="border border-border rounded-lg bg-card overflow-hidden">
        <Table>
          <TableHeader>
            <TableRow className="bg-muted/30 hover:bg-muted/30">
              <TableHead>Réf.</TableHead>
              <TableHead>Patient</TableHead>
              <TableHead>Téléphone</TableHead>
              <TableHead>Âge</TableHead>
              <TableHead>Statut</TableHead>
              <TableHead className="text-right">Dû</TableHead>
              <TableHead className="text-right">Versé</TableHead>
              <TableHead className="text-right">Restant</TableHead>
              <TableHead />
            </TableRow>
          </TableHeader>
          <TableBody>
            {filtered.length === 0 ? (
              <TableRow>
                <TableCell colSpan={9} className="text-center py-12 text-muted-foreground">
                  <User className="w-8 h-8 mx-auto mb-2 opacity-30" />
                  {search ? "Aucun patient trouvé" : "Aucun patient enregistré"}
                </TableCell>
              </TableRow>
            ) : (
              filtered.map((p) => (
                <TableRow key={p.id} className="cursor-pointer" onClick={() => router.push(`/patients/${p.id}`)}>
                  <TableCell className="text-xs text-muted-foreground font-mono">{p.ref}</TableCell>
                  <TableCell>
                    <p className="font-medium text-sm">{p.prenom} {p.nom}</p>
                    {p.sexe && <p className="text-xs text-muted-foreground">{p.sexe === "H" ? "Homme" : "Femme"}</p>}
                  </TableCell>
                  <TableCell className="text-sm">{p.telephone}</TableCell>
                  <TableCell className="text-sm">{calcAge(p.dateNaissance) ?? "—"}</TableCell>
                  <TableCell><Badge variant={STATUT_VARIANTS[p.statut]}>{STATUT_LABELS[p.statut]}</Badge></TableCell>
                  <TableCell className="text-right text-sm font-medium">{formatCurrency(p.montantDu)}</TableCell>
                  <TableCell className="text-right text-sm text-emerald-600">{formatCurrency(p.totalVerse)}</TableCell>
                  <TableCell className={`text-right text-sm font-semibold ${p.restant > 0 ? "text-red-600" : "text-emerald-600"}`}>
                    {formatCurrency(p.restant)}
                  </TableCell>
                  <TableCell>
                    {deletingId === p.id ? (
                      <div className="flex items-center gap-1" onClick={(e) => e.stopPropagation()}>
                        <button onClick={() => handleDelete(p.id)} className="text-xs px-2 py-1 rounded bg-red-500 text-white hover:bg-red-600 transition-colors">Oui</button>
                        <button onClick={() => setDeletingId(null)} className="text-xs px-2 py-1 rounded border border-border hover:bg-muted transition-colors">Non</button>
                      </div>
                    ) : (
                      <div className="flex items-center gap-1" onClick={(e) => e.stopPropagation()}>
                        <button onClick={(e) => openEdit(p, e)} className="p-1.5 rounded hover:bg-accent text-muted-foreground hover:text-foreground transition-colors">
                          <Pencil className="w-3.5 h-3.5" />
                        </button>
                        <button onClick={() => setDeletingId(p.id)} className="p-1.5 rounded hover:bg-red-50 text-muted-foreground hover:text-red-500 transition-colors">
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

      {/* Edit patient dialog */}
      <Dialog open={!!editPatient} onOpenChange={(open) => { if (!open) setEditPatient(null) }}>
        <DialogContent className="max-w-lg">
          <DialogHeader><DialogTitle>Modifier le patient</DialogTitle></DialogHeader>
          <form onSubmit={handleEditSubmit} className="space-y-4 mt-2">
            <div className="grid grid-cols-2 gap-3">
              <div className="space-y-1.5">
                <Label>Prénom *</Label>
                <Input value={editForm.prenom} onChange={(e) => setEditForm((f) => ({ ...f, prenom: e.target.value }))} required />
              </div>
              <div className="space-y-1.5">
                <Label>Nom *</Label>
                <Input value={editForm.nom} onChange={(e) => setEditForm((f) => ({ ...f, nom: e.target.value }))} required />
              </div>
            </div>
            <div className="space-y-1.5">
              <Label>Téléphone *</Label>
              <Input value={editForm.telephone} onChange={(e) => setEditForm((f) => ({ ...f, telephone: e.target.value }))} required />
            </div>
            <div className="grid grid-cols-2 gap-3">
              <div className="space-y-1.5">
                <Label>Date de naissance</Label>
                <Input type="date" value={editForm.dateNaissance ?? ""} onChange={(e) => setEditForm((f) => ({ ...f, dateNaissance: e.target.value || null }))} />
              </div>
              <div className="space-y-1.5">
                <Label>Sexe</Label>
                <Select value={editForm.sexe ?? ""} onValueChange={(v) => setEditForm((f) => ({ ...f, sexe: (v || null) as "H" | "F" | null }))}>
                  <SelectTrigger><SelectValue placeholder="—" /></SelectTrigger>
                  <SelectContent>
                    <SelectItem value="H">Homme</SelectItem>
                    <SelectItem value="F">Femme</SelectItem>
                  </SelectContent>
                </Select>
              </div>
            </div>
            <div className="space-y-1.5">
              <Label>Pathologie / Cas</Label>
              <Input value={editForm.pathologie ?? ""} onChange={(e) => setEditForm((f) => ({ ...f, pathologie: e.target.value || null }))} />
            </div>
            <div className="space-y-1.5">
              <Label>Notes médicales</Label>
              <Textarea rows={3} value={editForm.notesMedicales ?? ""} onChange={(e) => setEditForm((f) => ({ ...f, notesMedicales: e.target.value || null }))} />
            </div>
            <div className="flex justify-end gap-2 pt-1">
              <Button type="button" variant="outline" onClick={() => setEditPatient(null)}>Annuler</Button>
              <Button type="submit" disabled={editPending}>{editPending ? "Enregistrement…" : "Sauvegarder"}</Button>
            </div>
          </form>
        </DialogContent>
      </Dialog>
    </div>
  )
}
