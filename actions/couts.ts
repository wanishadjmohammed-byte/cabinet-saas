"use server"

import { db } from "@/lib/db"
import { couts } from "@/lib/db/schema"
import { eq, desc, gte, lte, and } from "drizzle-orm"
import { revalidatePath } from "next/cache"
import { z } from "zod"

const coutSchema = z.object({
  date: z.string(),
  categorie: z.enum([
    "salaires", "livraison", "charges", "materiel_medical",
    "medicaments_injections", "fournitures", "entretien",
    "assurance", "impots", "marketing", "autre",
  ]),
  description: z.string().min(2, "Description requise"),
  montant: z.number().min(1, "Montant requis"),
  nature: z.enum(["fixe", "variable"]),
  recurrence: z.enum(["mensuel", "ponctuel"]),
  notes: z.string().optional().nullable(),
})

export type CoutFormData = z.infer<typeof coutSchema>

export async function getCouts(filter?: { from?: string; to?: string }) {
  try {
    const where =
      filter?.from && filter?.to
        ? and(gte(couts.date, filter.from), lte(couts.date, filter.to))
        : undefined

    return db.query.couts.findMany({
      where,
      orderBy: desc(couts.date),
    })
  } catch {
    return []
  }
}

export async function createCout(data: CoutFormData) {
  const v = coutSchema.parse(data)
  await db.insert(couts).values({ ...v, notes: v.notes || null })
  revalidatePath("/couts")
  revalidatePath("/tresorerie")
  revalidatePath("/")
  return { success: true }
}

export async function deleteCout(id: string) {
  await db.delete(couts).where(eq(couts.id, id))
  revalidatePath("/couts")
  revalidatePath("/tresorerie")
  return { success: true }
}

export async function getTresorerie() {
  try {
    const allVers = await db.query.versements.findMany()
    const allCouts = await db.query.couts.findMany()

    // Group by year-month
    const months: Record<string, { entrees: number; fixes: number; variables: number }> = {}

    for (const v of allVers) {
      const key = v.date.slice(0, 7)
      if (!months[key]) months[key] = { entrees: 0, fixes: 0, variables: 0 }
      months[key].entrees += v.montant
    }
    for (const c of allCouts) {
      const key = c.date.slice(0, 7)
      if (!months[key]) months[key] = { entrees: 0, fixes: 0, variables: 0 }
      if (c.nature === "fixe") months[key].fixes += c.montant
      else months[key].variables += c.montant
    }

    const sorted = Object.entries(months).sort(([a], [b]) => a.localeCompare(b))
    let soldeCumule = 0
    return sorted.map(([mois, data]) => {
      const totalSorties = data.fixes + data.variables
      const soldeMois = data.entrees - totalSorties
      soldeCumule += soldeMois
      return { mois, ...data, totalSorties, soldeMois, soldeCumule }
    })
  } catch {
    return []
  }
}
