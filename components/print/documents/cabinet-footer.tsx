import { CABINET, PRINT_COLORS } from "@/lib/cabinet"
import { Mail, Home, Phone, Instagram } from "lucide-react"

/**
 * Bas de page du papier à en-tête : double filet rouge puis les quatre
 * coordonnées du cabinet. Partagé par l'ordonnance et le certificat.
 */
export function CabinetFooter({ marginTop = "4mm" }: { marginTop?: string }) {
  return (
    <footer style={{ marginTop }}>
      <div style={{ borderTop: `1pt solid ${PRINT_COLORS.rouge}` }} />
      <div style={{ borderTop: `0.5pt solid ${PRINT_COLORS.rouge}`, marginTop: "1.2mm" }} />

      <div className="mt-2 flex items-start justify-between gap-3" style={{ fontSize: "7.5pt" }}>
        <div className="space-y-1.5">
          <Contact icon={Mail} text={CABINET.email} />
          <Contact icon={Home} text={CABINET.adresse} />
        </div>
        <div className="space-y-1.5">
          <Contact icon={Phone} text={CABINET.telephone} />
          <Contact icon={Instagram} text={CABINET.instagram} />
        </div>
      </div>
    </footer>
  )
}

function Contact({ icon: Icon, text }: { icon: React.ElementType; text: string }) {
  return (
    <div className="flex items-center gap-1.5" style={{ color: PRINT_COLORS.ardoise }}>
      <span
        className="flex shrink-0 items-center justify-center rounded-full"
        style={{ width: "4mm", height: "4mm", border: `0.5pt solid ${PRINT_COLORS.rouge}` }}
      >
        <Icon style={{ width: "2.4mm", height: "2.4mm", color: PRINT_COLORS.rouge }} />
      </span>
      <span>{text}</span>
    </div>
  )
}
