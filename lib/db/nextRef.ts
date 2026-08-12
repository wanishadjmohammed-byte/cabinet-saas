import { db } from "@/lib/db"
import { sequences } from "@/lib/db/schema"
import { sql } from "drizzle-orm"

/** Atomically increments a named counter and returns its new value. */
export async function nextSequenceValue(seqName: string): Promise<number> {
  const [seq] = await db
    .insert(sequences)
    .values({ name: seqName, value: 1 })
    .onConflictDoUpdate({
      target: sequences.name,
      set: { value: sql`${sequences.value} + 1` },
    })
    .returning({ value: sequences.value })

  return seq.value
}

export async function nextRef(prefix: string, seqName: string): Promise<string> {
  const value = await nextSequenceValue(seqName)
  return `${prefix}-${String(value).padStart(3, "0")}`
}

/** Numéro de facture sur 6 chiffres — 000001, 000002… */
export async function nextFactureNumero(): Promise<string> {
  const value = await nextSequenceValue("factures")
  return String(value).padStart(6, "0")
}
