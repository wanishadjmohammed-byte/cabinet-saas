export const dynamic = "force-dynamic"

import { redirect } from "next/navigation"
import { createClient } from "@/lib/supabase/server"
import { db } from "@/lib/db"
import { profiles } from "@/lib/db/schema"
import { eq } from "drizzle-orm"
import { Sidebar } from "@/components/layout/sidebar"
import { Toaster } from "@/components/ui/sonner"

export default async function DashboardLayout({ children }: { children: React.ReactNode }) {
  const supabase = await createClient()
  const { data: { user } } = await supabase.auth.getUser()

  if (!user) redirect("/login")

  let role: "receptionniste" | "medecin" | "admin" = "admin"
  let userName = user.email?.split("@")[0] ?? "Utilisateur"

  try {
    const profile = await db.query.profiles.findFirst({ where: eq(profiles.id, user.id) })
    if (profile) {
      role = profile.role
      userName = `${profile.prenom} ${profile.nom}`
    }
  } catch {
    // DB not yet configured — fall through with defaults
  }

  return (
    <div className="flex h-screen overflow-hidden">
      <Sidebar role={role} userName={userName} />
      <main className="flex-1 ml-56 overflow-y-auto bg-background">
        <div className="min-h-full p-6 max-w-[1200px]">{children}</div>
      </main>
      <Toaster position="top-right" richColors />
    </div>
  )
}
