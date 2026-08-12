import { PRINT_COLORS } from "@/lib/cabinet"

/**
 * Turns the doctor's plain-text report into the layout of the paper document.
 * Deliberately tiny — no markdown dependency, no editor to learn:
 *
 *   Histoire de la maladie :   → titre souligné
 *   # Conclusion               → titre souligné
 *   1. Faiblesse proximale     → sous-titre en gras
 *   - Douleur diffuse          → puce
 *   -- Épaule droite           → sous-puce
 *   (ligne vide)               → respiration
 */

type Block =
  | { kind: "heading"; text: string }
  | { kind: "subheading"; text: string }
  | { kind: "bullet"; text: string; level: 1 | 2 }
  | { kind: "para"; text: string }
  | { kind: "space" }

export function parseBlocks(source: string): Block[] {
  const blocks: Block[] = []

  for (const raw of source.replace(/\r\n/g, "\n").split("\n")) {
    const line = raw.trimEnd()
    const trimmed = line.trim()

    if (!trimmed) {
      // Collapse runs of blank lines into a single break.
      if (blocks[blocks.length - 1]?.kind !== "space") blocks.push({ kind: "space" })
      continue
    }

    if (trimmed.startsWith("#")) {
      blocks.push({ kind: "heading", text: trimmed.replace(/^#+\s*/, "") })
      continue
    }

    // Sous-puce : "-- texte", "o texte", ou une puce indentée de 2 espaces.
    if (/^--\s*/.test(trimmed) || /^o\s/.test(trimmed) || /^\s{2,}[-*•]\s/.test(line)) {
      blocks.push({ kind: "bullet", level: 2, text: trimmed.replace(/^(--|[-*•]|o)\s*/, "") })
      continue
    }

    // Puce : "- texte", "* texte", "• texte".
    if (/^[-*•]\s/.test(trimmed)) {
      blocks.push({ kind: "bullet", level: 1, text: trimmed.replace(/^[-*•]\s*/, "") })
      continue
    }

    if (/^\d+[.)]\s/.test(trimmed)) {
      blocks.push({ kind: "subheading", text: trimmed })
      continue
    }

    // A short line ending in a colon reads as a section title on the paper form.
    if (trimmed.endsWith(":") && trimmed.length <= 120) {
      blocks.push({ kind: "heading", text: trimmed })
      continue
    }

    blocks.push({ kind: "para", text: trimmed })
  }

  return blocks
}

export function FormattedText({ source, color }: { source: string; color?: string }) {
  const blocks = parseBlocks(source)
  const accent = color ?? PRINT_COLORS.bleu

  return (
    <div className="fmt">
      {blocks.map((b, i) => {
        switch (b.kind) {
          case "heading":
            return (
              <p key={i} className="fmt-heading" style={{ color: accent }}>
                {b.text}
              </p>
            )
          case "subheading":
            return (
              <p key={i} className="fmt-subheading">
                {b.text}
              </p>
            )
          case "bullet":
            return (
              <p key={i} className={b.level === 1 ? "fmt-bullet" : "fmt-bullet fmt-bullet-2"}>
                <span className="fmt-dot">{b.level === 1 ? "•" : "o"}</span>
                <span>{b.text}</span>
              </p>
            )
          case "space":
            return <div key={i} className="fmt-space" />
          default:
            return (
              <p key={i} className="fmt-para">
                {b.text}
              </p>
            )
        }
      })}
    </div>
  )
}
