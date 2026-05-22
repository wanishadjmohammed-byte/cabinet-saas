"use client"

import { useState } from "react"
import { Badge } from "@/components/ui/badge"
import { Input } from "@/components/ui/input"
import { Table, TableBody, TableCell, TableHead, TableHeader, TableRow } from "@/components/ui/table"
import { Select, SelectContent, SelectItem, SelectTrigger, SelectValue } from "@/components/ui/select"
import { formatCurrency } from "@/lib/utils"
import { Search, ClipboardList } from "lucide-react"

type PatientRow = {
  id: string; prenom: string; nom: string; telephone: string
  montantDu: number; totalVerse: number; restant: number; pct: number
  statut: "paye" | "partiel" | "impaye"
}

const STATUT_LABELS = { paye: "Payé", partiel: "Partiel", impaye: "Impayé" }

export function SuiviClient({ patients }: { patients: PatientRow[] }) {
  const [search, setSearch] = useState("")
  const [filter, setFilter] = useState("all")

  const filtered = patients.filter((p) => {
    const q = search.toLowerCase()
    const matchSearch = p.nom.toLowerCase().includes(q) || p.prenom.toLowerCase().includes(q) || p.telephone.includes(q)
    const matchFilter = filter === "all" || p.statut === filter
    return matchSearch && matchFilter && p.montantDu > 0
  })

  const totals = filtered.reduce((acc, p) => ({
    du: acc.du + p.montantDu,
    verse: acc.verse + p.totalVerse,
    restant: acc.restant + p.restant,
  }), { du: 0, verse: 0, restant: 0 })

  return (
    <div className="space-y-5">
      <div>
        <h1 className="text-lg font-semibold">Suivi des paiements</h1>
        <p className="text-sm text-muted-foreground">{filtered.length} patient{filtered.length !== 1 ? "s" : ""}</p>
      </div>

      {/* Summary bands */}
      <div className="grid grid-cols-3 gap-3">
        {[
          { label: "Total dû", value: totals.du, color: "text-foreground" },
          { label: "Total versé", value: totals.verse, color: "text-emerald-600" },
          { label: "Restant", value: totals.restant, color: "text-red-600" },
        ].map(({ label, value, color }) => (
          <div key={label} className="border border-border rounded-lg bg-card px-4 py-3">
            <p className="text-xs text-muted-foreground">{label}</p>
            <p className={`text-xl font-bold mt-0.5 ${color}`}>{formatCurrency(value)}</p>
          </div>
        ))}
      </div>

      {/* Filters */}
      <div className="flex gap-3">
        <div className="relative flex-1 max-w-sm">
          <Search className="absolute left-3 top-1/2 -translate-y-1/2 w-4 h-4 text-muted-foreground" />
          <Input placeholder="Rechercher un patient…" className="pl-9" value={search} onChange={(e) => setSearch(e.target.value)} />
        </div>
        <Select value={filter} onValueChange={setFilter}>
          <SelectTrigger className="w-36"><SelectValue /></SelectTrigger>
          <SelectContent>
            <SelectItem value="all">Tous</SelectItem>
            <SelectItem value="impaye">Impayés</SelectItem>
            <SelectItem value="partiel">Partiels</SelectItem>
            <SelectItem value="paye">Payés</SelectItem>
          </SelectContent>
        </Select>
      </div>

      <div className="border border-border rounded-lg bg-card overflow-hidden">
        <Table>
          <TableHeader>
            <TableRow className="bg-muted/30 hover:bg-muted/30">
              <TableHead>Patient</TableHead><TableHead>Téléphone</TableHead>
              <TableHead className="text-right">Dû (DA)</TableHead>
              <TableHead className="text-right">Versé (DA)</TableHead>
              <TableHead className="text-right">Restant</TableHead>
              <TableHead className="text-right">%</TableHead>
              <TableHead>Statut</TableHead>
            </TableRow>
          </TableHeader>
          <TableBody>
            {filtered.length === 0 ? (
              <TableRow><TableCell colSpan={7} className="text-center py-12 text-muted-foreground">
                <ClipboardList className="w-8 h-8 mx-auto mb-2 opacity-30" />Aucun résultat
              </TableCell></TableRow>
            ) : (
              filtered.map((p) => (
                <TableRow key={p.id}>
                  <TableCell className="font-medium text-sm">{p.prenom} {p.nom}</TableCell>
                  <TableCell className="text-sm text-muted-foreground">{p.telephone}</TableCell>
                  <TableCell className="text-right text-sm font-medium">{formatCurrency(p.montantDu)}</TableCell>
                  <TableCell className="text-right text-sm text-emerald-600 font-medium">{formatCurrency(p.totalVerse)}</TableCell>
                  <TableCell className={`text-right text-sm font-semibold ${p.restant > 0 ? "text-red-600" : "text-emerald-600"}`}>
                    {formatCurrency(p.restant)}
                  </TableCell>
                  <TableCell className="text-right">
                    <div className="flex items-center justify-end gap-1.5">
                      <div className="w-16 h-1.5 rounded-full bg-muted overflow-hidden">
                        <div className="h-full rounded-full bg-emerald-500" style={{ width: `${Math.min(p.pct, 100)}%` }} />
                      </div>
                      <span className="text-xs text-muted-foreground">{p.pct}%</span>
                    </div>
                  </TableCell>
                  <TableCell><Badge variant={p.statut}>{STATUT_LABELS[p.statut]}</Badge></TableCell>
                </TableRow>
              ))
            )}
          </TableBody>
        </Table>
      </div>
    </div>
  )
}
