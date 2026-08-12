export const dynamic = "force-dynamic"

import "./print.css"
import { redirect } from "next/navigation"
import { createClient } from "@/lib/supabase/server"
import { Toaster } from "@/components/ui/sonner"

/**
 * Documents imprimables : aucune chrome d'application (ni sidebar ni en-tête),
 * la page n'est que la feuille de papier.
 */
export default async function PrintLayout({ children }: { children: React.ReactNode }) {
  const supabase = await createClient()
  const {
    data: { user },
  } = await supabase.auth.getUser()

  if (!user) redirect("/login")

  return (
    <>
      <div className="print-root">{children}</div>
      <Toaster position="top-right" richColors />
    </>
  )
}
