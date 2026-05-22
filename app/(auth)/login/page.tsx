"use client"

export const dynamic = "force-dynamic"

import { useState } from "react"
import { createClient } from "@/lib/supabase/client"
import { useRouter } from "next/navigation"
import { Eye, EyeOff, Stethoscope } from "lucide-react"

export default function LoginPage() {
  const [email, setEmail] = useState("")
  const [password, setPassword] = useState("")
  const [showPassword, setShowPassword] = useState(false)
  const [loading, setLoading] = useState(false)
  const [error, setError] = useState<string | null>(null)
  const router = useRouter()
  const supabase = createClient()

  async function handleSubmit(e: React.FormEvent) {
    e.preventDefault()
    setLoading(true)
    setError(null)

    const { error } = await supabase.auth.signInWithPassword({ email, password })

    if (error) {
      setError("Email ou mot de passe incorrect.")
      setLoading(false)
      return
    }

    router.push("/")
    router.refresh()
  }

  return (
    <div className="min-h-screen flex" style={{ background: "#F7F5F2" }}>
      {/* Left panel */}
      <div
        className="hidden lg:flex lg:w-[440px] flex-col justify-between p-10"
        style={{ background: "#111111" }}
      >
        <div>
          <div className="flex items-center gap-3 mb-12">
            <div
              className="w-8 h-8 rounded-md flex items-center justify-center"
              style={{ background: "#C0392B" }}
            >
              <Stethoscope className="w-4 h-4 text-white" />
            </div>
            <span className="text-white font-semibold text-sm tracking-wide">
              Cabinet Médical
            </span>
          </div>

          <div className="space-y-6">
            <h1 className="text-white text-3xl font-bold leading-tight">
              Gestion du cabinet
              <br />
              <span style={{ color: "#C0392B" }}>Dr. Ounnas</span>
            </h1>
            <p className="text-sm leading-relaxed" style={{ color: "#888888" }}>
              Plateforme de gestion dédiée à la rhumatologie et médecine
              ostéo-articulaire. RDV, consultations, paiements et trésorerie
              en un seul endroit.
            </p>
          </div>
        </div>

        <div className="space-y-3">
          {[
            { label: "Rendez-vous & agenda", icon: "📅" },
            { label: "Suivi des paiements", icon: "💳" },
            { label: "Trésorerie en temps réel", icon: "📊" },
          ].map((item) => (
            <div
              key={item.label}
              className="flex items-center gap-3 px-4 py-3 rounded-md"
              style={{ background: "rgba(255,255,255,0.05)" }}
            >
              <span className="text-base">{item.icon}</span>
              <span className="text-sm" style={{ color: "#CCCCCC" }}>
                {item.label}
              </span>
            </div>
          ))}
        </div>

        <p className="text-xs" style={{ color: "#555555" }}>
          Spécialité Rhumatologie / Ostéo-articulaire · Staoueli, Algérie
        </p>
      </div>

      {/* Right panel — form */}
      <div className="flex-1 flex items-center justify-center px-6">
        <div className="w-full max-w-sm">
          {/* Mobile logo */}
          <div className="flex items-center gap-2 mb-8 lg:hidden">
            <div
              className="w-7 h-7 rounded flex items-center justify-center"
              style={{ background: "#C0392B" }}
            >
              <Stethoscope className="w-3.5 h-3.5 text-white" />
            </div>
            <span className="font-semibold text-sm">Cabinet Dr. Ounnas</span>
          </div>

          <div className="mb-8">
            <h2 className="text-2xl font-bold text-gray-900">Connexion</h2>
            <p className="mt-1 text-sm text-gray-500">
              Accédez à votre espace de gestion
            </p>
          </div>

          <form onSubmit={handleSubmit} className="space-y-5">
            <div>
              <label
                htmlFor="email"
                className="block text-sm font-medium text-gray-700 mb-1.5"
              >
                Adresse e-mail
              </label>
              <input
                id="email"
                type="email"
                autoComplete="email"
                required
                value={email}
                onChange={(e) => setEmail(e.target.value)}
                placeholder="vous@cabinet.dz"
                className="w-full px-3 py-2.5 text-sm border rounded-md outline-none transition-colors bg-white placeholder:text-gray-400"
                style={{
                  borderColor: error ? "#C0392B" : "#D1CFC9",
                }}
                onFocus={(e) => {
                  e.target.style.borderColor = "#C0392B"
                  e.target.style.boxShadow = "0 0 0 3px rgba(192,57,43,0.08)"
                }}
                onBlur={(e) => {
                  e.target.style.borderColor = error ? "#C0392B" : "#D1CFC9"
                  e.target.style.boxShadow = "none"
                }}
              />
            </div>

            <div>
              <label
                htmlFor="password"
                className="block text-sm font-medium text-gray-700 mb-1.5"
              >
                Mot de passe
              </label>
              <div className="relative">
                <input
                  id="password"
                  type={showPassword ? "text" : "password"}
                  autoComplete="current-password"
                  required
                  value={password}
                  onChange={(e) => setPassword(e.target.value)}
                  placeholder="••••••••"
                  className="w-full px-3 py-2.5 pr-10 text-sm border rounded-md outline-none transition-colors bg-white placeholder:text-gray-400"
                  style={{
                    borderColor: error ? "#C0392B" : "#D1CFC9",
                  }}
                  onFocus={(e) => {
                    e.target.style.borderColor = "#C0392B"
                    e.target.style.boxShadow =
                      "0 0 0 3px rgba(192,57,43,0.08)"
                  }}
                  onBlur={(e) => {
                    e.target.style.borderColor = error
                      ? "#C0392B"
                      : "#D1CFC9"
                    e.target.style.boxShadow = "none"
                  }}
                />
                <button
                  type="button"
                  onClick={() => setShowPassword((v) => !v)}
                  className="absolute right-3 top-1/2 -translate-y-1/2 text-gray-400 hover:text-gray-600"
                >
                  {showPassword ? (
                    <EyeOff className="w-4 h-4" />
                  ) : (
                    <Eye className="w-4 h-4" />
                  )}
                </button>
              </div>
            </div>

            {error && (
              <p className="text-sm font-medium" style={{ color: "#C0392B" }}>
                {error}
              </p>
            )}

            <button
              type="submit"
              disabled={loading}
              className="w-full py-2.5 px-4 text-sm font-semibold text-white rounded-md transition-opacity disabled:opacity-60"
              style={{ background: "#C0392B" }}
            >
              {loading ? "Connexion en cours…" : "Se connecter"}
            </button>
          </form>

          <p className="mt-8 text-xs text-center text-gray-400">
            Accès réservé au personnel du cabinet
          </p>
        </div>
      </div>
    </div>
  )
}
