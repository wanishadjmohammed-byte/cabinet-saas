import { CABINET, PRINT_COLORS } from "@/lib/cabinet"
import { CabinetFooter } from "./cabinet-footer"
import { format, parseISO } from "date-fns"
import { fr } from "date-fns/locale"

export type NatureCertificat = "arret" | "prolongation" | "reprise"

export type CertificatData = {
  date: string
  patientNom: string
  patientPrenom: string
  age: number | null
  nature: NatureCertificat
  nombreJours: number | null
  dateDebut: string | null
  dateFin: string | null
  dateReprise: string | null
}

/** Certificat médical d'arrêt de travail — A5, d'après le formulaire du cabinet. */
export function CertificatSheet({ data }: { data: CertificatData }) {
  const nomComplet = [data.patientNom, data.patientPrenom].filter(Boolean).join(" ")

  return (
    <div className="sheet sheet-a5 flex flex-col">
      {/* eslint-disable-next-line @next/next/no-img-element */}
      <img src={CABINET.logo} alt="" className="watermark" />

      {/* ── En-tête ── */}
      <p
        className="text-center"
        style={{
          color: PRINT_COLORS.ardoise,
          fontSize: "8pt",
          fontWeight: 700,
          letterSpacing: "0.14em",
        }}
      >
        MÉDECIN SPÉCIALISÉ EN CHIRURGIE ORTHOPÉDIQUE
      </p>

      <header className="mt-2 flex items-center justify-center gap-3">
        {/* eslint-disable-next-line @next/next/no-img-element */}
        <img src={CABINET.logo} alt="" style={{ width: "12mm", height: "12mm", objectFit: "contain" }} />
        <div className="text-center">
          <p style={{ color: PRINT_COLORS.rouge, fontSize: "9.5pt", fontWeight: 700 }}>
            {CABINET.medecinNom}
          </p>
          <p
            dir="rtl"
            lang="ar"
            style={{ color: PRINT_COLORS.rouge, fontSize: "7.5pt", lineHeight: 1.6, fontWeight: 600 }}
          >
            {CABINET.titreArabe}
          </p>
          <p style={{ color: PRINT_COLORS.ardoise, fontSize: "8.5pt", letterSpacing: "0.04em" }}>
            {CABINET.titre}
          </p>
        </div>
      </header>

      {/* Date de délivrance de la feuille */}
      <p
        className="mt-3 text-right"
        style={{ color: PRINT_COLORS.ardoise, fontSize: "8.5pt" }}
      >
        {CABINET.ville} le : <Valeur>{jour(data.date)}</Valeur>
      </p>

      {/* ── Titre ── */}
      <h1
        className="text-center"
        style={{
          color: PRINT_COLORS.ardoise,
          fontSize: "11pt",
          fontWeight: 700,
          letterSpacing: "0.04em",
          textDecoration: "underline",
          textUnderlineOffset: "3px",
          margin: "6mm 0 6mm",
        }}
      >
        CERTIFICAT MEDICAL D&apos;ARRET DE TRAVAIL
      </h1>

      {/* ── Corps ── */}
      <div style={{ fontSize: "9.5pt", lineHeight: 2.1 }}>
        <p style={{ textAlign: "justify" }}>
          Je Soussigné, Docteur <u>OUNNAS MERIEM</u> Certifie avoir examiné ce jour le (la) patient
          (e) : <Valeur>{nomComplet}</Valeur> Agé(e) de : <Valeur>{data.age !== null ? `${data.age} ans` : ""}</Valeur> et
          Déclaré que son état de santé actuel nécessait :
        </p>

        <div style={{ marginTop: "4mm" }}>
          {data.nature === "reprise" ? (
            <p>
              Reprise de travail le <Valeur>{jour(data.dateReprise)}</Valeur>
            </p>
          ) : (
            <>
              <p>
                {data.nature === "arret" ? "Un arrêt de travail de " : "Prolongation d'arrêt de travail de "}
                <Valeur>{data.nombreJours ? `${data.nombreJours} jour${data.nombreJours > 1 ? "s" : ""}` : ""}</Valeur>{" "}
                du <Valeur>{jour(data.dateDebut)}</Valeur> au <Valeur>{jour(data.dateFin)}</Valeur>
              </p>
              <p style={{ marginTop: "2mm" }}>Sous réserve de complication .</p>
            </>
          )}
        </div>

        <p style={{ marginTop: "6mm", textAlign: "justify" }}>
          Certificat établi ce jour et remis en mains propres à l&apos;intéressé(e) pour faire valoir ce
          que de droit.
        </p>
      </div>

      {/* Espace laissé libre pour la signature et le cachet */}
      <div className="flex-1" />

      <CabinetFooter />
    </div>
  )
}

/** Valeur posée sur une ligne pointillée, comme sur le formulaire papier. */
function Valeur({ children }: { children: React.ReactNode }) {
  const vide = children === "" || children === null || children === undefined
  return (
    <span
      style={{
        display: "inline-block",
        minWidth: vide ? "30mm" : "18mm",
        color: "#1a1a1a",
        fontWeight: 600,
        borderBottom: `0.5pt dotted ${PRINT_COLORS.ardoise}`,
        padding: "0 3px",
        textAlign: "center",
      }}
    >
      {children}
    </span>
  )
}

/** Les aperçus en direct reçoivent des dates incomplètes pendant la saisie. */
function jour(date: string | null): string {
  if (!date) return ""
  try {
    return format(parseISO(date), "dd/MM/yyyy", { locale: fr })
  } catch {
    return date
  }
}
