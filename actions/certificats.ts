"use server"

import { db } from "@/lib/db"
import { certificats } from "@/lib/db/schema"
import { eq, desc } from "drizzle-orm"
import { nextRef } from "@/lib/db/nextRef"
import { requireUser, requireRole } from "@/lib/auth/guard"
import { revalidatePath } from "next/cache"
import { z } from "zod"

const certificatSchema = z
  .object({
    patientId: z.string().uuid("Patient requis"),
    date: z.string(),
    nature: z.enum(["arret", "prolongation", "reprise"]),
    nombreJours: z.number().int().min(1).optional().nullable(),
    dateDebut: z.string().optional().nullable(),
    dateFin: z.string().optional().nullable(),
    dateReprise: z.string().optional().nullable(),
    medecinId: z.string().uuid().optional().nullable(),
  })
  .superRefine((v, ctx) => {
    // Un arrêt sans bornes n'a aucune valeur légale : on refuse plutôt que
    // d'imprimer un certificat aux pointillés vides.
    if (v.nature === "reprise") {
      if (!v.dateReprise) {
        ctx.addIssue({ code: "custom", message: "Date de reprise requise", path: ["dateReprise"] })
      }
      return
    }
    if (!v.nombreJours) {
      ctx.addIssue({ code: "custom", message: "Nombre de jours requis", path: ["nombreJours"] })
    }
    if (!v.dateDebut) {
      ctx.addIssue({ code: "custom", message: "Date de début requise", path: ["dateDebut"] })
    }
    if (!v.dateFin) {
      ctx.addIssue({ code: "custom", message: "Date de fin requise", path: ["dateFin"] })
    }
    if (v.dateDebut && v.dateFin && v.dateFin < v.dateDebut) {
      ctx.addIssue({ code: "custom", message: "La fin précède le début", path: ["dateFin"] })
    }
  })

export type CertificatFormData = z.infer<typeof certificatSchema>

export async function getCertificats(limit = 100) {
  try {
    return db.query.certificats.findMany({
      with: { patient: true, medecin: true },
      orderBy: desc(certificats.createdAt),
      limit,
    })
  } catch {
    return []
  }
}

/** Enregistrement complet utilisé par la feuille imprimable. */
export async function getCertificatById(id: string) {
  await requireUser()
  return db.query.certificats.findFirst({
    where: eq(certificats.id, id),
    with: { patient: true, medecin: true },
  })
}

export async function createCertificat(data: CertificatFormData) {
  // Un arrêt de travail engage le médecin : réservé au corps médical.
  await requireRole(["medecin", "admin"])
  const v = certificatSchema.parse(data)
  const ref = await nextRef("CERT", "certificats")

  const estReprise = v.nature === "reprise"
  const [created] = await db
    .insert(certificats)
    .values({
      ref,
      date: v.date,
      patientId: v.patientId,
      nature: v.nature,
      nombreJours: estReprise ? null : v.nombreJours ?? null,
      dateDebut: estReprise ? null : v.dateDebut ?? null,
      dateFin: estReprise ? null : v.dateFin ?? null,
      dateReprise: estReprise ? v.dateReprise ?? null : null,
      medecinId: v.medecinId || null,
    })
    .returning({ id: certificats.id })

  revalidatePath("/certificats")
  return { success: true, id: created.id }
}

export async function updateCertificat(id: string, data: CertificatFormData) {
  await requireRole(["medecin", "admin"])
  const v = certificatSchema.parse(data)
  const estReprise = v.nature === "reprise"

  await db
    .update(certificats)
    .set({
      date: v.date,
      patientId: v.patientId,
      nature: v.nature,
      nombreJours: estReprise ? null : v.nombreJours ?? null,
      dateDebut: estReprise ? null : v.dateDebut ?? null,
      dateFin: estReprise ? null : v.dateFin ?? null,
      dateReprise: estReprise ? v.dateReprise ?? null : null,
      medecinId: v.medecinId || null,
    })
    .where(eq(certificats.id, id))

  revalidatePath("/certificats")
  return { success: true }
}

export async function deleteCertificat(id: string) {
  await requireRole(["admin"])
  await db.delete(certificats).where(eq(certificats.id, id))
  revalidatePath("/certificats")
  return { success: true }
}
