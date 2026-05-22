"use server"

import { db } from "@/lib/db"
import { rendezVous, sequences } from "@/lib/db/schema"
import { eq, desc, gte, lte, and } from "drizzle-orm"
import { revalidatePath } from "next/cache"
import { z } from "zod"

const rdvSchema = z.object({
  date: z.string(),
  heure: z.string(),
  patientId: z.string().uuid().optional().nullable(),
  patientNomLibre: z.string().optional().nullable(),
  telephone: z.string().optional().nullable(),
  age: z.number().optional().nullable(),
  medecinId: z.string().uuid().optional().nullable(),
  statut: z.enum(["confirme", "effectue", "annule", "no_show"]).default("confirme"),
  notes: z.string().optional().nullable(),
})

export type RdvFormData = z.infer<typeof rdvSchema>

async function nextRef(): Promise<string> {
  return db.transaction(async (tx) => {
    const existing = await tx.query.sequences.findFirst({ where: eq(sequences.name, "rdv") })
    const val = (existing?.value ?? 0) + 1
    if (existing) {
      await tx.update(sequences).set({ value: val }).where(eq(sequences.name, "rdv"))
    } else {
      await tx.insert(sequences).values({ name: "rdv", value: val })
    }
    return `RDV-${String(val).padStart(3, "0")}`
  })
}

export async function getRdv(filter?: { from?: string; to?: string }) {
  try {
    const where =
      filter?.from && filter?.to
        ? and(gte(rendezVous.date, filter.from), lte(rendezVous.date, filter.to))
        : filter?.from
        ? gte(rendezVous.date, filter.from)
        : undefined

    return db.query.rendezVous.findMany({
      where,
      with: { patient: true, medecin: true },
      orderBy: [rendezVous.date, rendezVous.heure],
    })
  } catch {
    return []
  }
}

export async function createRdv(data: RdvFormData) {
  const v = rdvSchema.parse(data)
  const ref = await nextRef()
  await db.insert(rendezVous).values({
    ref,
    date: v.date,
    heure: v.heure,
    patientId: v.patientId || null,
    patientNomLibre: v.patientNomLibre || null,
    telephone: v.telephone || null,
    age: v.age || null,
    medecinId: v.medecinId || null,
    statut: v.statut,
    notes: v.notes || null,
  })
  revalidatePath("/rdv")
  return { success: true }
}

export async function updateRdvStatut(id: string, statut: "confirme" | "effectue" | "annule" | "no_show") {
  await db.update(rendezVous).set({ statut }).where(eq(rendezVous.id, id))
  revalidatePath("/rdv")
  return { success: true }
}
