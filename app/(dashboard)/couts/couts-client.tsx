"use client"

import { useState, useTransition } from "react"
import { useRouter } from "next/navigation"
import { createCout, deleteCout, type CoutFormData } from "@/actions/couts"
import { Button } from "@/components/ui/button"
import { Input } from "@/components/ui/input"
import { Label } from "@/components/ui/label"
import { Select, SelectContent, SelectItem, SelectTrigger, SelectValue } from "@/components/ui/select"
import { Table, TableBody, TableCell, TableHead, TableHeader, TableRow } from "@/components/ui/table"
import { Card, CardContent, CardHeader, CardTitle } from "@/components/ui/card"
import { Badge } from "@/components/ui/badge"
import { formatCurrency, formatDate, today, CATEGORIES_COUT } from "@/lib/utils"
import { Trash2, TrendingDown } from "lucide-react"
import { toast } from "sonner"

type Cout = { id: string; date: string; categorie: string; description: string
  montant: number; nature: string; recurrence: string }

export function CoutsClient({ couts }: { couts: Cout[] }) {
  const router = useRouter()
  const [isPending, startTransition] = useTransition()
  const [form, setForm] = useState<CoutFormData>({
    date: today(), categorie: "autre", description: "", montant: 0, nature: "variable", recurrence: "ponctuel", notes: null,
  })

  const totalFixe = couts.filter((c) => c.nature === "fixe").reduce((s, c) => s + c.montant, 0)
  const totalVar = couts.filter((c) => c.nature === "variable").reduce((s, c) => s + c.montant, 0)

  function handleSubmit(e: React.FormEvent) {
    e.preventDefault()
    if (!form.description) { toast.error("Description requise"); return }
    startTransition(async () => {
      try {
        await createCout(form)
        toast.success("Coût enregistré")
        setForm({ date: today(), categorie: "autre", description: "", montant: 0, nature: "variable", recurrence: "ponctuel", notes: null })
        router.refresh()
      } catch (err: unknown) { toast.error(err instanceof Error ? err.message : "Erreur") }
    })
  }

  function handleDelete(id: string) {
    startTransition(async () => {
      await deleteCout(id)
      toast.success("Dépense supprimée")
      router.refresh()
    })
  }

  return (
    <div className="space-y-5">
      <div>
        <h1 className="text-lg font-semibold">Coûts & Dépenses</h1>
        <p className="text-sm text-muted-foreground">
          Fixes : <strong>{formatCurrency(totalFixe)}</strong> · Variables : <strong>{formatCurrency(totalVar)}</strong> · Total : <strong>{formatCurrency(totalFixe + totalVar)}</strong>
        </p>
      </div>

      <div className="grid grid-cols-1 lg:grid-cols-3 gap-4">
        <Card>
          <CardHeader><CardTitle>Nouvelle dépense</CardTitle></CardHeader>
          <CardContent>
            <form onSubmit={handleSubmit} className="space-y-3">
              <div className="space-y-1.5">
                <Label>Catégorie</Label>
                <Select value={form.categorie} onValueChange={(v) => setForm((f) => ({ ...f, categorie: v as CoutFormData["categorie"] }))}>
                  <SelectTrigger><SelectValue /></SelectTrigger>
                  <SelectContent>
                    {Object.entries(CATEGORIES_COUT).map(([k, v]) => <SelectItem key={k} value={k}>{v}</SelectItem>)}
                  </SelectContent>
                </Select>
              </div>
              <div className="space-y-1.5">
                <Label>Description *</Label>
                <Input value={form.description} onChange={(e) => setForm((f) => ({ ...f, description: e.target.value }))} required />
              </div>
              <div className="space-y-1.5">
                <Label>Montant (DA) *</Label>
                <Input type="number" min={1} value={form.montant || ""} onChange={(e) => setForm((f) => ({ ...f, montant: Number(e.target.value) }))} required />
              </div>
              <div className="grid grid-cols-2 gap-2">
                <div className="space-y-1.5">
                  <Label>Nature</Label>
                  <Select value={form.nature} onValueChange={(v) => setForm((f) => ({ ...f, nature: v as "fixe" | "variable" }))}>
                    <SelectTrigger><SelectValue /></SelectTrigger>
                    <SelectContent>
                      <SelectItem value="fixe">Fixe</SelectItem>
                      <SelectItem value="variable">Variable</SelectItem>
                    </SelectContent>
                  </Select>
                </div>
                <div className="space-y-1.5">
                  <Label>Récurrence</Label>
                  <Select value={form.recurrence} onValueChange={(v) => setForm((f) => ({ ...f, recurrence: v as "mensuel" | "ponctuel" }))}>
                    <SelectTrigger><SelectValue /></SelectTrigger>
                    <SelectContent>
                      <SelectItem value="ponctuel">Ponctuel</SelectItem>
                      <SelectItem value="mensuel">Mensuel</SelectItem>
                    </SelectContent>
                  </Select>
                </div>
              </div>
              <div className="space-y-1.5">
                <Label>Date</Label>
                <Input type="date" value={form.date} onChange={(e) => setForm((f) => ({ ...f, date: e.target.value }))} />
              </div>
              <Button type="submit" className="w-full" disabled={isPending}>{isPending ? "…" : "Enregistrer"}</Button>
            </form>
          </CardContent>
        </Card>

        <div className="lg:col-span-2">
          <div className="border border-border rounded-lg bg-card overflow-hidden">
            <Table>
              <TableHeader>
                <TableRow className="bg-muted/30 hover:bg-muted/30">
                  <TableHead>Date</TableHead><TableHead>Catégorie</TableHead>
                  <TableHead>Description</TableHead><TableHead>Nature</TableHead>
                  <TableHead className="text-right">Montant</TableHead><TableHead />
                </TableRow>
              </TableHeader>
              <TableBody>
                {couts.length === 0 ? (
                  <TableRow><TableCell colSpan={6} className="text-center py-12 text-muted-foreground">
                    <TrendingDown className="w-8 h-8 mx-auto mb-2 opacity-30" />Aucune dépense
                  </TableCell></TableRow>
                ) : (
                  couts.map((c) => (
                    <TableRow key={c.id}>
                      <TableCell className="text-sm">{formatDate(c.date)}</TableCell>
                      <TableCell><Badge variant="secondary" className="text-xs">{CATEGORIES_COUT[c.categorie] ?? c.categorie}</Badge></TableCell>
                      <TableCell className="text-sm">{c.description}</TableCell>
                      <TableCell><span className={`text-xs font-medium ${c.nature === "fixe" ? "text-blue-600" : "text-orange-600"}`}>{c.nature === "fixe" ? "Fixe" : "Variable"}</span></TableCell>
                      <TableCell className="text-right text-sm font-semibold">{formatCurrency(c.montant)}</TableCell>
                      <TableCell>
                        <button onClick={() => handleDelete(c.id)} className="text-muted-foreground hover:text-red-600 transition-colors p-1">
                          <Trash2 className="w-3.5 h-3.5" />
                        </button>
                      </TableCell>
                    </TableRow>
                  ))
                )}
              </TableBody>
            </Table>
          </div>
        </div>
      </div>
    </div>
  )
}
