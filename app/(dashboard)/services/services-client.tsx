"use client"

import { useState, useTransition } from "react"
import { useRouter } from "next/navigation"
import { createService, updateService, toggleService, seedServices, type ServiceFormData } from "@/actions/services"
import { Button } from "@/components/ui/button"
import { Input } from "@/components/ui/input"
import { Label } from "@/components/ui/label"
import { Textarea } from "@/components/ui/textarea"
import { Dialog, DialogContent, DialogHeader, DialogTitle, DialogTrigger } from "@/components/ui/dialog"
import { Table, TableBody, TableCell, TableHead, TableHeader, TableRow } from "@/components/ui/table"
import { formatCurrency } from "@/lib/utils"
import { Plus, Pencil, Settings } from "lucide-react"
import { toast } from "sonner"

type Service = { id: string; nom: string; prixStandard: number; notes: string | null; actif: boolean }

export function ServicesClient({ services }: { services: Service[] }) {
  const router = useRouter()
  const [isPending, startTransition] = useTransition()
  const [open, setOpen] = useState(false)
  const [editing, setEditing] = useState<Service | null>(null)
  const [form, setForm] = useState<ServiceFormData>({ nom: "", prixStandard: 0, notes: null })

  function openCreate() {
    setEditing(null)
    setForm({ nom: "", prixStandard: 0, notes: null })
    setOpen(true)
  }

  function openEdit(s: Service) {
    setEditing(s)
    setForm({ nom: s.nom, prixStandard: s.prixStandard, notes: s.notes })
    setOpen(true)
  }

  function handleSubmit(e: React.FormEvent) {
    e.preventDefault()
    startTransition(async () => {
      try {
        if (editing) {
          await updateService(editing.id, form)
          toast.success("Service mis à jour")
        } else {
          await createService(form)
          toast.success("Service créé")
        }
        setOpen(false)
        router.refresh()
      } catch (err: unknown) { toast.error(err instanceof Error ? err.message : "Erreur") }
    })
  }

  function handleToggle(id: string, actif: boolean) {
    startTransition(async () => {
      await toggleService(id, !actif)
      toast.success(actif ? "Service désactivé" : "Service activé")
      router.refresh()
    })
  }

  function handleSeed() {
    startTransition(async () => {
      await seedServices()
      toast.success("Catalogue initialisé")
      router.refresh()
    })
  }

  return (
    <div className="space-y-5">
      <div className="flex items-center justify-between">
        <div>
          <h1 className="text-lg font-semibold">Catalogue de services</h1>
          <p className="text-sm text-muted-foreground">{services.length} service{services.length !== 1 ? "s" : ""}</p>
        </div>
        <div className="flex gap-2">
          {services.length === 0 && (
            <Button variant="outline" size="sm" onClick={handleSeed} disabled={isPending}>
              Initialiser le catalogue par défaut
            </Button>
          )}
          <Dialog open={open} onOpenChange={setOpen}>
            <DialogTrigger asChild>
              <Button size="sm" onClick={openCreate}><Plus className="w-4 h-4" />Nouveau service</Button>
            </DialogTrigger>
            <DialogContent>
              <DialogHeader><DialogTitle>{editing ? "Modifier le service" : "Nouveau service"}</DialogTitle></DialogHeader>
              <form onSubmit={handleSubmit} className="space-y-4 mt-2">
                <div className="space-y-1.5">
                  <Label>Nom du service *</Label>
                  <Input value={form.nom} onChange={(e) => setForm((f) => ({ ...f, nom: e.target.value }))} required />
                </div>
                <div className="space-y-1.5">
                  <Label>Prix standard (DA) *</Label>
                  <Input type="number" min={0} value={form.prixStandard || ""} onChange={(e) => setForm((f) => ({ ...f, prixStandard: Number(e.target.value) }))} required />
                </div>
                <div className="space-y-1.5">
                  <Label>Notes</Label>
                  <Textarea rows={2} value={form.notes ?? ""} onChange={(e) => setForm((f) => ({ ...f, notes: e.target.value || null }))} />
                </div>
                <div className="flex justify-end gap-2">
                  <Button type="button" variant="outline" onClick={() => setOpen(false)}>Annuler</Button>
                  <Button type="submit" disabled={isPending}>{isPending ? "…" : "Enregistrer"}</Button>
                </div>
              </form>
            </DialogContent>
          </Dialog>
        </div>
      </div>

      <div className="border border-border rounded-lg bg-card overflow-hidden">
        <Table>
          <TableHeader>
            <TableRow className="bg-muted/30 hover:bg-muted/30">
              <TableHead>Service</TableHead>
              <TableHead className="text-right">Prix standard</TableHead>
              <TableHead>Notes</TableHead>
              <TableHead>Statut</TableHead>
              <TableHead />
            </TableRow>
          </TableHeader>
          <TableBody>
            {services.length === 0 ? (
              <TableRow><TableCell colSpan={5} className="text-center py-12 text-muted-foreground">
                <Settings className="w-8 h-8 mx-auto mb-2 opacity-30" />Aucun service. Initialisez le catalogue par défaut.
              </TableCell></TableRow>
            ) : (
              services.map((s) => (
                <TableRow key={s.id} className={!s.actif ? "opacity-50" : ""}>
                  <TableCell className="font-medium text-sm">{s.nom}</TableCell>
                  <TableCell className="text-right text-sm font-semibold">{formatCurrency(s.prixStandard)}</TableCell>
                  <TableCell className="text-sm text-muted-foreground">{s.notes ?? "—"}</TableCell>
                  <TableCell>
                    <span className={`text-xs font-medium ${s.actif ? "text-emerald-600" : "text-muted-foreground"}`}>
                      {s.actif ? "Actif" : "Inactif"}
                    </span>
                  </TableCell>
                  <TableCell>
                    <div className="flex items-center gap-1 justify-end">
                      <button onClick={() => openEdit(s)} className="p-1.5 rounded hover:bg-muted transition-colors text-muted-foreground hover:text-foreground">
                        <Pencil className="w-3.5 h-3.5" />
                      </button>
                      <button onClick={() => handleToggle(s.id, s.actif)} className={`text-xs px-2 py-1 rounded border transition-colors ${s.actif ? "border-border text-muted-foreground hover:bg-muted" : "border-emerald-200 text-emerald-700 hover:bg-emerald-50"}`}>
                        {s.actif ? "Désactiver" : "Activer"}
                      </button>
                    </div>
                  </TableCell>
                </TableRow>
              ))
            )}
          </TableBody>
        </Table>
      </div>
    </div>
  )
}
