import { createClient } from "@/lib/supabase/server"
import { db } from "@/lib/db"
import { profiles } from "@/lib/db/schema"
import { eq } from "drizzle-orm"
import type { Role } from "./guard"

/**
 * Rôle du visiteur, pour adapter l'affichage d'une page serveur.
 * Échoue FERMÉ : en cas de doute on retombe sur le rôle le moins privilégié.
 * Ne remplace pas les gardes des actions — c'est du confort d'interface.
 */
export async function currentRole(): Promise<Role> {
  try {
    const supabase = await createClient()
    const {
      data: { user },
    } = await supabase.auth.getUser()
    if (!user) return "receptionniste"

    const profile = await db.query.profiles.findFirst({ where: eq(profiles.id, user.id) })
    return profile?.role ?? "receptionniste"
  } catch {
    return "receptionniste"
  }
}
