"use server"

import { db } from "@/lib/db"
import { consultations, patients, versements, couts, rendezVous } from "@/lib/db/schema"
import { eq, desc } from "drizzle-orm"
import { nextRef } from "@/lib/db/nextRef"
import { requireUser, requireRole, canEditMedical } from "@/lib/auth/guard"
import { revalidatePath } from "next/cache"
import { z } from "zod"

const consultationSchema = z.object({
  patientId: z.string().uuid("Patient requis"),
  serviceId: z.string().uuid().optional().nullable(),
  prixStandard: z.number().min(0),
  prixFinal: z.number().min(0, "Prix invalide"),
  medecinId: z.string().uuid().optional().nullable(),
  date: z.string(),
  rdvId: z.string().uuid().optional().nullable(),
  diagnostic: z.string().optional().nullable(),
  ordonnance: z.string().optional().nullable(),
  notesMedicales: z.string().optional().nullable(),
})

export type ConsultationFormData = z.infer<typeof consultationSchema>


export async function deleteConsultation(id: string) {
  await requireRole(["admin"])
  await db.delete(consultations).where(eq(consultations.id, id))
  revalidatePath("/consultations")
  revalidatePath("/")
  return { success: true }
}

export async function getConsultationByRdvId(rdvId: string) {
  try {
    await requireUser()
    return db.query.consultations.findFirst({
      where: eq(consultations.rdvId, rdvId),
      with: { service: true },
    })
  } catch {
    return null
  }
}

export async function getConsultations(limit = 50) {
  try {
    return db.query.consultations.findMany({
      with: { patient: true, service: true, medecin: true },
      orderBy: desc(consultations.createdAt),
      limit,
    })
  } catch {
    return []
  }
}

export async function updateConsultation(
  id: string,
  data: { date: string; prixFinal: number; diagnostic?: string | null; ordonnance?: string | null; notesMedicales?: string | null }
) {
  // Editing a consultation touches medical records (diagnostic/ordonnance/notes).
  await requireRole(["medecin", "admin"])
  await db.update(consultations).set({
    date: data.date,
    prixFinal: data.prixFinal,
    diagnostic: data.diagnostic ?? null,
    ordonnance: data.ordonnance ?? null,
    notesMedicales: data.notesMedicales ?? null,
  }).where(eq(consultations.id, id))
  revalidatePath("/consultations")
  return { success: true }
}

export async function createConsultation(data: ConsultationFormData) {
  // Reception may create the billing record; only doctors/admin may attach medical data.
  const me = await requireUser()
  const medOk = canEditMedical(me.role)
  const v = consultationSchema.parse(data)
  const ref = await nextRef("C", "consultations")
  await db.insert(consultations).values({
    ref,
    patientId: v.patientId,
    serviceId: v.serviceId || null,
    prixStandard: v.prixStandard,
    prixFinal: v.prixFinal,
    medecinId: v.medecinId || null,
    date: v.date,
    rdvId: v.rdvId || null,
    diagnostic: medOk ? (v.diagnostic || null) : null,
    ordonnance: medOk ? (v.ordonnance || null) : null,
    notesMedicales: medOk ? (v.notesMedicales || null) : null,
  })
  revalidatePath("/consultations")
  revalidatePath("/suivi-paiement")
  revalidatePath("/")
  return { success: true }
}

export async function getDashboardStats() {
  try {
    const today = new Date().toISOString().split("T")[0]
    const allConsults = await db.query.consultations.findMany()
    const allVers = await db.query.versements.findMany()
    const allCouts = await db.query.couts.findMany()
    const allPatients = await db.query.patients.findMany()
    const allRdv = await db.query.rendezVous.findMany()

    const caJour = allVers
      .filter((v) => v.date === today)
      .reduce((s, v) => s + v.montant, 0)
    const caTotal = allVers.reduce((s, v) => s + v.montant, 0)
    const depenses = allCouts.reduce((s, c) => s + c.montant, 0)
    const benefice = caTotal - depenses
    const consultationsJour = allConsults.filter((c) => c.date === today).length
    const rdvEffectues = allRdv.filter((r) => r.statut === "effectue").length

    const paye = { count: 0, montant: 0 }
    const partiel = { count: 0, montant: 0 }
    const impaye = { count: 0, montant: 0 }

    for (const patient of allPatients) {
      const pc = allConsults.filter((c) => c.patientId === patient.id)
      const pv = allVers.filter((v) => v.patientId === patient.id)
      const montantDu = patient.montantDuCustom ?? pc.reduce((s, c) => s + c.prixFinal, 0)
      const totalVerse = pv.reduce((s, v) => s + v.montant, 0)
      if (montantDu === 0) continue
      if (totalVerse >= montantDu) { paye.count++; paye.montant += montantDu }
      else if (totalVerse > 0) { partiel.count++; partiel.montant += totalVerse }
      else { impaye.count++; impaye.montant += montantDu }
    }

    // Top services
    const allServices = await db.query.services.findMany()
    const serviceMap = Object.fromEntries(allServices.map((s) => [s.id, s.nom]))
    const serviceCounts: Record<string, { nom: string; count: number; ca: number }> = {}
    for (const c of allConsults) {
      if (!c.serviceId) continue
      if (!serviceCounts[c.serviceId]) {
        serviceCounts[c.serviceId] = { nom: serviceMap[c.serviceId] ?? "—", count: 0, ca: 0 }
      }
      serviceCounts[c.serviceId].count++
      serviceCounts[c.serviceId].ca += c.prixFinal
    }
    const topServices = Object.values(serviceCounts)
      .sort((a, b) => b.ca - a.ca)
      .slice(0, 5)

    return {
      caJour, caTotal, depenses, benefice,
      consultationsJour, patients: allPatients.length, rdvEffectues,
      tresorerie: caTotal - depenses,
      paye, partiel, impaye,
      topServices,
    }
  } catch {
    return null
  }
}
