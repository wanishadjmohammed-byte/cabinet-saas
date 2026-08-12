import { CABINET, PRINT_COLORS } from "@/lib/cabinet"
import { FormattedText } from "@/components/print/formatted-text"
import { format, parseISO } from "date-fns"
import { fr } from "date-fns/locale"

export type CompteRenduData = {
  type: string
  date: string
  motif: string | null
  contenu: string
  patientPrenom: string
  patientNom: string
  age: number | null
  sexe: "H" | "F" | null
}

/** Compte rendu A5 — s'étire sur plusieurs feuilles si le rapport est long. */
export function CompteRenduSheet({ data }: { data: CompteRenduData }) {
  const sexe = data.sexe === "F" ? "Féminin" : data.sexe === "H" ? "Masculin" : null

  return (
    <div className="sheet sheet-a5 sheet-flow flex flex-col">
      {/* eslint-disable-next-line @next/next/no-img-element */}
      <img src={CABINET.logo} alt="" className="watermark" />

      <header className="text-center" style={{ color: PRINT_COLORS.bleu }}>
        <p style={{ fontSize: "10pt" }}>{CABINET.medecinNomLong}</p>
        <p style={{ fontSize: "9pt" }}>Chirurgienne Orthopédiste &amp; traumatologue</p>
      </header>

      <div style={{ borderTop: `2pt solid ${PRINT_COLORS.bleu}`, margin: "3.5mm 0 4mm" }} />

      <h1
        className="text-center"
        style={{ color: PRINT_COLORS.bleu, fontSize: "18pt", fontWeight: 800, letterSpacing: "-0.01em" }}
      >
        COMPTE RENDU MEDICAL
      </h1>
      <p
        className="text-center"
        style={{ color: PRINT_COLORS.bleu, fontSize: "10pt", fontWeight: 700, marginTop: "0.8mm" }}
      >
        {data.type}
      </p>

      <div style={{ borderTop: `2pt solid ${PRINT_COLORS.bleu}`, margin: "4mm 0 3.5mm" }} />

      <section className="flex items-start justify-between gap-4" style={{ fontSize: "8pt" }}>
        <div style={{ maxWidth: "68%" }}>
          <p>
            <Bleu>Patient</Bleu> : {data.patientPrenom} {data.patientNom}
          </p>
          <p>
            <Bleu>Âge</Bleu> : {data.age !== null ? `${data.age} ans` : "—"}
            {sexe && (
              <>
                {" | "}
                <Bleu>Sexe</Bleu> : {sexe}
              </>
            )}
          </p>
          {data.motif && (
            <p>
              <Bleu>Motif de consultation</Bleu> : {data.motif}
            </p>
          )}
        </div>
        <p className="shrink-0">
          <Bleu>Date :</Bleu> {safeDate(data.date)}
        </p>
      </section>

      <div className="fmt-sm" style={{ marginTop: "3.5mm" }}>
        {data.contenu.trim() ? (
          <FormattedText source={data.contenu} color={PRINT_COLORS.bleu} />
        ) : (
          <p style={{ color: "#9CA3AF", fontSize: "8pt", fontStyle: "italic" }}>
            Le contenu du compte rendu apparaîtra ici.
          </p>
        )}
      </div>

      <footer style={{ marginTop: "12mm", breakInside: "avoid" }}>
        <p className="text-center" style={{ color: PRINT_COLORS.bleu, fontSize: "9pt", fontWeight: 700 }}>
          Signature
        </p>
        <div style={{ margin: "11mm auto 0", width: "62%", borderTop: "0.75pt solid #4b5563" }} />
        <div className="text-center" style={{ marginTop: "1.5mm", fontSize: "8pt", color: PRINT_COLORS.bleu }}>
          <p>
            Docteur <strong>OUNNAS Meriem</strong> |
          </p>
          <p>
            <strong>Chirurgienne Orthopédiste</strong>
          </p>
          <p>{CABINET.cabinet}</p>
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

function Bleu({ children }: { children: React.ReactNode }) {
  return <strong style={{ color: PRINT_COLORS.bleu, fontWeight: 700 }}>{children}</strong>
}
