import { CABINET, PRINT_COLORS } from "@/lib/cabinet"
import { FormattedText } from "@/components/print/formatted-text"
import { Mail, Home, Phone, Instagram } from "lucide-react"
import { format, parseISO } from "date-fns"
import { fr } from "date-fns/locale"

export type OrdonnanceData = {
  date: string
  patientNom: string
  patientPrenom: string
  age: number | null
  ordonnance: string | null
}

/** Ordonnance A5 — reprend la disposition du papier à en-tête du cabinet. */
export function OrdonnanceSheet({ data }: { data: OrdonnanceData }) {
  const dateStr = safeDate(data.date)

  return (
    <div className="sheet sheet-a5 flex flex-col">
      {/* eslint-disable-next-line @next/next/no-img-element */}
      <img src={CABINET.logo} alt="" className="watermark" />

      <header className="flex items-start justify-between gap-4">
        <div style={{ width: "48%" }}>
          <p
            dir="rtl"
            lang="ar"
            style={{ color: PRINT_COLORS.rouge, fontSize: "7.5pt", lineHeight: 1.5, fontWeight: 600 }}
          >
            {CABINET.titreArabe}
          </p>

          <div className="mt-1.5 flex items-center gap-2">
            {/* eslint-disable-next-line @next/next/no-img-element */}
            <img src={CABINET.logo} alt="" style={{ width: "13mm", height: "13mm", objectFit: "contain" }} />
            <div>
              <p style={{ color: PRINT_COLORS.rouge, fontSize: "9pt", fontWeight: 700, letterSpacing: "0.01em" }}>
                {CABINET.medecinNom}
              </p>
              <div style={{ borderTop: `0.5pt solid ${PRINT_COLORS.rouge}`, margin: "2px 0" }} />
              <p style={{ color: PRINT_COLORS.ardoise, fontSize: "8.5pt", letterSpacing: "0.04em" }}>
                {CABINET.titre}
              </p>
            </div>
          </div>
        </div>

        <div style={{ width: "46%", color: PRINT_COLORS.ardoise, fontSize: "8.5pt" }}>
          <Champ label={`${CABINET.ville} le`} value={dateStr} />
          <Champ label="Nom" value={data.patientNom} />
          <Champ label="Prénom" value={data.patientPrenom} />
          <Champ label="Age" value={data.age !== null ? `${data.age} ans` : ""} />
        </div>
      </header>

      <h1
        className="text-center"
        style={{
          color: PRINT_COLORS.ardoise,
          fontSize: "13pt",
          fontWeight: 700,
          letterSpacing: "0.08em",
          margin: "9mm 0 6mm",
        }}
      >
        ORDONNANCE
      </h1>

      <div className="fmt-lg flex-1 overflow-hidden">
        {data.ordonnance?.trim() ? (
          <FormattedText source={data.ordonnance} color={PRINT_COLORS.ardoise} />
        ) : (
          <p style={{ color: "#9CA3AF", fontSize: "10pt", fontStyle: "italic" }}>
            Aucune ordonnance saisie pour cette consultation.
          </p>
        )}
      </div>

      <footer style={{ marginTop: "4mm" }}>
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
    </div>
  )
}

/** L'aperçu en direct peut recevoir une date incomplète pendant la saisie. */
function safeDate(date: string): string {
  try {
    return format(parseISO(date), "d MMMM yyyy", { locale: fr })
  } catch {
    return date
  }
}

/** Libellé + valeur sur une ligne pointillée, comme sur le papier à en-tête. */
function Champ({ label, value }: { label: string; value: string }) {
  return (
    <div className="flex items-baseline gap-1" style={{ marginBottom: "2.4mm" }}>
      <span className="shrink-0">{label} :</span>
      <span
        className="min-w-0 flex-1 truncate"
        style={{
          color: "#1a1a1a",
          fontWeight: 600,
          borderBottom: `0.5pt dotted ${PRINT_COLORS.ardoise}`,
          paddingLeft: "2px",
        }}
      >
        {value}
      </span>
    </div>
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
