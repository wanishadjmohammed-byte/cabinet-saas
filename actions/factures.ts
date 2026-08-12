"use server"

import { db } from "@/lib/db"
import { factures, factureLignes } from "@/lib/db/schema"
import { eq, desc, asc } from "drizzle-orm"
import { nextFactureNumero } from "@/lib/db/nextRef"
import { requireUser, requireRole } from "@/lib/auth/guard"
import { revalidatePath } from "next/cache"
import { z } from "zod"

const ligneSchema = z.object({
  description: z.string().min(1, "Description requise"),
  montant: z.number().min(0, "Montant invalide"),
})

const factureSchema = z.object({
  date: z.string(),
  patientId: z.string().uuid().optional().nullable(),
  patientNom: z.string().min(2, "Nom du patient requis"),
  patientAge: z.string().optional().nullable(),
  patientSexe: z.string().optional().nullable(),
  typeIntervention: z.string().optional().nullable(),
  dateIntervention: z.string().optional().nullable(),
  tva: z.number().min(0).max(100),
  notes: z.string().optional().nullable(),
  lignes: z.array(ligneSchema).min(1, "Au moins une ligne est requise"),
})

export type FactureFormData = z.infer<typeof factureSchema>
export type FactureLigneInput = z.infer<typeof ligneSchema>

export async function getFactures(limit = 100) {
  try {
    return db.query.factures.findMany({
      with: { lignes: true },
      orderBy: desc(factures.createdAt),
      limit,
    })
  } catch {
    return []
  }
}

/** Full record used by the print view — throws if the caller isn't signed in. */
export async function getFactureById(id: string) {
  await requireUser()
  return db.query.factures.findFirst({
    where: eq(factures.id, id),
    with: { lignes: { orderBy: asc(factureLignes.ordre) } },
  })
}

export async function createFacture(data: FactureFormData) {
  await requireUser()
  const v = factureSchema.parse(data)
  const numero = await nextFactureNumero()

  const id = await db.transaction(async (tx) => {
    const [created] = await tx
      .insert(factures)
      .values({
        numero,
        date: v.date,
        patientId: v.patientId || null,
        patientNom: v.patientNom.trim(),
        patientAge: v.patientAge || null,
        patientSexe: v.patientSexe || null,
        typeIntervention: v.typeIntervention || null,
        dateIntervention: v.dateIntervention || null,
        tva: v.tva,
        notes: v.notes || null,
      })
      .returning({ id: factures.id })

    await tx.insert(factureLignes).values(
      v.lignes.map((l, i) => ({
        factureId: created.id,
        description: l.description.trim(),
        montant: l.montant,
        ordre: i,
      }))
    )

    return created.id
  })

  revalidatePath("/factures")
  return { success: true, id, numero }
}

export async function updateFacture(id: string, data: FactureFormData) {
  await requireUser()
  const v = factureSchema.parse(data)

  await db.transaction(async (tx) => {
    await tx
      .update(factures)
      .set({
        date: v.date,
        patientId: v.patientId || null,
        patientNom: v.patientNom.trim(),
        patientAge: v.patientAge || null,
        patientSexe: v.patientSexe || null,
        typeIntervention: v.typeIntervention || null,
        dateIntervention: v.dateIntervention || null,
        tva: v.tva,
        notes: v.notes || null,
      })
      .where(eq(factures.id, id))

    // Lines are replaced wholesale — simpler than diffing, and a facture is small.
    await tx.delete(factureLignes).where(eq(factureLignes.factureId, id))
    await tx.insert(factureLignes).values(
      v.lignes.map((l, i) => ({
        factureId: id,
        description: l.description.trim(),
        montant: l.montant,
        ordre: i,
      }))
    )
  })

  revalidatePath("/factures")
  return { success: true }
}

export async function deleteFacture(id: string) {
  await requireRole(["admin"])
  await db.delete(factures).where(eq(factures.id, id))
  revalidatePath("/factures")
  return { success: true }
}
