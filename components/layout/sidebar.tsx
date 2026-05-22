"use client"

import Link from "next/link"
import { usePathname } from "next/navigation"
import {
  LayoutDashboard,
  CalendarDays,
  Users,
  Stethoscope,
  CreditCard,
  ClipboardList,
  TrendingDown,
  BarChart3,
  Settings,
  LogOut,
  ChevronRight,
} from "lucide-react"
import Image from "next/image"
import { cn } from "@/lib/utils"
import { createClient } from "@/lib/supabase/client"
import { useRouter } from "next/navigation"

type Role = "receptionniste" | "medecin" | "admin"

interface NavItem {
  label: string
  href: string
  icon: React.ElementType
  roles: Role[]
}

interface NavSection {
  title: string
  items: NavItem[]
}

const navigation: NavSection[] = [
  {
    title: "Général",
    items: [
      {
        label: "Tableau de bord",
        href: "/",
        icon: LayoutDashboard,
        roles: ["admin"],
      },
      {
        label: "Rendez-vous",
        href: "/rdv",
        icon: CalendarDays,
        roles: ["receptionniste", "medecin", "admin"],
      },
    ],
  },
  {
    title: "Médical",
    items: [
      {
        label: "Patients",
        href: "/patients",
        icon: Users,
        roles: ["receptionniste", "medecin", "admin"],
      },
      {
        label: "Consultations",
        href: "/consultations",
        icon: Stethoscope,
        roles: ["medecin", "admin"],
      },
    ],
  },
  {
    title: "Facturation",
    items: [
      {
        label: "Versements",
        href: "/versements",
        icon: CreditCard,
        roles: ["receptionniste", "medecin", "admin"],
      },
      {
        label: "Suivi paiement",
        href: "/suivi-paiement",
        icon: ClipboardList,
        roles: ["receptionniste", "medecin", "admin"],
      },
    ],
  },
  {
    title: "Finance",
    items: [
      {
        label: "Coûts",
        href: "/couts",
        icon: TrendingDown,
        roles: ["admin"],
      },
      {
        label: "Trésorerie",
        href: "/tresorerie",
        icon: BarChart3,
        roles: ["admin"],
      },
    ],
  },
  {
    title: "Paramètres",
    items: [
      {
        label: "Services",
        href: "/services",
        icon: Settings,
        roles: ["admin"],
      },
    ],
  },
]

const ROLE_LABELS: Record<Role, string> = {
  receptionniste: "Réceptionniste",
  medecin: "Médecin",
  admin: "Admin",
}

interface SidebarProps {
  role: Role
  userName: string
}

export function Sidebar({ role, userName }: SidebarProps) {
  const pathname = usePathname()
  const router = useRouter()
  const supabase = createClient()

  async function handleSignOut() {
    await supabase.auth.signOut()
    router.push("/login")
    router.refresh()
  }

  const initials = userName
    .split(" ")
    .map((n) => n[0])
    .join("")
    .toUpperCase()
    .slice(0, 2)

  return (
    <aside
      className="fixed inset-y-0 left-0 z-40 flex w-56 flex-col"
      style={{ background: "#111111" }}
    >
      {/* Logo */}
      <div
        className="flex h-14 items-center gap-2.5 px-4 border-b"
        style={{ borderColor: "#1E1E1E" }}
      >
        <Image src="/logo.png" alt="Logo Dr. Ounnas" width={32} height={32} className="rounded-full shrink-0" />
        <div className="min-w-0">
          <p className="text-white text-xs font-semibold truncate leading-none">
            Dr. Ounnas
          </p>
          <p className="text-xs truncate leading-none mt-0.5" style={{ color: "#666666" }}>
            Cabinet médical
          </p>
        </div>
      </div>

      {/* Navigation */}
      <nav className="flex-1 overflow-y-auto py-4 scrollbar-thin px-2">
        {navigation.map((section) => {
          const visibleItems = section.items.filter((item) =>
            item.roles.includes(role)
          )
          if (visibleItems.length === 0) return null

          return (
            <div key={section.title} className="mb-5">
              <p
                className="px-2 mb-1.5 text-[10px] font-semibold uppercase tracking-widest"
                style={{ color: "#444444" }}
              >
                {section.title}
              </p>
              <div className="space-y-0.5">
                {visibleItems.map((item) => {
                  const isActive =
                    item.href === "/"
                      ? pathname === "/"
                      : pathname.startsWith(item.href)
                  const Icon = item.icon

                  return (
                    <Link
                      key={item.href}
                      href={item.href}
                      className={cn(
                        "flex items-center gap-2.5 px-2 py-2 rounded-md text-xs font-medium transition-colors group",
                        isActive
                          ? "text-white"
                          : "text-[#888888] hover:text-[#CCCCCC]"
                      )}
                      style={
                        isActive
                          ? { background: "rgba(255,255,255,0.08)" }
                          : {}
                      }
                    >
                      <Icon
                        className={cn(
                          "w-4 h-4 shrink-0 transition-colors",
                          isActive ? "text-white" : "text-[#666666] group-hover:text-[#999999]"
                        )}
                      />
                      {item.label}
                      {isActive && (
                        <ChevronRight
                          className="w-3 h-3 ml-auto"
                          style={{ color: "#C0392B" }}
                        />
                      )}
                    </Link>
                  )
                })}
              </div>
            </div>
          )
        })}
      </nav>

      {/* User */}
      <div
        className="border-t p-3"
        style={{ borderColor: "#1E1E1E" }}
      >
        <div className="flex items-center gap-2.5 mb-2 px-1">
          <div
            className="w-7 h-7 rounded-full flex items-center justify-center text-white text-[10px] font-semibold shrink-0"
            style={{ background: "#C0392B" }}
          >
            {initials}
          </div>
          <div className="min-w-0 flex-1">
            <p className="text-white text-xs font-medium truncate leading-none">
              {userName}
            </p>
            <p
              className="text-[10px] truncate leading-none mt-0.5"
              style={{ color: "#666666" }}
            >
              {ROLE_LABELS[role]}
            </p>
          </div>
        </div>

        <button
          onClick={handleSignOut}
          className="w-full flex items-center gap-2 px-2 py-1.5 rounded-md text-xs transition-colors text-[#666666] hover:text-[#CCCCCC] hover:bg-white/5"
        >
          <LogOut className="w-3.5 h-3.5" />
          Déconnexion
        </button>
      </div>
    </aside>
  )
}
