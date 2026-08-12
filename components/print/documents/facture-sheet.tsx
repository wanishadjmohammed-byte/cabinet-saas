import { CABINET, PRINT_COLORS } from "@/lib/cabinet"
import { calcTotaux } from "@/lib/facture"
import { formatDZD } from "@/lib/utils"
import { format, parseISO } from "date-fns"
import { fr } from "date-fns/locale"

export type FactureData = {
  numero: string
  date: string
  patientNom: string
  patientAge: string | null
  patientSexe: string | null
  typeIntervention: string | null
  dateIntervention: string | null
  tva: number
  lignes: { description: string; montant: number }[]
}

/** Le tableau garde toujours 7 lignes pour conserver la hauteur du modèle papier. */
const MIN_LIGNES = 7

export function FactureSheet({ data }: { data: FactureData }) {
  const { totalHT, montantTva, totalTTC } = calcTotaux(data.lignes, data.tva)
  const vides = Math.max(0, MIN_LIGNES - data.lignes.length)

  const cell: React.CSSProperties = {
    border: `0.75pt solid ${PRINT_COLORS.bleu}`,
    padding: "1.7mm 2.2mm",
    fontFamily: "ui-monospace, SFMono-Regular, Menlo, Consolas, monospace",
    fontSize: "7.5pt",
  }

  return (
    <div className="sheet sheet-a5 flex flex-col">
      {/* eslint-disable-next-line @next/next/no-img-element */}
      <img src={CABINET.logo} alt="" className="watermark" />

      <header className="text-center" style={{ color: PRINT_COLORS.bleu }}>
        <p style={{ fontSize: "10pt" }}>{CABINET.medecinNomLong}</p>
        <p style={{ fontSize: "9pt" }}>{CABINET.titreLong}</p>
      </header>

      <div style={{ borderTop: `2pt solid ${PRINT_COLORS.bleu}`, margin: "3.5mm 0 4mm" }} />

      <h1 className="text-center" style={{ color: PRINT_COLORS.bleu, fontSize: "19pt", fontWeight: 800 }}>
        FACTURE
      </h1>

      <div style={{ borderTop: `2pt solid ${PRINT_COLORS.bleu}`, margin: "4mm 0 4mm" }} />

      <section className="flex items-start justify-between gap-4" style={{ fontSize: "8pt" }}>
        <div style={{ maxWidth: "66%" }}>
          <p>
            <Bleu>Facture N</Bleu> : {data.numero}
          </p>
          <p>
            <Bleu>Patient</Bleu> : {data.patientNom}
          </p>
          {(data.patientAge || data.patientSexe) && (
            <p>
              {data.patientAge && (
                <>
                  <Bleu>Âge</Bleu> : {data.patientAge}
                </>
              )}
              {data.patientAge && data.patientSexe && " | "}
              {data.patientSexe && (
                <>
                  <Bleu>Sexe</Bleu> : {data.patientSexe}
                </>
              )}
            </p>
          )}
          {data.typeIntervention && (
            <p>
              <Bleu>Type d&apos;intervention</Bleu> : {data.typeIntervention}
            </p>
          )}
          {data.dateIntervention && (
            <p>
              <Bleu>Date de l&apos;intervention</Bleu> : {safeDate(data.dateIntervention, "dd MMMM yyyy")}
            </p>
          )}
        </div>
        <p className="shrink-0">
          <Bleu>Date :</Bleu> {safeDate(data.date, "dd/MM/yyyy")}
        </p>
      </section>

      <table style={{ width: "100%", marginTop: "7mm", borderCollapse: "collapse", tableLayout: "fixed" }}>
        <thead>
          <tr>
            <th style={{ ...cell, fontWeight: 700, textAlign: "left", letterSpacing: "0.06em" }}>
              DESCRIPTION
            </th>
            <th
              style={{ ...cell, fontWeight: 700, textAlign: "right", letterSpacing: "0.06em", width: "40%" }}
            >
              PRIX
            </th>
          </tr>
        </thead>
        <tbody>
          {data.lignes.map((l, i) => (
            <tr key={i}>
              <td style={{ ...cell, textTransform: "uppercase" }}>{l.description}</td>
              <td style={{ ...cell, textAlign: "right" }}>{formatDZD(l.montant)}</td>
            </tr>
          ))}
          {Array.from({ length: vides }).map((_, i) => (
            <tr key={`vide-${i}`}>
              <td style={cell}>&nbsp;</td>
              <td style={cell}>&nbsp;</td>
            </tr>
          ))}

          <Total label="TOTAL HT" value={formatDZD(totalHT)} cell={cell} />
          <Total label={`TVA ${data.tva}%`} value={formatDZD(montantTva)} cell={cell} />
          <Total label="TOTAL TC" value={formatDZD(totalTTC)} cell={cell} />
        </tbody>
      </table>

      <p
        className="text-center"
        style={{ color: PRINT_COLORS.bleu, fontSize: "9pt", fontWeight: 700, marginTop: "8mm" }}
      >
        Signature
      </p>

      <footer className="mt-auto text-center" style={{ color: PRINT_COLORS.bleu, fontSize: "7pt" }}>
        <div style={{ margin: "0 auto 1.5mm", width: "60%", borderTop: "0.75pt solid #4b5563" }} />
        <p>
          Docteur <strong>OUNNAS Meriem</strong> | <strong>Chirurgienne Orthopédiste</strong>
        </p>
        <p style={{ marginTop: "0.8mm" }}>
          <strong>Numéro d&apos;ordre :</strong> {CABINET.numeroOrdre} | <strong>NIF :</strong> {CABINET.nif}
        </p>
        <p style={{ marginTop: "0.8mm" }}>
          <strong>Adresse :</strong> {CABINET.adresseComplete} | <strong>N° tel :</strong>{" "}
          {CABINET.telephoneCourt}
        </p>
      </footer>
    </div>
  )
}

/** L'aperçu en direct peut recevoir une date incomplète pendant la saisie. */
function safeDate(date: string, pattern: string): string {
  try {
    return format(parseISO(date), pattern, { locale: fr })
  } catch {
    return date
  }
}

function Total({ label, value, cell }: { label: string; value: string; cell: React.CSSProperties }) {
  return (
    <tr>
      <td style={{ ...cell, textAlign: "right", fontWeight: 700, letterSpacing: "0.04em" }}>{label}</td>
      <td style={{ ...cell, textAlign: "right" }}>{value}</td>
    </tr>
  )
}

function Bleu({ children }: { children: React.ReactNode }) {
  return <strong style={{ color: PRINT_COLORS.bleu, fontWeight: 700 }}>{children}</strong>
}
