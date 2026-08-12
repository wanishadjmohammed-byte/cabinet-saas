"use server"

import { db } from "@/lib/db"
import { comptesRendus } from "@/lib/db/schema"
import { eq, desc } from "drizzle-orm"
import { nextRef } from "@/lib/db/nextRef"
import { requireUser, requireRole } from "@/lib/auth/guard"
import { revalidatePath } from "next/cache"
import { z } from "zod"

const compteRenduSchema = z.object({
  patientId: z.string().uuid("Patient requis"),
  date: z.string(),
  type: z.string().min(2, "Type requis"),
  motif: z.string().optional().nullable(),
  contenu: z.string().min(10, "Le contenu du compte rendu est requis"),
  medecinId: z.string().uuid().optional().nullable(),
  consultationId: z.string().uuid().optional().nullable(),
})

export type CompteRenduFormData = z.infer<typeof compteRenduSchema>

export async function getComptesRendus(limit = 100) {
  try {
    return db.query.comptesRendus.findMany({
      with: { patient: true, medecin: true },
      orderBy: desc(comptesRendus.createdAt),
      limit,
    })
  } catch {
    return []
  }
}

/** Full record used by the print view — throws if the caller isn't signed in. */
export async function getCompteRenduById(id: string) {
  await requireUser()
  return db.query.comptesRendus.findFirst({
    where: eq(comptesRendus.id, id),
    with: { patient: true, medecin: true },
  })
}

export async function createCompteRendu(data: CompteRenduFormData) {
  // A medical report is a medical record — doctors and admin only.
  await requireRole(["medecin", "admin"])
  const v = compteRenduSchema.parse(data)
  const ref = await nextRef("CR", "comptes_rendus")
  const [created] = await db
    .insert(comptesRendus)
    .values({
      ref,
      patientId: v.patientId,
      date: v.date,
      type: v.type.trim().toUpperCase(),
      motif: v.motif || null,
      contenu: v.contenu,
      medecinId: v.medecinId || null,
      consultationId: v.consultationId || null,
    })
    .returning({ id: comptesRendus.id })

  revalidatePath("/comptes-rendus")
  return { success: true, id: created.id }
}

export async function updateCompteRendu(id: string, data: CompteRenduFormData) {
  await requireRole(["medecin", "admin"])
  const v = compteRenduSchema.parse(data)
  await db
    .update(comptesRendus)
    .set({
      patientId: v.patientId,
      date: v.date,
      type: v.type.trim().toUpperCase(),
      motif: v.motif || null,
      contenu: v.contenu,
      medecinId: v.medecinId || null,
    })
    .where(eq(comptesRendus.id, id))

  revalidatePath("/comptes-rendus")
  return { success: true }
}

export async function deleteCompteRendu(id: string) {
  await requireRole(["admin"])
  await db.delete(comptesRendus).where(eq(comptesRendus.id, id))
  revalidatePath("/comptes-rendus")
  return { success: true }
}
