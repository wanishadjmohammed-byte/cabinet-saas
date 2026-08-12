"use client"

import { useEffect, useRef } from "react"
import { Textarea } from "@/components/ui/textarea"
import { Heading, List, ListOrdered, IndentIncrease, Pilcrow } from "lucide-react"

/** Tout marqueur de mise en forme en début de ligne. */
const MARQUEURS = /^\s*(#+\s*|--\s*|[-*•]\s+|\d+[.)]\s+)/
/** Marqueur de liste, pour la poursuite automatique à la touche Entrée. */
const MARQUEUR_LISTE = /^(--\s+|[-*•]\s+|(\d+)[.)]\s+)/

export type Modele = { label: string; texte: string }

/** Modèles proposés sur un compte rendu vide. */
export const MODELES_COMPTE_RENDU: Modele[] = [
  {
    label: "Suivi médical",
    texte:
      "# Histoire de la maladie\n- \n\n# Symptomatologie fonctionnelle\n1. \n\n# Examen clinique\n- \n\n# Conduite à tenir\n- ",
  },
  {
    label: "Opératoire",
    texte:
      "# Indication opératoire\n- \n\n# Technique\n- \n\n# Suites opératoires\n- \n\n# Recommandations\n- ",
  },
  {
    label: "Certificat",
    texte:
      "Je soussignée, Docteur OUNNAS Meriem, chirurgienne orthopédiste, certifie avoir examiné ce jour le patient.\n\n# Constatations\n- \n\n# Conclusion\n- ",
  },
]

function bornesLigne(texte: string, pos: number): [number, number] {
  const debut = texte.lastIndexOf("\n", pos - 1) + 1
  let fin = texte.indexOf("\n", pos)
  if (fin === -1) fin = texte.length
  return [debut, fin]
}

/** Poursuit la numérotation en cours, ou repart à 1 après une ligne vide. */
function prochainNumero(texte: string, debut: number): number {
  const avant = texte.slice(0, debut).split("\n")
  if (avant[avant.length - 1] === "") avant.pop()
  for (let i = avant.length - 1; i >= 0; i--) {
    const ligne = avant[i].trim()
    if (!ligne) break
    const m = ligne.match(/^(\d+)[.)]\s/)
    if (m) return parseInt(m[1], 10) + 1
  }
  return 1
}

export function ReportEditor({
  value,
  onChange,
  rows = 14,
  placeholder,
  required = false,
  modeles = [],
}: {
  value: string
  onChange: (v: string) => void
  rows?: number
  placeholder?: string
  required?: boolean
  /** Squelettes proposés tant que le champ est vide. */
  modeles?: Modele[]
}) {
  const ref = useRef<HTMLTextAreaElement>(null)
  /** Position du curseur à restaurer après le rendu contrôlé. */
  const selection = useRef<[number, number] | null>(null)

  useEffect(() => {
    if (!selection.current || !ref.current) return
    const [a, b] = selection.current
    selection.current = null
    ref.current.focus()
    ref.current.setSelectionRange(a, b)
  })

  /** Applique un marqueur à toutes les lignes couvertes par la sélection. */
  function appliquer(marqueur: (indice: number, ligne: string) => string) {
    const ta = ref.current
    if (!ta) return
    const [debut] = bornesLigne(value, ta.selectionStart)
    const [, fin] = bornesLigne(value, ta.selectionEnd)
    const lignes = value.slice(debut, fin).split("\n")
    const nouveau = lignes
      .map((l, i) => marqueur(i, l.replace(MARQUEURS, "")))
      .join("\n")

    onChange(value.slice(0, debut) + nouveau + value.slice(fin))
    selection.current = [debut + nouveau.length, debut + nouveau.length]
  }

  function numeroter() {
    const ta = ref.current
    if (!ta) return
    const [debut] = bornesLigne(value, ta.selectionStart)
    const depart = prochainNumero(value, debut)
    appliquer((i, l) => `${depart + i}. ${l}`)
  }

  function appliquerModele(texte: string) {
    onChange(texte)
    const curseur = texte.indexOf("- ")
    const pos = curseur === -1 ? texte.length : curseur + 2
    selection.current = [pos, pos]
  }

  /** Entrée poursuit la liste en cours ; sur une puce vide, elle en sort. */
  function gererEntree(e: React.KeyboardEvent<HTMLTextAreaElement>) {
    if (e.key !== "Enter" || e.shiftKey) return
    const ta = e.currentTarget
    if (ta.selectionStart !== ta.selectionEnd) return

    const pos = ta.selectionStart
    const [debut] = bornesLigne(value, pos)
    const ligne = value.slice(debut, pos)
    const m = ligne.match(MARQUEUR_LISTE)
    if (!m) return

    e.preventDefault()

    if (!ligne.slice(m[0].length).trim()) {
      onChange(value.slice(0, debut) + value.slice(pos))
      selection.current = [debut, debut]
      return
    }

    const suite = m[2] ? `${parseInt(m[2], 10) + 1}. ` : m[0]
    const insertion = "\n" + suite
    onChange(value.slice(0, pos) + insertion + value.slice(pos))
    selection.current = [pos + insertion.length, pos + insertion.length]
  }

  const outils = [
    { icon: Heading, label: "Titre", action: () => appliquer((_, l) => `# ${l}`) },
    { icon: ListOrdered, label: "Sous-titre", action: numeroter },
    { icon: List, label: "Puce", action: () => appliquer((_, l) => `- ${l}`) },
    { icon: IndentIncrease, label: "Sous-puce", action: () => appliquer((_, l) => `-- ${l}`) },
    { icon: Pilcrow, label: "Paragraphe", action: () => appliquer((_, l) => l) },
  ]

  return (
    <div className="space-y-1.5">
      <div className="flex flex-wrap items-center gap-1 rounded-md border border-border bg-muted/40 p-1">
        {outils.map(({ icon: Icon, label, action }) => (
          <button
            key={label}
            type="button"
            onMouseDown={(e) => e.preventDefault()} /* garde le focus dans le champ */
            onClick={action}
            title={`${label} — s'applique aux lignes sélectionnées`}
            className="flex items-center gap-1.5 rounded px-2 py-1 text-xs text-muted-foreground transition-colors hover:bg-background hover:text-foreground"
          >
            <Icon className="h-3.5 w-3.5" />
            {label}
          </button>
        ))}
      </div>

      <Textarea
        ref={ref}
        rows={rows}
        value={value}
        onChange={(e) => onChange(e.target.value)}
        onKeyDown={gererEntree}
        placeholder={placeholder}
        className="font-mono text-xs leading-relaxed"
        required={required}
      />

      {!value.trim() && modeles.length > 0 && (
        <div className="flex flex-wrap items-center gap-1.5">
          <span className="text-[11px] text-muted-foreground">Commencer avec un modèle :</span>
          {modeles.map((m) => (
            <button
              key={m.label}
              type="button"
              onClick={() => appliquerModele(m.texte)}
              className="rounded border border-border px-2 py-0.5 text-[11px] text-muted-foreground transition-colors hover:bg-muted hover:text-foreground"
            >
              {m.label}
            </button>
          ))}
        </div>
      )}

      <p className="text-[11px] leading-relaxed text-muted-foreground">
        Placez le curseur sur une ligne (ou sélectionnez-en plusieurs) puis cliquez un bouton.
        Après une puce, <strong>Entrée</strong> en crée une nouvelle ; sur une puce vide, elle sort de la liste.
      </p>
    </div>
  )
}
