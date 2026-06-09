export const dynamic = "force-dynamic"

import { redirect } from "next/navigation"
import { createClient } from "@/lib/supabase/server"
import { db } from "@/lib/db"
import { profiles } from "@/lib/db/schema"
import { eq } from "drizzle-orm"
import { DashboardShell } from "@/components/layout/dashboard-shell"
import { Toaster } from "@/components/ui/sonner"

export default async function DashboardLayout({ children }: { children: React.ReactNode }) {
  const supabase = await createClient()
  const { data: { user } } = await supabase.auth.getUser()

  if (!user) redirect("/login")

  // Fail CLOSED: default to the least-privileged role if the profile can't be read.
  let role: "receptionniste" | "medecin" | "admin" = "receptionniste"
  let userName = user.email?.split("@")[0] ?? "Utilisateur"

  try {
    const profile = await db.query.profiles.findFirst({ where: eq(profiles.id, user.id) })
    if (profile) {
      role = profile.role
      userName = `${profile.prenom} ${profile.nom}`
    }
  } catch {
    // DB not yet configured — stay on least-privileged default
  }

  return (
    <>
      <DashboardShell role={role} userName={userName}>
        {children}
      </DashboardShell>
      <Toaster position="top-right" richColors />
    </>
  )
}
