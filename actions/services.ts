"use server"

import { db } from "@/lib/db"
import { services } from "@/lib/db/schema"
import { eq, asc } from "drizzle-orm"
import { revalidatePath } from "next/cache"
import { z } from "zod"

const serviceSchema = z.object({
  nom: z.string().min(2, "Nom requis"),
  prixStandard: z.number().min(0, "Prix invalide"),
  notes: z.string().optional().nullable(),
})

export type ServiceFormData = z.infer<typeof serviceSchema>

export async function getServices() {
  try {
    return db.query.services.findMany({ orderBy: asc(services.nom) })
  } catch {
    return []
  }
}

export async function getActiveServices() {
  try {
    return db.query.services.findMany({ where: eq(services.actif, true), orderBy: asc(services.nom) })
  } catch {
    return []
  }
}

export async function createService(data: ServiceFormData) {
  const v = serviceSchema.parse(data)
  await db.insert(services).values({ nom: v.nom.trim(), prixStandard: v.prixStandard, notes: v.notes || null })
  revalidatePath("/services")
  return { success: true }
}

export async function updateService(id: string, data: ServiceFormData) {
  const v = serviceSchema.parse(data)
  await db.update(services).set({ nom: v.nom.trim(), prixStandard: v.prixStandard, notes: v.notes || null }).where(eq(services.id, id))
  revalidatePath("/services")
  return { success: true }
}

export async function toggleService(id: string, actif: boolean) {
  await db.update(services).set({ actif }).where(eq(services.id, id))
  revalidatePath("/services")
  return { success: true }
}

export async function seedServices() {
  const defaults = [
    { nom: "Consultation", prixStandard: 2000 },
    { nom: "Consultation + Écho", prixStandard: 3000 },
    { nom: "Consultation + PRP", prixStandard: 15000 },
    { nom: "Consultation + Mésothérapie", prixStandard: 4000 },
    { nom: "Consultation + Méso + Infiltration", prixStandard: 5000 },
    { nom: "Consultation + Infiltration", prixStandard: 4000 },
    { nom: "Solumidrole injection patient", prixStandard: 500 },
    { nom: "Solumidrole injection cabinet", prixStandard: 1000 },
    { nom: "Heyal One", prixStandard: 24000 },
    { nom: "Plâtre simple", prixStandard: 6000 },
    { nom: "Plâtre complexe", prixStandard: 12000 },
    { nom: "Ablation de fil", prixStandard: 2000 },
    { nom: "Autre", prixStandard: 0 },
  ]
  for (const s of defaults) {
    await db.insert(services).values(s).onConflictDoNothing()
  }
  revalidatePath("/services")
  return { success: true }
}
