"use client"

import { useState, useEffect } from "react"
import { usePathname } from "next/navigation"
import Image from "next/image"
import { Menu } from "lucide-react"
import { Sidebar } from "./sidebar"

type Role = "receptionniste" | "medecin" | "admin"

export function DashboardShell({
  role,
  userName,
  children,
}: {
  role: Role
  userName: string
  children: React.ReactNode
}) {
  const [open, setOpen] = useState(false)
  const pathname = usePathname()

  // Close the drawer whenever the route changes (covers back/forward too).
  useEffect(() => {
    setOpen(false)
  }, [pathname])

  return (
    <div className="flex h-screen overflow-hidden">
      <Sidebar
        role={role}
        userName={userName}
        mobileOpen={open}
        onNavigate={() => setOpen(false)}
      />

      {/* Backdrop — mobile only, behind the drawer (z-50) but above content. */}
      {open && (
        <div
          className="fixed inset-0 z-40 bg-black/50 md:hidden"
          aria-hidden="true"
          onClick={() => setOpen(false)}
        />
      )}

      <div className="flex flex-1 flex-col overflow-hidden md:ml-56">
        {/* Mobile top bar with hamburger — hidden on md+ where the sidebar is always shown. */}
        <header className="flex h-14 shrink-0 items-center gap-3 border-b bg-background px-4 md:hidden">
          <button
            type="button"
            onClick={() => setOpen(true)}
            aria-label="Ouvrir le menu"
            className="flex h-9 w-9 items-center justify-center rounded-md text-foreground hover:bg-muted"
          >
            <Menu className="h-5 w-5" />
          </button>
          <Image src="/logo.png" alt="" width={28} height={28} className="rounded-full" />
          <span className="text-sm font-semibold">Dr. Ounnas</span>
        </header>

        <main className="flex-1 overflow-y-auto bg-background">
          <div className="min-h-full max-w-[1200px] p-4 md:p-6">{children}</div>
        </main>
      </div>
    </div>
  )
}
