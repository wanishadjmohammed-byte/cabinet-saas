"use client"

import { useEffect, useRef, useState } from "react"

/**
 * Affiche une feuille de document à taille réduite dans l'application.
 * La feuille garde ses dimensions réelles en millimètres (indispensable pour que
 * l'aperçu soit fidèle à l'impression) et n'est que mise à l'échelle visuellement.
 */
export function SheetPreview({ children }: { children: React.ReactNode }) {
  const conteneur = useRef<HTMLDivElement>(null)
  const feuille = useRef<HTMLDivElement>(null)
  const [echelle, setEchelle] = useState(1)
  const [hauteur, setHauteur] = useState(0)

  useEffect(() => {
    const c = conteneur.current
    const f = feuille.current
    if (!c || !f) return

    // offsetWidth/Height ignorent la transformation : pas de boucle de mesure.
    const mesurer = () => {
      const largeurFeuille = f.offsetWidth || 1
      const e = Math.min(1, c.clientWidth / largeurFeuille)
      setEchelle(e)
      setHauteur(f.offsetHeight * e)
    }

    mesurer()
    // L'observateur suffit à réagir aux changements de contenu : pas de dépendances.
    const observer = new ResizeObserver(mesurer)
    observer.observe(c)
    observer.observe(f)
    return () => observer.disconnect()
  }, [])

  return (
    <div ref={conteneur} className="w-full">
      <div style={{ height: hauteur }}>
        <div
          ref={feuille}
          style={{
            transform: `scale(${echelle})`,
            transformOrigin: "top left",
            width: "fit-content",
          }}
        >
          {children}
        </div>
      </div>
    </div>
  )
}
