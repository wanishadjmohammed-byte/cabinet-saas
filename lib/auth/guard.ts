import { createClient } from "@/lib/supabase/server"
import { db } from "@/lib/db"
import { profiles } from "@/lib/db/schema"
import { eq } from "drizzle-orm"

export type Role = "receptionniste" | "medecin" | "admin"

export class AuthError extends Error {
  constructor(message: string) {
    super(message)
    this.name = "AuthError"
  }
}

/**
 * Ensures the caller is authenticated and returns their profile (with role).
 * Fails CLOSED: any missing user / missing profile throws.
 */
export async function requireUser() {
  const supabase = await createClient()
  const {
    data: { user },
  } = await supabase.auth.getUser()
  if (!user) throw new AuthError("Non authentifié")

  const profile = await db.query.profiles.findFirst({
    where: eq(profiles.id, user.id),
  })
  if (!profile) throw new AuthError("Profil introuvable")

  return { id: user.id, role: profile.role as Role, profile }
}

/**
 * Ensures the caller is authenticated AND holds one of the allowed roles.
 */
export async function requireRole(allowed: Role[]) {
  const me = await requireUser()
  if (!allowed.includes(me.role)) {
    throw new AuthError("Accès refusé")
  }
  return me
}

/** True if the role may read/write medical records. */
export function canEditMedical(role: Role) {
  return role === "medecin" || role === "admin"
}
