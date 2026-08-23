"use server"

import { db } from "@/lib/db"
import { couts, versements } from "@/lib/db/schema"
import { eq, desc, gte, lte, and } from "drizzle-orm"
import { requireUser, requireRole } from "@/lib/auth/guard"
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
  await requireUser()
  const v = coutSchema.parse(data)
  await db.insert(couts).values({ ...v, notes: v.notes || null })
  revalidatePath("/couts")
  revalidatePath("/tresorerie")
  revalidatePath("/")
  return { success: true }
}

export async function deleteCout(id: string) {
  await requireRole(["admin"])
  await db.delete(couts).where(eq(couts.id, id))
  revalidatePath("/couts")
  revalidatePath("/tresorerie")
  return { success: true }
}

export type StatJour = {
  date: string
  encaisse: number
  depenses: number
  net: number
}

/**
 * Net encaissé jour par jour : versements du jour moins dépenses du jour.
 * La plage est filtrée en SQL, pas en mémoire — cette vue est consultée souvent.
 */
export async function getStatsJournalieres(filter?: {
  from?: string
  to?: string
}): Promise<StatJour[]> {
  try {
    const bornes = filter?.from && filter?.to
    const [tousVersements, toutesDepenses] = await Promise.all([
      db.query.versements.findMany({
        where: bornes
          ? and(gte(versements.date, filter!.from!), lte(versements.date, filter!.to!))
          : undefined,
      }),
      db.query.couts.findMany({
        where: bornes
          ? and(gte(couts.date, filter!.from!), lte(couts.date, filter!.to!))
          : undefined,
      }),
    ])

    const jours: Record<string, { encaisse: number; depenses: number }> = {}
    for (const v of tousVersements) {
      ;(jours[v.date] ??= { encaisse: 0, depenses: 0 }).encaisse += v.montant
    }
    for (const c of toutesDepenses) {
      ;(jours[c.date] ??= { encaisse: 0, depenses: 0 }).depenses += c.montant
    }

    return Object.entries(jours)
      .map(([date, d]) => ({ date, ...d, net: d.encaisse - d.depenses }))
      .sort((a, b) => b.date.localeCompare(a.date))
  } catch {
    return []
  }
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
