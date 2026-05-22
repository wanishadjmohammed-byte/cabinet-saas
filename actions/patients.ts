"use server"

import { db } from "@/lib/db"
import { patients, sequences, consultations, versements } from "@/lib/db/schema"
import { eq, desc, ilike, or } from "drizzle-orm"
import { revalidatePath } from "next/cache"
import { z } from "zod"

const patientSchema = z.object({
  nom: z.string().min(2, "Nom requis"),
  prenom: z.string().min(2, "Prénom requis"),
  telephone: z.string().min(8, "Téléphone requis"),
  dateNaissance: z.string().optional().nullable(),
  sexe: z.enum(["H", "F"]).optional().nullable(),
  pathologie: z.string().optional().nullable(),
  notesMedicales: z.string().optional().nullable(),
})

export type PatientFormData = z.infer<typeof patientSchema>

async function nextRef(prefix: string, seqName: string): Promise<string> {
  return db.transaction(async (tx) => {
    const existing = await tx.query.sequences.findFirst({ where: eq(sequences.name, seqName) })
    const val = (existing?.value ?? 0) + 1
    if (existing) {
      await tx.update(sequences).set({ value: val }).where(eq(sequences.name, seqName))
    } else {
      await tx.insert(sequences).values({ name: seqName, value: val })
    }
    return `${prefix}-${String(val).padStart(3, "0")}`
  })
}

export async function getPatients(search?: string) {
  try {
    return db.query.patients.findMany({
      where: search
        ? or(
            ilike(patients.nom, `%${search}%`),
            ilike(patients.prenom, `%${search}%`),
            ilike(patients.telephone, `%${search}%`)
          )
        : undefined,
      orderBy: desc(patients.createdAt),
    })
  } catch {
    return []
  }
}

export async function getPatientById(id: string) {
  return db.query.patients.findFirst({
    where: eq(patients.id, id),
    with: {
      consultations: { with: { service: true }, orderBy: desc(consultations.date) },
      versements: { orderBy: desc(versements.date) },
    },
  })
}

export async function getPatientsWithPayment() {
  try {
    const all = await db.query.patients.findMany({ orderBy: desc(patients.createdAt) })
    return Promise.all(
      all.map(async (p) => {
        const consults = await db.query.consultations.findMany({ where: eq(consultations.patientId, p.id) })
        const vers = await db.query.versements.findMany({ where: eq(versements.patientId, p.id) })
        const montantDuCalc = consults.reduce((s, c) => s + c.prixFinal, 0)
        const montantDu = p.montantDuCustom ?? montantDuCalc
        const totalVerse = vers.reduce((s, v) => s + v.montant, 0)
        const restant = montantDu - totalVerse
        const pct = montantDu > 0 ? Math.round((totalVerse / montantDu) * 100) : 0
        const statut =
          totalVerse >= montantDu && montantDu > 0 ? "paye" :
          totalVerse > 0 ? "partiel" : "impaye"
        return { ...p, montantDu, totalVerse, restant, pct, statut } as typeof p & {
          montantDu: number; totalVerse: number; restant: number; pct: number
          statut: "paye" | "partiel" | "impaye"
        }
      })
    )
  } catch {
    return []
  }
}

export async function createPatient(data: PatientFormData) {
  const v = patientSchema.parse(data)
  const ref = await nextRef("PAT", "patients")
  await db.insert(patients).values({
    ref,
    nom: v.nom.trim(),
    prenom: v.prenom.trim(),
    telephone: v.telephone.trim(),
    dateNaissance: v.dateNaissance || null,
    sexe: v.sexe || null,
    pathologie: v.pathologie || null,
    notesMedicales: v.notesMedicales || null,
  })
  revalidatePath("/patients")
  revalidatePath("/suivi-paiement")
  return { success: true }
}

export async function updatePatient(id: string, data: PatientFormData) {
  const v = patientSchema.parse(data)
  await db.update(patients).set({
    nom: v.nom.trim(),
    prenom: v.prenom.trim(),
    telephone: v.telephone.trim(),
    dateNaissance: v.dateNaissance || null,
    sexe: v.sexe || null,
    pathologie: v.pathologie || null,
    notesMedicales: v.notesMedicales || null,
  }).where(eq(patients.id, id))
  revalidatePath("/patients")
  revalidatePath(`/patients/${id}`)
  return { success: true }
}

export async function updateMontantDu(patientId: string, montant: number) {
  await db.update(patients).set({ montantDuCustom: montant }).where(eq(patients.id, patientId))
  revalidatePath("/suivi-paiement")
  return { success: true }
}
