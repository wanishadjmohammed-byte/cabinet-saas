import type { Metadata } from "next"
import "./globals.css"

export const metadata: Metadata = {
  title: "Cabinet Dr. Ounnas — Gestion",
  description: "Système de gestion du cabinet médical Dr. Meriem Ounnas",
}

export default function RootLayout({
  children,
}: {
  children: React.ReactNode
}) {
  return (
    <html lang="fr" suppressHydrationWarning>
      <body>{children}</body>
    </html>
  )
}
