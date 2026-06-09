"use server"

import { db } from "@/lib/db"
import { rendezVous, sequences, patients } from "@/lib/db/schema"
import { eq, gte, lte, and, sql } from "drizzle-orm"
import { nextRef } from "@/lib/db/nextRef"
import { requireUser } from "@/lib/auth/guard"
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
  statut: z.enum(["confirme", "arrive", "en_consultation", "effectue", "annule", "no_show"]).default("confirme"),
  notes: z.string().optional().nullable(),
})

export type RdvFormData = z.infer<typeof rdvSchema>


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
  await requireUser()
  const v = rdvSchema.parse(data)
  const ref = await nextRef("RDV", "rdv")
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

export async function updateRdv(id: string, data: {
  heure: string; date: string
  patientNomLibre?: string | null; telephone?: string | null; notes?: string | null
}) {
  await requireUser()
  await db.update(rendezVous).set({
    heure: data.heure,
    date: data.date,
    patientNomLibre: data.patientNomLibre ?? null,
    telephone: data.telephone ?? null,
    notes: data.notes ?? null,
  }).where(eq(rendezVous.id, id))
  revalidatePath("/rdv")
  return { success: true }
}

export async function updateRdvStatut(id: string, statut: "confirme" | "arrive" | "en_consultation" | "effectue" | "annule" | "no_show") {
  await requireUser()
  await db.update(rendezVous).set({ statut }).where(eq(rendezVous.id, id))
  revalidatePath("/rdv")
  return { success: true }
}

export async function deleteRdv(id: string) {
  await requireUser()
  await db.delete(rendezVous).where(eq(rendezVous.id, id))
  revalidatePath("/rdv")
  return { success: true }
}

export async function createPatientAndLinkToRdv(
  rdvId: string,
  data: { nom: string; prenom: string; telephone: string; sexe?: "H" | "F" | null; dateNaissance?: string | null; pathologie?: string | null }
) {
  await requireUser()
  return db.transaction(async (tx) => {
    const [seq] = await tx
      .insert(sequences)
      .values({ name: "patients", value: 1 })
      .onConflictDoUpdate({
        target: sequences.name,
        set: { value: sql`${sequences.value} + 1` },
      })
      .returning({ value: sequences.value })
    const ref = `PAT-${String(seq.value).padStart(3, "0")}`

    const [newPatient] = await tx.insert(patients).values({
      ref,
      nom: data.nom.trim(),
      prenom: data.prenom.trim(),
      telephone: data.telephone.trim(),
      sexe: data.sexe ?? null,
      dateNaissance: data.dateNaissance ?? null,
      pathologie: data.pathologie ?? null,
    }).returning()

    await tx.update(rendezVous)
      .set({ patientId: newPatient.id, patientNomLibre: null, statut: "arrive" })
      .where(eq(rendezVous.id, rdvId))

    revalidatePath("/rdv")
    revalidatePath("/patients")
    return { success: true, patientId: newPatient.id }
  })
}
