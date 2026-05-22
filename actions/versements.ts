"use server"

import { db } from "@/lib/db"
import { versements, sequences } from "@/lib/db/schema"
import { eq, desc } from "drizzle-orm"
import { revalidatePath } from "next/cache"
import { z } from "zod"

const versementSchema = z.object({
  patientId: z.string().uuid("Patient requis"),
  montant: z.number().min(1, "Montant requis"),
  mode: z.enum(["baridi_mob", "especes"]),
  type: z.enum(["acompte", "versement", "solde", "total"]),
  date: z.string(),
  notes: z.string().optional().nullable(),
})

export type VersementFormData = z.infer<typeof versementSchema>

async function nextRef(): Promise<string> {
  return db.transaction(async (tx) => {
    const existing = await tx.query.sequences.findFirst({ where: eq(sequences.name, "versements") })
    const val = (existing?.value ?? 0) + 1
    if (existing) {
      await tx.update(sequences).set({ value: val }).where(eq(sequences.name, "versements"))
    } else {
      await tx.insert(sequences).values({ name: "versements", value: val })
    }
    return `V-${String(val).padStart(3, "0")}`
  })
}

export async function getVersements(limit = 100) {
  try {
    return db.query.versements.findMany({
      with: { patient: true },
      orderBy: desc(versements.createdAt),
      limit,
    })
  } catch {
    return []
  }
}

export async function createVersement(data: VersementFormData) {
  const v = versementSchema.parse(data)
  const ref = await nextRef()
  await db.insert(versements).values({ ref, ...v, notes: v.notes || null })
  revalidatePath("/versements")
  revalidatePath("/suivi-paiement")
  revalidatePath("/")
  return { success: true }
}

export async function updateVersement(
  id: string,
  data: { montant: number; mode: "baridi_mob" | "especes"; type: "acompte" | "versement" | "solde" | "total"; date: string; notes?: string | null }
) {
  await db.update(versements).set({
    montant: data.montant,
    mode: data.mode,
    type: data.type,
    date: data.date,
    notes: data.notes ?? null,
  }).where(eq(versements.id, id))
  revalidatePath("/versements")
  revalidatePath("/suivi-paiement")
  return { success: true }
}

export async function deleteVersement(id: string) {
  await db.delete(versements).where(eq(versements.id, id))
  revalidatePath("/versements")
  revalidatePath("/suivi-paiement")
  return { success: true }
}
